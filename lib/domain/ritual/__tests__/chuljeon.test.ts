import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  CHULJEON_COINS,
  CHULJEON_COIN_STEP_MS,
  CHULJEON_DAILY_LIMIT,
  CHULJEON_DISCLAIMER,
  CHULJEON_MAX_ROUNDS,
  CHULJEON_MS,
  CHULJEON_ORIGIN_LINE,
  CHULJEON_TALLY_LABEL,
  CHULJEON_WAY_MAX,
  CHULJEON_WAY_MIN,
  CHULJEON_WAY_TEXT_MAX,
  allChuljeonLines,
  castChuljeon,
  countGil,
  countThrowsOnDay,
  dailySeed,
  pickLine,
  remainingThrows,
  tallyText,
  throwCoins,
  throwSeed,
} from '../chuljeon'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION_SQL = read('supabase/migrations/20260801_shrine_chuljeon_throws.sql')
const ACTIONS_SRC = read('app/actions/shrine/rituals.ts')
const CSS = read('app/shrine-scene.css')
const GATE = read('scripts/check-animation-css.mjs')

/** KST 시각을 UTC epoch 으로 — 테스트 의도를 KST 로 읽히게 한다(KST = UTC+9). */
function kst(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m - 1, d, h - 9, min)
}

const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => (i * 2654435761) >>> 0)

describe('전거 — 태종의 셈 (태종실록 4년 10월 6일)', () => {
  it('길마다 엽전 셋을 던진다 — 실록의 "2길1흉"이 이 눈금이다', () => {
    expect(CHULJEON_COINS).toBe(3)
    expect(tallyText(2)).toBe('2길 1흉')
    expect(tallyText(0)).toBe('0길 3흉')
    expect(tallyText(3)).toBe('3길 0흉')
  })

  it('괘 이름이 0~3 길 모두 있다', () => {
    for (const g of [0, 1, 2, 3]) expect(CHULJEON_TALLY_LABEL[g]).toBeTruthy()
  })

  it('전거 문구가 한양·2길1흉을 그대로 밝힌다 — 어디서 온 셈인지 화면이 말한다', () => {
    expect(CHULJEON_ORIGIN_LINE).toContain('한양')
    expect(CHULJEON_ORIGIN_LINE).toContain('2길1흉')
    expect(CHULJEON_ORIGIN_LINE).toContain('태종')
  })
})

describe('정책 — 오방기와 다른 도구다', () => {
  it('갈림길은 2~4개, 하루 10회, 복채 없음', () => {
    expect(CHULJEON_WAY_MIN).toBe(2)
    expect(CHULJEON_WAY_MAX).toBe(4)
    expect(CHULJEON_DAILY_LIMIT).toBe(10)
    expect(CHULJEON_WAY_TEXT_MAX).toBeGreaterThan(0)
  })

  it('★ 척전 도메인이 오방기를 알지 못한다 — 두 의식이 섞이면 둘 다 흐려진다', () => {
    const src = read('lib/domain/ritual/chuljeon.ts')
    expect(src).not.toContain('obangki')
    expect(src).not.toContain('Obangki')
  })

  it('★ 과금 경로가 아예 없다 — 갈림길에 값을 붙이면 도구가 아니라 판매다', () => {
    // 막는 것은 **식별자**다. "복채를 물리지 않는다"고 적어 둔 주석은 남아 있어야 한다
    // (설명글까지 막으면 다음 사람이 이유를 모른 채 과금을 붙인다).
    const src = read('lib/domain/ritual/chuljeon.ts')
    for (const paid of ['spendBokchae', 'refundBokchae', 'EXTRA_COST', 'isPaid']) expect(src).not.toContain(paid)
    // 액션 쪽도 척전 구간에서는 지갑을 만지지 않는다
    const section = ACTIONS_SRC.slice(ACTIONS_SRC.indexOf('R-4 척전'))
    expect(section).not.toContain('spendBokchae')
    expect(section).not.toContain('refundBokchae')
  })

  it('법무 고지는 다른 의식과 같은 문구다', () => {
    expect(CHULJEON_DISCLAIMER).toBe('재미로 보는 전통 놀이 점괘입니다 — 중요한 결정의 근거로 삼지 마세요')
  })
})

