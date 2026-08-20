/**
 * deductTalisman 금액 가드 — «공개 엔드포인트» 계약.
 *
 * 못 박는 것:
 *  1. 음수 금액은 어떤 DB 경로에도 닿지 못한다 — RPC 가 예외를 던지면 그 예외가
 *     «RPC 미설정» 폴백으로 해석되어, 가드 없는 UPDATE 가 잔액을 **증액**하는 벡터였다.
 *  2. 0·비정수 금액도 동일하게 서두에서 거부된다(0원 차감 = 전 기능 무료).
 *  3. 정상 양수 금액은 가드를 통과해 RPC 차감 경로에 도달한다.
 *
 * Regression: QA 2026-08-20 — 결제 커밋 리뷰 C-1.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserTierLimits } from '../membership'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('../membership', () => ({
  incrementDailyUsage: jest.fn().mockResolvedValue(undefined),
  getUserTierLimits: jest.fn(),
}))
jest.mock('@/lib/supabase/edge-config', () => ({ isEdgeEnabled: () => false }))
jest.mock('@/lib/supabase/invoke-edge', () => ({ invokeEdgeSafe: jest.fn() }))
jest.mock('@/lib/supabase/helpers', () => ({ getUserRole: jest.fn().mockResolvedValue('user') }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { deductTalisman } from '../wallet'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGetTierLimits = getUserTierLimits as jest.MockedFunction<typeof getUserTierLimits>

function tableChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  for (const m of ['select', 'insert', 'update', 'eq', 'gte', 'order', 'limit']) {
    chain[m] = jest.fn(() => chain)
  }
  chain.single = jest.fn().mockResolvedValue(result)
  chain.maybeSingle = jest.fn().mockResolvedValue(result)
  // insert(...).then(...) 형태(await 직접) 지원
  ;(chain as unknown as { then: (r: (v: unknown) => unknown) => unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result)
  return chain
}

function setupMocks(rpcResult: { data: unknown; error: unknown }) {
  const rpc = jest.fn().mockResolvedValue(rpcResult)
  const adminFrom = jest.fn(() => tableChain({ data: { talismans_used: 0, balance: 100 }, error: null }))
  mockCreateAdmin.mockReturnValue({ rpc, from: adminFrom } as unknown as ReturnType<typeof createAdminClient>)

  const userFrom = jest.fn(() => tableChain({ data: { balance: 100 }, error: null }))
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: userFrom,
  } as unknown as Awaited<ReturnType<typeof createClient>>)

  mockGetTierLimits.mockResolvedValue({
    tier: 'SINGLE',
    daily_talisman_limit: 10,
  } as unknown as Awaited<ReturnType<typeof getUserTierLimits>>)

  return { rpc, adminFrom }
}

describe('deductTalisman 금액 가드', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([[-1_000_000], [-1], [0], [1.5], [Number.NaN]])('잘못된 금액 %p 은 DB에 닿기 전에 거부된다', async (bad) => {
    const { rpc, adminFrom } = setupMocks({ data: 5, error: null })
    const result = await deductTalisman('SAJU', bad as number)
    expect(result.success).toBe(false)
    expect(result.error).toBe('잘못된 차감 금액입니다.')
    expect(rpc).not.toHaveBeenCalled()
    expect(adminFrom).not.toHaveBeenCalled()
  })

  it('정상 양수 금액은 가드를 통과해 RPC 차감에 도달한다', async () => {
    const { rpc } = setupMocks({ data: 98, error: null })
    const result = await deductTalisman('SAJU', 2)
    expect(rpc).toHaveBeenCalledWith('deduct_wallet_balance', { p_user_id: 'user-1', p_amount: 2 })
    expect(result.success).toBe(true)
    expect(result.remainingBalance).toBe(98)
  })

  it('RPC 예외 폴백 경로도 양수 금액에서만 돈다 — 음수는 폴백 자체가 실행되지 않는다', async () => {
    const { rpc, adminFrom } = setupMocks({ data: null, error: { message: 'function does not exist' } })
    const result = await deductTalisman('SAJU', -50)
    expect(result.success).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
    expect(adminFrom).not.toHaveBeenCalled()
  })
})
