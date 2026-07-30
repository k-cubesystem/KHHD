import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  AEKMAK_DAILY_LIMIT,
  AEKMAK_DISCLAIMER,
  AEKMAK_TAGS,
  AEKMAK_TAG_LABEL,
  AEKMAK_TAG_SEAL,
  AEKMAK_TEXT_MAX,
  BURN_MS,
  allSettleLines,
  countBurnsOnDay,
  countBurnsThisMonth,
  hashSeed,
  isAekmakTag,
  kstDayKey,
  kstMonthStartMs,
  monthlyRecallLine,
  remainingBurns,
  settleLine,
  sigilStrokes,
  type AekmakTag,
} from '../aekmak'

/** KST 시각을 UTC epoch 으로 — 테스트 의도를 KST 로 읽히게 한다(KST = UTC+9). */
function kst(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, min)
}

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION_SQL = read('supabase/migrations/20260730_shrine_aekmak_logs.sql')

describe('감정 태그 6종', () => {
  it('원안 6종 그대로 — 불안·미련·화·걱정·미움·액운', () => {
    expect([...AEKMAK_TAGS]).toEqual(['anxiety', 'regret', 'anger', 'worry', 'resentment', 'misfortune'])
    expect(AEKMAK_TAGS.map((t) => AEKMAK_TAG_LABEL[t])).toEqual(['불안', '미련', '화', '걱정', '미움', '액운'])
  })

  it('표시명·인장이 모든 태그에 빠짐없이 있다', () => {
    for (const t of AEKMAK_TAGS) {
      expect(AEKMAK_TAG_LABEL[t]).toBeTruthy()
      expect(AEKMAK_TAG_SEAL[t]).toHaveLength(1)
    }
  })

  it('isAekmakTag 는 6종만 통과시킨다 (서버 입력 검증)', () => {
    for (const t of AEKMAK_TAGS) expect(isAekmakTag(t)).toBe(true)
    for (const bad of ['', 'ANXIETY', '불안', 'sadness', null, undefined, 3, {}, ['anger']]) {
      expect(isAekmakTag(bad)).toBe(false)
    }
  })

  it('DB CHECK 제약(마이그레이션)과 태그 문자열이 같다', () => {
    for (const t of AEKMAK_TAGS) expect(MIGRATION_SQL).toContain(`'${t}'`)
  })

  /**
   * 프라이버시가 **스키마로 강제**되는지 — 이 기획의 핵심 가치다.
   * 컬럼 집합을 통째로 고정한다: 액운 원문을 담을 자리가 새로 생기면 즉시 실패한다.
   */
  it('shrine_aekmak_logs 에 원문 컬럼이 없다 (컬럼 집합 고정)', () => {
    const body = /create table if not exists public\.shrine_aekmak_logs\s*\(([\s\S]*?)\n\);/i.exec(MIGRATION_SQL)?.[1]
    expect(body).toBeTruthy()
    const columns = (body ?? '')
      .split('\n')
      .map((l) => l.replace(/--.*$/, '').trim())
      .filter((l) => l.length > 0 && !/^(primary key|unique|constraint|check|foreign key)\b/i.test(l))
      .map((l) => l.split(/\s+/)[0])
    expect(columns).toEqual(['id', 'user_id', 'tag', 'burned_at'])
  })
})

