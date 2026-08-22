/**
 * refundStudioCost 성공 검증 가드 — «공개 엔드포인트» 계약.
 *
 * 못 박는 것:
 *  1. 차감(USE) 이후 같은 유형의 analysis_history 기록이 있으면(=풀이 성공) 환불하지 않는다.
 *     — 성공한 풀이 직후 직접 호출해 «결과는 받고 돈은 돌려받는» 어뷰즈 차단.
 *  2. 완료 기록이 없으면(실패·캐시 히트) 기존대로 환불된다.
 *  3. 차감 기록 자체가 없으면 환불하지 않는다(마스터·무차감 어뷰즈 — 기존 계약 유지).
 *
 * Regression: QA 2026-08-20 — 결제 커밋 리뷰 M-3.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('../membership', () => ({
  incrementDailyUsage: jest.fn(),
  getUserTierLimits: jest.fn(),
}))
jest.mock('@/lib/supabase/edge-config', () => ({ isEdgeEnabled: () => false }))
jest.mock('@/lib/supabase/invoke-edge', () => ({ invokeEdgeSafe: jest.fn() }))
jest.mock('@/lib/supabase/helpers', () => ({ getUserRole: jest.fn().mockResolvedValue('user') }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { refundStudioCost } from '../wallet'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>

interface QueryResult {
  data: unknown
  error: null
}

/** 테이블별 maybeSingle 결과 큐 — 호출 순서대로 소비한다. */
function setupMocks(queues: Record<string, QueryResult[]>) {
  const inserts: Array<Record<string, unknown>> = []
  const rpc = jest.fn().mockResolvedValue({ data: 100, error: null })
  const from = jest.fn((table: string) => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'gte', 'order', 'limit']) {
      chain[m] = jest.fn(() => chain)
    }
    chain.maybeSingle = jest.fn(() => {
      const q = queues[table]
      return Promise.resolve(q && q.length > 0 ? q.shift() : { data: null, error: null })
    })
    chain.insert = jest.fn((row: Record<string, unknown>) => {
      inserts.push({ table, ...row })
      return Promise.resolve({ data: null, error: null })
    })
    return chain
  })
  mockCreateAdmin.mockReturnValue({ rpc, from } as unknown as ReturnType<typeof createAdminClient>)
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  return { rpc, inserts }
}

const USE_TX = { id: 'tx-1', amount: -2, created_at: '2026-08-21T00:00:00.000Z' }

describe('refundStudioCost 성공 검증 가드', () => {
  beforeEach(() => jest.clearAllMocks())

  it('차감 이후 완료 기록이 있으면(성공한 풀이) 환불하지 않는다', async () => {
    const { rpc } = setupMocks({
      wallet_transactions: [{ data: USE_TX, error: null }, { data: null, error: null }],
      analysis_history: [{ data: { id: 'hist-1' }, error: null }],
    })
    const result = await refundStudioCost('FACE')
    expect(result.refunded).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('완료 기록이 없으면(실패) 기존대로 환불된다', async () => {
    const { rpc } = setupMocks({
      wallet_transactions: [{ data: USE_TX, error: null }, { data: null, error: null }],
      analysis_history: [{ data: null, error: null }],
    })
    const result = await refundStudioCost('FACE')
    expect(result.refunded).toBe(true)
    expect(result.amount).toBe(2)
    expect(rpc).toHaveBeenCalledWith('add_wallet_balance', { p_user_id: 'user-1', p_amount: 2 })
  })

  it('차감 기록이 없으면 환불하지 않는다 (기존 계약 유지)', async () => {
    const { rpc } = setupMocks({ wallet_transactions: [{ data: null, error: null }] })
    const result = await refundStudioCost('FACE')
    expect(result.refunded).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })
})
