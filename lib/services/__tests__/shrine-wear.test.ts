import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TIER_OPEN_DEITY_SOURCE } from '@/lib/domain/shrine/types'
import { loadWornMainDeity } from '@/lib/services/shrine-wear'

jest.mock('server-only', () => ({}))

const mockGetActiveMembership = jest.fn()
jest.mock('@/lib/auth/subscription', () => ({
  getActiveMembership: (...args: unknown[]) => mockGetActiveMembership(...args),
}))

/**
 * 신당 밖 화면(속풀이·명식 팝업·프로필·신탁)의 主神 — 좌정 기록을 그냥 읽지 않고 신당과 같은 판정을 거친다.
 * 등급이 끊겨 신당에서 풀린 主神이 다른 화면에서는 계속 앉아 있던 결함(F37)의 잠금.
 */

const DEITY = { code: 'janggun', name: '장군신', portrait_url: '/deities/janggun.webp', required_tier: 'FAMILY' }

/** from().select().eq().is().maybeSingle() 만 흉내 낸다 — 표 이름별로 돌려줄 행을 정한다. */
function fakeClient(rows: Record<string, unknown>): { client: SupabaseClient; tables: string[] } {
  const tables: string[] = []
  const client = {
    from: (table: string) => {
      tables.push(table)
      const q = {
        select: () => q,
        eq: () => q,
        is: () => q,
        maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
      }
      return q
    },
  } as unknown as SupabaseClient
  return { client, tables }
}

const seated = (source: string, deity: Record<string, unknown> = DEITY) => ({
  shrines: { main_deity_id: 'deity-1' },
  shrine_deities: deity,
  user_shrine_deities: { source },
})

describe('loadWornMainDeity — 지금 좌정해 있는 主神', () => {
  beforeEach(() => mockGetActiveMembership.mockReset())

  it('★ 등급이 닿으면 主神을 돌려준다', async () => {
    const { client } = fakeClient(seated(TIER_OPEN_DEITY_SOURCE))
    await expect(loadWornMainDeity(client, 'u1', async () => 'FAMILY')).resolves.toEqual({
      id: 'deity-1',
      code: 'janggun',
      name: '장군신',
      portraitUrl: '/deities/janggun.webp',
    })
  })

  it('★ 등급으로 모신 主神은 등급이 모자라면 null — 좌정 기록이 남아 있어도 풀린 것으로 본다', async () => {
    const { client } = fakeClient(seated(TIER_OPEN_DEITY_SOURCE))
    await expect(loadWornMainDeity(client, 'u1', async () => 'SINGLE')).resolves.toBeNull()
    await expect(loadWornMainDeity(client, 'u1', async () => null)).resolves.toBeNull()
  })

  it('★ main_deity_id 가 없으면 null — 신위 표도, 멤버십도 묻지 않는다', async () => {
    const tier = jest.fn(async () => 'BUSINESS')
    for (const rows of [{}, { shrines: { main_deity_id: null } }]) {
      const { client, tables } = fakeClient(rows)
      await expect(loadWornMainDeity(client, 'u1', tier)).resolves.toBeNull()
      expect(tables).toEqual(['shrines'])
    }
    expect(tier).not.toHaveBeenCalled()
  })

  it('증정·보상으로 받은 主神은 해지해도 남는다 — 멤버십을 묻지 않는다', async () => {
    const tier = jest.fn(async () => null)
    const { client } = fakeClient(seated('membership'))
    await expect(loadWornMainDeity(client, 'u1', tier)).resolves.toMatchObject({ code: 'janggun' })
    expect(tier).not.toHaveBeenCalled()
  })

  it('요구 등급이 없는 수호신은 소유 행도 읽지 않는다', async () => {
    const { client, tables } = fakeClient(seated(TIER_OPEN_DEITY_SOURCE, { ...DEITY, required_tier: null }))
    await expect(loadWornMainDeity(client, 'u1', async () => null)).resolves.toMatchObject({ name: '장군신' })
    expect(tables).toEqual(['shrines', 'shrine_deities'])
  })

  it('카탈로그에서 사라진 신위면 null', async () => {
    const { client } = fakeClient({ shrines: { main_deity_id: 'deity-1' } })
    await expect(loadWornMainDeity(client, 'u1', async () => 'BUSINESS')).resolves.toBeNull()
  })

  it('tier 를 안 넘기면 주인의 활성 멤버십에서 읽는다', async () => {
    const { client } = fakeClient(seated(TIER_OPEN_DEITY_SOURCE))
    mockGetActiveMembership.mockResolvedValue({ tier: 'BUSINESS' })
    await expect(loadWornMainDeity(client, 'u1')).resolves.toMatchObject({ id: 'deity-1' })
    expect(mockGetActiveMembership).toHaveBeenCalledWith('u1')

    mockGetActiveMembership.mockResolvedValue(null)
    await expect(loadWornMainDeity(client, 'u1')).resolves.toBeNull()
  })
})

describe('신당 밖 화면은 좌정 기록을 그냥 읽지 않는다', () => {
  const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
  const SCREENS = [
    'app/protected/ai-shaman/page.tsx',
    'app/actions/ai/shaman-chat.ts',
    'app/actions/user/manse-summary.ts',
    'app/protected/profile/page.tsx',
    'app/actions/shrine/oracle.ts',
  ] as const

  it.each(SCREENS)('%s — loadWornMainDeity 를 거친다', (rel) => {
    const source = read(rel)
    expect(source).toContain('loadWornMainDeity(')
    expect(`${rel}: main_deity_id ${source.includes('main_deity_id')}`).toBe(`${rel}: main_deity_id false`)
  })

  // 좌정 기록을 «다른 용도»로도 읽어서 파일에 main_deity_id 가 남는 것이 정상인 곳 — 예전의 그냥 읽기 꼴만 막는다.
  //  · guide: 온보딩 체크리스트(한 번이라도 모셨는가)   · energy-map: 가족 신당 행(폐지·행만 보존)
  const MIXED = [
    ['app/actions/guide.ts', /\.eq\('id', shrine\??\.main_deity_id\)/],
    ['app/actions/shrine/energy-map.ts', /shrineRows\s*\.map\(\(s\) => s\.main_deity_id\)/],
  ] as const

  it.each(MIXED)('%s — 본인 主神은 loadWornMainDeity 를 거친다', (rel, rawRead) => {
    const source = read(rel)
    expect(source).toContain('loadWornMainDeity(')
    expect(source).not.toMatch(rawRead)
  })
})
