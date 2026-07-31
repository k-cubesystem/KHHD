import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  AEKMAK_DAILY_LIMIT,
  AEKMAK_DISCLAIMER,
  AEKMAK_TAGS,
  AEKMAK_TAG_LABEL,
  AEKMAK_TAG_MARK,
  AEKMAK_TAG_WORD,
  AEKMAK_TEXT_MAX,
  BURN_CURVE,
  BURN_MASK_SCALE,
  BURN_MS,
  WRIT_BOX,
  WRIT_COL_LIMIT,
  WRIT_FONT,
  allSettleLines,
  burnProgress,
  countBurnsOnDay,
  countBurnsThisMonth,
  hashSeed,
  isAekmakTag,
  kstDayKey,
  kstMonthStartMs,
  monthlyRecallLine,
  remainingBurns,
  settleLine,
  writFallbackColumns,
  writPlan,
  type AekmakTag,
} from '../aekmak'

/** KST 시각을 UTC epoch 으로 — 테스트 의도를 KST 로 읽히게 한다(KST = UTC+9). */
function kst(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, min)
}

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION_SQL = read('supabase/migrations/20260730_shrine_aekmak_logs.sql')

// 표시광고법(L-트랙) — 의료·심리 효능 주장 금지. 마무리 문구·발원 낱말·폴백 발원문이 같은 게이트를 받는다.
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

