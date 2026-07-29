import { addFamilyMember, updateFamilyMember } from '../user/family'
import { canAddRelationship } from '../payment/membership'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('../payment/membership', () => ({
  canAddRelationship: jest.fn(),
}))

jest.mock('../payment/bok-points', () => ({
  addBokPoints: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCanAddRelationship = canAddRelationship as jest.MockedFunction<typeof canAddRelationship>

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData()
  const fields: Record<string, string> = {
    name: '홍길동',
    relationship: '자녀',
    birth_date: '2010-05-01',
    birth_time: 'unknown',
    calendar_type: 'solar',
    gender: 'male',
    ...overrides,
  }
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return formData
}

describe('addFamilyMember 인연 등록 한도', () => {
  const insert = jest.fn()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any

  beforeEach(() => {
    insert.mockResolvedValue({ error: null })
    mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: jest.fn(() => ({ insert })),
    }
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('한도를 초과하면 insert 없이 거부한다', async () => {
    mockCanAddRelationship.mockResolvedValue({
      allowed: false,
      current: 3,
      limit: 3,
      message: '인연 등록 한도에 도달했습니다. (3/3)',
    })

    await expect(addFamilyMember(buildFormData())).rejects.toThrow('인연 등록 한도에 도달했습니다. (3/3)')
    expect(insert).not.toHaveBeenCalled()
  })

  it('한도 이내면 정상 등록한다', async () => {
    mockCanAddRelationship.mockResolvedValue({ allowed: true, current: 1, limit: 3 })

    await addFamilyMember(buildFormData())

    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ user_id: 'user-1', name: '홍길동' })])
  })

  it('마스터(무제한 한도)는 보유 수와 무관하게 등록된다', async () => {
    mockCanAddRelationship.mockResolvedValue({ allowed: true, current: 120, limit: 999 })

    await addFamilyMember(buildFormData())

    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('한도 검증은 insert 이전에 수행된다 — 인증 조회보다 먼저 차단', async () => {
    mockCanAddRelationship.mockResolvedValue({
      allowed: false,
      current: 10,
      limit: 10,
      message: '인연 등록 한도에 도달했습니다. (10/10)',
    })

    await expect(addFamilyMember(buildFormData())).rejects.toThrow()
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})

describe('가족 음력 윤달(is_leap_month) 저장', () => {
  const insert = jest.fn()
  const update = jest.fn()
  const updateEqId = jest.fn()
  const updateEqUser = jest.fn()

  beforeEach(() => {
    mockCanAddRelationship.mockResolvedValue({ allowed: true, current: 0, limit: 3 })
    insert.mockResolvedValue({ error: null })
    updateEqUser.mockResolvedValue({ error: null })
    updateEqId.mockReturnValue({ eq: updateEqUser })
    update.mockReturnValue({ eq: updateEqId })
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: jest.fn(() => ({ insert, update })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('음력 + 윤달 체크는 is_leap_month: true 로 등록된다', async () => {
    await addFamilyMember(buildFormData({ calendar_type: 'lunar', is_leap_month: 'true' }))

    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ calendar_type: 'lunar', is_leap_month: true })])
  })

  it('음력이라도 윤달 미체크면 false 로 등록된다', async () => {
    await addFamilyMember(buildFormData({ calendar_type: 'lunar', is_leap_month: 'false' }))

    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ calendar_type: 'lunar', is_leap_month: false })])
  })

  it('양력이면 윤달 값이 실려 와도 false 로 정규화된다 — 본인(profiles) 경로와 동일 규약', async () => {
    await addFamilyMember(buildFormData({ calendar_type: 'solar', is_leap_month: 'true' }))

    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ calendar_type: 'solar', is_leap_month: false })])
  })

  it('수정 경로도 윤달을 저장한다', async () => {
    await updateFamilyMember(buildFormData({ id: 'member-1', calendar_type: 'lunar', is_leap_month: 'true' }))

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ calendar_type: 'lunar', is_leap_month: true }))
    expect(updateEqId).toHaveBeenCalledWith('id', 'member-1')
    expect(updateEqUser).toHaveBeenCalledWith('user_id', 'user-1')
  })
})

describe('canAddRelationship 무제한 판정', () => {
  it('UNLIMITED_TIER_LIMITS.relationship_limit 는 999 로 유지되어야 한다', () => {
    // membership.ts 의 무제한 분기가 이 상수에 의존하므로 회귀 시 즉시 깨지도록 고정.
    const { UNLIMITED_TIER_LIMITS } = jest.requireActual('@/lib/auth/privileges')
    expect(UNLIMITED_TIER_LIMITS.relationship_limit).toBe(999)
  })
})