describe('엽전 세 닢 — 결정론과 독립', () => {
  it('같은 (시드, 길)이면 같은 면, 언제나 세 닢', () => {
    for (const s of seeds(120)) {
      for (let w = 0; w < CHULJEON_WAY_MAX; w += 1) {
        const a = throwCoins(s, w)
        expect(a).toHaveLength(CHULJEON_COINS)
        expect(a).toEqual(throwCoins(s, w))
        for (const f of a) expect(['gil', 'hyung']).toContain(f)
      }
    }
  })

  it('닢마다 소금이 달라 서로를 유추할 수 없다 — 네 조합이 모두 나온다', () => {
    const seen = new Set<string>()
    for (const s of seeds(400)) seen.add(throwCoins(s, 0).join(''))
    // 3닢 → 8가지. 전부 나와야 "닢이 독립"이라 말할 수 있다
    expect(seen.size).toBe(8)
  })

  it('★ 글자면이 한쪽으로 쏠리지 않는다 — 치우친 엽전은 정해 주는 도구가 아니다', () => {
    let gil = 0
    let total = 0
    for (const s of seeds(3000)) {
      for (const f of throwCoins(s, 0)) {
        total += 1
        if (f === 'gil') gil += 1
      }
    }
    const rate = gil / total
    expect(rate).toBeGreaterThan(0.45)
    expect(rate).toBeLessThan(0.55)
  })

  it('countGil 은 글자면 수를 그대로 센다', () => {
    expect(countGil(['gil', 'gil', 'hyung'])).toBe(2)
    expect(countGil(['hyung', 'hyung', 'hyung'])).toBe(0)
    expect(countGil([])).toBe(0)
  })
})

describe('castChuljeon — 길(吉)이 많은 쪽으로 정한다', () => {
  it('같은 시드·갈래 수면 판이 통째로 같다', () => {
    for (const s of seeds(100)) {
      for (const w of [2, 3, 4]) expect(castChuljeon(s, w)).toEqual(castChuljeon(s, w))
    }
  })

  it('정해진 길은 마지막 판에서 길이 가장 많은 길이고, 그 길이 유일하다', () => {
    for (const s of seeds(800)) {
      for (const w of [2, 3, 4]) {
        const r = castChuljeon(s, w)
        if (r.picked === null) continue
        const last = r.rounds[r.rounds.length - 1]
        const best = Math.max(...last.throws.map((t) => t.gil))
        expect(last.throws.filter((t) => t.gil === best)).toHaveLength(1)
        expect(last.throws.find((t) => t.gil === best)?.index).toBe(r.picked)
        expect(r.gil).toBe(best)
      }
    }
  })

  it('첫 판에 갈리면 라운드는 하나뿐이고 retied 가 false 다', () => {
    const oneRound = seeds(600).filter((s) => castChuljeon(s, 3).rounds.length === 1)
    expect(oneRound.length).toBeGreaterThan(0)
    for (const s of oneRound) expect(castChuljeon(s, 3).retied).toBe(false)
  })

  it('동수면 **동수였던 길만** 다시 던진다 — 이미 진 길이 되살아나지 않는다', () => {
    const retied = seeds(1200).filter((s) => castChuljeon(s, 4).rounds.length > 1)
    expect(retied.length).toBeGreaterThan(0)
    for (const s of retied) {
      const r = castChuljeon(s, 4)
      for (let i = 1; i < r.rounds.length; i += 1) {
        const prev = r.rounds[i - 1]
        const best = Math.max(...prev.throws.map((t) => t.gil))
        const tied = prev.throws.filter((t) => t.gil === best).map((t) => t.index)
        expect(r.rounds[i].throws.map((t) => t.index)).toEqual(tied)
        expect(tied.length).toBeGreaterThan(1)
      }
      expect(r.retied).toBe(true)
    }
  })

  it('라운드는 최대 3회이고, 끝내 갈리지 않으면 정하지 않는다 (억지로 고르지 않는다)', () => {
    for (const s of seeds(2000)) {
      const r = castChuljeon(s, 4)
      expect(r.rounds.length).toBeLessThanOrEqual(CHULJEON_MAX_ROUNDS)
      if (r.picked === null) {
        expect(r.rounds).toHaveLength(CHULJEON_MAX_ROUNDS)
        expect(r.gil).toBeNull()
        expect(r.retied).toBe(true)
      }
    }
  })

  it('라운드마다 소금이 달라 같은 판이 되풀이되지 않는다', () => {
    const retied = seeds(1500).filter((s) => castChuljeon(s, 2).rounds.length > 1)
    expect(retied.length).toBeGreaterThan(0)
    let differed = 0
    for (const s of retied) {
      const r = castChuljeon(s, 2)
      const a = r.rounds[0].throws.map((t) => t.faces.join('')).join('|')
      const b = r.rounds[1].throws.map((t) => t.faces.join('')).join('|')
      if (a !== b) differed += 1
    }
    // 우연히 같을 수는 있어도 대부분은 달라야 한다
    expect(differed / retied.length).toBeGreaterThan(0.5)
  })

  it('★ 자리에 유리·불리가 없다 — 몇 번째 길인지가 결과를 바꾸면 안 된다', () => {
    const wins = [0, 0, 0]
    let decided = 0
    for (const s of seeds(6000)) {
      const r = castChuljeon(s, 3)
      if (r.picked === null) continue
      decided += 1
      wins[r.picked] += 1
    }
    expect(decided).toBeGreaterThan(3000)
    for (const w of wins) {
      const share = w / decided
      expect(share).toBeGreaterThan(0.28)
      expect(share).toBeLessThan(0.39)
    }
  })

  it('갈래 수는 2~4로 클램프된다 (경계 밖 입력이 판을 깨지 않는다)', () => {
    for (const bad of [-3, 0, 1, 7, Number.NaN]) {
      const r = castChuljeon(12345, bad)
      const n = r.rounds[0].throws.length
      expect(n).toBeGreaterThanOrEqual(CHULJEON_WAY_MIN)
      expect(n).toBeLessThanOrEqual(CHULJEON_WAY_MAX)
    }
  })
})

