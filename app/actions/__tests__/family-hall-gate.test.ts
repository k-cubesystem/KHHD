import { getFamilyHallData, saveFamilyHallSeats } from '../shrine/family-hall'
import { getCurrentUserMembership, type ActiveMembership } from '@/lib/auth/subscription'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getCurrentUserMembership: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

const mockMembership = getCurrentUserMembership as jest.MockedFunction<typeof getCurrentUserMembership>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const rpc = jest.fn()
const getUser = jest.fn()
/** shrines 조회 결과 — hall_seats 를 실은 행(또는 에러) */
const selectResult = jest.fn()
/** shrines UPDATE 결과 */
const updateResult = jest.fn()

/** UPDATE 로 넘어간 패치 본문 + 체인에 걸린 필터 — 「서버 클램프」·「본인 신당만」 계약 검증용 */
let updatePatch: unknown = null
let updateFilters: Array<[string, unknown]> = []

function membership(tier: string, isMaster = false): ActiveMembership {
  return { tier, planId: 'plan-1', status: 'ACTIVE', currentPeriodEnd: null, isMaster }
}

/** shrines 테이블 스텁 — select 는 maybeSingle 로, update 는 필터를 기록하고 .is() 에서 결과를 낸다 */
function shrinesTable() {
  const updateChain = {
    eq: (col: string, val: unknown) => {
      updateFilters.push([col, val])
      return updateChain
    },
    is: (col: string, val: unknown) => {
      updateFilters.push([col, val])
      return Promise.resolve(updateResult())
    },
  }
  const selectChain = {
    eq: () => selectChain,
    is: () => selectChain,
    maybeSingle: () => Promise.resolve(selectResult()),
  }
  return {
    select: () => selectChain,
    update: (patch: unknown) => {
      updatePatch = patch
      return updateChain
    },
  }
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
  getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
  selectResult.mockReturnValue({ data: { hall_seats: {} }, error: null })
  updateResult.mockReturnValue({ error: null })
  updatePatch = null
  updateFilters = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockCreateClient.mockResolvedValue({ rpc, auth: { getUser }, from: () => shrinesTable() } as any)
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('getFamilyHallData — FAMILY 멤버십 게이트', () => {
  it('비로그인은 좌석을 내리지 않고 RPC 도 부르지 않는다', async () => {
    mockMembership.mockResolvedValue(null)

    await expect(getFamilyHallData()).resolves.toEqual({
      isFamilyTier: false,
      members: [],
      allPrayedToday: false,
      seats: {},
    })
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

    await expect(getFamilyHallData()).resolves.toEqual({
      isFamilyTier: false,
      members: [],
      allPrayedToday: false,
      seats: {},
    })
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

    await expect(getFamilyHallData()).resolves.toEqual({
      isFamilyTier: true,
      members: [],
      allPrayedToday: false,
      seats: {},
    })
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

    expect(data).toEqual({ isFamilyTier: true, members: [], allPrayedToday: false, seats: {} })
    expect(logger.error).toHaveBeenCalled()
  })
})

describe('getFamilyHallData — 좌석 재배치 복원', () => {
  beforeEach(() => {
    mockMembership.mockResolvedValue(membership('FAMILY'))
  })

  it('저장된 좌석 좌표를 함께 내려준다', async () => {
    selectResult.mockReturnValue({
      data: { hall_seats: { self: { x: 40, y: 70 }, 'fm-1': { x: 60, y: 50 } } },
      error: null,
    })

    await expect(getFamilyHallData()).resolves.toMatchObject({
      seats: { self: { x: 40, y: 70 }, 'fm-1': { x: 60, y: 50 } },
    })
  })

  it('DB 에 범위를 벗어난 좌표가 남아 있어도 클램프해서 내려준다 (클라 클램프를 믿지 않는다)', async () => {
    selectResult.mockReturnValue({ data: { hall_seats: { self: { x: -500, y: 9999 } } }, error: null })

    const { seats } = await getFamilyHallData()

    expect(seats.self.x).toBeGreaterThanOrEqual(14)
    expect(seats.self.y).toBeLessThanOrEqual(86)
  })

  it('마이그레이션 미적용 DB(hall_seats 컬럼 없음)는 자동 배치로 흘려보낸다 — 사랑방이 죽지 않는다', async () => {
    selectResult.mockReturnValue({ data: { id: 'shrine-1' }, error: null })

    await expect(getFamilyHallData()).resolves.toMatchObject({ seats: {}, isFamilyTier: true })
  })

  it('신당 조회가 실패해도 좌석 presence 는 살아 있다', async () => {
    selectResult.mockReturnValue({ data: null, error: { message: 'boom' } })
    rpc.mockResolvedValue({ data: [row()], error: null })

    const data = await getFamilyHallData()

    expect(data.members).toHaveLength(1)
    expect(data.seats).toEqual({})
    expect(logger.warn).toHaveBeenCalled()
  })
})

describe('saveFamilyHallSeats — 좌석 재배치 저장', () => {
  beforeEach(() => {
    mockMembership.mockResolvedValue(membership('FAMILY'))
  })

  it('비로그인은 저장하지 못한다', async () => {
    mockMembership.mockResolvedValue(null)

    await expect(saveFamilyHallSeats({ self: { x: 50, y: 60 } })).resolves.toEqual({
      success: false,
      error: 'UNAUTHORIZED',
    })
    expect(updatePatch).toBeNull()
  })

  it('사랑방이 잠긴 등급(SINGLE)은 쓰지도 못한다 — 읽기와 같은 게이트', async () => {
    mockMembership.mockResolvedValue(membership('SINGLE'))

    await expect(saveFamilyHallSeats({ self: { x: 50, y: 60 } })).resolves.toEqual({
      success: false,
      error: 'FORBIDDEN',
    })
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('좌표를 서버에서 다시 클램프해 저장한다', async () => {
    await expect(saveFamilyHallSeats({ self: { x: 1000, y: -1000 } })).resolves.toEqual({ success: true })

    // HALL_SEAT_ZONE = x [14,86] · y [30,86]
    expect(updatePatch).toEqual({ hall_seats: { self: { x: 86, y: 30 } } })
  })

  it('형태가 어긋난 항목은 버리고 성한 좌석만 남긴다', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await saveFamilyHallSeats({ self: { x: 50, y: 60 }, bad: { x: 'nope', y: 3 } } as any)

    expect(updatePatch).toEqual({ hall_seats: { self: { x: 50, y: 60 } } })
  })

  it('null 은 초기화 — 빈 맵을 써서 자동 배치로 되돌린다', async () => {
    await expect(saveFamilyHallSeats(null)).resolves.toEqual({ success: true })

    expect(updatePatch).toEqual({ hall_seats: {} })
  })

  it('본인 신당 행만 덮어쓴다 — user_id 고정 + family_member_id IS NULL', async () => {
    await saveFamilyHallSeats({ self: { x: 50, y: 60 } })

    expect(updateFilters).toEqual([
      ['user_id', 'u-1'],
      ['family_member_id', null],
    ])
  })

  it('저장 실패는 로그를 남기고 실패로 돌려준다 (무음 실패 금지)', async () => {
    updateResult.mockReturnValue({ error: { message: 'column "hall_seats" does not exist' } })

    await expect(saveFamilyHallSeats({ self: { x: 50, y: 60 } })).resolves.toEqual({
      success: false,
      error: 'SAVE_FAILED',
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
