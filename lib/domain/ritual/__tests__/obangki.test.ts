import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  OBANGKI_COLORS,
  OBANGKI_COLOR_INFO,
  OBANGKI_DAILY_FREE,
  OBANGKI_DISCLAIMER,
  OBANGKI_DRAG_THRESHOLD,
  OBANGKI_EXTRA_COST,
  OBANGKI_MS,
  OBANGKI_OPTION_MAX,
  OBANGKI_OPTION_MIN,
  OBANGKI_OPTION_TEXT_MAX,
  OBANGKI_QTYPES,
  OBANGKI_QTYPE_HINT,
  OBANGKI_QTYPE_LABEL,
  OBANGKI_VARIANTS,
  allObangkiLines,
  assignOptions,
  countDrawsOnDay,
  dailySeed,
  drawSeed,
  isObangkiColor,
  isObangkiQType,
  isPaidDraw,
  obangkiLine,
  remainingFreeDraws,
  resolveDraw,
  shuffleFlags,
  verdictLine,
  type ObangkiColor,
  type ObangkiQType,
} from '../obangki'

/** KST 시각을 UTC epoch 으로 — 테스트 의도를 KST 로 읽히게 한다(KST = UTC+9). */
function kst(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, min)
}

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION_SQL = read('supabase/migrations/20260730_shrine_obangki_draws.sql')
const ACTIONS_SRC = read('app/actions/shrine/rituals.ts')

