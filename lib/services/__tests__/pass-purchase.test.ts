/**
 * settlePassPurchase — 이용권 구매 확정(승인 액션 · 웹훅 공용).
 *
 * 못 박는 것:
 *  1. pending → completed 는 `status='pending'` 조건부로만 올린다(취소·실패를 되살리지 않는다).
 *  2. 발급은 결제 1건 = 1번 — 멱등 키 PURCHASE:<paymentId>. 이미 발급됐으면 성공으로 본다.
 *  3. 승인 금액이 기록과 다르면 확정도 발급도 하지 않는다.
 *  4. 발급이 실패하면 grant_failed 로 표시하고 Sentry 로 올린다(수동 발급 대상).
 *  5. 공개 표면이 아니다 — 'use server' 파일에서 export 하지 않는다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantPasses } from '@/lib/services/entitlement'
import { logger } from '@/lib/utils/logger'
import { PASS_VALID_DAYS } from '@/lib/domain/entitlement/pass'

jest.mock('server-only', () => ({}))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/services/entitlement', () => ({ grantPasses: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { settlePassPurchase } from '../pass-purchase'

const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGrant = grantPasses as jest.MockedFunction<typeof grantPasses>
const mockLogger = logger as jest.Mocked<typeof logger>

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

const PAYMENT = {
  id: 'pay-1',
  user_id: 'user-1',
  order_id: 'PASS_1',
  amount: 19_800,
  credits_purchased: 5,
  status: 'pending',
  bokchae_type: 'pass',
}

function adminStub(options: { payment?: unknown; plan?: unknown } = {}) {
  const calls: CallLog[] = []
  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'update', 'eq', 'order', 'limit']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.maybeSingle = () =>
      Promise.resolve(
        table === 'payments'
          ? { data: options.payment === undefined ? PAYMENT : options.payment, error: null }
          : { data: options.plan === undefined ? { name: '이용권 5장', valid_days: 90 } : options.plan, error: null }
      )
    builder.then = (resolve: (value: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    return builder
  })
  mockCreateAdmin.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>)
  return { calls }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGrant.mockResolvedValue({ granted: true, reason: 'OK', grantId: 'grant-1' })
})

describe('settlePassPurchase — 확정', () => {
  it('pending 을 조건부로 completed 로 올리고, 산 장 수 그대로 멱등 키로 발급한다', async () => {
    const admin = adminStub()

    const result = await settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 19_800 })

    expect(result).toEqual({ ok: true, paymentId: 'pay-1', userId: 'user-1', passes: 5, validDays: 90 })
    const update = admin.calls.find((call) => call.table === 'payments' && call.method === 'update')
    expect(update?.args[0]).toEqual({ status: 'completed' })
    const filters = admin.calls.filter((call) => call.table === 'payments' && call.method === 'eq')
    expect(filters.map((call) => call.args)).toEqual(expect.arrayContaining([['status', 'pending']]))
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
  })

  it('이미 completed 면 상태는 건드리지 않고 발급만 멱등으로 다시 시도한다(웹훅·재시도)', async () => {
    const admin = adminStub({ payment: { ...PAYMENT, status: 'completed' } })
    mockGrant.mockResolvedValue({ granted: false, reason: 'ALREADY_GRANTED', grantId: 'grant-1' })

    await expect(settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 19_800 })).resolves.toMatchObject({ ok: true })
    expect(admin.calls.some((call) => call.table === 'payments' && call.method === 'update')).toBe(false)
  })

  it('팩에 유효기간이 비었거나 팩을 못 찾으면 정본 PASS_VALID_DAYS 를 쓴다', async () => {
    adminStub({ plan: null })

    const result = await settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 19_800 })

    expect(result).toMatchObject({ ok: true, validDays: PASS_VALID_DAYS })
    expect(mockGrant).toHaveBeenCalledWith(expect.objectContaining({ validDays: PASS_VALID_DAYS }))
  })
})

describe('settlePassPurchase — 확정하지 않는 경우', () => {
  it.each(['refunded', 'failed', 'grant_failed'])('🔴 %s 결제는 되살리지 않는다', async (status) => {
    const admin = adminStub({ payment: { ...PAYMENT, status } })

    await expect(settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 19_800 })).resolves.toEqual({
      ok: false,
      reason: 'NOT_SETTLEABLE',
    })
    expect(admin.calls.some((call) => call.method === 'update')).toBe(false)
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('🔴 승인 금액이 기록과 다르면 확정도 발급도 하지 않고 Sentry 로 올린다', async () => {
    const admin = adminStub()

    await expect(settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 4_800 })).resolves.toEqual({
      ok: false,
      reason: 'AMOUNT_MISMATCH',
    })
    expect(admin.calls.some((call) => call.method === 'update')).toBe(false)
    expect(mockGrant).not.toHaveBeenCalled()
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('기록이 없거나 이용권 결제가 아니면 아무것도 하지 않는다', async () => {
    adminStub({ payment: null })
    await expect(settlePassPurchase({ orderId: 'PASS_X', approvedAmount: 1 })).resolves.toEqual({
      ok: false,
      reason: 'NO_PAYMENT',
    })

    adminStub({ payment: { ...PAYMENT, bokchae_type: 'charge' } })
    await expect(settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 19_800 })).resolves.toEqual({
      ok: false,
      reason: 'NOT_A_PASS_ORDER',
    })
    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('🔴 발급이 실패하면 grant_failed 로 표시하고 Sentry 로 올린다', async () => {
    const admin = adminStub()
    mockGrant.mockResolvedValue({ granted: false, reason: 'ERROR' })

    await expect(settlePassPurchase({ orderId: 'PASS_1', approvedAmount: 19_800 })).resolves.toEqual({
      ok: false,
      reason: 'GRANT_FAILED',
    })
    const updates = admin.calls.filter((call) => call.table === 'payments' && call.method === 'update')
    expect(updates.map((call) => call.args[0])).toContainEqual({ status: 'grant_failed' })
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})

describe('공개 표면 — 확정 함수는 서버 안에서만 부른다', () => {
  it("'use server' 파일이 settlePassPurchase 를 export·re-export 하지 않는다", () => {
    const action = readFileSync(join(process.cwd(), 'app/actions/payment/payment.ts'), 'utf8')
    expect(action).toContain("'use server'")
    expect(action).not.toMatch(/export\s*\{[^}]*settlePassPurchase/)
    expect(action).not.toMatch(/export\s+(async\s+)?function\s+settlePassPurchase/)

    const service = readFileSync(join(process.cwd(), 'lib/services/pass-purchase.ts'), 'utf8')
    expect(service.startsWith("import 'server-only'")).toBe(true)
    // 머리말 주석이 그 말을 언급하므로 «지시문으로 쓰였는가»만 본다.
    expect(service).not.toMatch(/^\s*['"]use server['"]/m)
  })
})
