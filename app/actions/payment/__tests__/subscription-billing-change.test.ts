/**
 * 결제 수단 변경(빌링키 재발급) 계약.
 *
 * 예전에는 토스 인증창을 «열기 전»에 subscriptions.customer_key 를 새 값으로 덮어썼고, 복귀 화면은
 * authKey 를 읽지 않아 빌링키가 아예 발급되지 않았다. 그래서 빌링키는 옛 customerKey 에 묶인 채
 * customer_key 만 새 값이 되어, 다음 갱신 청구가 토스에서 키 불일치로 거절되고 재시도 3회 뒤
 * PAYMENT_FAILED 로 떨어졌다 — 카드를 만지기만 해도 멀쩡한 구독이 죽었다.
 *
 * 못 박는 것:
 *  1. 접수는 customer_key·billing_key 를 건드리지 않는다 — 새 키는 대기 칸에만 둔다.
 *  2. 인증이 성공해야 두 키가 «함께» 바뀐다(같은 UPDATE 한 번).
 *  3. 이 경로는 청구하지 않는다 — 빌링 승인(POST /v1/billing/{key})을 부르지 않는다.
 *  4. 발급이 실패하면 기존 결제 수단이 그대로 남는다(대기 칸만 비운다).
 *  5. 옛 빌링키 삭제는 «교체 뒤»다 — 순서가 뒤집히면 삭제 통지가 방금 살린 구독을 해지한다.
 */
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/config/toss-keys', () => ({
  tossBillingSecretKey: 'test_sk_billing',
  tossGeneralSecretKey: 'test_sk',
}))
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
/** DB 쓰기와 토스 호출이 «어떤 순서로» 일어났는지 — 삭제가 교체 뒤인지 보려면 순서가 증거다. */
const timeline: string[] = []
/** pending_customer_key 로 찾을 구독 — null 이면 «대기 중인 요청 없음» */
let adminPending: unknown = null
/** 이미 적용된 구독을 찾는 두 번째 조회의 답 */
let adminApplied: unknown = null
/** 교체 UPDATE 가 돌려줄 행 — null 이면 교체 실패(대기 키가 사라짐) */
let adminSwapped: unknown = { id: 'sub-1' }

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    // 조회마다 새 빌더다 — 같은 빌더에 쌓인 필터로만 «무엇을 찾는 조회인가»를 가른다.
    from: (table: string) => {
      const builder: Record<string, unknown> = {}
      const filters: string[] = []
      let isUpdate = false
      for (const method of ['select', 'insert', 'update', 'eq', 'neq', 'in', 'is', 'not', 'order', 'limit']) {
        builder[method] = (...args: unknown[]) => {
          if (method === 'update') {
            isUpdate = true
            timeline.push(`db:update:${Object.keys(args[0] as object).join('+')}`)
          }
          if (method === 'eq') filters.push(String(args[0]))
          adminCalls.push({ table, method, args })
          return builder
        }
      }
      builder.maybeSingle = () => {
        if (isUpdate) return Promise.resolve({ data: adminSwapped, error: null })
        const pendingLookup = filters.includes('pending_customer_key')
        return Promise.resolve({ data: pendingLookup ? adminPending : adminApplied, error: null })
      }
      builder.single = () => Promise.resolve({ data: null, error: { message: 'none' } })
      builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: isUpdate ? [adminSwapped] : [], error: null }).then(resolve)
      return builder
    },
  }),
}))

import { changeBillingMethod, completeBillingMethodChange } from '../subscription'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

/** 사용자 세션 대역 — 활성 구독 목록만 돌려준다. */
function userClient(activeSubs: unknown[]) {
  const from = () => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit']) builder[method] = () => builder
    builder.maybeSingle = () => Promise.resolve({ data: null, error: null })
    builder.single = () => Promise.resolve({ data: null, error: { message: 'none' } })
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data: activeSubs, error: null }).then(resolve)
    return builder
  }
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1234-5678' } } }) },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

const fetchSpy = jest.fn()

/** subscriptions 에 실제로 쓴 값들. */
function subscriptionPatches(): Record<string, unknown>[] {
  return adminCalls
    .filter((call) => call.table === 'subscriptions' && call.method === 'update')
    .map((call) => call.args[0] as Record<string, unknown>)
}

/** 토스를 부른 순서 — 어느 엔드포인트를 어떤 method 로 불렀나. */
function tossCalls(): { url: string; method: string }[] {
  return fetchSpy.mock.calls.map((call) => ({
    url: String(call[0]),
    method: String((call[1] as RequestInit | undefined)?.method ?? 'GET'),
  }))
}

beforeEach(() => {
  adminCalls.length = 0
  timeline.length = 0
  adminPending = null
  adminApplied = null
  adminSwapped = { id: 'sub-1' }
  jest.clearAllMocks()
  global.fetch = fetchSpy as unknown as typeof fetch
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
})

