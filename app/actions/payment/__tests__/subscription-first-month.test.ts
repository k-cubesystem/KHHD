/**
 * 첫 구독 첫 달 할인 — 서버 계약.
 *
 * 못 박는 것:
 *  1. 첫 결제 금액은 서버가 정한다 — 유료 멤버십 결제(성공) 이력이 없을 때만 할인가, 있으면 정가.
 *  2. 자격을 확인하지 못하면 청구하지 않는다(정가로 청구하면 화면과 다르고, 할인가로 청구하면 자격 없는 사람에게 깎아 준다).
 *  3. 결제 기록의 금액은 «실제로 낸 금액»이다 — 즉시 해지 환불이 이 값을 기준으로 계산된다.
 *  4. 화면용 조회(getFirstMonthOffer·getFirstMonthEligibility)는 인자로 사용자를 받지 않는다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { firstMonthPrice } from '@/lib/domain/payment/membership-intro'

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
/** 서비스 권한으로 읽는 «성공한 멤버십 결제» 목록 — 비어 있으면 첫 구독이다. */
let adminPaidBefore: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null }

const PLAN = { id: 'plan-single', name: '싱글 멤버십', tier: 'SINGLE', price: 12_800, interval: 'MONTH' }

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
      builder.single = () =>
        Promise.resolve(
          table === 'membership_plans'
            ? { data: PLAN, error: null }
            : { data: { id: 'sub-new', status: 'ACTIVE' }, error: null }
        )
      builder.maybeSingle = () => Promise.resolve({ data: null, error: null })
      builder.then = (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
        Promise.resolve(table === 'subscription_payments' ? adminPaidBefore : { data: [], error: null }).then(resolve)
      return builder
    },
  }),
}))

import { executeFirstPayment, getFirstMonthEligibility, getFirstMonthOffer } from '../subscription'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const PENDING = {
  id: 'sub-new',
  user_id: 'user-1234-5678',
  status: 'PENDING',
  billing_key: 'bk_new',
  customer_key: 'HHD_user-123_1',
  plan: PLAN,
}

function userClient(userId: string | null = 'user-1234-5678') {
  const from = () => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit']) builder[method] = () => builder
    builder.single = () => Promise.resolve({ data: PENDING, error: null })
    builder.maybeSingle = () => Promise.resolve({ data: null, error: null })
    return builder
  }
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

const fetchSpy = jest.fn()

function chargedAmount(): number {
  const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body)) as { amount: number }
  return body.amount
}

beforeEach(() => {
  adminCalls.length = 0
  adminPaidBefore = { data: [], error: null }
  jest.clearAllMocks()
  global.fetch = fetchSpy as unknown as typeof fetch
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ paymentKey: 'pk_sub_1' }),
  } as unknown as Response)
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  userClient()
})

describe('executeFirstPayment — 첫 결제 금액은 서버가 정한다', () => {
  it('유료 멤버십 결제 이력이 없으면 첫 달 할인가로 청구하고, 기록에도 실제로 낸 금액을 적는다', async () => {
    const result = await executeFirstPayment('HHD_user-123_1')

    expect(result.success).toBe(true)
    expect(chargedAmount()).toBe(firstMonthPrice(12_800))
    expect(chargedAmount()).toBe(6_400)
    const record = adminCalls.find(
      (call) =>
        call.table === 'subscription_payments' &&
        call.method === 'insert' &&
        (call.args[0] as { status?: string }).status === 'SUCCESS'
    )
    expect(record?.args[0]).toMatchObject({ amount: 6_400 })
  })

  it('🔴 결제 이력이 있으면(해지 후 재가입 포함) 정가로 청구한다 — 할인은 계정당 한 번이다', async () => {
    adminPaidBefore = { data: [{ id: 'subpay-old' }], error: null }

    await executeFirstPayment('HHD_user-123_1')

    expect(chargedAmount()).toBe(12_800)
  })

  it('이력 판정은 «성공한 결제»만 센다 — 활성화 실패로 자동 환불된 결제는 멤버십을 받은 적이 없다', async () => {
    await executeFirstPayment('HHD_user-123_1')

    const filters = adminCalls.filter((call) => call.table === 'subscription_payments' && call.method === 'eq')
    expect(filters.map((call) => call.args)).toEqual(
      expect.arrayContaining([
        ['user_id', 'user-1234-5678'],
        ['status', 'SUCCESS'],
      ])
    )
  })

  it('🔴 자격을 확인하지 못하면 청구하지 않는다', async () => {
    adminPaidBefore = { data: null, error: { message: 'timeout' } }

    const result = await executeFirstPayment('HHD_user-123_1')

    expect(result.success).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('화면용 조회 — 본인 것만, 확인 못 하면 약속하지 않는다', () => {
  it('대상이면 첫 결제 금액과 정가를 함께 돌려준다', async () => {
    await expect(getFirstMonthOffer('plan-single')).resolves.toEqual({
      eligible: true,
      firstPrice: 6_400,
      regularPrice: 12_800,
    })
    await expect(getFirstMonthEligibility()).resolves.toBe(true)
  })

  it('결제 이력이 있으면 정가만 보여 준다', async () => {
    adminPaidBefore = { data: [{ id: 'subpay-old' }], error: null }

    await expect(getFirstMonthOffer('plan-single')).resolves.toEqual({
      eligible: false,
      firstPrice: 12_800,
      regularPrice: 12_800,
    })
    await expect(getFirstMonthEligibility()).resolves.toBe(false)
  })

  it('자격 조회가 실패하면 할인을 약속하지 않는다', async () => {
    adminPaidBefore = { data: null, error: { message: 'timeout' } }

    await expect(getFirstMonthOffer('plan-single')).resolves.toMatchObject({ eligible: false, firstPrice: 12_800 })
    await expect(getFirstMonthEligibility()).resolves.toBe(false)
  })

  it('비로그인은 조회할 것이 없다', async () => {
    userClient(null)

    await expect(getFirstMonthOffer('plan-single')).resolves.toBeNull()
    await expect(getFirstMonthEligibility()).resolves.toBe(false)
  })

  it('조회 액션은 인자로 사용자를 받지 않는다 — 남의 결제 이력을 캐묻는 창구가 되면 안 된다', () => {
    const source = readFileSync(join(process.cwd(), 'app/actions/payment/subscription.ts'), 'utf8')
    expect(source).toMatch(/export async function getFirstMonthEligibility\(\)/)
    expect(source).toMatch(/export async function getFirstMonthOffer\(\s*planId: string\s*\)/)
    expect(source).not.toMatch(/export async function hasPaidMembershipBefore/)
  })
})
