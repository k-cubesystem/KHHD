/**
 * @jest-environment node
 */
/**
 * 멤버십 갱신 크론 계약.
 *
 * 못 박는 것:
 *  1. 갱신은 기간 연장뿐이다 — 이용권·재화를 지급하지 않는다(재화 지급이 토스 빌링 거절 사유였다).
 *  2. 주문번호는 «구독 · 새 주기 시작일 · 재시도 차수»로 결정된다 — 크론이 겹쳐 돌아도 같은 주기를 두 번 청구하지 못한다.
 *  3. 겹쳐 돈 실행이 먼저 청구했으면(토스 중복 주문 거절) 다시 청구하지 않고, 승인됐으면 기록만 맞춘다.
 *  4. 기간 연장은 읽은 기간 끝이 그대로일 때만 — 두 번 늘어나지 않는다.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

jest.mock('server-only', () => ({}))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>

type GetHandler = (typeof import('../route'))['GET']
let GET: GetHandler

beforeAll(async () => {
  process.env.CRON_SECRET = 'cron-secret'
  ;({ GET } = await import('../route'))
})

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

const PERIOD_END = '2026-09-18T03:00:00.000Z'

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    user_id: 'user-1',
    billing_key: 'bk_1',
    customer_key: 'HHD_user1',
    current_period_end: PERIOD_END,
    retry_count: 0,
    plan: { name: '싱글 멤버십', price: 12_800, interval: 'MONTH', monthly_passes: 5 },
    ...overrides,
  }
}

function adminStub(options: { subscriptions?: unknown[]; recordedSuccess?: unknown } = {}) {
  const calls: CallLog[] = []
  const rpc = jest.fn()
  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'update', 'eq', 'lte', 'limit']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.maybeSingle = () => Promise.resolve({ data: options.recordedSuccess ?? null, error: null })
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({
        data: table === 'subscriptions' ? (options.subscriptions ?? [subscriptionRow()]) : null,
        error: null,
      }).then(resolve)
    return builder
  })
  mockCreateAdmin.mockReturnValue({ from, rpc } as unknown as ReturnType<typeof createAdminClient>)
  return { from, rpc, calls }
}

function cronRequest() {
  return new Request('https://k-haehwadang.com/api/cron/billing', {
    headers: { authorization: 'Bearer cron-secret' },
  }) as unknown as NextRequest
}

function jsonResponse(ok: boolean, body: Record<string, unknown>) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as unknown as Response)
}

const fetchSpy = jest.fn()

/** 빌링 승인 요청들의 주문번호. */
function chargedOrderIds(): string[] {
  return fetchSpy.mock.calls
    .filter((call) => String(call[0]).includes('/v1/billing/'))
    .map((call) => (JSON.parse(String((call[1] as RequestInit).body)) as { orderId: string }).orderId)
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = fetchSpy as unknown as typeof fetch
  fetchSpy.mockImplementation(() => jsonResponse(true, { paymentKey: 'pk_renew', status: 'DONE' }))
})

describe('갱신 크론 — 지급 없음', () => {
  it('갱신 성공은 기간만 늘린다 — 이용권·재화를 지급하지 않는다', async () => {
    const admin = adminStub()

    await GET(cronRequest())

    expect(admin.rpc).not.toHaveBeenCalled()
    expect(
      admin.calls.some((call) => ['wallets', 'wallet_transactions', 'entitlement_grants'].includes(call.table))
    ).toBe(false)
    const insert = admin.calls.find((call) => call.table === 'subscription_payments' && call.method === 'insert')
    expect(insert?.args[0]).not.toHaveProperty('talismans_granted')
  })

  it('기간 연장은 읽은 기간 끝이 그대로일 때만 한다 — 겹쳐 돈 실행이 두 번 늘리지 못한다', async () => {
    const admin = adminStub()

    await GET(cronRequest())

    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).toMatchObject({
      current_period_start: PERIOD_END,
      current_period_end: '2026-10-18T03:00:00.000Z',
      retry_count: 0,
    })
    const guards = admin.calls.filter((call) => call.table === 'subscriptions' && call.method === 'eq')
    expect(guards.map((call) => call.args)).toEqual(expect.arrayContaining([['current_period_end', PERIOD_END]]))
  })
})