describe('문구 — 결정론 + 법무', () => {
  const FORBIDDEN = [
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
    '치유',
    '효과',
    '효능',
  ]

  it('같은 (길 수, 시드)면 항상 같은 문장이고, 시드가 다르면 갈린다', () => {
    for (const g of [0, 1, 2, 3]) {
      expect(pickLine(g, 4242)).toBe(pickLine(g, 4242))
      const variants = new Set(Array.from({ length: 60 }, (_, i) => pickLine(g, i * 104729)))
      expect(variants.size).toBeGreaterThan(1)
      for (let i = 0; i < 40; i += 1) expect(allChuljeonLines()).toContain(pickLine(g, i * 7919))
    }
  })

  it('길 수가 범위를 벗어나도 문장이 나온다 (클램프)', () => {
    expect(pickLine(-1, 1)).toBeTruthy()
    expect(pickLine(9, 1)).toBeTruthy()
  })

  it.each(FORBIDDEN)('문구 풀에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allChuljeonLines()) expect(line).not.toContain(word)
  })

  it('명령형 어미가 없다 — 셈이 말할 뿐 시키지 않는다', () => {
    for (const line of allChuljeonLines()) {
      expect(line).not.toMatch(/(하십시오|하세요|해라|하라\.|십시오|하시오)/)
    }
  })

  it('문구가 전부 유일하다', () => {
    const all = allChuljeonLines()
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('시드 · 하루 판정', () => {
  it('같은 (userId, 날짜)면 뿌리가 같고 다르면 갈린다', () => {
    expect(dailySeed('u1', '2026-08-01')).toBe(dailySeed('u1', '2026-08-01'))
    expect(dailySeed('u1', '2026-08-01')).not.toBe(dailySeed('u2', '2026-08-01'))
    expect(dailySeed('u1', '2026-08-01')).not.toBe(dailySeed('u1', '2026-08-02'))
  })

  it('회차가 다르면 판이 갈린다 — 같은 날 두 번 던져 같은 답이 나오지 않는다', () => {
    const base = dailySeed('u1', '2026-08-01')
    const a = castChuljeon(throwSeed(base, 0), 3)
    const b = castChuljeon(throwSeed(base, 1), 3)
    expect(throwSeed(base, 0)).not.toBe(throwSeed(base, 1))
    expect(a.rounds[0].throws.map((t) => t.faces.join(''))).not.toEqual(b.rounds[0].throws.map((t) => t.faces.join('')))
  })

  it('KST 하루 경계로 센다', () => {
    const stamps = [kst(2026, 8, 1, 23, 59), kst(2026, 8, 2, 0, 1)]
    expect(countThrowsOnDay(stamps, kst(2026, 8, 1, 12))).toBe(1)
    expect(countThrowsOnDay(stamps, kst(2026, 8, 2, 12))).toBe(1)
  })

  it('남은 횟수는 0~상한으로 클램프된다', () => {
    const many = Array.from({ length: 30 }, () => kst(2026, 8, 1, 10))
    expect(remainingThrows(many, kst(2026, 8, 1, 12))).toBe(0)
    expect(remainingThrows([], kst(2026, 8, 1, 12))).toBe(CHULJEON_DAILY_LIMIT)
  })
})

describe('스키마 — 프라이버시·RLS 를 SQL 로 강제', () => {
  it('갈림길 원문을 담을 컬럼이 없다 (컬럼 집합 고정)', () => {
    const body = /create table if not exists public\.shrine_chuljeon_throws\s*\(([\s\S]*?)\n\);/i.exec(
      MIGRATION_SQL
    )?.[1]
    expect(body).toBeTruthy()
    const columns = (body ?? '')
      .split('\n')
      .map((l) => l.replace(/--.*$/, '').trim())
      .filter((l) => l.length > 0 && !/^(primary key|unique|constraint|check|foreign key)\b/i.test(l))
      .map((l) => l.split(/\s+/)[0])
    expect(columns).toEqual(['id', 'user_id', 'ways', 'picked', 'thrown_at'])
  })

  it('RLS 가 켜져 있고 정책은 본인 SELECT 하나뿐이다', () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.shrine_chuljeon_throws enable row level security/i)
    expect(MIGRATION_SQL).toMatch(/for select using \(auth\.uid\(\) = user_id\)/i)
    // 쓰기 정책을 주면 클라이언트가 직접 INSERT 해 일 상한을 우회한다
    expect(MIGRATION_SQL).not.toMatch(/for\s+(insert|update|delete)/i)
  })

  it('기록 RPC 는 security definer + service_role 전용이고 어드바이저리 잠금을 쥔다', () => {
    expect(MIGRATION_SQL).toMatch(/create or replace function public\.throw_shrine_chuljeon/i)
    expect(MIGRATION_SQL).toMatch(/security definer/i)
    expect(MIGRATION_SQL).toMatch(/set search_path to 'public'/i)
    // 감사 A3 P0-2(오방기 50병렬 상한 우회)와 같은 구멍을 처음부터 닫는다
    expect(MIGRATION_SQL).toMatch(/pg_advisory_xact_lock/i)
    expect(MIGRATION_SQL).toMatch(
      /revoke all on function public\.throw_shrine_chuljeon[\s\S]*?from public, anon, authenticated/i
    )
    expect(MIGRATION_SQL).toMatch(/grant execute on function public\.throw_shrine_chuljeon[\s\S]*?to service_role/i)
  })

  it('갈래 수·고른 자리에 CHECK 이 걸려 있다', () => {
    expect(MIGRATION_SQL).toMatch(/ways\s+smallint not null check \(ways between 2 and 4\)/i)
    expect(MIGRATION_SQL).toMatch(/picked\s+smallint not null check/i)
  })
})

describe('서버 액션 계약', () => {
  it('갈래 **수**만 받는다 — 갈림길 원문이 인자로 들어올 자리가 없다', () => {
    expect(ACTIONS_SRC).toMatch(/castChuljeonThrow\(ways: number\)/)
  })

  it('결과를 서버가 스스로 계산한다 — 마음에 드는 답이 나올 때까지 되던질 수 없어야 한다', () => {
    expect(ACTIONS_SRC).toContain('castChuljeon(chuljeonThrowSeed(chuljeonDailySeed(user.id, today), seq), n)')
  })

  it('의식 공통 게이트(멤버십·rate limit)를 통과한다', () => {
    const section = ACTIONS_SRC.slice(ACTIONS_SRC.indexOf('R-4 척전'))
    expect(section).toContain("ritualGate(user.id, 'chuljeon')")
  })
})

describe('연출 CSS 계약 — 무증상 사망 방지', () => {
  it('클래스·키프레임이 실재하고 길이가 CHULJEON_MS 와 같다', () => {
    for (const cls of ['.chuljeon-coin', '.chuljeon-seal']) expect(CSS).toContain(`${cls} {`)
    for (const kf of ['chuljeonCoin', 'chuljeonSeal']) expect(CSS).toMatch(new RegExp(`@keyframes\\s+${kf}\\b`))
    for (const [cls, ms] of [
      ['chuljeon-coin', CHULJEON_MS.coin],
      ['chuljeon-seal', CHULJEON_MS.seal],
    ] as const) {
      const block = new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`).exec(CSS)?.[0] ?? ''
      expect(block).not.toBe('')
      expect(block).toMatch(new RegExp(`animation:[^;]*${String(ms / 1000).replace('.', '\\.')}s`))
    }
  })

  it('배포 게이트에 등록돼 있다 (목록 누락 자체가 무증상 사망이다)', () => {
    for (const name of ["'.chuljeon-coin'", "'.chuljeon-seal'", "'chuljeonCoin'", "'chuljeonSeal'"]) {
      expect(GATE).toContain(name)
    }
  })

  it('동작 줄이기(reduced-motion)가 새 연출도 덮는다', () => {
    const block = /@media \(prefers-reduced-motion: reduce\)([\s\S]*)$/.exec(CSS)?.[1] ?? ''
    expect(block).toContain('.chuljeon-coin')
    expect(block).toContain('.chuljeon-seal')
  })

  it('화면이 순서를 지연으로 몰고 타이머로 몰지 않는다', () => {
    const src = read('components/shrine/scene/ChuljeonSheet.tsx')
    expect(src).not.toMatch(/\b(setTimeout|setInterval)\s*\(/)
    expect(src).not.toMatch(/<style\s+jsx/)
    expect(src).toContain('chuljeonCoin')
    expect(src).toContain("'--cj-delay'")
  })

  it('닢 간격이 한 닢 연출보다 짧다 — 셋이 이어져 떨어지는 조건', () => {
    expect(CHULJEON_COIN_STEP_MS).toBeGreaterThan(0)
    expect(CHULJEON_COIN_STEP_MS).toBeLessThan(CHULJEON_MS.coin)
  })
})

describe('신당 진입점 — 버튼이 실제로 걸려 있다', () => {
  it('의식 독에 척전 행이 있고 전용 페이지로 나간다', () => {
    const dock = read('components/shrine/scene/RitualDock.tsx')
    expect(dock).toContain('/protected/shrine/chuljeon')
    expect(dock).toContain('엽전 세 닢')
  })

  it('룸·페이지가 현황을 실어 내려보낸다 (클라 fetch 워터폴 없이)', () => {
    expect(read('app/protected/shrine/page.tsx')).toContain('getChuljeonStatus()')
    expect(read('components/shrine/scene/ShrineRoomClient.tsx')).toContain('chuljeon={chuljeon}')
  })
})

describe('다시 던지기 — 결과를 보고 그 자리에서 (CEO 8차c)', () => {
  const SHEET = read('components/shrine/scene/ChuljeonSheet.tsx')

  it('결과 카드에 같은 갈림길로 다시 던지는 주 버튼이 있다', () => {
    expect(SHEET).toContain('같은 갈림길로 다시 던지기')
    expect(SHEET).toContain('onThrowAgain')
    // 갈림길을 새로 적는 길도 남는다(주 버튼 자리는 내준다)
    expect(SHEET).toContain('다른 갈림길')
  })

  it('★ 판마다 쟁반을 새로 세운다 — key 가 없으면 연출이 안 돌아 결과가 영영 안 뜬다', () => {
    // CSS 애니메이션은 마운트 때만 돈다. 같은 DOM 을 재사용하면 animationend 가 오지 않고
    // settled 가 false 로 굳어 결과 카드가 다시는 뜨지 않는다 — 콘솔도 조용한 교착이다.
    expect(SHEET).toContain('<Tray key={throwNo}')
    expect(SHEET).toContain('setThrowNo((n) => n + 1)')
  })

  it('회차는 서버가 정한다 — 화면이 미리 올리지 않는다', () => {
    expect(SHEET).toContain("if (typeof res.seq === 'number') setSeq(res.seq)")
    expect(SHEET).not.toMatch(/setSeq\(\s*seq\s*\+\s*1\s*\)/)
  })

  it('오늘 몫을 다 쓰면 다시 던지기가 잠긴다', () => {
    expect(SHEET).toContain('disabled={remaining <= 0}')
  })
})

describe('신당 팻말 — 창방에 널이 걸렸다 (CEO 8차c)', () => {
  it('척전 팻말이 전용 페이지를 가리킨다', () => {
    const plaque = read('lib/domain/shrine/plaque.ts')
    expect(plaque).toContain("key: 'chuljeon'")
    expect(plaque).toContain('/protected/shrine/chuljeon')
    expect(plaque).toContain("ko: '엽전'")
  })
})
