import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  OBANGKI_COLORS,
  OBANGKI_COLOR_ELEMENT,
  OBANGKI_COLOR_INFO,
  OBANGKI_DAILY_FREE,
  OBANGKI_DISCLAIMER,
  OBANGKI_EXTRA_COST,
  OBANGKI_MATTERS,
  OBANGKI_MATTER_INFO,
  OBANGKI_MATTER_VARIANTS,
  OBANGKI_MS,
  OBANGKI_PLEA_TEXT_MAX,
  OBANGKI_SAMGI_STEP_MS,
  allMatterLines,
  allSajuLines,
  countDrawsOnDay,
  dailySeed,
  drawSeed,
  gochukLine,
  isObangkiColor,
  isObangkiMatter,
  isPaidDraw,
  matterLine,
  remainingFreeDraws,
  sajuLine,
  sajuRelation,
  shuffleFlags,
  verdictLine,
  type ObangkiColor,
  type ObangkiMatter,
} from '../obangki'

/** KST 시각을 UTC epoch 으로 — 테스트 의도를 KST 로 읽히게 한다(KST = UTC+9). */
function kst(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, min)
}

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION_SQL = read('supabase/migrations/20260730_shrine_obangki_draws.sql')
const ACTIONS_SRC = read('app/actions/shrine/rituals.ts')
const MATTER_MIGRATION_SQL = read('supabase/migrations/20260801_obangki_matter_categories.sql')

