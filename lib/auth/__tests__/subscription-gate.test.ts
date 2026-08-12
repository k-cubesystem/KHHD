/**
 * 멤버십 게이트 판정 — 해지 예약(CANCELLED) 구독의 «남은 기간» 취급.
 *
 * 약관 제6조 4항: "해지 시 현재 결제 주기의 만료일까지 서비스를 이용할 수 있습니다."
 * status='ACTIVE' 만 보면 해지 버튼을 누른 순간 혜택이 끊겨 약관 위반이 된다.
 * 반대로 즉시 해지(일할 환불)는 current_period_end 를 지금으로 닫으므로 곧바로 빠져야 한다.
 */
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/privileges', () => ({ hasUnlimitedAccess: jest.fn(() => false) }))

import { hasActiveMembership } from '../subscription'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const DAY = 86_400_000

interface SubscriptionFixture {
  status: string
  current_period_end: string | null
  end_date?: string | null
}

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

function supabaseStub(subscription: SubscriptionFixture | null) {
  const calls: CallLog[] = []

  const from = jest.fn((table: string) => {
    const result = table === 'profiles' ? { data: { role: 'user' }, error: null } : { data: subscription, error: null }

    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.maybeSingle = () => Promise.resolve(result)
    builder.single = () => Promise.resolve(result)
    return builder
  })

  mockCreateClient.mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createClient>>)
  return { calls }
}

describe('hasActiveMembership — 해지 예약 구독', () => {
  beforeEach(() => jest.clearAllMocks())

  it('ACTIVE 이고 기간이 남아 있으면 통과', async () => {
    supabaseStub({ status: 'ACTIVE', current_period_end: new Date(Date.now() + 5 * DAY).toISOString() })

    await expect(hasActiveMembership('user-1')).resolves.toBe(true)
  })

  it('해지 예약(CANCELLED)이어도 남은 기간에는 혜택이 유지된다 — 약관 제6조 4항', async () => {
    supabaseStub({ status: 'CANCELLED', current_period_end: new Date(Date.now() + 5 * DAY).toISOString() })

    await expect(hasActiveMembership('user-1')).resolves.toBe(true)
  })

  it('즉시 해지로 기간이 닫히면 곧바로 빠진다', async () => {
    supabaseStub({ status: 'CANCELLED', current_period_end: new Date(Date.now() - 1_000).toISOString() })

    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('해지됐는데 기간을 모르면 무기한 통과시키지 않는다', async () => {
    supabaseStub({ status: 'CANCELLED', current_period_end: null, end_date: null })

    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('만료된 ACTIVE 구독도 빠진다', async () => {
    supabaseStub({ status: 'ACTIVE', current_period_end: new Date(Date.now() - DAY).toISOString() })

    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('구독이 아예 없으면 비회원', async () => {
    supabaseStub(null)

    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('조회는 ACTIVE·CANCELLED 두 상태만 긁는다', async () => {
    const stub = supabaseStub({ status: 'ACTIVE', current_period_end: new Date(Date.now() + DAY).toISOString() })

    await hasActiveMembership('user-1')

    const statusFilter = stub.calls.find((call) => call.table === 'subscriptions' && call.method === 'in')
    expect(statusFilter?.args).toEqual(['status', ['ACTIVE', 'CANCELLED']])
  })
})
