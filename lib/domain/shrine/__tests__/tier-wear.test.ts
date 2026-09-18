import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TIER_OPEN_DEITY_SOURCE, deityOwnershipHolds } from '@/lib/domain/shrine/types'
import { hungPackHolds, seatedDeityHolds, type WearCheck } from '@/lib/services/shrine-wear'

jest.mock('server-only', () => ({}))

/**
 * 소유의 두 층(PRD-voucher-system) — 증정·보상·예전 봉헌은 해지해도 남고, 등급으로 연 신위·테마는
 * «구독 중 이용»이라 등급이 끊기면 착용이 풀린다. 소유 기록은 지우지 않으므로 재구독하면 돌아온다.
 */

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const SCENE = read('app/actions/shrine/scene.ts')
const DEITIES = read('app/actions/shrine/deities.ts')
const JOURNEY = read('app/actions/analysis/journey-reward.ts')
const WEAR = read('lib/services/shrine-wear.ts')
const GIFT = read('lib/services/membership-deity.ts')

/** from().select().eq().eq().maybeSingle() 한 줄만 흉내 낸다 — 표 이름별로 돌려줄 행을 정한다. */
function fakeClient(rows: Record<string, unknown>): { client: SupabaseClient; tables: string[] } {
  const tables: string[] = []
  const chain = (table: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
    }
    return q
  }
  const client = {
    from: (table: string) => {
      tables.push(table)
      return chain(table)
    },
  } as unknown as SupabaseClient
  return { client, tables }
}

function wearOf(
  rows: Record<string, unknown>,
  tier: string | null
): WearCheck & { calls: () => number; tables: string[] } {
  const { client, tables } = fakeClient(rows)
  let calls = 0
  return {
    client,
    tables,
    tier: async () => {
      calls += 1
      return tier
    },
    calls: () => calls,
  }
}

describe('deityOwnershipHolds — 등급으로 모신 행만 등급을 본다', () => {
  it('★ 등급으로 모신 신위는 등급이 닿을 때만 보유다', () => {
    expect(deityOwnershipHolds(TIER_OPEN_DEITY_SOURCE, 'SINGLE', null)).toBe(false)
    expect(deityOwnershipHolds(TIER_OPEN_DEITY_SOURCE, 'SINGLE', 'SINGLE')).toBe(true)
    expect(deityOwnershipHolds(TIER_OPEN_DEITY_SOURCE, 'FAMILY', 'SINGLE')).toBe(false)
    expect(deityOwnershipHolds(TIER_OPEN_DEITY_SOURCE, 'FAMILY', 'BUSINESS')).toBe(true)
    expect(deityOwnershipHolds(TIER_OPEN_DEITY_SOURCE, 'BUSINESS', 'MASTER')).toBe(true)
  })

  it('★ 증정·보상·예전 봉헌·수호신은 해지해도 남는다', () => {
    for (const source of ['membership', 'journey_reward', 'purchase', 'free_guardian', null, undefined]) {
      expect([source, deityOwnershipHolds(source, 'BUSINESS', null)]).toEqual([source, true])
    }
  })
})