describe('오방색 5기', () => {
  it('전승 그대로 — 홍 재수·백 명복·황 조상·청 우환·녹 부정 (8차: 임의 괘 폐지)', () => {
    expect([...OBANGKI_COLORS]).toEqual(['red', 'white', 'yellow', 'blue', 'green'])
    expect(OBANGKI_COLORS.map((c) => OBANGKI_COLOR_INFO[c].verdict)).toEqual(['재수', '명복', '조상', '우환', '부정'])
  })

  it('오방신장 명호·방위·오행이 전승과 맞는다 (동청 남적 중황 서백 북흑)', () => {
    const pairs: [ObangkiColor, string, string, string][] = [
      ['blue', '동방청제신장', '동(東)', 'wood'],
      ['red', '남방적제신장', '남(南)', 'fire'],
      ['yellow', '중앙황제신장', '중앙(中央)', 'earth'],
      ['white', '서방백제신장', '서(西)', 'metal'],
      // 북방은 본디 흑기 — 현대 무구는 녹기가 그 자리에 서지만 방위·오행은 흑기의 것을 잇는다
      ['green', '북방흑제신장', '북(北)', 'water'],
    ]
    for (const [color, general, direction, element] of pairs) {
      expect(OBANGKI_COLOR_INFO[color].general).toBe(general)
      expect(OBANGKI_COLOR_INFO[color].direction).toBe(direction)
      expect(OBANGKI_COLOR_ELEMENT[color]).toBe(element)
    }
  })

  it('모시는 갈래와 길흉이 색마다 빠짐없이 있다', () => {
    for (const c of OBANGKI_COLORS) {
      const info = OBANGKI_COLOR_INFO[c]
      expect(info.deity).toBeTruthy()
      expect(info.gloss).toBeTruthy()
      expect(['gil', 'ban', 'hyung']).toContain(info.fortune)
    }
    // 전승에서 홍기가 가장 좋고 흑(녹)기가 가장 나쁘다 — 이 두 극만 고정한다(중간 배정은 스승마다 다르다)
    expect(OBANGKI_COLOR_INFO.red.fortune).toBe('gil')
    expect(OBANGKI_COLOR_INFO.green.fortune).toBe('hyung')
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

describe('문복(問卜) 갈래 7종 — 8차b: 선택지 구조 폐지', () => {
  it('전통 갈래 7종 그대로 — 신수·재수·관재·혼사·터·몸·자손', () => {
    expect([...OBANGKI_MATTERS]).toEqual(['sinsu', 'jaesu', 'gwanjae', 'honsa', 'teo', 'mom', 'jason'])
    expect(OBANGKI_MATTERS.map((m) => OBANGKI_MATTER_INFO[m].label)).toEqual([
      '신수',
      '재수',
      '관재',
      '혼사',
      '터',
      '몸',
      '자손',
    ])
  })

  it('갈래마다 한자·설명·아뢰는 말머리·입력 안내가 있다', () => {
    for (const m of OBANGKI_MATTERS) {
      const info = OBANGKI_MATTER_INFO[m]
      expect(info.hanja).toMatch(/^[一-鿿]{1,2}$/)
      expect(info.gloss).toBeTruthy()
      expect(info.plea).toContain('여쭈옵니다')
      expect(info.hint).toBeTruthy()
    }
  })

  it('isObangkiMatter 는 7종만 통과시킨다 (서버 입력 검증)', () => {
    for (const m of OBANGKI_MATTERS) expect(isObangkiMatter(m)).toBe(true)
    // 폐지된 옛 유형이 그대로 들어오면 안 된다 — DB CHECK 에는 남아 있어도 새 기록은 막는다
    for (const bad of ['choice', 'timing', 'money', '', '신수', 'SINSU', null, undefined, 0, {}, ['sinsu']]) {
      expect(isObangkiMatter(bad)).toBe(false)
    }
  })

  it('DB CHECK 제약(마이그레이션)이 7종을 받고 옛 값도 보존한다', () => {
    for (const m of OBANGKI_MATTERS) expect(MATTER_MIGRATION_SQL).toContain(`'${m}'`)
    // 이미 쌓인 로그를 무효로 만들지 않는다
    for (const legacy of ['choice', 'timing', 'money']) expect(MATTER_MIGRATION_SQL).toContain(`'${legacy}'`)
  })

  it('★ 선택지 배정 구조가 되살아나지 않는다 — 오방기는 제비가 아니다', () => {
    // 폐지한 것은 **식별자**다. 왜 폐지했는지 적어 둔 주석은 남아 있어야 하므로 낱말이 아니라
    // 코드 이름으로 검사한다(설명글까지 막으면 다음 사람이 이유를 모른 채 되살린다).
    const src = read('lib/domain/ritual/obangki.ts')
    for (const gone of ['assignOptions', 'OBANGKI_OPTION_MIN', 'OBANGKI_QTYPES', 'obangkiLine(']) {
      expect(src).not.toContain(gone)
    }
    const sheet = read('components/shrine/scene/ObangkiSheet.tsx')
    for (const gone of ['assignOptions', 'onOptions', 'OBANGKI_OPTION_TEXT_MAX', '선택지 ${i + 1}']) {
      expect(sheet).not.toContain(gone)
    }
    // 그 자리에 문복 절차가 서 있다
    expect(sheet).toContain('gochukLine')
    expect(sheet).toContain('OBANGKI_MATTERS.map')
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

  it('아뢰는 말은 한 줄 — 한 번에 한 가지만 여쭙게 하는 장치다', () => {
    expect(OBANGKI_PLEA_TEXT_MAX).toBeGreaterThan(0)
    expect(OBANGKI_PLEA_TEXT_MAX).toBeLessThanOrEqual(60)
  })

  it('삼기 간격이 한 기 연출보다 짧다 — 셋이 끊기지 않고 이어지는 조건', () => {
    expect(OBANGKI_SAMGI_STEP_MS).toBeGreaterThan(0)
    expect(OBANGKI_SAMGI_STEP_MS).toBeLessThan(OBANGKI_MS.samgi)
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

describe('신당지기 맺음말 — 갈래 7 × 변형 4', () => {
  it('갈래마다 정확히 4문이고 전부 유일하다', () => {
    expect(OBANGKI_MATTER_VARIANTS).toBe(4)
    const all = allMatterLines()
    expect(all).toHaveLength(OBANGKI_MATTERS.length * OBANGKI_MATTER_VARIANTS)
    expect(new Set(all).size).toBe(all.length)
  })

  it('같은 (갈래, 시드)면 항상 같은 문장이고 시드가 다르면 갈린다', () => {
    for (const m of OBANGKI_MATTERS) {
      expect(matterLine(m, 12345)).toBe(matterLine(m, 12345))
      const variants = new Set(Array.from({ length: 60 }, (_, i) => matterLine(m, i * 104729)))
      expect(variants.size).toBeGreaterThan(1)
    }
  })

  it('맺음말은 그 갈래 풀 안에서만 나온다', () => {
    for (const m of OBANGKI_MATTERS) {
      for (let i = 0; i < 40; i += 1) expect(allMatterLines()).toContain(matterLine(m, i * 7919))
    }
  })

  it('몸(健康) 갈래는 의원을 함께 이르는 문구를 갖고 있다 — 의료 오인 방지', () => {
    expect(allMatterLines().some((l) => l.includes('의원'))).toBe(true)
  })
})

describe('고축(告祝) — 신원을 아뢰며 연다', () => {
  it('이름·생년이 있으면 그대로 엮는다', () => {
    expect(gochukLine('김해화', 1990, 'honsa')).toBe('1990년생 김해화가 오방신장 앞에 혼사를 여쭈옵니다.')
  })

  it('생년만 없으면 이름으로, 이름도 없으면 "이 몸이"로 아뢴다 (폴백 필수)', () => {
    expect(gochukLine('김해화', null, 'sinsu')).toBe('김해화가 오방신장 앞에 신수를 여쭈옵니다.')
    expect(gochukLine(null, 1990, 'mom')).toBe('이 몸이 오방신장 앞에 몸을 여쭈옵니다.')
    expect(gochukLine('   ', null, 'teo')).toBe('이 몸이 오방신장 앞에 터를 여쭈옵니다.')
  })

  it('일곱 갈래 모두 문장이 성립한다', () => {
    for (const m of OBANGKI_MATTERS) {
      const line = gochukLine('아무개', 2000, m)
      expect(line).toContain(OBANGKI_MATTER_INFO[m].plea)
      expect(line.endsWith('.')).toBe(true)
    }
  })
})

describe('문구 규율 — 표시광고법 L-트랙', () => {
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
    for (const line of allMatterLines()) expect(line).not.toContain(word)
    for (const line of allSajuLines()) expect(line).not.toContain(word)
  })

  it('명령형 어미가 없다 — 신위는 본 것을 말할 뿐 시키지 않는다', () => {
    for (const line of [...allMatterLines(), ...allSajuLines()]) {
      expect(line).not.toMatch(/(하십시오|하세요|해라|하라\.|십시오|하시오)/)
    }
  })

  it('전 문구가 서술 종결이다', () => {
    for (const line of allMatterLines()) expect(line).toMatch(/(다|구나|네|것이다)\.$/)
  })
})

describe('verdictLine — 공유 자막', () => {
  it('기 이름과 소관만 담는다 — 아뢴 말은 절대 담지 않는다', () => {
    expect(verdictLine('red')).toBe('홍기 · 재수')
    expect(verdictLine('green')).toBe('녹기 · 부정')
    expect(verdictLine('blue')).toBe('청기 · 우환')
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
    '.obangki-dim',
    '.obangki-unfurl',
    '.obangki-samgi',
    '.obangki-purified',
    '.obangki-burst',
    '.obangki-bubble',
  ]
  const OBANGKI_KEYFRAMES = [
    'obangkiBell',
    'obangkiSway',
    'obangkiShuffle',
    'obangkiDim',
    'obangkiUnfurl',
    'obangkiSamgiRise',
    'obangkiPurify',
    'obangkiBurst',
    'obangkiBubbleIn',
  ]

  /** 220 → "0.22" · 700 → "0.7" · 1100 → "1.1" (CSS 표기와 같은 최소 형태) */
  const sec = (ms: number): string => String(ms / 1000)

  it.each([
    ['obangki-bell', OBANGKI_MS.bell],
    ['obangki-shuffle', OBANGKI_MS.shuffle],
    ['obangki-samgi', OBANGKI_MS.samgi],
    ['obangki-purified', OBANGKI_MS.purify],
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

  /**
   * ★ 게이트 목록이 **손으로 관리된다**는 것이 이 검사의 존재 이유다.
   *
   * 8차에 .obangki-samgi·.obangki-purified 를 새로 만들었는데 게이트는 그 이름을 몰라
   * "클래스 67종 실재 확인 ✓"을 그대로 출력했다 — 자기가 안 보는 것을 통과시킨 것이다
   * (feedback-gate-measures-wrong-thing 과 같은 구조의 결함).
   * 그래서 목록을 위 상수에서 읽지 않고 **CSS 원본에서 역으로 뽑아** 대조한다:
   * 새 obangki 연출을 CSS 에 넣고 게이트에 등록하지 않으면 여기서 걸린다.
   */
  it('★ CSS 안의 모든 obangki 연출이 게이트에 등록돼 있다 (목록 누락 자체를 잡는다)', () => {
    const cssClasses = [...css.matchAll(/^\.(obangki-[a-z-]+)\s*\{/gm)].map((m) => m[1])
    const cssKeyframes = [...css.matchAll(/@keyframes\s+(obangki[A-Za-z]+)/g)].map((m) => m[1])
    expect(cssClasses.length).toBeGreaterThan(0)
    expect(cssKeyframes.length).toBeGreaterThan(0)
    // 빠진 것을 **모아서** 단언한다 — 하나씩 끊으면 첫 누락만 보이고 나머지는 다음 판까지 숨는다
    const missingClasses = [...new Set(cssClasses)].filter((c) => !gate.includes(`'.${c}'`))
    const missingKeyframes = [...new Set(cssKeyframes)].filter((k) => !gate.includes(`'${k}'`))
    expect({ missingClasses, missingKeyframes }).toEqual({ missingClasses: [], missingKeyframes: [] })
  })

  it('죽은 연출이 남아 있지 않다 — 폐지된 뽑기(pull) 자취', () => {
    // 7차에 제스처를, 8차에 단일 뽑기를 없앴다. 쓰이지 않는 키프레임이 게이트 목록에 남으면
    // "확인했다"는 숫자만 늘고 실제로 지키는 것은 없다.
    expect(css).not.toContain('obangkiPull')
    expect(gate).not.toContain('obangkiPull')
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

  it('ObangkiMatter 유니온과 OBANGKI_MATTERS 가 어긋나면 컴파일이 깨진다', () => {
    const all: Record<ObangkiMatter, true> = {
      sinsu: true,
      jaesu: true,
      gwanjae: true,
      honsa: true,
      teo: true,
      mom: true,
      jason: true,
    }
    expect(Object.keys(all).sort()).toEqual([...OBANGKI_MATTERS].sort())
  })
})

describe('사주 해석 층 — 용신 오행 × 색 오행 (CEO 7차: "그 사람 사주 기반")', () => {
  const ELS = ['wood', 'fire', 'earth', 'metal', 'water'] as const
  const SAENG: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
  const GEUK: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }

  it('색 ↔ 오행 대응이 전승 그대로다 (청목·홍화·황토·백금·녹수)', () => {
    expect(OBANGKI_COLOR_ELEMENT).toEqual({
      blue: 'wood',
      red: 'fire',
      yellow: 'earth',
      white: 'metal',
      green: 'water',
    })
  })

  it('관계 판정 25쌍 전수 — 정의(상생·상극 고리)와 일치한다', () => {
    for (const color of OBANGKI_COLORS) {
      const el = OBANGKI_COLOR_ELEMENT[color]
      for (const yong of ELS) {
        const expected =
          el === yong
            ? 'bihwa'
            : SAENG[el] === yong
              ? 'saengip'
              : SAENG[yong] === el
                ? 'seolgi'
                : GEUK[yong] === el
                  ? 'jeap'
                  : 'geukip'
        expect(sajuRelation(color, yong)).toBe(expected)
      }
    }
  })

  it('문구는 관계 풀 안에서 결정론이고, 다른 시드는 다른 문장을 낼 수 있다', () => {
    const line = sajuLine('blue', 'fire', 1234)
    expect(line).toBe(sajuLine('blue', 'fire', 1234))
    expect(allSajuLines()).toContain(line)
    const variants = new Set(Array.from({ length: 40 }, (_, i) => sajuLine('blue', 'fire', i)))
    expect(variants.size).toBeGreaterThan(1)
  })

  it('전 문구가 서술 종결이고 15문(5관계 × 3변형)이 전부 유일하다', () => {
    const all = allSajuLines()
    expect(all).toHaveLength(15)
    expect(new Set(all).size).toBe(15)
    for (const line of all) expect(line).toMatch(/(다|구나|네)\.$/)
  })
})

describe('서버 색 확정 — 감사 A3 "시드 역산" 근본 해소 계약', () => {
  it('액션이 색을 입력으로 받지 않고 시드·회차로 스스로 계산한다', () => {
    expect(ACTIONS_SRC).toMatch(/drawObangki\(matter: string, confirmPaid: boolean\)/)
    // 8차: 한 점사는 삼기다. 로그에 남는 한 색은 **향방**이고 나머지 두 기는 같은 시드에서 다시 나온다
    expect(ACTIONS_SRC).toContain('drawSamgi(roundSeed).way')
    // 색이 입력이던 시절의 검증이 되살아나면 안 된다
    expect(ACTIONS_SRC).not.toMatch(/drawObangki\(color/)
  })
})
