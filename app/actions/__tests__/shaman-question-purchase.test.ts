/**
 * 속풀이 질문권 열기(purchaseShamanQuestions) — 이용권 1장 → 질문 10문.
 *
 * 계약: ①인증 없이는 아무것도 안 한다 ②이용권을 쓴 «뒤»에만 질문을 연다 ③여는 데 실패하면
 * 쓴 이용권을 되돌린다 ④장 수·문 수는 호출부가 아니라 단일 출처(FEATURE_COST·SHAMAN_QUESTIONS_PER_PASS)다.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chargeFeature } from '@/lib/services/feature-charge'
import { NO_PASS_ERROR, SHAMAN_QUESTIONS_PER_PASS } from '@/lib/domain/entitlement/pass'

jest.mock('next/server', () => ({ after: jest.fn() }))
jest.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/services/feature-charge', () => ({ chargeFeature: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getActiveMembership: jest.fn() }))
jest.mock('@/lib/ai/memory', () => ({
  recallMemories: jest.fn(),
  recallMemoryList: jest.fn(),
  extractAndSaveMemories: jest.fn(),
}))
jest.mock('@/lib/ai/summarizer', () => ({ maybeSummarizeSession: jest.fn() }))
jest.mock('@/app/actions/shrine/scene', () => ({ getSceneData: jest.fn() }))
jest.mock('@/lib/services/deity-bond', () => ({ awardDeityBondForUser: jest.fn() }))
jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn() }))
jest.mock('@/lib/supabase/invoke-edge', () => ({ invokeEdgeSafe: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn(), info: jest.fn() },
}))

import { purchaseShamanQuestions } from '../ai/shaman-chat'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockCharge = chargeFeature as jest.MockedFunction<typeof chargeFeature>

const USER = { id: 'user-1' }
const rpc = jest.fn()
const refund = jest.fn<Promise<void>, []>()

function useUser(user: { id: string } | null) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

beforeEach(() => {
  jest.clearAllMocks()
  useUser(USER)
  refund.mockResolvedValue(undefined)
  rpc.mockResolvedValue({ data: SHAMAN_QUESTIONS_PER_PASS, error: null })
  mockAdmin.mockReturnValue({ rpc } as unknown as ReturnType<typeof createAdminClient>)
  mockCharge.mockResolvedValue({ ok: true, refundOnFailure: refund })
})

describe('purchaseShamanQuestions — 이용권 1장으로 질문을 연다', () => {
  it('로그인하지 않으면 이용권도 질문도 건드리지 않는다', async () => {
    useUser(null)

    const result = await purchaseShamanQuestions()

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' })
    expect(mockCharge).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('이용권은 costKey 로 서버가 정하고, 연 질문 수는 단일 출처 값이다', async () => {
    const result = await purchaseShamanQuestions()

    expect(mockCharge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER.id, featureKey: 'SHAMAN_QUESTIONS', costKey: 'shamanQuestions' })
    )
    expect(rpc).toHaveBeenCalledWith('add_shaman_credits', { p_user_id: USER.id, p_amount: SHAMAN_QUESTIONS_PER_PASS })
    expect(result).toEqual({ success: true, newPurchasedCredits: SHAMAN_QUESTIONS_PER_PASS })
    expect(refund).not.toHaveBeenCalled()
  })

  it('이용권이 모자라면 질문을 열지 않고 실패 응답을 그대로 넘긴다 (구매 안내로 이어진다)', async () => {
    const failure = { success: false as const, error: '이용권이 필요해요.', errorType: NO_PASS_ERROR, requiredUnits: 1 }
    mockCharge.mockResolvedValue({ ok: false, failure })

    const result = await purchaseShamanQuestions()

    expect(result).toEqual(failure)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('🔴 질문을 여는 데 실패하면 쓴 이용권을 되돌린다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const result = await purchaseShamanQuestions()

    expect(result.success).toBe(false)
    expect(refund).toHaveBeenCalledTimes(1)
  })

  it('🔴 이용권을 쓴 뒤 예외가 나도 되돌린다', async () => {
    rpc.mockRejectedValue(new Error('network'))

    const result = await purchaseShamanQuestions()

    expect(result.success).toBe(false)
    expect(refund).toHaveBeenCalledTimes(1)
  })

  it('되돌릴 것이 없으면(관리자·검수) «돌려드렸다»고 말하지 않는다', async () => {
    mockCharge.mockResolvedValue({ ok: true, refundOnFailure: null })
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    const result = await purchaseShamanQuestions()

    expect(result.success).toBe(false)
    expect(result.error).not.toMatch(/돌려드렸/)
  })

  it('관리자·검수 통과(되돌릴 것 없음)도 질문은 연다', async () => {
    mockCharge.mockResolvedValue({ ok: true, refundOnFailure: null })

    const result = await purchaseShamanQuestions()

    expect(result.success).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('🔴 역할을 직접 비교하지 않는다 — 통과 판정은 chargeFeature(hasPassBypass) 한 곳이다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source: string = require('fs').readFileSync('app/actions/ai/shaman-chat.ts', 'utf8')

    expect(source).not.toMatch(/role\s*===\s*'admin'/)
    expect(source).not.toMatch(/spendBokchae|refundBokchae|getWalletBalance/)
  })
})