describe('오방색 5기', () => {
  it('원안 5색 그대로 — 빨강 대길·하양 순리·노랑 무난·파랑 신중·초록 멈춤', () => {
    expect([...OBANGKI_COLORS]).toEqual(['red', 'white', 'yellow', 'blue', 'green'])
    expect(OBANGKI_COLORS.map((c) => OBANGKI_COLOR_INFO[c].verdict)).toEqual(['대길', '순리', '무난', '신중', '멈춤'])
  })

  it('표시명·인장·색이 모든 깃발에 빠짐없이 있다', () => {
    for (const c of OBANGKI_COLORS) {
      const info = OBANGKI_COLOR_INFO[c]
      expect(info.label).toBeTruthy()
      expect(info.seal).toHaveLength(1)
      expect(info.verdict).toBeTruthy()
      expect(info.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(info.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('isObangkiColor 는 5색만 통과시킨다 (서버 입력 검증)', () => {
    for (const c of OBANGKI_COLORS) expect(isObangkiColor(c)).toBe(true)
    for (const bad of ['', 'RED', '빨강', 'black', 'purple', null, undefined, 3, {}, ['red']]) {
      expect(isObangkiColor(bad)).toBe(false)
    }
  })

  it('DB CHECK 제약(마이그레이션)과 색 문자열이 같다', () => {
    for (const c of OBANGKI_COLORS) expect(MIGRATION_SQL).toContain(`'${c}'`)
  })
})

describe('질문 유형 3종', () => {
  it('세 유형 — 무엇을 고를까 / 지금 할까 말까 / 쓸까 말까', () => {
    expect([...OBANGKI_QTYPES]).toEqual(['choice', 'timing', 'money'])
    expect(OBANGKI_QTYPES.map((q) => OBANGKI_QTYPE_LABEL[q])).toEqual(['무엇을 고를까', '지금 할까 말까', '쓸까 말까'])
  })

  it('유형마다 입력 예시가 두 갈래로 들어 있다 (화면 플레이스홀더)', () => {
    for (const q of OBANGKI_QTYPES) {
      expect(OBANGKI_QTYPE_HINT[q].split(' / ')).toHaveLength(2)
    }
  })

  it('isObangkiQType 은 3종만 통과시킨다 (서버 입력 검증)', () => {
    for (const q of OBANGKI_QTYPES) expect(isObangkiQType(q)).toBe(true)
    for (const bad of ['', 'CHOICE', '선택', 'love', null, undefined, 0, {}, ['money']]) {
      expect(isObangkiQType(bad)).toBe(false)
    }
  })

  it('DB CHECK 제약(마이그레이션)과 유형 문자열이 같다', () => {
    for (const q of OBANGKI_QTYPES) expect(MIGRATION_SQL).toContain(`'${q}'`)
  })
})

describe('스키마 — 프라이버시·RLS 를 SQL 로 강제', () => {
  /**
   * 질문 원문·선택지를 담을 자리가 **없는지** — 액막이와 같은 기획 가치다.
   * 컬럼 집합을 통째로 고정한다: 텍스트 컬럼이 새로 생기면 즉시 실패한다.
   */
  it('obangki_draws 에 질문·선택지 컬럼이 없다 (컬럼 집합 고정)', () => {
    const body = /create table if not exists public\.obangki_draws\s*\(([\s\S]*?)\n\);/i.exec(MIGRATION_SQL)?.[1]
    expect(body).toBeTruthy()
    const columns = (body ?? '')
      .split('\n')
      .map((l) => l.replace(/--.*$/, '').trim())
      .filter((l) => l.length > 0 && !/^(primary key|unique|constraint|check|foreign key)\b/i.test(l))
      .map((l) => l.split(/\s+/)[0])
    expect(columns).toEqual(['id', 'user_id', 'color', 'qtype', 'drawn_at'])
  })

  it('RLS 가 켜져 있고 정책은 본인 SELECT 하나뿐이다', () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.obangki_draws enable row level security/i)
    expect(MIGRATION_SQL).toMatch(
      /create policy obangki_draws_select_own[\s\S]*?for select using \(auth\.uid\(\) = user_id\)/i
    )
    // 쓰기 정책을 주면 클라이언트가 직접 INSERT 해 무료 3회를 무한히 늘릴 수 있다
    expect(MIGRATION_SQL).not.toMatch(/for\s+(insert|update|delete)/i)
  })

  it('기록 RPC 는 security definer + service_role 전용이다', () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.draw_shrine_obangki/i)
    expect(MIGRATION_SQL).toMatch(/security definer/i)
    expect(MIGRATION_SQL).toMatch(/set search_path to 'public'/i)
    expect(MIGRATION_SQL).toMatch(
      /revoke all on function public\.draw_shrine_obangki[\s\S]*?from public, anon, authenticated/i
    )
    expect(MIGRATION_SQL).toMatch(/grant execute on function public\.draw_shrine_obangki[\s\S]*?to service_role/i)
  })
})

describe('과금 경로 — 지갑은 server-only 모듈로만 만진다', () => {
  it('서버 액션이 지갑 RPC 를 직접 부르지 않는다', () => {
    // 주석에 이름이 나오는 것은 괜찮다 — 막는 것은 **호출**이다
    expect(ACTIONS_SRC).not.toMatch(/rpc\(\s*['"](deduct|add)_wallet_balance/)
    expect(ACTIONS_SRC).not.toMatch(/from\(\s*['"]wallets['"]/)
  })

  it('차감·환불은 lib/services/bokchae 경유다', () => {
    expect(ACTIONS_SRC).toMatch(/import \{ spendBokchae, refundBokchae \} from '@\/lib\/services\/bokchae'/)
  })

  /**
   * 과금 순서 회귀 방지 — **무료 시도가 복채 차감보다 반드시 먼저**여야 한다.
   * 이 순서라야 "무료가 남았는데 돈을 물렸다"가 구조적으로 불가능하다
   * (클라이언트가 confirmPaid 를 항상 true 로 보내도 무료 경로에서 통과해버린다).
   */
  it('무료 시도가 spendBokchae 보다 먼저 온다', () => {
    const freeAttempt = ACTIONS_SRC.indexOf('const free = await record(false)')
    const spend = ACTIONS_SRC.indexOf('await spendBokchae(OBANGKI_EXTRA_COST')
    expect(freeAttempt).toBeGreaterThan(-1)
    expect(spend).toBeGreaterThan(-1)
    expect(freeAttempt).toBeLessThan(spend)
  })

  it('차감 후 기록 실패는 환불한다', () => {
    expect(ACTIONS_SRC).toMatch(/refundBokchae\(user\.id, OBANGKI_EXTRA_COST/)
  })

  /**
   * "못 읽음"과 "거절"을 구분해야 하는 이유 — 안전한 방향이 경로마다 **반대**다.
   * 유료 기록 경로에서는 못 읽음을 거절로 보면 환불이라 안전하지만, 무료 시도 경로에서
   * 같은 처리를 하면 "무료 소진"으로 읽혀 **과금 단계로 넘어간다**. RPC 가 무료 뽑기를
   * 이미 INSERT 한 뒤 응답만 안 읽히는 경우 공짜 뽑기에 복채를 물리게 된다.
   */
  it('무료 응답을 못 읽으면 과금하지 않고 멈춘다 — parsed 를 allowed 와 따로 본다', () => {
    expect(ACTIONS_SRC).toMatch(/parsed:\s*boolean/)
    expect(ACTIONS_SRC).toMatch(/if \(!freeRow\.parsed\)/)

    const guard = ACTIONS_SRC.indexOf('if (!freeRow.parsed)')
    const spend = ACTIONS_SRC.indexOf('await spendBokchae(OBANGKI_EXTRA_COST')
    expect(guard).toBeGreaterThan(-1)
    // 가드가 차감보다 먼저 와야 의미가 있다
    expect(guard).toBeLessThan(spend)
  })
})

describe('정책 상수', () => {
  it('무료는 하루 3회, 이후 1회 1만냥(wallets 단위 1)', () => {
    expect(OBANGKI_DAILY_FREE).toBe(3)
    expect(OBANGKI_EXTRA_COST).toBe(1)
  })

  it('선택지는 2~4개, 깃발 수를 넘지 않는다', () => {
    expect(OBANGKI_OPTION_MIN).toBe(2)
    expect(OBANGKI_OPTION_MAX).toBe(4)
    expect(OBANGKI_OPTION_MAX).toBeLessThanOrEqual(OBANGKI_COLORS.length)
    expect(OBANGKI_OPTION_TEXT_MAX).toBeGreaterThan(0)
  })

  it('뽑기 임계는 ARCH §4 의 40px', () => {
    expect(OBANGKI_DRAG_THRESHOLD).toBe(40)
  })

  it('법무 고지는 PRD §2 확정 문구 그대로다', () => {
    expect(OBANGKI_DISCLAIMER).toBe('재미로 보는 전통 놀이 점괘입니다 — 중요한 결정의 근거로 삼지 마세요')
  })
})

describe('결정론 시드 — 같은 (userId, 날짜, seq) 는 같은 결과', () => {
  const U = 'e2e-user-0001'
  const D = '2026-07-30'

  it('같은 (userId, 날짜)면 뿌리가 같다', () => {
    expect(dailySeed(U, D)).toBe(dailySeed(U, D))
  })

  it('userId 나 날짜가 다르면 뿌리가 갈린다', () => {
    expect(dailySeed(U, D)).not.toBe(dailySeed('other-user', D))
    expect(dailySeed(U, D)).not.toBe(dailySeed(U, '2026-07-31'))
  })

  it('같은 (뿌리, seq)면 회차 시드가 같고, seq 가 다르면 갈린다', () => {
    const base = dailySeed(U, D)
    expect(drawSeed(base, 0)).toBe(drawSeed(base, 0))
    expect(drawSeed(base, 0)).not.toBe(drawSeed(base, 1))
    expect(drawSeed(base, 1)).not.toBe(drawSeed(base, 2))
  })

  it('비정상 seq 는 0회차로 접힌다(화면이 비지 않는다)', () => {
    const base = dailySeed(U, D)
    expect(drawSeed(base, -5)).toBe(drawSeed(base, 0))
    expect(drawSeed(base, Number.NaN)).toBe(drawSeed(base, 0))
    expect(drawSeed(base, 2.7)).toBe(drawSeed(base, 2))
  })

  it('시드는 32bit 부호 없는 정수', () => {
    for (let i = 0; i < 50; i += 1) {
      const h = drawSeed(dailySeed(`u${i}`, D), i)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })

  /** 같은 사용자·같은 날 안에서 3회를 뽑아도 세 번 다 같은 그림이면 뽑기가 아니다. */
  it('한 사람의 하루 안에서 회차마다 진열이 실제로 갈린다', () => {
    const base = dailySeed(U, D)
    const seen = new Set(Array.from({ length: 20 }, (_, i) => shuffleFlags(drawSeed(base, i)).join(',')))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('셔플 — 5기가 하나씩', () => {
  it('언제나 5색이 하나씩 들어 있다 (중복·누락 없음)', () => {
    for (let i = 0; i < 300; i += 1) {
      const flags = shuffleFlags(drawSeed(dailySeed(`u${i}`, '2026-07-30'), i % 4))
      expect(flags).toHaveLength(OBANGKI_COLORS.length)
      expect([...flags].sort()).toEqual([...OBANGKI_COLORS].sort())
    }
  })

  it('같은 시드면 같은 진열(리렌더에도 안 흔들린다)', () => {
    const s = drawSeed(dailySeed('u', '2026-07-30'), 1)
    expect(shuffleFlags(s)).toEqual(shuffleFlags(s))
  })

  it('첫 자리가 한 색으로 고정되지 않는다', () => {
    const first = new Set<ObangkiColor>()
    for (let i = 0; i < 400; i += 1) first.add(shuffleFlags(drawSeed(dailySeed(`u${i}`, '2026-07-30'), 0))[0])
    expect(first.size).toBeGreaterThan(2)
  })
})

describe('선택지 배정 — 5기에 고르게', () => {
  it('5칸을 채우고, 같은 시드면 같은 배정', () => {
    const s = drawSeed(dailySeed('u', '2026-07-30'), 0)
    expect(assignOptions(2, s)).toHaveLength(OBANGKI_COLORS.length)
    expect(assignOptions(2, s)).toEqual(assignOptions(2, s))
  })

  it('선택지 2~4개 모두 최소 1기에 배정되고, 개수 차가 1을 넘지 않는다', () => {
    for (let n = OBANGKI_OPTION_MIN; n <= OBANGKI_OPTION_MAX; n += 1) {
      for (let i = 0; i < 120; i += 1) {
        const slots = assignOptions(n, drawSeed(dailySeed(`u${i}`, '2026-07-30'), i % 3))
        const counts = Array.from({ length: n }, (_, k) => slots.filter((v) => v === k).length)
        expect(Math.min(...counts)).toBeGreaterThanOrEqual(1)
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
        expect(counts.reduce((a, b) => a + b, 0)).toBe(OBANGKI_COLORS.length)
      }
    }
  })

  it('선택지가 없으면 배정도 없다', () => {
    expect(assignOptions(0, 1234)).toEqual([])
    expect(assignOptions(-2, 1234)).toEqual([])
    expect(assignOptions(Number.NaN, 1234)).toEqual([])
  })

  it('선택지 1개면 다섯 기가 모두 그 하나', () => {
    expect(assignOptions(1, 4321)).toEqual([0, 0, 0, 0, 0])
  })

  it('선택지가 깃발 수를 넘으면 5개까지만 쓰인다(빈 깃발이 사라지지 않게)', () => {
    const slots = assignOptions(9, 777)
    expect(Math.max(...slots)).toBeLessThan(OBANGKI_COLORS.length)
  })
})

describe('resolveDraw — 진열 × 고른 자리', () => {
  const seed = drawSeed(dailySeed('u', '2026-07-30'), 0)

  it('고른 자리의 색·선택지를 그대로 돌려준다', () => {
    const flags = shuffleFlags(seed)
    const slots = assignOptions(3, seed)
    for (let i = 0; i < flags.length; i += 1) {
      const d = resolveDraw(seed, 3, i)
      expect(d.color).toBe(flags[i])
      expect(d.flagIndex).toBe(i)
      expect(d.optionIndex).toBe(slots[i])
    }
  })

  it('범위 밖 자리는 무대 안으로 접힌다', () => {
    expect(resolveDraw(seed, 2, -3).flagIndex).toBe(0)
    expect(resolveDraw(seed, 2, 99).flagIndex).toBe(OBANGKI_COLORS.length - 1)
    expect(resolveDraw(seed, 2, Number.NaN).flagIndex).toBe(0)
  })

  it('선택지를 안 적었으면 배정이 없다(색만 나온다)', () => {
    const d = resolveDraw(seed, 0, 2)
    expect(d.optionIndex).toBeNull()
    expect(isObangkiColor(d.color)).toBe(true)
  })
})

describe('문구 풀 — 결정론 + 법무', () => {
  it('색 5 × 유형 3 × 변형 8 = 120문', () => {
    expect(OBANGKI_VARIANTS).toBe(8)
    expect(allObangkiLines()).toHaveLength(OBANGKI_COLORS.length * OBANGKI_QTYPES.length * OBANGKI_VARIANTS)
  })

  it('120문이 전부 서로 다른 문장이다', () => {
    const lines = allObangkiLines()
    expect(new Set(lines).size).toBe(lines.length)
  })

  it('같은 (색, 유형, 시드)면 항상 같은 문장', () => {
    const seed = drawSeed(dailySeed('u', '2026-07-30'), 1)
    for (const c of OBANGKI_COLORS) {
      for (const q of OBANGKI_QTYPES) expect(obangkiLine(c, q, seed)).toBe(obangkiLine(c, q, seed))
    }
  })

  it('모든 (색, 유형)이 자기 풀 안의 문장을 낸다', () => {
    const pool = new Set(allObangkiLines())
    for (const c of OBANGKI_COLORS) {
      for (const q of OBANGKI_QTYPES) {
        for (let i = 0; i < 120; i += 1) expect(pool.has(obangkiLine(c, q, i * 7919))).toBe(true)
      }
    }
  })

  it('시드가 흐르면 변형이 실제로 갈린다(한 문장에 고정되지 않는다)', () => {
    for (const c of OBANGKI_COLORS) {
      for (const q of OBANGKI_QTYPES) {
        const seen = new Set<string>()
        for (let i = 0; i < 400; i += 1) seen.add(obangkiLine(c, q, drawSeed(dailySeed(`u${i}`, '2026-07-30'), i % 3)))
        expect(seen.size).toBeGreaterThan(1)
      }
    }
  })

  // 표시광고법(L-트랙) — 단정·지시 금지. 신위는 본 것을 말할 뿐 시키지 않는다.
  // PRD §2: "아껴라" ✗ → "지갑은 잠시 쉬고 싶다 하는구나" ○. 문구를 늘릴 때 이 목록이 게이트다.
  const FORBIDDEN = [
    '사라',
    '팔아라',
    '아껴라',
    '아끼세요',
    '사세요',
    '파세요',
    '지르세요',
    '결제',
    '투자',
    '주식',
    '코인',
    '대출',
    '수익',
    '손해',
    '이득',
    '대박',
    '보장',
    '반드시',
    '무조건',
    '확실',
    '틀림없',
    '절대',
    '100%',
    '틀림',
    '치유',
    '효과',
    '효능',
  ]

  it.each(FORBIDDEN)('문구 풀에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allObangkiLines()) expect(line).not.toContain(word)
  })

  it('금전 유형 문구에 명령형 어미가 없다', () => {
    for (const c of OBANGKI_COLORS) {
      for (let i = 0; i < 200; i += 1) {
        expect(obangkiLine(c, 'money', i * 104729)).not.toMatch(/(하십시오|하세요|해라|하라\.|십시오)/)
      }
    }
  })

  it('모든 문구가 서술 어미(-구나/-이다)로 끝난다 — 지시가 아니라 관찰이다', () => {
    for (const line of allObangkiLines()) expect(line).toMatch(/(구나|이다)\.$/)
  })

  it('고지 문구는 부정형이라 풀 린트 대상이 아니다', () => {
    expect(OBANGKI_DISCLAIMER).toContain('삼지 마세요')
  })
})

describe('verdictLine — 화면 자막', () => {
  it('선택지가 있으면 함께, 없으면 괘만', () => {
    expect(verdictLine('red', '짬뽕')).toBe('홍기 · 대길 — 짬뽕')
    expect(verdictLine('green', null)).toBe('녹기 · 멈춤')
    expect(verdictLine('blue', '   ')).toBe('청기 · 신중')
  })
})

describe('하루 판정 · 무료 3회', () => {
  it('countDrawsOnDay — 같은 KST 하루만 센다', () => {
    const now = kst(2026, 7, 30, 22)
    const logs = [
      kst(2026, 7, 30, 0, 1),
      kst(2026, 7, 30, 21),
      kst(2026, 7, 29, 23, 59), // 어제
      kst(2026, 7, 31, 0, 1), // 내일
    ]
    expect(countDrawsOnDay(logs, now)).toBe(2)
  })

  it('remainingFreeDraws — 0회면 3, 3회면 0, 복채로 더 뽑아도 음수가 되지 않는다', () => {
    const now = kst(2026, 7, 30, 12)
    const one = kst(2026, 7, 30, 9)
    expect(remainingFreeDraws([], now)).toBe(3)
    expect(remainingFreeDraws([one], now)).toBe(2)
    expect(remainingFreeDraws([one, one, one], now)).toBe(0)
    expect(remainingFreeDraws([one, one, one, one, one, one], now)).toBe(0)
  })

  it('remainingFreeDraws — KST 자정을 넘기면 다시 3회', () => {
    const yesterday = [kst(2026, 7, 30, 20), kst(2026, 7, 30, 21), kst(2026, 7, 30, 22)]
    expect(remainingFreeDraws(yesterday, kst(2026, 7, 30, 23))).toBe(0)
    expect(remainingFreeDraws(yesterday, kst(2026, 7, 31, 0, 0))).toBe(3)
  })

  it('isPaidDraw — 무료 3회를 다 쓴 뒤부터 복채', () => {
    expect(isPaidDraw(0)).toBe(false)
    expect(isPaidDraw(2)).toBe(false)
    expect(isPaidDraw(3)).toBe(true)
    expect(isPaidDraw(9)).toBe(true)
    expect(isPaidDraw(Number.NaN)).toBe(false)
  })
})

describe('연출 타임라인 ↔ CSS 계약', () => {
  const css = read('app/shrine-scene.css')
  const gate = read('scripts/check-animation-css.mjs')
  const OBANGKI_CLASSES = [
    '.obangki-bell',
    '.obangki-slot',
    '.obangki-cloth',
    '.obangki-shuffle',
    '.obangki-pull',
    '.obangki-dim',
    '.obangki-unfurl',
    '.obangki-burst',
    '.obangki-bubble',
  ]
  const OBANGKI_KEYFRAMES = [
    'obangkiBell',
    'obangkiSway',
    'obangkiShuffle',
    'obangkiPull',
    'obangkiDim',
    'obangkiUnfurl',
    'obangkiBurst',
    'obangkiBubbleIn',
  ]

  /** 220 → "0.22" · 700 → "0.7" · 1100 → "1.1" (CSS 표기와 같은 최소 형태) */
  const sec = (ms: number): string => String(ms / 1000)

  it.each([
    ['obangki-bell', OBANGKI_MS.bell],
    ['obangki-shuffle', OBANGKI_MS.shuffle],
    ['obangki-pull', OBANGKI_MS.pull],
    ['obangki-unfurl', OBANGKI_MS.unfurl],
  ])('.%s 의 길이가 OBANGKI_MS 와 같다', (cls, ms) => {
    const block = new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? ''
    expect(block).not.toBe('')
    expect(block).toMatch(new RegExp(`animation:[^;]*${sec(ms).replace('.', '\\.')}s`))
  })

  it('CSS 에 연출 클래스·키프레임이 실제로 있다 (styled-jsx 회귀 방지)', () => {
    for (const cls of OBANGKI_CLASSES) expect(css).toContain(`${cls} {`)
    for (const kf of OBANGKI_KEYFRAMES) expect(css).toMatch(new RegExp(`@keyframes\\s+${kf}\\b`))
  })

  it('배포 게이트(check-animation-css.mjs)에 obangki-* 가 등록돼 있다', () => {
    for (const cls of OBANGKI_CLASSES) expect(gate).toContain(`'${cls}'`)
    for (const kf of OBANGKI_KEYFRAMES) expect(gate).toContain(`'${kf}'`)
  })

  it('모션 최소화에서도 국면 전환이 멎지 않는다 (animation:none 이 아니라 0.01ms)', () => {
    const reduced =
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.obangki-bell[\s\S]*?\n\}/.exec(css)?.[0] ?? ''
    expect(reduced).toContain('animation-duration: 0.01ms')
  })

  it('연출 컴포넌트에 styled-jsx 가 없다', () => {
    expect(read('components/shrine/scene/ObangkiSheet.tsx')).not.toMatch(/<style\s+jsx/)
  })

  it('국면 전환을 setTimeout 체인으로 몰지 않는다 (animationend 가 유일한 지휘자)', () => {
    const src = read('components/shrine/scene/ObangkiSheet.tsx')
    // 주석에 이름이 나오는 것은 괜찮다 — 막는 것은 **호출**이다
    expect(src).not.toMatch(/\b(setTimeout|setInterval)\s*\(/)
    expect(src).toContain('onAnimationEnd')
  })
})

describe('타입 계약', () => {
  it('ObangkiColor 유니온과 OBANGKI_COLORS 가 어긋나면 컴파일이 깨진다', () => {
    const all: Record<ObangkiColor, true> = { red: true, white: true, yellow: true, blue: true, green: true }
    expect(Object.keys(all).sort()).toEqual([...OBANGKI_COLORS].sort())
  })

  it('ObangkiQType 유니온과 OBANGKI_QTYPES 가 어긋나면 컴파일이 깨진다', () => {
    const all: Record<ObangkiQType, true> = { choice: true, timing: true, money: true }
    expect(Object.keys(all).sort()).toEqual([...OBANGKI_QTYPES].sort())
  })
})