describe('seatedDeityHolds / hungPackHolds — 착용 판정', () => {
  it('★ 요구 등급이 없는 신위·테마는 조회도, 멤버십 확인도 하지 않는다', async () => {
    const w = wearOf({}, null)
    await expect(seatedDeityHolds(w, 'u', 'd', null)).resolves.toBe(true)
    await expect(hungPackHolds(w, 'u', 'p', null)).resolves.toBe(true)
    expect(w.tables).toEqual([])
    expect(w.calls()).toBe(0)
  })

  it('★ 등급으로 모신 主神은 등급이 끊기면 풀린다 — 다시 닿으면 돌아온다', async () => {
    const rows = { user_shrine_deities: { source: TIER_OPEN_DEITY_SOURCE } }
    await expect(seatedDeityHolds(wearOf(rows, null), 'u', 'd', 'SINGLE')).resolves.toBe(false)
    await expect(seatedDeityHolds(wearOf(rows, 'FAMILY'), 'u', 'd', 'SINGLE')).resolves.toBe(true)
  })

  it('★ 증정·보상으로 받은 主神은 멤버십을 묻지 않는다', async () => {
    const w = wearOf({ user_shrine_deities: { source: 'membership' } }, null)
    await expect(seatedDeityHolds(w, 'u', 'd', 'BUSINESS')).resolves.toBe(true)
    expect(w.calls()).toBe(0)
  })

  it('★ 등급 테마는 등급이 닿거나 소유 행(보상·예전 봉헌)이 있을 때만 걸린다', async () => {
    await expect(hungPackHolds(wearOf({}, 'FAMILY'), 'u', 'p', 'FAMILY')).resolves.toBe(true)
    await expect(hungPackHolds(wearOf({}, 'SINGLE'), 'u', 'p', 'FAMILY')).resolves.toBe(false)
    await expect(hungPackHolds(wearOf({ user_theme_packs: { pack_id: 'p' } }, null), 'u', 'p', 'FAMILY')).resolves.toBe(
      true
    )
  })

  it('★ 판정 모듈은 서버 전용이다 — 방문자 뷰에서 admin 으로 주인의 행을 읽는다', () => {
    expect(WEAR.startsWith("import 'server-only'")).toBe(true)
  })
})

describe('착용 판정이 화면 경로에 실려 있다', () => {
  it('★ 주인 씬 — 걸린 테마는 쓸 수 있을 때만, 主神은 seatedDeityHolds 를 거친다', () => {
    expect(SCENE).toContain('themes.find((t) => t.id === shrine.active_pack_id && (t.owned || t.unlocked))')
    expect(SCENE).toContain('seatedDeityHolds(wear, ownerId, mainDeityId, data.required_tier)')
  })

  it('★ 방문자 씬도 같은 판정 — 주인의 등급·소유 행을 admin 으로 본다', () => {
    const pub = SCENE.slice(SCENE.indexOf('export async function getPublicSceneData'))
    expect(pub).toContain("getActiveMembership(userId, 'admin')")
    expect(pub).toContain('hungPackHolds(wear, userId, hung.id, hung.required_tier)')
    expect(pub).toContain('loadMainDeity(supabase, userId, shrine.main_deity_id, false, null, wear)')
  })

  it('★ 신위전 — 풀린 主神은 좌정으로 보이지 않고, 수호신 좌정이 새로 모신다', () => {
    expect(DEITIES).toContain('const seatedDeityId = seatedRow && !holds(seatedRow) ? null')
    const auto = DEITIES.slice(DEITIES.indexOf('export async function autoSeatGuardian'))
    expect(auto.slice(0, auto.indexOf('assignGuardian('))).toContain('seatedDeityHolds(')
  })

  it('★ 등급으로 모실 때만 tier_open 행을 쓴다 — 문자열의 정본은 도메인 한 곳', () => {
    expect(DEITIES).toContain('grantDeity(user.id, deity.id, TIER_OPEN_DEITY_SOURCE)')
    for (const src of [SCENE, DEITIES, JOURNEY, WEAR]) expect(src).not.toContain("'tier_open'")
  })

  it('★ 여정 완주 선물 — 등급으로 모신 신위도 고를 수 있고, 고르면 영구 보유로 올린다', () => {
    expect(JOURNEY).toContain('.filter((o) => o.source !== TIER_OPEN_DEITY_SOURCE)')
    expect(JOURNEY).toContain("update({ source: 'journey_reward' })")
  })

  it('★ 멤버십 증정 — 등급으로 모셔 둔 그 신위면 증정(영구 보유)으로 올린다', () => {
    expect(GIFT).toContain('owned.source === TIER_OPEN_DEITY_SOURCE')
    expect(GIFT).toContain("update({ source: 'membership' })")
    expect(GIFT).not.toContain("'tier_open'")
  })
})
