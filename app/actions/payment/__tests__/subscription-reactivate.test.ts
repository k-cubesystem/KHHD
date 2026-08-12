/**
 * 구독 재활성화 계약.
 *
 * 해지는 `next_billing_date` 를 null 로 끊어 빌링 크론을 2중으로 막는다(→ cancel-request.ts).
 * 재활성화가 이 값을 되살리지 않으면 구독이 «영원히 갱신되지 않는 무료 멤버십»이 된다.
 */
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/edge-config', () => ({ isEdgeEnabled: () => false }))
jest.mock('@/lib/services/wallet-grant', () => ({ addTalismans: jest.fn(async () => ({ success: true })) }))
jest.mock('@/lib/services/membership-deity', () => ({ grantMembershipDeity: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn(async () => ({ success: true })) }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

const adminCalls: Array<{ table: string; method: string; args: unknown[] }> = []

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'insert', 'update', 'eq', 'in', 'order', 'limit']) {
        builder[method] = (...args: unknown[]) => {
          adminCalls.push({ table, method, args })
          return builder
        }
      }
      builder.maybeSingle = () => Promise.resolve({ data: null, error: null })
      builder.single = () => Promise.resolve({ data: null, error: null })
      builder.then = (resolve: (value: { data: null; error: null }) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
      return builder
    },
  }),
}))

import { reactivateSubscription } from '../subscription'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const PERIOD_END = new Date(Date.now() + 20 * 86_400_000).toISOString()

function userClient(subscription: unknown) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
    builder[method] = () => builder
  }
  builder.single = () => Promise.resolve({ data: subscription, error: subscription ? null : { message: 'none' } })
  builder.maybeSingle = () => Promise.resolve({ data: subscription, error: null })

  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: () => builder,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

beforeEach(() => {
  adminCalls.length = 0
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
})

describe('reactivateSubscription', () => {
  it('다음 결제일을 되살린다 — 없으면 갱신되지 않는 무료 구독이 된다', async () => {
    userClient({ id: 'sub-1', status: 'CANCELLED', current_period_end: PERIOD_END })

    const result = await reactivateSubscription()

    expect(result.success).toBe(true)
    const update = adminCalls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).toMatchObject({
      status: 'ACTIVE',
      cancelled_at: null,
      cancel_reason: null,
      next_billing_date: PERIOD_END,
    })
  })

  it('기간이 끝난 구독은 되살리지 않는다', async () => {
    userClient({ id: 'sub-1', status: 'CANCELLED', current_period_end: new Date(Date.now() - 1000).toISOString() })

    const result = await reactivateSubscription()

    expect(result.success).toBe(false)
    expect(adminCalls.some((call) => call.method === 'update')).toBe(false)
  })
})
