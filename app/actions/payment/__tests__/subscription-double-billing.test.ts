/**
 * 유료 구독은 한 사람에 하나 — 이중 청구 방어.
 *
 * 갱신 결제가 실패하면 크론은 구독을 ACTIVE 로 둔 채 다음 날 다시 청구한다. 그 사이 기간은 이미 끝나 있어
 * 화면에는 비회원으로 보이고, 회원은 다시 가입한다. 접수 검사가 «기간이 남은» 구독만 막으면 옛 빌링키와
 * 새 빌링키가 매달 둘 다 청구된다.
 *
 * 못 박는 것:
 *  1. 접수(createBillingAuthUrl)는 기간과 무관하게 ACTIVE + 빌링키 구독이 있으면 막는다.
 *  2. 결제 없이 부여된 구독(빌링키 없음)은 막지 않는다 — 부여받은 회원이 유료로 올릴 길이 없어진다.
 *  3. 첫 결제(executeFirstPayment)는 토스를 부르기 «전에» 다른 유료 구독을 다시 확인한다(두 탭 동시 가입).
 */
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/services/membership-deity', () => ({ grantMembershipDeity: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn(async () => ({ success: true })) }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

const adminCalls: CallLog[] = []
/** 서비스 권한 조회가 돌려줄 값 — «다른 유료 구독» 목록(subscriptions) · 플랜(membership_plans) */
let adminOtherPaid: unknown[] = []

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'insert', 'update', 'eq', 'neq', 'in', 'is', 'not', 'order', 'limit']) {
        builder[method] = (...args: unknown[]) => {
          adminCalls.push({ table, method, args })
          return builder
        }
      }
      const plan = { id: 'plan-single', name: '싱글 멤버십', tier: 'SINGLE', price: 12_800, interval: 'MONTH' }
      builder.single = () => Promise.resolve({ data: table === 'membership_plans' ? plan : null, error: null })
      builder.maybeSingle = () => Promise.resolve({ data: null, error: null })
      builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: table === 'subscriptions' ? adminOtherPaid : null, error: null }).then(resolve)
      return builder
    },
  }),
}))

import { createBillingAuthUrl, executeFirstPayment } from '../subscription'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const DAY = 86_400_000

/** 사용자 세션 대역 — 목록 조회(await)와 단건 조회(single)를 따로 채운다. */
function userClient(options: { list?: unknown[]; single?: unknown; payment?: unknown }) {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit']) builder[method] = () => builder
    builder.single = () =>
      Promise.resolve({ data: options.single ?? null, error: options.single ? null : { message: 'none' } })
    builder.maybeSingle = () =>
      Promise.resolve({ data: table === 'subscription_payments' ? (options.payment ?? null) : null, error: null })
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data: options.list ?? [], error: null }).then(resolve)
    return builder
  }
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1234-5678' } } }) },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

const fetchSpy = jest.fn()

beforeEach(() => {
  adminCalls.length = 0
  adminOtherPaid = []
  jest.clearAllMocks()
  global.fetch = fetchSpy as unknown as typeof fetch
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
})

describe('createBillingAuthUrl — 접수', () => {
  it('🔴 갱신 재시도 중(기간이 끝난 ACTIVE + 빌링키)이어도 새 구독 접수를 막고, 결제 수단 변경으로 안내한다', async () => {
    userClient({
      list: [
        {
          id: 'sub-old',
          status: 'ACTIVE',
          billing_key: 'bk_old',
          current_period_end: new Date(Date.now() - DAY).toISOString(),
        },
      ],
    })

    const result = await createBillingAuthUrl('plan-single')

    expect(result.success).toBe(false)
    expect(result.error).toContain('갱신 결제가 진행 중')
    expect(adminCalls.some((call) => call.table === 'subscriptions' && call.method === 'insert')).toBe(false)
  })

  it('기간이 남은 유료 구독이 있으면 막는다', async () => {
    userClient({
      list: [
        {
          id: 'sub-live',
          status: 'ACTIVE',
          billing_key: 'bk_live',
          current_period_end: new Date(Date.now() + 10 * DAY).toISOString(),
        },
      ],
    })

    await expect(createBillingAuthUrl('plan-single')).resolves.toMatchObject({
      success: false,
      error: '이미 활성화된 구독이 있습니다.',
    })
  })

  it('결제 없이 부여된 구독(빌링키 없음)은 막지 않는다', async () => {
    userClient({
      list: [
        {
          id: 'sub-granted',
          status: 'ACTIVE',
          billing_key: null,
          current_period_end: new Date(Date.now() + 10 * DAY).toISOString(),
        },
      ],
    })

    const result = await createBillingAuthUrl('plan-single')

    expect(result.success).toBe(true)
    expect(adminCalls.some((call) => call.table === 'subscriptions' && call.method === 'insert')).toBe(true)
  })
})

describe('executeFirstPayment — 청구 전 재확인', () => {
  const PENDING = {
    id: 'sub-new',
    user_id: 'user-1234-5678',
    status: 'PENDING',
    billing_key: 'bk_new',
    customer_key: 'HHD_user-123_1',
    plan: { id: 'plan-single', name: '싱글 멤버십', tier: 'SINGLE', price: 12_800, interval: 'MONTH' },
  }

  it('🔴 다른 유료 구독이 이미 있으면 토스를 부르지 않는다 — 두 탭에서 동시에 가입한 경우', async () => {
    userClient({ single: PENDING })
    adminOtherPaid = [{ id: 'sub-other' }]

    const result = await executeFirstPayment('HHD_user-123_1')

    expect(result).toMatchObject({ success: false, error: '이미 활성화된 구독이 있습니다.' })
    expect(fetchSpy).not.toHaveBeenCalled()

    const filters = adminCalls.filter((call) => call.table === 'subscriptions')
    expect(filters.map((call) => [call.method, ...call.args])).toEqual(
      expect.arrayContaining([
        ['eq', 'status', 'ACTIVE'],
        ['not', 'billing_key', 'is', null],
        ['neq', 'id', 'sub-new'],
      ])
    )
  })

  it('다른 유료 구독이 없으면 청구한다', async () => {
    userClient({ single: PENDING })
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ paymentKey: 'pk_sub_1' }),
    } as unknown as Response)

    const result = await executeFirstPayment('HHD_user-123_1')

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