describe('changeBillingMethod — 접수', () => {
  it('🔴 인증 전에는 customer_key 를 건드리지 않는다 — 새 키는 대기 칸에만 둔다', async () => {
    userClient([{ id: 'sub-1', billing_key: 'bk_old', next_billing_date: '2026-10-19T00:00:00.000Z' }])

    const result = await changeBillingMethod()

    expect(result.success).toBe(true)
    const patches = subscriptionPatches()
    expect(patches).toHaveLength(1)
    expect(Object.keys(patches[0])).toEqual(['pending_customer_key'])
    expect(patches[0].pending_customer_key).toBe(result.customerKey)
  })

  it('활성 구독이 없으면 접수하지 않는다', async () => {
    userClient([])

    await expect(changeBillingMethod()).resolves.toMatchObject({
      success: false,
      error: '활성화된 구독이 없습니다.',
    })
    expect(subscriptionPatches()).toHaveLength(0)
  })

  it('결제 없이 부여된 구독(빌링키·다음 결제일 없음)은 바꿀 수단이 없다', async () => {
    userClient([{ id: 'sub-granted', billing_key: null, next_billing_date: null }])

    await expect(changeBillingMethod()).resolves.toMatchObject({
      success: false,
      error: '자동 결제 중인 멤버십이 아닙니다.',
    })
    expect(subscriptionPatches()).toHaveLength(0)
  })

  it('갱신이 실패해 빌링키가 사라진 구독도 다음 결제일이 있으면 바꿀 수 있다', async () => {
    userClient([{ id: 'sub-1', billing_key: null, next_billing_date: '2026-09-19T00:00:00.000Z' }])

    await expect(changeBillingMethod()).resolves.toMatchObject({ success: true })
  })
})

describe('completeBillingMethodChange — 인증 뒤 교체', () => {
  const PENDING = { id: 'sub-1', billing_key: 'bk_old', customer_key: 'HHD_user_1', retry_count: 0 }

  function tossIssuesKey() {
    fetchSpy.mockImplementation((url: string, init?: RequestInit) => {
      timeline.push(`toss:${String(init?.method ?? 'GET')} ${String(url)}`)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(String(url).includes('/authorizations/issue') ? { billingKey: 'bk_new' } : {}),
      } as unknown as Response)
    })
  }

  it('🔴 두 키가 «함께» 바뀐다 — 한 번의 UPDATE 로, 대기 키가 그대로일 때만', async () => {
    userClient([])
    adminPending = PENDING
    tossIssuesKey()

    const result = await completeBillingMethodChange('auth_1', 'HHD_user_2')

    expect(result).toEqual({ success: true })
    const swap = subscriptionPatches().find((patch) => 'billing_key' in patch)
    expect(swap).toEqual({ billing_key: 'bk_new', customer_key: 'HHD_user_2', pending_customer_key: null })
    const guards = adminCalls.filter((call) => call.method === 'eq').map((call) => call.args)
    expect(guards).toEqual(expect.arrayContaining([['pending_customer_key', 'HHD_user_2']]))
  })

  it('🔴 수단만 바꾼다 — 청구(빌링 승인)를 부르지 않는다', async () => {
    userClient([])
    adminPending = PENDING
    tossIssuesKey()

    await completeBillingMethodChange('auth_1', 'HHD_user_2')

    const charged = tossCalls().filter(
      (call) => call.method === 'POST' && /\/v1\/billing\/[^/]+$/.test(call.url.split('?')[0])
    )
    expect(charged).toEqual([])
    expect(adminCalls.some((call) => call.table === 'subscription_payments')).toBe(false)
  })

  it('🔴 옛 빌링키 삭제는 교체 «뒤»다 — 순서가 뒤집히면 삭제 통지가 방금 살린 구독을 해지한다', async () => {
    userClient([])
    adminPending = PENDING
    tossIssuesKey()

    await completeBillingMethodChange('auth_1', 'HHD_user_2')

    const swapAt = timeline.findIndex((event) => event.startsWith('db:update:') && event.includes('billing_key'))
    const deleteAt = timeline.findIndex((event) => event.startsWith('toss:DELETE'))
    expect(swapAt).toBeGreaterThanOrEqual(0)
    expect(deleteAt).toBeGreaterThan(swapAt)
    expect(timeline[deleteAt]).toContain('/v1/billing/bk_old')
  })

  it('🔴 빌링키 발급이 실패하면 기존 결제 수단이 그대로 남는다 — 대기 칸만 비운다', async () => {
    userClient([])
    adminPending = PENDING
    fetchSpy.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ code: 'INVALID_AUTH_KEY', message: '인증 키가 유효하지 않습니다.' }),
    } as unknown as Response)

    const result = await completeBillingMethodChange('auth_bad', 'HHD_user_2')

    expect(result).toMatchObject({ success: false, error: '인증 키가 유효하지 않습니다.' })
    const patches = subscriptionPatches()
    expect(patches).toHaveLength(1)
    expect(patches[0]).toEqual({ pending_customer_key: null })
    expect(tossCalls().some((call) => call.method === 'DELETE')).toBe(false)
  })

  it('갱신 재시도 중이었으면 다음 확인을 지금으로 당긴다 — 재시도 차수는 되돌리지 않는다', async () => {
    userClient([])
    adminPending = { ...PENDING, retry_count: 2 }
    tossIssuesKey()

    await completeBillingMethodChange('auth_1', 'HHD_user_2')

    const swap = subscriptionPatches().find((patch) => 'billing_key' in patch) ?? {}
    expect(swap).not.toHaveProperty('retry_count')
    expect(new Date(String(swap.next_billing_date)).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('대기 중인 요청이 없고 이미 적용됐으면 성공으로 답한다 — 복귀 화면 새로고침', async () => {
    userClient([])
    adminPending = null
    adminApplied = { id: 'sub-1' }

    const result = await completeBillingMethodChange('auth_1', 'HHD_user_2')

    expect(result).toEqual({ success: true })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('알지 못하는 customerKey 로는 아무것도 하지 않는다', async () => {
    userClient([])
    adminPending = null
    adminApplied = null

    const result = await completeBillingMethodChange('auth_1', 'HHD_someone_else')

    expect(result.success).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(subscriptionPatches()).toHaveLength(0)
  })
})
