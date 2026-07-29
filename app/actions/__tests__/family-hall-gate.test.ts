import { getFamilyHallData } from '../shrine/family-hall'
import { getCurrentUserMembership, type ActiveMembership } from '@/lib/auth/subscription'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getCurrentUserMembership: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))

const mockMembership = getCurrentUserMembership as jest.MockedFunction<typeof getCurrentUserMembership>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const rpc = jest.fn()

function membership(tier: string, isMaster = false): ActiveMembership {
  return { tier, planId: 'plan-1', status: 'ACTIVE', currentPeriodEnd: null, isMaster }
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    member_id: 'fm-1',
    name: '어머니',
    relationship: '어머니',
    avatar_id: 'water_dokkaebi',
    prayed_today: true,
    last_wish_at: '2026-07-29T01:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  rpc.mockResolvedValue({ data: [], error: null })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockCreateClient.mockResolvedValue({ rpc } as any)
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('getFamilyHallData — FAMILY 멤버십 게이트', () => {
  it('비로그인은 좌석을 내리지 않고 RPC 도 부르지 않는다', async () => {
    mockMembership.mockResolvedValue(null)

    await expect(getFamilyHallData()).resolves.toEqual({ isFamilyTier: false, members: [], allPrayedToday: false })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('SINGLE 은 잠금 — presence 데이터 자체가 나가지 않는다 (업셀 씬용)', async () => {
    mockMembership.mockResolvedValue(membership('SINGLE'))

    const data = await getFamilyHallData()

    expect(data.isFamilyTier).toBe(false)
    expect(data.members).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it('티어 조회 실패 폴백(MEMBER)도 잠금 — 게이트는 안전 측 실패', async () => {
    mockMembership.mockResolvedValue(membership('MEMBER'))

    await expect(getFamilyHallData()).resolves.toEqual({ isFamilyTier: false, members: [], allPrayedToday: false })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('FAMILY 는 통과하고 좌석을 받는다', async () => {
    mockMembership.mockResolvedValue(membership('FAMILY'))
    rpc.mockResolvedValue({ data: [row()], error: null })

    const data = await getFamilyHallData()

    expect(rpc).toHaveBeenCalledWith('get_family_hall_presence')
    expect(data.isFamilyTier).toBe(true)
    expect(data.members).toEqual([
      {
        memberId: 'fm-1',
        name: '어머니',
        relationship: '어머니',
        avatarId: 'water_dokkaebi',
        prayedToday: true,
        lastWishAt: '2026-07-29T01:00:00Z',
      },
    ])
  })

  it('상위 등급(BUSINESS)도 사랑방이 열린다', async () => {
    mockMembership.mockResolvedValue(membership('BUSINESS'))

    await expect(getFamilyHallData()).resolves.toMatchObject({ isFamilyTier: true })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('마스터는 구독 없이도 우회 통과한다 (privileges 단일 기준 경유)', async () => {
    // subscription.ts 가 hasUnlimitedAccess 판정 결과를 tier='MASTER' 로 실어 준다
    mockMembership.mockResolvedValue({
      tier: 'MASTER',
      planId: null,
      status: 'ACTIVE',
      currentPeriodEnd: null,
      isMaster: true,
    })

    await expect(getFamilyHallData()).resolves.toMatchObject({ isFamilyTier: true })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('게이트에서 막히면 RPC 인자로도 남의 가족을 지목할 수 없다 — 호출 자체가 없다', async () => {
    mockMembership.mockResolvedValue(membership('SINGLE'))

    await getFamilyHallData()

    expect(mockCreateClient).not.toHaveBeenCalled()
  })
})

describe('getFamilyHallData — presence 매핑', () => {
  beforeEach(() => {
    mockMembership.mockResolvedValue(membership('FAMILY'))
  })

  it('전원 기도면 만개 조건이 선다', async () => {
    rpc.mockResolvedValue({
      data: [row({ member_id: null, name: '나', relationship: '본인', avatar_id: null }), row()],
      error: null,
    })

    const data = await getFamilyHallData()

    expect(data.members).toHaveLength(2)
    expect(data.members[0].memberId).toBeNull()
    expect(data.allPrayedToday).toBe(true)
  })

  it('한 자리라도 비면 만개가 아니다', async () => {
    rpc.mockResolvedValue({ data: [row(), row({ member_id: 'fm-2', prayed_today: false })], error: null })

    const data = await getFamilyHallData()

    expect(data.allPrayedToday).toBe(false)
    expect(data.members[1].prayedToday).toBe(false)
  })

  it('좌석이 하나도 없으면 만개가 아니다', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    await expect(getFamilyHallData()).resolves.toEqual({ isFamilyTier: true, members: [], allPrayedToday: false })
  })

  it('형태가 어긋난 행은 버리고 나머지는 살린다', async () => {
    rpc.mockResolvedValue({ data: [null, 'nope', { name: '' }, row()], error: null })

    const data = await getFamilyHallData()

    expect(data.members).toHaveLength(1)
    expect(data.members[0].name).toBe('어머니')
  })

  it('배열이 아닌 응답도 빈 좌석으로 흡수한다', async () => {
    rpc.mockResolvedValue({ data: { unexpected: true }, error: null })

    await expect(getFamilyHallData()).resolves.toMatchObject({ members: [] })
  })

  it('prayed_today 는 엄격히 true 일 때만 점등한다', async () => {
    rpc.mockResolvedValue({ data: [row({ prayed_today: null })], error: null })

    const data = await getFamilyHallData()

    expect(data.members[0].prayedToday).toBe(false)
  })

  it('RPC 가 실패해도 FAMILY 등급은 유지한다 — 돈 낸 회원에게 업셀 문을 보이지 않는다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } })

    const data = await getFamilyHallData()

    expect(data).toEqual({ isFamilyTier: true, members: [], allPrayedToday: false })
    expect(logger.error).toHaveBeenCalled()
  })
})