describe('감정 태그 6종', () => {
  it('원안 6종 그대로 — 불안·미련·화·걱정·미움·액운', () => {
    expect([...AEKMAK_TAGS]).toEqual(['anxiety', 'regret', 'anger', 'worry', 'resentment', 'misfortune'])
    expect(AEKMAK_TAGS.map((t) => AEKMAK_TAG_LABEL[t])).toEqual(['불안', '미련', '화', '걱정', '미움', '액운'])
  })

  it('표시명·인장·발원이 모든 태그에 빠짐없이 있다', () => {
    for (const t of AEKMAK_TAGS) {
      expect(AEKMAK_TAG_LABEL[t]).toBeTruthy()
      expect(AEKMAK_TAG_MARK[t]).toHaveLength(1)
      expect(AEKMAK_TAG_WORD[t]).toBeTruthy()
    }
  })

  /**
   * 부적을 한글로 기획했다(CEO 지시 2026-07-30). 한자가 한 자라도 돌아오면 실패한다.
   * 인장 한 자는 발원 낱말의 첫 자여야 한다 — 둘이 갈리면 부적 위·아래가 딴 말을 한다.
   */
  it('인장·발원이 전부 한글이고, 인장은 발원의 첫 자다', () => {
    for (const t of AEKMAK_TAGS) {
      expect(AEKMAK_TAG_MARK[t]).toMatch(/^[가-힣]$/)
      expect(AEKMAK_TAG_WORD[t]).toMatch(/^[가-힣]+$/)
      expect(AEKMAK_TAG_WORD[t].startsWith(AEKMAK_TAG_MARK[t])).toBe(true)
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

  it.each(FORBIDDEN)('문구 풀에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allSettleLines()) expect(line).not.toContain(word)
  })

  // 부적 위에 찍히는 발원 낱말도 같은 게이트를 받는다 — 화면에 남는 글자라 문구 풀과 급이 같다
  it.each(FORBIDDEN)('발원 낱말에 금지 어휘 "%s" 가 없다', (word) => {
    for (const t of AEKMAK_TAGS) expect(AEKMAK_TAG_WORD[t]).not.toContain(word)
  })

  it('고지 문구는 효능 부정형이라 풀 린트 대상이 아니다', () => {
    expect(AEKMAK_DISCLAIMER).toContain('대신하지 않습니다')
  })

  it('풀은 태그당 2문장 이상 — 하루 3회에 같은 문장만 나오지 않게', () => {
    expect(allSettleLines()).toHaveLength(AEKMAK_TAGS.length * 4)
  })
})

describe('부적 본문(writ) — 원문이 읽히는 세로쓰기 한글로 앉는다 (CEO 7차)', () => {
  /** 공백 없는 한글 n자 — 분배 산술을 정확히 보려면 다듬기(공백 제거)가 안 끼어야 한다 */
  const ko = (n: number): string => '가나다라마바사아자차카타파하'.repeat(6).slice(0, n)

  it('같은 (원문, 태그)면 같은 계획 — 리렌더에 흔들리지 않는다(결정론)', () => {
    expect(writPlan('내일 면접이 두렵다', 'anxiety')).toEqual(writPlan('내일 면접이 두렵다', 'anxiety'))
  })

  it('원문이 그대로 열에 실린다 — 공백만 다듬고 글자는 하나도 잃지 않는다(읽히는 한글의 요체)', () => {
    const src = '면접이 무섭고\n잠이 오지 않는다'
    const plan = writPlan(src, 'anxiety')
    expect(plan.source).toBe('user')
    expect(plan.columns.join('').replace(/ /g, '')).toBe(src.replace(/\s/g, ''))
  })

  it('열 수 문턱 — 12자까지 1열 · 34자까지 2열 · 그 위 3열', () => {
    expect(writPlan(ko(1), null).columns).toHaveLength(1)
    expect(writPlan(ko(WRIT_COL_LIMIT.single), null).columns).toHaveLength(1)
    expect(writPlan(ko(WRIT_COL_LIMIT.single + 1), null).columns).toHaveLength(2)
    expect(writPlan(ko(WRIT_COL_LIMIT.double), null).columns).toHaveLength(2)
    expect(writPlan(ko(WRIT_COL_LIMIT.double + 1), null).columns).toHaveLength(3)
    expect(writPlan(ko(AEKMAK_TEXT_MAX), null).columns).toHaveLength(WRIT_BOX.maxCols)
  })

  it('고른 분배 — 공백 없는 원문은 열 길이 차가 1자 이하고 글자 수 합이 보존된다', () => {
    for (const n of [13, 20, 34, 35, 50, 79, 80]) {
      const lens = writPlan(ko(n), null).columns.map((c) => [...c].length)
      expect(Math.max(...lens) - Math.min(...lens)).toBeLessThanOrEqual(1)
      expect(lens.reduce((a, b) => a + b, 0)).toBe(n)
    }
  })

  /**
   * **fit 불변식** — 80자까지 어떤 길이도 본문 영역(WRIT_BOX)에 들어간다.
   * 세로: 최장 열 × 전진폭 × 글자크기 ≤ 영역 높이. 가로: 열 수 × 줄높이 × 글자크기 ≤ 부적 폭.
   * CSS 의 letter-spacing·line-height 가 advance·line 과 같다는 계약(아래 CSS 대조)과 합쳐져
   * "화면에서 실제로 안 넘친다"가 된다.
   */
  it('fit 불변식 — 1~80자 전 길이가 부적 본문 영역에 들어간다', () => {
    const boxH = WRIT_BOX.bottom - WRIT_BOX.top
    for (let n = 1; n <= AEKMAK_TEXT_MAX; n += 1) {
      const plan = writPlan(ko(n), 'worry')
      const m = Math.max(...plan.columns.map((c) => [...c].length))
      expect(m * WRIT_FONT.advance * plan.fontPx).toBeLessThanOrEqual(boxH + 1e-6)
      expect(plan.columns.length * WRIT_FONT.line * plan.fontPx).toBeLessThanOrEqual(WRIT_BOX.w)
      expect(plan.fontPx).toBeGreaterThanOrEqual(WRIT_FONT.min)
      expect(plan.fontPx).toBeLessThanOrEqual(WRIT_FONT.max)
    }
  })

  it('대표 길이의 결정 값 — 80자는 3열 [27,27,26]·6px, 34자는 2열·10px, 짧은 글은 1열·20px', () => {
    const long = writPlan(ko(AEKMAK_TEXT_MAX), null)
    expect(long.columns.map((c) => [...c].length)).toEqual([27, 27, 26])
    expect(long.fontPx).toBe(WRIT_FONT.min)
    expect(writPlan(ko(34), null).fontPx).toBe(10)
    const short = writPlan('빚 걱정', null)
    expect(short.columns).toEqual(['빚 걱정'])
    expect(short.fontPx).toBe(WRIT_FONT.max)
  })

  it('80자 초과 입력은 80자에서 자른다 (UI 상한 AEKMAK_TEXT_MAX 의 도메인 짝)', () => {
    expect(writPlan(ko(84), null)).toEqual(writPlan(ko(AEKMAK_TEXT_MAX), null))
  })

  it('빈 원문이면 태그 발원문 두 열로 선다 — 부적이 비어 보이지 않는다', () => {
    for (const t of AEKMAK_TAGS) {
      const plan = writPlan('  \n  ', t)
      expect(plan.source).toBe('fallback')
      expect(plan.columns).toEqual([...writFallbackColumns(t)])
      expect(plan.columns.join(' ')).toContain(AEKMAK_TAG_LABEL[t])
      expect(plan.columns.join(' ')).toContain(AEKMAK_TAG_WORD[t])
    }
    const noTag = writPlan('', null)
    expect(noTag.source).toBe('fallback')
    expect(noTag.columns.length).toBeGreaterThan(0)
  })

  it('발원문 조사가 받침 유무로 갈린다 — 어색한 을/를이 부적에 찍히면 놀이가 깨진다', () => {
    expect(writFallbackColumns('anger')).toEqual(['화를 여기 두고', '삭임을 빕니다'])
    expect(writFallbackColumns('anxiety')).toEqual(['불안을 여기 두고', '고요를 빕니다'])
    expect(writFallbackColumns('worry')[1]).toBe('덜기를 빕니다')
    expect(writFallbackColumns('regret')[1]).toBe('놓음을 빕니다')
  })

  it('폴백 발원문도 전부 한글·공백이고 fit 안에 있다', () => {
    for (const t of [...AEKMAK_TAGS, null]) {
      const cols = writFallbackColumns(t)
      const plan = writPlan('', t)
      for (const col of cols) expect(col).toMatch(/^[가-힣 ]+$/)
      const m = Math.max(...cols.map((c) => [...c].length))
      expect(m * WRIT_FONT.advance * plan.fontPx).toBeLessThanOrEqual(WRIT_BOX.bottom - WRIT_BOX.top)
    }
  })

  // 부적 위에 남는 글자라 마무리 문구·발원 낱말과 같은 급의 게이트를 받는다
  it.each(FORBIDDEN)('폴백 발원문에 금지 어휘 "%s" 가 없다', (word) => {
    for (const t of [...AEKMAK_TAGS, null]) {
      for (const col of writFallbackColumns(t)) expect(col).not.toContain(word)
    }
  })

  it('hashSeed 는 32bit 부호 없는 정수 (마무리 문구 결정론의 시드)', () => {
    for (const s of ['', '액', 'hello']) {
      const h = hashSeed(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })
})

describe('원문 화면 전용 계약 — 부적에 그리되 서버·GA 로는 내보내지 않는다', () => {
  const sheet = read('components/shrine/scene/AekmakSheet.tsx')

  it('서버 액션에는 태그 하나만 간다 — burnAekmak 호출에 원문이 없다', () => {
    expect(sheet).toMatch(/burnAekmak\(tag\)/)
    expect(sheet).not.toMatch(/burnAekmak\([^)]*(text|writ)/)
  })

  it('GA 라벨에 원문·본문 계획이 실리지 않는다', () => {
    expect(sheet).not.toMatch(/label:\s*(text|writ)/)
  })

  it('부적 무대 크기가 도메인 WRIT_BOX 와 같다 — 열 분배 계산의 좌표 기준', () => {
    expect(sheet).toContain(`{ w: ${WRIT_BOX.w}, h: ${WRIT_BOX.h} }`)
  })
})

describe('연소 완급 곡선 (BURN_CURVE)', () => {
  it('0 에서 시작해 100 에서 끝나고 단조 증가한다', () => {
    expect(BURN_CURVE[0]).toEqual({ t: 0, p: 0 })
    expect(BURN_CURVE[BURN_CURVE.length - 1]).toEqual({ t: 100, p: 100 })
    for (let i = 1; i < BURN_CURVE.length; i += 1) {
      expect(BURN_CURVE[i].t).toBeGreaterThan(BURN_CURVE[i - 1].t)
      expect(BURN_CURVE[i].p).toBeGreaterThan(BURN_CURVE[i - 1].p)
    }
  })

  /** "처음엔 천천히 붙고 중간에 빨라졌다가 끝에 잦아든다" — 속도의 최댓값이 중간에 있어야 성립한다 */
  it('속도가 중간(t 40~70%)에서 최대고 양끝이 그보다 느리다', () => {
    const v = BURN_CURVE.slice(1).map((s, i) => ({
      t: s.t,
      v: (s.p - BURN_CURVE[i].p) / (s.t - BURN_CURVE[i].t),
    }))
    const peak = v.reduce((a, b) => (b.v > a.v ? b : a))
    expect(peak.t).toBeGreaterThanOrEqual(40)
    expect(peak.t).toBeLessThanOrEqual(70)
    expect(v[0].v).toBeLessThan(peak.v * 0.35)
    expect(v[v.length - 1].v).toBeLessThan(peak.v * 0.55)
  })

  it('burnProgress 는 표의 마디를 그대로 지나고 0~1 로 잘린다', () => {
    for (const s of BURN_CURVE) expect(burnProgress(s.t / 100)).toBeCloseTo(s.p / 100, 6)
    expect(burnProgress(-5)).toBe(0)
    expect(burnProgress(9)).toBe(1)
    expect(burnProgress(Number.NaN)).toBe(0)
  })
})

describe('연소 타임라인 ↔ CSS 계약', () => {
  const css = read('app/shrine-scene.css')
  const gate = read('scripts/check-animation-css.mjs')
  const baker = read('scripts/shrine-assets/ritual-talisman.mjs')
  const RITUAL_CLASSES = [
    '.ritual-sheet',
    '.ritual-paper',
    '.ritual-writ',
    '.ritual-writ-col',
    '.ritual-burn',
    '.ritual-char',
    '.ritual-glow',
  ]
  const RITUAL_KEYFRAMES = [
    'ritualSheetUp',
    'ritualPaperIn',
    'ritualWritIn',
    'ritualBurn',
    'ritualCurl',
    'ritualChar',
    'ritualSettleIn',
  ]
  const block = (cls: string): string => new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? ''
  const keyframes = (name: string): string =>
    new RegExp(`@keyframes\\s+${name}\\s*\\{(?:[^{}]*\\{[^{}]*\\})*[^{}]*\\}`).exec(css)?.[0] ?? ''

  it('연소 세 층의 길이가 모두 BURN_MS.total 과 같다', () => {
    const dur = (BURN_MS.total / 1000).toFixed(1).replace(/\.0$/, '').replace('.', '\\.')
    for (const cls of ['ritual-burn', 'ritual-char', 'ritual-glow']) {
      expect(block(cls)).not.toBe('')
      expect(block(cls)).toMatch(new RegExp(`animation:[^;]*${dur}s`))
    }
  })

  /**
   * 완급의 **단일 출처** 대조. 마스크(ritualBurn)와 잉걸불·투과광(ritualChar)이 같은 스톱을
   * 쓰지 않으면 두 층이 어긋난다 — 예전 구현이 그렇게 높이의 14% 를 벌렸다.
   * 그래서 두 키프레임 모두에서 BURN_CURVE 의 (t, p) 를 한 줄씩 찾는다.
   */
  it('ritualBurn · ritualChar 의 스톱이 BURN_CURVE 와 한 줄도 다르지 않다', () => {
    const burn = keyframes('ritualBurn')
    const char = keyframes('ritualChar')
    expect(burn).not.toBe('')
    expect(char).not.toBe('')
    for (const s of BURN_CURVE) {
      const p = String(s.p).replace('.', '\\.')
      expect(burn).toMatch(new RegExp(`${s.t}%\\s*\\{[^}]*mask-position:\\s*0%\\s+${p}%`))
      expect(char).toMatch(new RegExp(`${s.t}%\\s*\\{[^}]*background-position:\\s*0%\\s+${p}%`))
    }
    // 표에 없는 스톱이 CSS 에만 몰래 끼어 있으면 대조가 무의미해진다 — 개수도 고정한다
    expect((burn.match(/\d+%\s*\{/g) ?? []).length).toBe(BURN_CURVE.length)
    expect((char.match(/\d+%\s*\{/g) ?? []).length).toBe(BURN_CURVE.length)
  })

  /**
   * 국면 전환(연소 → 마무리)은 `.ritual-burn` 의 animationend 하나가 몬다. 이 요소에는
   * 애니메이션이 둘(ritualBurn·ritualCurl) 붙으므로, 한쪽이 먼저 끝나면 부적이 다 타기도 전에
   * 마무리 카드가 뜬다. 그래서 **길이가 같다**를 계약으로 못 박는다(컴포넌트가 이름으로 거르지 않는 근거).
   */
  it('.ritual-burn 에 붙은 두 애니메이션의 길이가 같다', () => {
    // cubic-bezier 의 숫자에는 s 가 없으므로 `Ns` 만 골라내면 곧 지속시간 목록이다(지연은 쓰지 않는다)
    const shorthand = /animation:\s*([^;]+);/.exec(block('ritual-burn'))?.[1] ?? ''
    const durations = [...shorthand.matchAll(/(\d+(?:\.\d+)?)s\b/g)].map((m) => m[1])
    expect(durations).toHaveLength(2)
    expect(durations[0]).toBe(String(BURN_MS.total / 1000))
    expect(durations[1]).toBe(durations[0])
  })

  it('연출 컴포넌트가 animationend 를 이름으로 거르지 않는다 (오타 한 글자에 화면이 멎는다)', () => {
    expect(read('components/shrine/scene/AekmakSheet.tsx')).not.toMatch(/animationName\s*===/)
  })

  /**
   * 세로쓰기 계약 — writPlan 의 fit 계산이 화면에서 성립하려면 CSS 가 같은 수를 써야 한다:
   * 글자 전진폭 = 1em + letter-spacing = WRIT_FONT.advance, 열 전진폭 = line-height = WRIT_FONT.line.
   * writing-mode·upright 가 빠지면 가로쓰기가 되어 "세로 부적"이 통째로 무너진다.
   */
  it('.ritual-writ-col 이 세로쓰기고 자간·줄높이가 WRIT_FONT 와 같다', () => {
    const col = block('ritual-writ-col')
    expect(col).toContain('writing-mode: vertical-rl')
    expect(col).toContain('text-orientation: upright')
    expect(col).toContain(`letter-spacing: ${(WRIT_FONT.advance - 1).toFixed(2)}em`)
    expect(col).toContain(`line-height: ${WRIT_FONT.line}`)
  })

  it('본문은 끝에 또렷하다 — ritualWritIn 이 blur 0 으로 끝난다(읽히는 것이 지시의 전부다)', () => {
    const writIn = keyframes('ritualWritIn')
    expect(writIn).not.toBe('')
    expect(/to\s*\{[^}]*filter:\s*blur\(0px\)/.test(writIn)).toBe(true)
  })

  it('완급은 timing-function 이 아니라 표가 진다 — 연소 세 층이 linear 다', () => {
    for (const cls of ['ritual-burn', 'ritual-char', 'ritual-glow']) {
      expect(block(cls)).toMatch(/animation:[^;]*\blinear\b/)
    }
  })

  /** 마스크·잉걸불·투과광이 같은 배율이라야 정합이 구조적으로 보장된다(눈대중 금지) */
  it('세 층의 size 가 모두 BURN_MASK_SCALE 이다', () => {
    const pct = `${Math.round(BURN_MASK_SCALE * 1000) / 10}%`
    expect(block('ritual-burn')).toContain(`mask-size: 100% ${pct}`)
    expect(block('ritual-char')).toContain(`background-size: 100% ${pct}`)
    expect(block('ritual-glow')).toContain(`background-size: 100% ${pct}`)
  })

  /** 텍스처를 굽는 쪽과 화면이 같은 배율을 봐야 잡음 결이 세로로 늘어나지 않는다 */
  it('에셋 스크립트의 MASK_SCALE 이 BURN_MASK_SCALE 과 같다', () => {
    expect(baker).toMatch(new RegExp(`const MASK_SCALE = ${BURN_MASK_SCALE}\\b`))
  })

  it('연소 텍스처 세 장을 CSS 가 실제로 참조한다', () => {
    for (const f of ['burn-mask', 'burn-front', 'burn-glow']) {
      expect(css).toContain(`/shrine/ritual/${f}.webp`)
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

  /** 모션 최소화에서 `none` 이면 animationend 가 안 와 화면이 연소 상태로 멎는다 */
  it('모션 최소화는 연소를 끄지 않고 0.01ms 로 줄인다', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{\s*\.ritual-sheet[\s\S]*?\n\}/.exec(css)?.[0] ?? ''
    expect(reduced).toContain('.ritual-burn')
    expect(reduced).toContain('.ritual-glow')
    expect(reduced).toContain('animation-duration: 0.01ms')
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
