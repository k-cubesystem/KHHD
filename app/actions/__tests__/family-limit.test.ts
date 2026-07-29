import { addFamilyMember } from '../user/family'
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

function buildFormData(): FormData {
  const formData = new FormData()
  formData.append('name', '홍길동')
  formData.append('relationship', '자녀')
  formData.append('birth_date', '2010-05-01')
  formData.append('birth_time', 'unknown')
  formData.append('calendar_type', 'solar')
  formData.append('gender', 'male')
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

describe('canAddRelationship 무제한 판정', () => {
  it('UNLIMITED_TIER_LIMITS.relationship_limit 는 999 로 유지되어야 한다', () => {
    // membership.ts 의 무제한 분기가 이 상수에 의존하므로 회귀 시 즉시 깨지도록 고정.
    const { UNLIMITED_TIER_LIMITS } = jest.requireActual('@/lib/auth/privileges')
    expect(UNLIMITED_TIER_LIMITS.relationship_limit).toBe(999)
  })
})
