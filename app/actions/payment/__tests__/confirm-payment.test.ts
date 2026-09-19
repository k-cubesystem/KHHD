/**
 * 이용권 구매 승인(confirmPayment) — «공개 엔드포인트» 계약.
 *
 * 못 박는 것:
 *  1. 이용권 주문(PASS_)만 받는다 — 구독 주문번호와 섞이면 웹훅 분기가 틀어진다.
 *  2. 가격·장 수·유효기간은 DB(price_plans, product_kind='pass')에서 다시 읽는다. 금액은 토스 응답과 대조한다.
 *  3. 결제 기록은 admin 으로, 토스 승인 «전에» pending 으로 남긴다 — 승인 뒤 기록이 실패하면 복구할 길이 없다.
 *  4. 확정·발급은 settlePassPurchase 한 곳(웹훅과 공용). 첫 구매 2배·보너스는 없다.
 *  5. 1회 결제 상한(PASS_MAX_ORDER_AMOUNT)을 넘는 팩은 승인하지 않는다.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { settlePassPurchase } from '@/lib/services/pass-purchase'
import { logger } from '@/lib/utils/logger'
import { PASS_MAX_ORDER_AMOUNT } from '@/lib/domain/entitlement/pass'

jest.mock('server-only', () => ({}))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('@/lib/services/pass-purchase', () => ({ settlePassPurchase: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { confirmPayment } from '../payment'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockSettle = settlePassPurchase as jest.MockedFunction<typeof settlePassPurchase>
const mockLogger = logger as jest.Mocked<typeof logger>

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

const PLAN_5 = { id: 'plan-5', name: '이용권 5장', credits: 5, price: 19_800, valid_days: 90 }

/** insertError: payments INSERT 가 돌려줄 오류 · existing: 같은 주문번호로 이미 있는 행 */
function adminStub(
  options: { plan?: unknown; insertError?: { code?: string; message: string }; existing?: unknown } = {}
) {
  const calls: CallLog[] = []
  const from = jest.fn((table: string) => {
    let inserted = false
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'insert', 'update', 'eq', 'neq']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        if (method === 'insert') inserted = true
        return builder
      }
    }
    builder.maybeSingle = () =>
      Promise.resolve(
        table === 'payments'
          ? { data: options.existing ?? null, error: null }
          : { data: options.plan === undefined ? PLAN_5 : options.plan, error: null }
      )
    builder.then = (resolve: (value: { data: null; error: unknown }) => unknown) =>
      Promise.resolve({ data: null, error: inserted ? (options.insertError ?? null) : null }).then(resolve)
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
  mockSettle.mockResolvedValue({ ok: true, paymentId: 'pay-1', userId: 'user-1', passes: 5, validDays: 90 })
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

  it('토스가 승인한 금액이 다르면 확정·발급하지 않는다', async () => {
    adminStub()
    fetchSpy.mockImplementation(() => tossResponse(true, { totalAmount: 4_800 }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('결제 금액이 일치하지 않습니다.')
    expect(mockSettle).not.toHaveBeenCalled()
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('🔴 1회 결제 상한을 넘는 팩은 기록도 토스 승인도 하지 않는다', async () => {
    const admin = adminStub({ plan: { ...PLAN_5, price: PASS_MAX_ORDER_AMOUNT + 1 } })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('결제할 수 없습니다')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(admin.calls.some((call) => call.table === 'payments')).toBe(false)
  })

  it('토스 승인이 실패하면 확정·발급하지 않고, 열어 둔 기록을 failed 로 닫는다', async () => {
    const admin = adminStub()
    fetchSpy.mockImplementation(() => tossResponse(false, { code: 'REJECT_CARD_COMPANY', message: '카드사 거절' }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('카드사 거절')
    expect(mockSettle).not.toHaveBeenCalled()

    const close = admin.calls.find((call) => call.table === 'payments' && call.method === 'update')
    expect(close?.args[0]).toEqual({ status: 'failed' })
    const closeFilters = admin.calls.filter((call) => call.table === 'payments' && call.method === 'eq')
    expect(closeFilters.map((call) => call.args)).toEqual(expect.arrayContaining([['status', 'pending']]))
  })
})

describe('confirmPayment — 기록이 먼저, 확정은 한 곳에서', () => {
  it('🔴 토스를 부르기 전에 admin 으로 pending 기록을 남긴다(이용권 결제·산 장 수 그대로)', async () => {
    const admin = adminStub()
    let insertedBeforeToss = false
    fetchSpy.mockImplementation(() => {
      insertedBeforeToss = admin.calls.some((call) => call.table === 'payments' && call.method === 'insert')
      return tossResponse(true, { totalAmount: 19_800 })
    })

    await confirmPayment('pk_1', 'PASS_1', 5)

    expect(insertedBeforeToss).toBe(true)
    const insert = admin.calls.find((call) => call.table === 'payments' && call.method === 'insert')
    expect(insert?.args[0]).toEqual({
      user_id: 'user-1',
      payment_key: 'pk_1',
      order_id: 'PASS_1',
      amount: 19_800,
      credits_purchased: 5,
      credits_remaining: 5,
      status: 'pending',
      bokchae_type: 'pass',
    })
  })

  it('기록을 남기지 못하면 토스를 부르지 않는다 — 돈이 나가지 않는다', async () => {
    adminStub({ insertError: { code: '08006', message: 'connection failure' } })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('결제를 시작하지 못했습니다')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockSettle).not.toHaveBeenCalled()
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('확정·발급은 settlePassPurchase 에 주문번호와 서버가 읽은 금액으로 맡긴다', async () => {
    adminStub()

    const result = await confirmPayment('pk_1', 'PASS_1', 5)

    expect(mockSettle).toHaveBeenCalledTimes(1)
    expect(mockSettle).toHaveBeenCalledWith({ orderId: 'PASS_1', approvedAmount: 19_800 })
    expect(result).toMatchObject({ grantedPasses: 5, validDays: 90, totalAmount: 19_800 })
    expect(Number.isFinite(new Date(result.expiresAt).getTime())).toBe(true)
  })

  it('발급이 실패하면 고객에게 발급 실패를 알린다(기록은 확정 함수가 grant_failed 로 남긴다)', async () => {
    adminStub()
    mockSettle.mockResolvedValue({ ok: false, reason: 'GRANT_FAILED' })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('이용권 발급에 실패했습니다')
  })

  it('확정이 실패하면 Sentry 로 올린다 — 돈은 나갔고 기록은 pending 으로 남아 웹훅이 잇는다', async () => {
    adminStub()
    mockSettle.mockResolvedValue({ ok: false, reason: 'ERROR' })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('기록 저장에 실패했습니다')
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})

describe('confirmPayment — 같은 주문으로 다시 들어왔을 때', () => {
  const EXISTING = {
    id: 'pay-1',
    user_id: 'user-1',
    payment_key: 'pk_1',
    amount: 19_800,
    credits_purchased: 5,
    status: 'pending',
  }
  const DUPLICATE = { code: '23505', message: 'duplicate key value violates unique constraint' }

  it('본인의 같은 결제면 이어 간다 — 토스가 «이미 승인됨»이면 조회해서 확정한다', async () => {
    adminStub({ insertError: DUPLICATE, existing: EXISTING })
    fetchSpy
      .mockImplementationOnce(() =>
        tossResponse(false, { code: 'ALREADY_PROCESSED_PAYMENT', message: '이미 처리된 결제' })
      )
      .mockImplementationOnce(() => tossResponse(true, { status: 'DONE', orderId: 'PASS_1', totalAmount: 19_800 }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).resolves.toMatchObject({ grantedPasses: 5 })
    expect(String(fetchSpy.mock.calls[1][0])).toContain('/v1/payments/pk_1')
    expect(mockSettle).toHaveBeenCalledWith({ orderId: 'PASS_1', approvedAmount: 19_800 })
  })

  it('«이미 승인됨»인데 조회 결과가 다른 주문이면 확정하지 않는다', async () => {
    adminStub({ insertError: DUPLICATE, existing: EXISTING })
    fetchSpy
      .mockImplementationOnce(() =>
        tossResponse(false, { code: 'ALREADY_PROCESSED_PAYMENT', message: '이미 처리된 결제' })
      )
      .mockImplementationOnce(() => tossResponse(true, { status: 'DONE', orderId: 'PASS_OTHER', totalAmount: 19_800 }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('이미 처리된 결제')
    expect(mockSettle).not.toHaveBeenCalled()
  })

  it('🔴 뒤늦게 들어온 호출은 토스에 거절당해도 기록을 닫지 않는다 — 앞쪽 호출이 승인을 받는 중일 수 있다', async () => {
    const admin = adminStub({ insertError: DUPLICATE, existing: EXISTING })
    fetchSpy
      .mockImplementationOnce(() =>
        tossResponse(false, { code: 'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING', message: '결제 처리 중' })
      )
      .mockImplementationOnce(() => tossResponse(true, { status: 'IN_PROGRESS', orderId: 'PASS_1' }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('결제 처리 중')
    expect(admin.calls.some((call) => call.table === 'payments' && call.method === 'update')).toBe(false)
    expect(mockSettle).not.toHaveBeenCalled()
  })

  it('거절 코드가 무엇이든 토스가 승인 완료(DONE)라고 답하면 확정한다', async () => {
    adminStub({ insertError: DUPLICATE, existing: { ...EXISTING, status: 'failed' } })
    fetchSpy
      .mockImplementationOnce(() =>
        tossResponse(false, { code: 'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING', message: '결제 처리 중' })
      )
      .mockImplementationOnce(() => tossResponse(true, { status: 'DONE', orderId: 'PASS_1', totalAmount: 19_800 }))

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).resolves.toMatchObject({ grantedPasses: 5 })
  })

  it('이미 확정된 결제(성공 화면 새로고침)는 토스를 다시 부르지 않고 발급 확인만 멱등으로 한다', async () => {
    adminStub({ insertError: DUPLICATE, existing: { ...EXISTING, status: 'completed' } })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).resolves.toMatchObject({
      grantedPasses: 5,
      totalAmount: 19_800,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockSettle).toHaveBeenCalledWith({ orderId: 'PASS_1', approvedAmount: 19_800 })
  })

  it('이미 취소된 결제는 다시 승인하지 않는다', async () => {
    adminStub({ insertError: DUPLICATE, existing: { ...EXISTING, status: 'refunded' } })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('이미 취소된 결제입니다.')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockSettle).not.toHaveBeenCalled()
  })

  it.each([
    ['남의 주문', { ...EXISTING, user_id: 'user-2' }],
    ['다른 결제키', { ...EXISTING, payment_key: 'pk_other' }],
    ['다른 장 수', { ...EXISTING, credits_purchased: 10 }],
    ['행을 못 찾음(결제키만 겹침)', null],
  ])('🔴 %s 이면 토스를 부르지 않고 거절한다', async (_name, existing) => {
    adminStub({ insertError: DUPLICATE, existing })

    await expect(confirmPayment('pk_1', 'PASS_1', 5)).rejects.toThrow('잘못된 주문번호입니다.')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockSettle).not.toHaveBeenCalled()
  })
})
