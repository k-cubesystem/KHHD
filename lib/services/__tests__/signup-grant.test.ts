/**
 * 가입 선물 발급 계약.
 *
 *  1. 가입 맛보기는 평생 한 번 — 멱등 키 'ONBOARDING:<userId>' 로 이용권 1장·90일(pass.ts 정본 숫자).
 *  2. 친구 추천 발급 함수는 공개 서버 액션 표면에 없다 — 예전 processReferralBonus 는 'use server' 에 있어
 *     로그인한 누구나 남의 id 로 추천 선물을 부를 수 있었다.
 *  3. 초대 링크의 코드 확인은 비로그인 방문자에게도 통한다(RLS 로 0행이 되지 않게 service_role).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { grantPasses } from '@/lib/services/entitlement'
import { ONBOARDING_PASSES, ONBOARDING_VALID_DAYS } from '@/lib/domain/entitlement/pass'
import { findReferralCode, grantOnboardingPasses, grantReferralPasses } from '../signup-grant'
import * as referralActions from '@/app/actions/user/referral'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/services/entitlement', () => ({
  grantPasses: jest.fn(),
}))

const mockGrantPasses = grantPasses as jest.MockedFunction<typeof grantPasses>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

function rpcStub(result: { data: unknown; error: { message: string } | null }) {
  const rpc = jest.fn().mockResolvedValue(result)
  return { client: { rpc } as unknown as ReturnType<typeof createAdminClient>, rpc }
}

describe('grantOnboardingPasses', () => {
  it('가입 맛보기는 정본 숫자와 멱등 키로 발급한다', async () => {
    mockGrantPasses.mockResolvedValue({ granted: true, reason: 'OK', grantId: 'g-1' })

    await grantOnboardingPasses('user-1')

    expect(mockGrantPasses).toHaveBeenCalledWith({
      userId: 'user-1',
      source: 'onboarding',
      quantity: ONBOARDING_PASSES,
      validDays: ONBOARDING_VALID_DAYS,
      idempotencyKey: 'ONBOARDING:user-1',
      note: '가입 맛보기',
    })
  })
})

describe('grantReferralPasses', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('DB 가 준 장 수를 그대로 돌려준다', async () => {
    const stub = rpcStub({ data: { success: true, referrerId: 'user-9', bonus: 1 }, error: null })
    mockCreateAdminClient.mockReturnValue(stub.client)

    await expect(grantReferralPasses('user-1', 'abc123')).resolves.toEqual({
      success: true,
      passes: 1,
      error: undefined,
    })
    expect(stub.rpc).toHaveBeenCalledWith('process_referral_bonus', { p_referee_id: 'user-1', p_code: 'abc123' })
  })

  it('이미 받았거나 코드가 틀리면 실패로 돌려준다', async () => {
    mockCreateAdminClient.mockReturnValue(
      rpcStub({ data: { success: false, error: '이미 추천 혜택을 받으셨습니다.' }, error: null }).client
    )

    await expect(grantReferralPasses('user-1', 'abc123')).resolves.toEqual({
      success: false,
      passes: undefined,
      error: '이미 추천 혜택을 받으셨습니다.',
    })
  })

  it('RPC 오류는 실패로 돌려준다', async () => {
    mockCreateAdminClient.mockReturnValue(rpcStub({ data: null, error: { message: 'boom' } }).client)

    await expect(grantReferralPasses('user-1', 'abc123')).resolves.toEqual({ success: false, error: 'boom' })
  })
})

describe('findReferralCode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function lookupStub(result: { data: unknown; error: { message: string } | null }) {
    const eq = jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue(result) }))
    const from = jest.fn(() => ({ select: jest.fn(() => ({ eq })) }))
    mockCreateAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>)
    return { from, eq }
  }

  it('비로그인 방문자도 확인되도록 service_role 로 대문자 코드를 찾는다', async () => {
    const stub = lookupStub({ data: { code: 'AB12CD34' }, error: null })

    await expect(findReferralCode(' ab12cd34 ')).resolves.toBe('AB12CD34')
    expect(stub.from).toHaveBeenCalledWith('referral_codes')
    expect(stub.eq).toHaveBeenCalledWith('code', 'AB12CD34')
  })

  it('없는 코드·조회 오류는 null', async () => {
    lookupStub({ data: null, error: null })
    await expect(findReferralCode('AB12CD34')).resolves.toBeNull()

    lookupStub({ data: null, error: { message: 'boom' } })
    await expect(findReferralCode('AB12CD34')).resolves.toBeNull()
  })

  it.each([null, undefined, '', 'a b', 'ÁB12', 'X'.repeat(17)])('형식이 틀리면 조회하지 않는다 (%p)', async (raw) => {
    await expect(findReferralCode(raw)).resolves.toBeNull()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

describe('추천 공개 액션 표면', () => {
  it('발급 함수·코드 조회는 공개 서버 액션이 아니다', () => {
    const surface = referralActions as unknown as Record<string, unknown>
    expect(surface.processReferralBonus).toBeUndefined()
    expect(surface.grantReferralPasses).toBeUndefined()
    expect(surface.validateReferralCode).toBeUndefined()
  })
})
