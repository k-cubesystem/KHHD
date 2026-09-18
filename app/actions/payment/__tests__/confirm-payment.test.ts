/**
 * 이용권 구매 승인(confirmPayment) — «공개 엔드포인트» 계약.
 *
 * 못 박는 것:
 *  1. 이용권 주문(PASS_)만 받는다 — 구독 주문번호와 섞이면 웹훅 분기가 틀어진다.
 *  2. 가격·장 수·유효기간은 DB(price_plans, product_kind='pass')에서 다시 읽는다. 금액은 토스 응답과 대조한다.
 *  3. 결제 기록은 admin 으로 쓴다(사용자 세션으로 쓰다 RLS 에 조용히 막히면 기록 없이 발급까지 간다).
 *  4. 발급은 결제 1건 = 발급 1건 — 멱등 키 PURCHASE:<paymentId>. 첫 구매 2배·보너스는 없다.
 *  5. 발급이 실패하면 결제를 grant_failed 로 표시하고 Sentry 로 올린다(수동 발급 대상).
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { grantPasses } from '@/lib/services/entitlement'
import { logger } from '@/lib/utils/logger'
import { PASS_VALID_DAYS } from '@/lib/domain/entitlement/pass'

jest.mock('server-only', () => ({}))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('@/lib/services/entitlement', () => ({ grantPasses: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { confirmPayment } from '../payment'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockGrant = grantPasses as jest.MockedFunction<typeof grantPasses>
const mockLogger = logger as jest.Mocked<typeof logger>

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

const PLAN_5 = { id: 'plan-5', name: '이용권 5장', credits: 5, price: 19_800, valid_days: 90 }

function adminStub(options: { plan?: unknown; insert?: { data: unknown; error: unknown } } = {}) {
  const calls: CallLog[] = []
  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'update', 'eq', 'neq']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.maybeSingle = () =>
      Promise.resolve({ data: options.plan === undefined ? PLAN_5 : options.plan, error: null })
    builder.single = () => Promise.resolve(options.insert ?? { data: { id: 'pay-1' }, error: null })
    builder.then = (resolve: (value: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    return builder
  })
  mockCreateAdmin.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>)
  return { from, calls }
}

function tossResponse(ok: boolean, body: Record<string, unknown>) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as unknown as Response)
}

const fetchSpy = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = fetchSpy as unknown as typeof fetch
  mockRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 })
  // 사용자 세션은 인증에만 쓴다 — from 이 없으니 세션으로 쓰려 들면 테스트가 터진다.
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  fetchSpy.mockImplementation(() => tossResponse(true, { totalAmount: 19_800, orderId: 'PASS_1', method: '카드' }))
  mockGrant.mockResolvedValue({ granted: true, reason: 'OK', grantId: 'grant-1' })
})

describe('confirmPayment — 입력 가드', () => {
  it.each(['SUB_1', 'BOKCHAE_1', 'order-1'])(
    '이용권 주문이 아닌 %s 는 토스를 부르기 전에 거절한다',
    async (orderId) => {
      const admin = adminStub()

      await expect(confirmPayment('pk_1', orderId, 5)).rejects.toThrow('잘못된 주문번호입니다.')
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(admin.from).not.toHaveBeenCalled()
    }
  )

  it.each([0, -1, 1.5, Number.NaN])('잘못된 장 수 %p 는 DB·토스에 닿기 전에 거절한다', async (passes) => {
    const admin = adminStub()

    await expect(confirmPayment('pk_1', 'PASS_1', passes)).rejects.toThrow('잘못된 이용권 상품입니다.')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(admin.from).not.toHaveBeenCalled()
  })

  it('판매 중인 이용권 팩이 아니면(옛 복채 팩 포함) 승인하지 않는다', async () => {
    adminStub({ plan: null })

    await expect(confirmPayment('pk_1', 'PASS_1', 20)).rejects.toThrow('잘못된 이용권 상품입니다.')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('confirmPayment — 가격은 서버가 다시 읽는다', () => {
  it('이용권 팩(product_kind=pass · 판매 중 · 장 수)으로 찾고 그 가격으로 승인한다', async () => {
    const admin = adminStub()

    await confirmPayment('pk_1', 'PASS_1', 5)

    const planFilters = admin.calls.filter((call) => call.table === 'price_plans' && call.method === 'eq')
    expect(planFilters.map((call) => call.args)).toEqual(
      expect.arrayContaining([
        ['credits', 5],
        ['product_kind', 'pass'],
        ['is_active', true],
      ])
    )
    const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body)) as Record<string, unknown>
    expect(body).toEqual({ paymentKey: 'pk_1', orderId: 'PASS_1', amount: 19_800 })
  })

  it('토스가 승인한 금액이 다르면 기록·발급하지 않는다', async () => {
    const admin = adminStub()
    fetchSpy.mockImplementation(() => tossResponse(true, { totalAmount: 4_800 }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('결제 금액이 일치하지 않습니다.')
    expect(admin.calls.some((call) => call.table === 'payments')).toBe(false)
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('토스 승인이 실패하면 기록·발급하지 않는다', async () => {
    adminStub()
    fetchSpy.mockImplementation(() => tossResponse(false, { code: 'REJECT_CARD_COMPANY', message: '카드사 거절' }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('카드사 거절')
    expect(mockGrant).not.toHaveBeenCalled()
  })
})

describe('confirmPayment — 기록과 발급', () => {
  it('결제 기록은 admin 으로 이용권 결제(pass)·산 장 수 그대로 남긴다', async () => {
    const admin = adminStub()

    await confirmPayment('pk_1', 'PASS_1', 5)

    const insert = admin.calls.find((call) => call.table === 'payments' && call.method === 'insert')
    expect(insert?.args[0]).toMatchObject({
      user_id: 'user-1',
      payment_key: 'pk_1',
      order_id: 'PASS_1',
      amount: 19_800,
      credits_purchased: 5,
      credits_remaining: 5,
      status: 'completed',
      bokchae_type: 'pass',
    })
  })

  it('결제 1건 = 발급 1건 — 산 장 수 그대로, 멱등 키로, 첫 구매 배수 없이', async () => {
    adminStub()

    const result = await confirmPayment('pk_1', 'PASS_1', 5)

    expect(mockGrant).toHaveBeenCalledTimes(1)
    expect(mockGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        source: 'purchase',
        quantity: 5,
        validDays: 90,
        paymentId: 'pay-1',
        idempotencyKey: 'PURCHASE:pay-1',
      })
    )
    expect(result).toMatchObject({ grantedPasses: 5, validDays: 90, totalAmount: 19_800 })
    expect(Number.isFinite(new Date(result.expiresAt).getTime())).toBe(true)
  })

  it('팩에 유효기간이 비어 있으면 정본 PASS_VALID_DAYS 를 쓴다', async () => {
    adminStub({ plan: { ...PLAN_5, valid_days: null } })

    const result = await confirmPayment('pk_1', 'PASS_1', 5)

    expect(mockGrant).toHaveBeenCalledWith(expect.objectContaining({ validDays: PASS_VALID_DAYS }))
    expect(result.validDays).toBe(PASS_VALID_DAYS)
  })

  it('같은 결제로 이미 발급됐으면(재시도) 성공으로 본다 — 두 번 발급하지 않는다', async () => {
    adminStub()
    mockGrant.mockResolvedValue({ granted: false, reason: 'ALREADY_GRANTED', grantId: 'grant-1' })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).resolves.toMatchObject({ grantedPasses: 5 })
  })

  it('🔴 발급이 실패하면 grant_failed 로 표시하고 Sentry 로 올린다', async () => {
    const admin = adminStub()
    mockGrant.mockResolvedValue({ granted: false, reason: 'ERROR' })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('이용권 발급에 실패했습니다')

    const update = admin.calls.find((call) => call.table === 'payments' && call.method === 'update')
    expect(update?.args[0]).toEqual({ status: 'grant_failed' })
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('결제 기록 저장이 실패하면 발급하지 않고 Sentry 로 올린다', async () => {
    adminStub({ insert: { data: null, error: { message: 'duplicate key' } } })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('기록 저장에 실패했습니다')
    expect(mockGrant).not.toHaveBeenCalled()
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