describe('KST 하루 판정 · 일 3회', () => {
  it('일 상한은 3', () => {
    expect(AEKMAK_DAILY_LIMIT).toBe(3)
  })

  it('kstDayKey — KST 자정 경계에서 날짜가 넘어간다', () => {
    expect(kstDayKey(kst(2026, 7, 30, 23, 59))).toBe('2026-07-30')
    expect(kstDayKey(kst(2026, 7, 31, 0, 0))).toBe('2026-07-31')
    // UTC 로는 같은 날(2026-07-30 15:00Z)이지만 KST 로는 이미 31일이다
    expect(kstDayKey(Date.UTC(2026, 6, 30, 15, 0))).toBe('2026-07-31')
  })

  it('kstDayKey — 비유한수는 어떤 날에도 속하지 않는다', () => {
    expect(kstDayKey(Number.NaN)).toBe('')
    expect(kstDayKey(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('countBurnsOnDay — 같은 KST 하루만 센다', () => {
    const now = kst(2026, 7, 30, 22)
    const logs = [
      kst(2026, 7, 30, 0, 1), // 오늘 시작 직후
      kst(2026, 7, 30, 21),
      kst(2026, 7, 29, 23, 59), // 어제
      kst(2026, 7, 31, 0, 1), // 내일
    ]
    expect(countBurnsOnDay(logs, now)).toBe(2)
  })

  it('remainingBurns — 0회면 3, 3회면 0, 초과해도 음수가 되지 않는다', () => {
    const now = kst(2026, 7, 30, 12)
    const one = kst(2026, 7, 30, 9)
    expect(remainingBurns([], now)).toBe(3)
    expect(remainingBurns([one], now)).toBe(2)
    expect(remainingBurns([one, one, one], now)).toBe(0)
    expect(remainingBurns([one, one, one, one, one], now)).toBe(0)
  })

  it('remainingBurns — KST 자정을 넘기면 다시 3회', () => {
    const yesterday = [kst(2026, 7, 30, 20), kst(2026, 7, 30, 21), kst(2026, 7, 30, 22)]
    expect(remainingBurns(yesterday, kst(2026, 7, 30, 23))).toBe(0)
    expect(remainingBurns(yesterday, kst(2026, 7, 31, 0, 0))).toBe(3)
  })
})

describe('월간 회고', () => {
  it('kstMonthStartMs — 그 달 1일 00:00 KST', () => {
    expect(kstMonthStartMs(kst(2026, 7, 30, 13))).toBe(kst(2026, 7, 1, 0, 0))
    expect(kstMonthStartMs(kst(2026, 1, 1, 0, 0))).toBe(kst(2026, 1, 1, 0, 0))
  })

  it('countBurnsThisMonth — 지난달·다음달은 세지 않는다 (말일 길이 무관)', () => {
    const now = kst(2026, 7, 15, 12)
    const logs = [
      kst(2026, 6, 30, 23, 59), // 지난달 마지막
      kst(2026, 7, 1, 0, 0), // 이달 첫
      kst(2026, 7, 31, 23, 59), // 이달 마지막(31일 달)
      kst(2026, 8, 1, 0, 0), // 다음달 첫
    ]
    expect(countBurnsThisMonth(logs, now)).toBe(2)
  })

  it('countBurnsThisMonth — 28일 달(2026-02)에서도 경계가 맞는다', () => {
    const now = kst(2026, 2, 10)
    expect(countBurnsThisMonth([kst(2026, 2, 28, 23, 59), kst(2026, 3, 1, 0, 0)], now)).toBe(1)
  })

  it('monthlyRecallLine — 0건이면 문장을 만들지 않는다', () => {
    expect(monthlyRecallLine(0)).toBeNull()
    expect(monthlyRecallLine(-3)).toBeNull()
    expect(monthlyRecallLine(7)).toBe('이달에 7개의 액을 태우셨습니다.')
  })
})

describe('마무리 문구 — 결정론 + 법무', () => {
  it('같은 (태그, 시각)이면 항상 같은 문장', () => {
    const at = kst(2026, 7, 30, 21, 12)
    for (const t of AEKMAK_TAGS) {
      expect(settleLine(t, at)).toBe(settleLine(t, at))
    }
  })

  it('모든 태그가 자기 풀 안의 문장을 낸다', () => {
    const pool = new Set(allSettleLines())
    for (const t of AEKMAK_TAGS) {
      for (let i = 0; i < 200; i += 1) {
        expect(pool.has(settleLine(t, kst(2026, 7, 30) + i * 60_000))).toBe(true)
      }
    }
  })

  it('시각이 흐르면 변형이 실제로 갈린다(한 문장에 고정되지 않는다)', () => {
    for (const t of AEKMAK_TAGS) {
      const seen = new Set<string>()
      for (let i = 0; i < 400; i += 1) seen.add(settleLine(t, kst(2026, 7, 30) + i * 137_000))
      expect(seen.size).toBeGreaterThan(1)
    }
  })

  it('비유한 시각도 문장을 낸다(화면이 비지 않는다)', () => {
    expect(settleLine('anxiety', Number.NaN)).toBeTruthy()
  })

  // 표시광고법(L-트랙) — 의료·심리 효능 주장 금지. 문구를 늘릴 때 이 목록이 게이트다.
  const FORBIDDEN = [
    '치유',
    '치료',
    '완치',
    '정화',
    '효과',
    '효능',
    '해소',
    '힐링',
    '우울',
    '불안장애',
    '스트레스',
    '심리',
    '상담',
    '처방',
    '개선됩니다',
    '낫습니다',
    '사라집니다', // 원문 무저장 약속과 달리 "액이 사라진다"는 효능 단정
  ]

  it.each(FORBIDDEN)('문구 풀에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allSettleLines()) expect(line).not.toContain(word)
  })

  it('고지 문구는 효능 부정형이라 풀 린트 대상이 아니다', () => {
    expect(AEKMAK_DISCLAIMER).toContain('대신하지 않습니다')
  })

  it('풀은 태그당 2문장 이상 — 하루 3회에 같은 문장만 나오지 않게', () => {
    expect(allSettleLines()).toHaveLength(AEKMAK_TAGS.length * 4)
  })
})

describe('부적 문양(sigil) — 원문 비가역 변환', () => {
  it('같은 원문이면 같은 문양(리렌더에도 안 흔들린다)', () => {
    expect(sigilStrokes('내일 면접이 두렵다')).toEqual(sigilStrokes('내일 면접이 두렵다'))
  })

  it('다른 원문이면 다른 문양', () => {
    expect(sigilStrokes('내일 면접이 두렵다')).not.toEqual(sigilStrokes('빚 걱정'))
  })

  it('획은 부적지 안(0~100%)에 머문다', () => {
    const samples = ['', '厄', 'a'.repeat(AEKMAK_TEXT_MAX), '가나다라마바사아자차카타파하', '  공백  ']
    for (const s of samples) {
      const strokes = sigilStrokes(s)
      expect(strokes.length).toBeGreaterThanOrEqual(3)
      expect(strokes.length).toBeLessThanOrEqual(9)
      for (const st of strokes) {
        expect(st.y).toBeGreaterThanOrEqual(0)
        expect(st.y).toBeLessThanOrEqual(100)
        expect(st.x - st.len / 2).toBeGreaterThan(-10)
        expect(st.x + st.len / 2).toBeLessThan(110)
        expect(st.weight).toBeGreaterThan(0)
      }
    }
  })

  it('원문 글자가 좌표로 새어 나가지 않는다 — 길이가 같으면 획 수가 같다', () => {
    expect(sigilStrokes('일이삼사오').length).toBe(sigilStrokes('abcde').length)
  })

  it('hashSeed 는 32bit 부호 없는 정수', () => {
    for (const s of ['', '厄', 'hello']) {
      const h = hashSeed(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })
})

describe('연소 타임라인 ↔ CSS 계약', () => {
  const css = read('app/shrine-scene.css')
  const gate = read('scripts/check-animation-css.mjs')
  const RITUAL_CLASSES = ['.ritual-sheet', '.ritual-paper', '.ritual-sigil', '.ritual-burn', '.ritual-char']
  const RITUAL_KEYFRAMES = ['ritualSheetUp', 'ritualPaperIn', 'ritualBurn', 'ritualChar', 'ritualSettleIn']

  it('.ritual-burn / .ritual-char 의 길이가 BURN_MS.total 과 같다', () => {
    const seconds = (BURN_MS.total / 1000).toFixed(1).replace(/\.0$/, '')
    const dur = seconds.replace('.', '\\.')
    for (const cls of ['ritual-burn', 'ritual-char']) {
      const block = new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? ''
      expect(block).not.toBe('')
      expect(block).toMatch(new RegExp(`animation:[^;]*${dur}s`))
    }
  })

  it('CSS 에 연출 클래스·키프레임이 실제로 있다 (styled-jsx 회귀 방지)', () => {
    for (const cls of RITUAL_CLASSES) expect(css).toContain(`${cls} {`)
    for (const kf of RITUAL_KEYFRAMES) expect(css).toMatch(new RegExp(`@keyframes\\s+${kf}\\b`))
  })

  it('배포 게이트(check-animation-css.mjs)에 ritual-* 가 등록돼 있다', () => {
    for (const cls of RITUAL_CLASSES) expect(gate).toContain(`'${cls}'`)
    for (const kf of RITUAL_KEYFRAMES) expect(gate).toContain(`'${kf}'`)
  })

  it('연출 컴포넌트에 styled-jsx 가 없다', () => {
    expect(read('components/shrine/scene/AekmakSheet.tsx')).not.toMatch(/<style\s+jsx/)
  })
})

describe('타입 계약', () => {
  it('AekmakTag 유니온과 AEKMAK_TAGS 가 어긋나면 컴파일이 깨진다', () => {
    const all: Record<AekmakTag, true> = {
      anxiety: true,
      regret: true,
      anger: true,
      worry: true,
      resentment: true,
      misfortune: true,
    }
    expect(Object.keys(all).sort()).toEqual([...AEKMAK_TAGS].sort())
  })
})
