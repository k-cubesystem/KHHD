/**
 * 멤버십 게이트 판정 — 해지 예약(CANCELLED) 구독의 «남은 기간» 취급.
 *
 * 약관 제6조 4항: "해지 시 현재 결제 주기의 만료일까지 서비스를 이용할 수 있습니다."
 * status='ACTIVE' 만 보면 해지 버튼을 누른 순간 혜택이 끊겨 약관 위반이 된다.
 * 반대로 즉시 해지(일할 환불)는 current_period_end 를 지금으로 닫으므로 곧바로 빠져야 한다.
 */
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/auth/privileges', () => ({ hasUnlimitedAccess: jest.fn(() => false) }))

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveMembership, hasActiveMembership, RENEWAL_GRACE_MS } from '../subscription'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const DAY = 86_400_000

interface SubscriptionFixture {
  status: string
  current_period_end: string | null
  end_date?: string | null
  current_period_start?: string | null
  next_billing_date?: string | null
  retry_count?: number | null
  plan_id?: string | null
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

describe('갱신 유예 — 기간 끝과 갱신 크론 사이의 틈', () => {
  beforeEach(() => jest.clearAllMocks())

  const justEnded = () => new Date(Date.now() - 5 * 60_000).toISOString()

  it('🔴 갱신이 예정된 구독은 기간이 막 끝났어도 끊기지 않는다 — 돈을 내는 회원이 매달 같은 시각에 막히면 안 된다', async () => {
    const ended = justEnded()
    supabaseStub({ status: 'ACTIVE', current_period_end: ended, next_billing_date: ended, retry_count: 0 })

    await expect(hasActiveMembership('user-1')).resolves.toBe(true)
  })

  it('🔴 유예는 옛 기간을 늘릴 뿐 새 주기를 미리 열지 않는다 — 결제 전에 새 달 몫이 열리면 다 쓰고 해지하는 공짜 한 달이 된다', async () => {
    const ended = justEnded()
    const started = new Date(Date.now() - 30 * DAY).toISOString()
    supabaseStub({
      status: 'ACTIVE',
      current_period_end: ended,
      current_period_start: started,
      next_billing_date: ended,
      retry_count: 0,
    })

    const membership = await getActiveMembership('user-1')

    expect(membership?.currentPeriodStart).toBe(started)
    expect(membership?.currentPeriodEnd).toBe(new Date(new Date(ended).getTime() + RENEWAL_GRACE_MS).toISOString())
    expect(membership?.renews).toBe(true)
  })

  it('🔴 갱신 결제가 한 번이라도 실패했으면 유예하지 않는다 — 안 되는 카드로 다음 달 몫을 쓰게 두지 않는다', async () => {
    const ended = justEnded()
    supabaseStub({ status: 'ACTIVE', current_period_end: ended, next_billing_date: ended, retry_count: 1 })

    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('유예는 짧다 — 시한이 지나면 끊긴다', async () => {
    const ended = new Date(Date.now() - RENEWAL_GRACE_MS - 60_000).toISOString()
    supabaseStub({ status: 'ACTIVE', current_period_end: ended, next_billing_date: ended, retry_count: 0 })

    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('해지했거나 결제 수단 없이 부여된 구독(다음 결제일 없음)은 유예 대상이 아니다', async () => {
    supabaseStub({ status: 'CANCELLED', current_period_end: justEnded(), next_billing_date: null })
    await expect(hasActiveMembership('user-1')).resolves.toBe(false)

    supabaseStub({ status: 'ACTIVE', current_period_end: justEnded(), next_billing_date: null })
    await expect(hasActiveMembership('user-1')).resolves.toBe(false)
  })

  it('유예는 크론 주기(10분)보다 길고 한 시간을 넘지 않는다', () => {
    expect(RENEWAL_GRACE_MS).toBeGreaterThan(10 * 60_000)
    expect(RENEWAL_GRACE_MS).toBeLessThanOrEqual(60 * 60_000)
  })
})

describe('getActiveMembership — 등급·갱신 여부', () => {
  beforeEach(() => jest.clearAllMocks())

  function planStub(plan: { tier: string } | null) {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq']) builder[method] = () => builder
    builder.maybeSingle = () => Promise.resolve({ data: plan, error: null })
    const from = jest.fn(() => builder)
    ;(createAdminClient as jest.MockedFunction<typeof createAdminClient>).mockReturnValue({
      from,
    } as unknown as ReturnType<typeof createAdminClient>)
    return { from }
  }

  it('🔴 플랜 등급은 서비스 권한으로 읽는다 — 판매를 내린 플랜의 구독자가 세션 RLS 에 막혀 MEMBER 로 떨어지면 안 된다', async () => {
    supabaseStub({
      status: 'ACTIVE',
      plan_id: 'plan-family',
      current_period_end: new Date(Date.now() + 5 * DAY).toISOString(),
      next_billing_date: new Date(Date.now() + 5 * DAY).toISOString(),
    })
    const admin = planStub({ tier: 'FAMILY' })

    const membership = await getActiveMembership('user-1')

    expect(membership?.tier).toBe('FAMILY')
    expect(admin.from).toHaveBeenCalledWith('membership_plans')
  })

  it('해지 예약 구독은 다시 채워지지 않는다(renews=false) — 요약 문구가 «다시 N장»을 약속하지 않게', async () => {
    supabaseStub({
      status: 'CANCELLED',
      plan_id: 'plan-single',
      current_period_end: new Date(Date.now() + 5 * DAY).toISOString(),
      next_billing_date: null,
    })
    planStub({ tier: 'SINGLE' })

    await expect(getActiveMembership('user-1')).resolves.toMatchObject({ renews: false })
  })
})