describe('갱신 크론 — 이중 청구 방지', () => {
  it('주문번호는 구독 · 새 주기 시작일 · 재시도 차수로 정해진다', async () => {
    adminStub()

    await GET(cronRequest())

    expect(chargedOrderIds()).toEqual(['SUB_11111111-2222-3333-4444-555555555555_20260918_0'])
  })

  it('🔴 같은 주기를 두 번 돌려도 주문번호가 같다 — 토스가 두 번째 승인을 거절할 수 있게', async () => {
    adminStub()
    await GET(cronRequest())
    adminStub()
    await GET(cronRequest())

    const [first, second] = chargedOrderIds()
    expect(first).toBe(second)
    expect(first.length).toBeLessThanOrEqual(64)
    expect(first).toMatch(/^SUB_[A-Za-z0-9_-]+$/)
  })

  it('재시도는 차수가 바뀐다 — 실패한 주문번호를 다시 써서 영영 막히지 않는다', async () => {
    adminStub({ subscriptions: [subscriptionRow({ retry_count: 1 })] })

    await GET(cronRequest())

    expect(chargedOrderIds()).toEqual(['SUB_11111111-2222-3333-4444-555555555555_20260918_1'])
  })

  it('다른 실행이 이미 승인받은 주문이면 다시 청구하지 않고 기록만 맞춘다', async () => {
    fetchSpy.mockImplementation((url: string) =>
      String(url).includes('/v1/payments/orders/')
        ? jsonResponse(true, { paymentKey: 'pk_first', status: 'DONE' })
        : jsonResponse(false, { code: 'DUPLICATED_ORDER_ID', message: '중복된 주문번호' })
    )
    const admin = adminStub()

    const response = await GET(cronRequest())
    const body = (await response.json()) as { stats: { success: number; failed: number } }

    expect(chargedOrderIds()).toHaveLength(1)
    expect(body.stats).toMatchObject({ success: 1, failed: 0 })
    const insert = admin.calls.find((call) => call.table === 'subscription_payments' && call.method === 'insert')
    expect(insert?.args[0]).toMatchObject({ status: 'SUCCESS', payment_key: 'pk_first' })
  })

  it('중복 주문인데 승인 여부를 모르면 건너뛴다 — 실패로 적지 않고, 다음 확인만 한 시간 뒤로 민다', async () => {
    fetchSpy.mockImplementation((url: string) =>
      String(url).includes('/v1/payments/orders/')
        ? jsonResponse(false, { code: 'NOT_FOUND_PAYMENT' })
        : jsonResponse(false, { code: 'DUPLICATED_ORDER_ID', message: '중복된 주문번호' })
    )
    const admin = adminStub()

    const response = await GET(cronRequest())
    const body = (await response.json()) as { stats: { skipped: number; failed: number } }

    expect(body.stats).toMatchObject({ skipped: 1, failed: 0 })
    expect(admin.calls.some((call) => call.table === 'subscription_payments' && call.method === 'insert')).toBe(false)
    // 🔴 크론이 10분마다 돈다 — 상태를 그대로 두면 같은 호출을 영원히 되풀이한다. 재시도 차수는 건드리지 않는다.
    const updates = admin.calls.filter((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(updates).toHaveLength(1)
    const patchBody = updates[0].args[0] as Record<string, unknown>
    expect(Object.keys(patchBody)).toEqual(['next_billing_date'])
    expect(new Date(String(patchBody.next_billing_date)).getTime()).toBeGreaterThan(Date.now() + 50 * 60_000)
  })

  it('중복 주문의 앞선 시도가 끝났고 실패했으면(ABORTED) 실패로 세어 재시도 차수를 올린다 — 주문번호가 바뀌어야 다시 청구된다', async () => {
    fetchSpy.mockImplementation((url: string) =>
      String(url).includes('/v1/payments/orders/')
        ? jsonResponse(true, { status: 'ABORTED' })
        : jsonResponse(false, { code: 'DUPLICATED_ORDER_ID', message: '중복된 주문번호' })
    )
    const admin = adminStub()

    const response = await GET(cronRequest())
    const body = (await response.json()) as { stats: { skipped: number; failed: number } }

    expect(body.stats).toMatchObject({ failed: 1 })
    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).toMatchObject({ retry_count: 1 })
  })

  it('이미 성공 기록이 있으면 결제 기록을 두 번 남기지 않는다', async () => {
    const admin = adminStub({ recordedSuccess: { id: 'subpay-1' } })

    await GET(cronRequest())

    expect(admin.calls.some((call) => call.table === 'subscription_payments' && call.method === 'insert')).toBe(false)
  })

  it('기간 끝을 모르는 구독은 청구하지 않는다 — 1970년 주기를 만들지 않는다', async () => {
    adminStub({ subscriptions: [subscriptionRow({ current_period_end: null })] })

    await GET(cronRequest())

    expect(chargedOrderIds()).toEqual([])
  })
})
