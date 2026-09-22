/**
 * 결제 취소 셀프서비스 서버 액션의 «공개 엔드포인트» 계약.
 *
 * 못 박는 것:
 *  1. 인가 — 결제·발급 이용권 조회에 반드시 `user_id = 본인` 이 걸린다(남의 결제 취소 차단).
 *  2. rate limit 이 토스 호출보다 먼저 끊는다.
 *  3. (b) 갈래는 손실 처리 동의 없이는 토스를 부르지 않는다.
 *  4. 회수는 `revokePaymentPasses` 단일 경로 + **전량 회수 강제**(수수료 때문에 이용권이 남으면 안 된다).
 *  5. 멤버십 해지는 이용권을 건드리지 않고, 다음 결제를 두 겹으로 끊는다.
 *     일할 환불의 이용 비율은 이번 달 창의 사용 장 수(subscription_usage)로 잰다.
 *  6. 손실 처리 상한 — 접수는 `open_charge_cancel_request` RPC 단일 경로(잠금 아래 판정),
 *     손실 0 취소는 상한과 무관, 마스터는 면제.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { revokePaymentPasses } from '@/lib/services/pass-revoke'
import { requestTossCancel } from '@/lib/domain/payment/toss-cancel'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))
jest.mock('@/lib/services/pass-revoke', () => ({ revokePaymentPasses: jest.fn() }))
jest.mock('@/lib/domain/payment/toss-cancel', () => ({ requestTossCancel: jest.fn() }))

import { getChargeCancelOverview, submitChargeCancel, submitMembershipCancel } from '../cancel-request'

import { SUPPORT_LABEL } from '@/lib/domain/support/contact'
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockRevoke = revokePaymentPasses as jest.MockedFunction<typeof revokePaymentPasses>
const mockTossCancel = requestTossCancel as jest.MockedFunction<typeof requestTossCancel>

const DAY = 86_400_000

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

interface CallLog {
  table: string
  method: string
  args: unknown[]
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'neq',
  'in',
  'order',
  'limit',
  'is',
  'lt',
  'gt',
  'gte',
] as const

/**
 * Supabase 쿼리 빌더 대역.
 * 모든 체인 메서드가 자기 자신을 돌려주고, `maybeSingle()`·await 둘 다 준비된 결과로 끝난다.
 */
function makeAdmin(
  results: Record<string, QueryResult[]>,
  rpcResult?: QueryResult,
  rpcByName: Record<string, QueryResult> = {}
) {
  const calls: CallLog[] = []
  const cursor: Record<string, number> = {}

  const from = jest.fn((table: string) => {
    const index = cursor[table] ?? 0
    cursor[table] = index + 1
    const queue = results[table] ?? []
    const result = queue[Math.min(index, queue.length - 1)] ?? { data: null, error: null }

    const builder: Record<string, unknown> = {}
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return builder
      }
    }
    builder.maybeSingle = () => Promise.resolve(result)
    builder.single = () => Promise.resolve(result)
    builder.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve)
    return builder
  })

  const rpc = jest.fn((name: string, args: unknown) => {
    calls.push({ table: `rpc:${name}`, method: 'rpc', args: [args] })
    return Promise.resolve(rpcByName[name] ?? rpcResult ?? { data: { ok: true, request_id: 'req-1' }, error: null })
  })

  return { client: { from, rpc } as unknown as ReturnType<typeof createAdminClient>, from, rpc, calls }
}

/** 사용자 세션 대역. 상한 면제 판정이 `profiles.role` 을 읽으므로 그 경로도 함께 세운다. */
function authAs(userId: string | null, role: string = 'user') {
  const profileBuilder: Record<string, unknown> = {}
  for (const method of CHAIN_METHODS) {
    profileBuilder[method] = () => profileBuilder
  }
  profileBuilder.single = () => Promise.resolve({ data: { role }, error: null })
  profileBuilder.maybeSingle = () => Promise.resolve({ data: { role }, error: null })

  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
    from: jest.fn(() => profileBuilder),
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

/** 이동창 안의 손실 처리 이력 한 건. */
function lossHistory(lossAmount: number, daysAgo: number = 30) {
  return { loss_amount: lossAmount, created_at: new Date(Date.now() - daysAgo * DAY).toISOString() }
}

function allowRate() {
  mockRateLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60_000 })
}

/** 이용권 10장(39,800원) 구매 결제. */
const PAYMENT = {
  id: 'pay-1',
  order_id: 'PASS_order-1',
  payment_key: 'pk_live_1',
  amount: 39_800,
  cancelled_amount: 0,
  credits_purchased: 10,
  credits_remaining: 10,
  status: 'completed',
  bokchae_type: 'pass',
  created_at: new Date(Date.now() - DAY).toISOString(),
}

/** 그 결제로 발급된 이용권 행 — 쓰지 않은 장 수를 정한다. */
function grantRow(unused: number) {
  return { payment_id: 'pay-1', quantity: 10, consumed: 10 - unused, revoked: 0 }
}

function chargeAdmin(
  options: {
    payment?: unknown
    /** 그 결제로 발급된 이용권 중 쓰지 않은 장 수 */
    unused?: number
    /** 발급 이용권 조회 오류 */
    grantsError?: { message: string }
    /** 이동창 안의 손실 처리 이력 — 상한 사전 판정이 읽는다 */
    lossHistory?: unknown[]
    /** open_charge_cancel_request 응답 대역 */
    rpc?: QueryResult
    /** 환불은 나갔는데 회수가 끝나지 않은 앞선 취소(REVOKE_PENDING) 행 */
    unsettled?: unknown
  } = {}
) {
  // 손실이 나는 취소만 상한 사용량을 읽는다 — 그 조회가 있을 때만 대기열에 자리를 둔다.
  const lossQuery = options.lossHistory ? [{ data: options.lossHistory, error: null }] : []
  return makeAdmin(
    {
      payments: [{ data: options.payment === undefined ? PAYMENT : options.payment, error: null }],
      entitlement_grants: [
        options.grantsError
          ? { data: null, error: options.grantsError }
          : { data: [grantRow(options.unused ?? 10)], error: null },
      ],
      payment_cancel_requests: [
        // 1) 회수 미완인 앞선 취소 확인 2) 상한 사용량 조회(손실 취소일 때만) 3) 이후 결과 갱신(update)
        { data: options.unsettled ?? null, error: null },
        ...lossQuery,
        { data: null, error: null },
      ],
    },
    options.rpc
  )
}

function rpcArgs(admin: ReturnType<typeof makeAdmin>): Record<string, unknown> {
  const call = admin.calls.find((entry) => entry.table === 'rpc:open_charge_cancel_request')
  return (call?.args[0] ?? {}) as Record<string, unknown>
}

function tossOk() {
  mockTossCancel.mockResolvedValue({
    ok: true,
    payment: {
      status: 'CANCELED',
      totalAmount: 39_800,
      balanceAmount: 0,
      cancels: [{ cancelAmount: 39_800, cancelStatus: 'DONE', transactionKey: 'tk-1' }],
    },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  allowRate()
  authAs('user-1')
  mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 10, shortfall: 0, userId: 'user-1' })
  tossOk()
})

describe('submitChargeCancel — 인가·한도', () => {
  it('미로그인은 아무것도 하지 않는다', async () => {
    authAs(null)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('결제 조회에 본인 user_id 를 반드시 건다 — 남의 결제 취소 차단', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    const paymentEq = admin.calls.filter((call) => call.table === 'payments' && call.method === 'eq')
    expect(paymentEq).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ['id', 'pay-1'] }),
        expect.objectContaining({ args: ['user_id', 'user-1'] }),
      ])
    )
  })

  it('발급 이용권 조회에도 본인 user_id 와 그 결제 id 를 건다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    const grantFilters = admin.calls.filter((call) => call.table === 'entitlement_grants')
    expect(grantFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: 'eq', args: ['user_id', 'user-1'] }),
        expect.objectContaining({ method: 'in', args: ['payment_id', ['pay-1']] }),
      ])
    )
  })

  it('남의 결제(조회 결과 없음)는 취소되지 않는다', async () => {
    const admin = chargeAdmin({ payment: null })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'someone-else', reasonCode: 'MISTAKE' })

    expect(result).toEqual({ success: false, error: '취소할 결제를 찾을 수 없습니다.' })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('rate limit 이 토스 호출보다 먼저 끊는다', async () => {
    mockRateLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: Date.now() + 60_000 })
    mockCreateAdmin.mockReturnValue(chargeAdmin().client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(false)
    expect(mockRateLimit).toHaveBeenCalledWith('payment-cancel:user-1', {
      interval: 60_000,
      uniqueTokenPerInterval: 5,
    })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('사유가 없으면 접수하지 않는다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin().client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: '' })

    expect(result).toEqual({ success: false, error: '취소 사유를 선택해주세요.' })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('🔴 발급 이용권을 확인하지 못하면 판정을 추측하지 않고 접수하지 않는다', async () => {
    const admin = chargeAdmin({ grantsError: { message: 'timeout' } })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(false)
    expect(mockTossCancel).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })
})

describe('submitChargeCancel — 세 갈래 분기', () => {
  it('(a) 한 장도 안 썼으면 바로 취소하고 전액 환불한다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ unused: 10 }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toMatchObject({ success: true, refundAmount: 39_800, lossCredits: 0, revokedPasses: 10 })
    expect(mockTossCancel).toHaveBeenCalledWith(
      expect.objectContaining({ paymentKey: 'pk_live_1', cancelAmount: 39_800 })
    )
  })

  it('(b) 쓴 장이 있으면 손실 처리 동의 전에는 토스를 부르지 않는다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ unused: 4 }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE' })

    expect(result.success).toBe(false)
    expect(result.requiresLossAcknowledgement).toBe(true)
    expect(result.error).toContain('이용권 중 6장을 이미 사용')
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('(b) 손실 처리에 동의하면 진행하고 부족분을 기록한다', async () => {
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 4, shortfall: 6, userId: 'user-1' })
    mockCreateAdmin.mockReturnValue(chargeAdmin({ unused: 4 }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result).toMatchObject({ success: true, refundAmount: 39_800, lossCredits: 6, revokedPasses: 4 })
  })

  it('(c) 이미 취소된 결제는 접수 자체를 막는다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ payment: { ...PAYMENT, status: 'refunded' } }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toEqual({ success: false, error: '이미 취소된 결제입니다.' })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('(c) 옛 복채 충전 결제는 셀프 취소 대상이 아니다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ payment: { ...PAYMENT, bokchae_type: 'charge' } }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toEqual({ success: false, error: '이용권 구매 결제만 취소할 수 있습니다.' })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })
})

describe('submitChargeCancel — 회수 경로', () => {
  it('수수료로 부분 취소가 되더라도 이용권은 전량 회수시킨다', async () => {
    const admin = chargeAdmin({ payment: { ...PAYMENT, created_at: new Date(Date.now() - 30 * DAY).toISOString() } })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    // 30일 경과 → 10% 수수료 → 토스에는 35,820원 부분 취소
    expect(mockTossCancel).toHaveBeenCalledWith(expect.objectContaining({ cancelAmount: 35_820 }))
    expect(result.refundAmount).toBe(35_820)

    // 그러나 회수는 전체 취소 — 금액 비율이 아니라 발급 전량이 목표다. 10% 어치 이용권이 남으면 안 된다.
    expect(mockRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'PASS_order-1',
        selfCancel: { fullRevoke: true, targetRevoked: 10 },
      })
    )
  })

  it('🔴 회수 호출이 실패한 것은 손실이 아니다 — 미사용 취소가 손실 상한을 깎지 않고, 회수 미완으로 표시·경보한다', async () => {
    mockRevoke.mockResolvedValue({ applied: false, reason: 'RPC_FAILED', revoked: 0, shortfall: 10, userId: 'user-1' })
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toMatchObject({ success: true, lossCredits: 0 })
    const settle = admin.calls.find(
      (call) =>
        call.table === 'payment_cancel_requests' &&
        call.method === 'update' &&
        (call.args[0] as { status?: string }).status === 'SUCCEEDED'
    )
    expect(settle?.args[0]).toMatchObject({ loss_credits: 0, loss_amount: 0, toss_error_code: 'REVOKE_PENDING' })
  })

  it('🔴 접수 직전에 이용권이 쓰였으면(STATE_CHANGED) 토스를 부르지 않는다', async () => {
    const admin = chargeAdmin({ rpc: { data: { ok: false, blocked_reason: 'STATE_CHANGED' }, error: null } })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('사용 내역이 바뀌었습니다')
    expect(mockTossCancel).not.toHaveBeenCalled()
    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('발급 기록이 없는 결제는 환불을 내보내지 않는다', async () => {
    const admin = makeAdmin({
      payments: [{ data: PAYMENT, error: null }],
      entitlement_grants: [{ data: [], error: null }],
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(false)
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('🔴 앞선 취소의 환불은 나갔는데 회수가 끝나지 않은 결제는 다시 접수하지 않는다 — 같은 장으로 환불이 두 번 나간다', async () => {
    const admin = chargeAdmin({ unsettled: { id: 'req-old' } })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(false)
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('🔴 토스 취소 결과를 모르면(응답 유실) 접수를 실패로 닫지 않는다 — 닫으면 이용권이 풀리고 재시도가 이중 환불이 된다', async () => {
    mockTossCancel.mockResolvedValue({
      ok: false,
      code: 'NETWORK_ERROR',
      message: '취소 처리 결과를 확인하고 있습니다.',
      retryable: true,
      httpStatus: 0,
      outcomeUnknown: true,
    })
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(false)
    expect(mockRevoke).not.toHaveBeenCalled()
    const updates = admin.calls.filter((call) => call.table === 'payment_cancel_requests' && call.method === 'update')
    expect(updates.map((call) => (call.args[0] as { status?: string }).status)).not.toContain('FAILED')
    expect(updates[0]?.args[0]).toMatchObject({ toss_error_code: 'NETWORK_ERROR' })
  })

  it('화면이 보여 준 환불 금액과 서버가 다시 계산한 금액이 다르면 접수하지 않고 화면을 새로 읽게 한다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE', expectedRefundAmount: 1 })

    expect(result).toMatchObject({ success: false, stateChanged: true })
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(mockTossCancel).not.toHaveBeenCalled()
  })
})

describe('submitChargeCancel — 일부 사용: 쓰지 않은 장만 환불(약관 제7조 제2항 기본 산식)', () => {
  function partialTossOk(cancelAmount: number) {
    mockTossCancel.mockResolvedValue({
      ok: true,
      payment: {
        status: 'PARTIAL_CANCELED',
        totalAmount: 39_800,
        balanceAmount: 39_800 - cancelAmount,
        cancels: [{ cancelAmount, cancelStatus: 'DONE', transactionKey: 'tk-unused' }],
      },
    })
  }

  it('10장 중 1장 사용·7일 이내 — 9장 값(35,820원)만 환불하고 미사용 9장을 회수한다. 손실은 없다', async () => {
    partialTossOk(35_820)
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 9, shortfall: 0, userId: 'user-1' })
    const admin = chargeAdmin({ unused: 9 })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'LOW_USAGE', unusedOnly: true })

    expect(result).toMatchObject({ success: true, refundAmount: 35_820, lossCredits: 0, revokedPasses: 9 })
    expect(mockTossCancel).toHaveBeenCalledWith(expect.objectContaining({ cancelAmount: 35_820 }))
    expect(mockRevoke).toHaveBeenCalledWith(
      expect.objectContaining({ selfCancel: { fullRevoke: false, targetRevoked: 9 } })
    )
    expect(rpcArgs(admin)).toMatchObject({
      p_verdict: 'PARTIALLY_SPENT',
      p_accepted_loss: false,
      p_recoverable_credits: 9,
      p_loss_credits: 0,
      p_loss_amount: 0,
      p_gross_amount: 35_820,
      p_fee_amount: 0,
      p_refund_amount: 35_820,
    })
  })

  it('7일 경과면 미사용분의 90% — 35,820 × 0.9 = 32,238원, 회수는 그래도 미사용 9장 전부', async () => {
    partialTossOk(32_238)
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 9, shortfall: 0, userId: 'user-1' })
    const admin = chargeAdmin({
      unused: 9,
      payment: { ...PAYMENT, created_at: new Date(Date.now() - 30 * DAY).toISOString() },
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'LOW_USAGE', unusedOnly: true })

    expect(result).toMatchObject({ success: true, refundAmount: 32_238, lossCredits: 0 })
    expect(mockRevoke).toHaveBeenCalledWith(
      expect.objectContaining({ selfCancel: { fullRevoke: false, targetRevoked: 9 } })
    )
  })

  it('🔴 손실이 없으므로 손실 처리 상한에 걸린 계정도 미사용분 환불은 된다', async () => {
    partialTossOk(35_820)
    const admin = chargeAdmin({ unused: 9, lossHistory: [lossHistory(50_000), lossHistory(60_000)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'LOW_USAGE', unusedOnly: true })

    expect(result.success).toBe(true)
    expect(result.lossCapBlocked).toBeUndefined()
  })

  it('전부 써서 돌려줄 장이 없으면 미사용분 환불을 접수하지 않는다', async () => {
    const admin = chargeAdmin({ unused: 0 })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'LOW_USAGE', unusedOnly: true })

    expect(result.success).toBe(false)
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('미사용분을 이미 돌려받은 결제는 다시 취소할 수 없다 — 남은 금액은 쓴 이용권과 수수료의 몫이다', async () => {
    const admin = chargeAdmin({
      unused: 0,
      payment: { ...PAYMENT, cancelled_amount: 32_238, credits_remaining: 1 },
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'LOW_USAGE', acceptLoss: true })

    expect(result.success).toBe(false)
    expect(result.error).toContain('이미 환불')
    expect(mockTossCancel).not.toHaveBeenCalled()
  })
})

describe('submitChargeCancel — 회수 경로(계속)', () => {
  it('멱등키는 토스가 돌려준 취소 거래로 만들어지도록 cancels 를 그대로 넘긴다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin().client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(mockRevoke).toHaveBeenCalledWith(
      expect.objectContaining({
        cancels: [{ cancelAmount: 39_800, cancelStatus: 'DONE', transactionKey: 'tk-1' }],
      })
    )
  })

  it('토스 취소가 실패하면 이용권을 회수하지 않는다', async () => {
    mockTossCancel.mockResolvedValue({
      ok: false,
      code: 'ALREADY_CANCELED_PAYMENT',
      message: '이미 취소된 결제입니다.',
      retryable: false,
      httpStatus: 400,
    })
    mockCreateAdmin.mockReturnValue(chargeAdmin().client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toEqual({ success: false, error: '이미 취소된 결제입니다.' })
    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('발급 표를 직접 쓰지 않는다 — 이용권 변경은 RPC 전용, 옛 지갑 표는 읽지도 않는다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    const grantWrites = admin.calls.filter(
      (call) => call.table === 'entitlement_grants' && ['insert', 'update', 'delete'].includes(call.method)
    )
    expect(grantWrites).toHaveLength(0)
    expect(admin.calls.some((call) => call.table === 'wallets')).toBe(false)
  })

  it('오래 굳은 REQUESTED 요청을 실패로 확정해 영구 잠금을 막는다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    // 굳은 요청 정리는 접수 RPC 안(같은 잠금 아래)에서 일어난다 — 시한만 넘긴다.
    // 애플리케이션에서 먼저 지우면 상한 집계와 정리 사이에 틈이 생긴다.
    expect(rpcArgs(admin).p_stale_after_minutes).toBe(10)
  })

  it('🔴 요청 생성은 RPC 단일 경로 — 표에 직접 INSERT 하지 않는다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    const directInsert = admin.calls.filter(
      (call) => call.table === 'payment_cancel_requests' && call.method === 'insert'
    )
    expect(directInsert).toHaveLength(0)
    expect(admin.rpc).toHaveBeenCalledWith('open_charge_cancel_request', expect.any(Object))
  })

  it('취소 요청 기록에 사유·메모·장 수가 남는다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'OTHER', memo: '<b>화면이 안 떠요</b>' })

    expect(rpcArgs(admin)).toMatchObject({
      p_user_id: 'user-1',
      p_payment_id: 'pay-1',
      p_reason_code: 'OTHER',
      p_reason_memo: 'b화면이 안 떠요/b',
      p_verdict: 'FULL_REFUNDABLE',
      p_granted_credits: 10,
      p_recoverable_credits: 10,
    })
  })
})

describe('submitChargeCancel — 손실 처리 상한', () => {
  /** 손실이 나는 상황: 발급 10장 중 6장 사용(4장 남음) */
  const SPENT = { unused: 4 }

  it('상한 미만이면 그대로 통과한다', async () => {
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(30_000)] })
    mockCreateAdmin.mockReturnValue(admin.client)
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 4, shortfall: 6, userId: 'user-1' })

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.success).toBe(true)
    expect(mockTossCancel).toHaveBeenCalled()
  })

  it('횟수 상한(연 2회)을 채우면 토스를 부르지 않고 막는다', async () => {
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(10_000, 300), lossHistory(10_000, 100)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.success).toBe(false)
    expect(result.lossCapBlocked).toBe(true)
    expect(result.error).toContain('1년 2회')
    expect(mockTossCancel).not.toHaveBeenCalled()
    expect(mockRevoke).not.toHaveBeenCalled()
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('금액 상한(연 10만원)을 채우면 횟수가 남아 있어도 막는다', async () => {
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(100_000, 20)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.success).toBe(false)
    expect(result.lossCapBlocked).toBe(true)
    // 남은 금액을 알려주면 그게 곧 인출 한도 지도가 된다.
    expect(result.error).not.toContain('10만원')
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('창(365일)을 벗어난 이력은 세지 않는다 — 조회 자체에 창 시작이 걸린다', async () => {
    const admin = chargeAdmin({ ...SPENT, lossHistory: [] })
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    const windowFilter = admin.calls.find((call) => call.table === 'payment_cancel_requests' && call.method === 'gte')
    expect(windowFilter?.args[0]).toBe('created_at')
    const since = new Date(String(windowFilter?.args[1])).getTime()
    expect(Math.round((Date.now() - since) / DAY)).toBe(365)

    // 진행 중(REQUESTED)도 함께 센다 — 따닥으로 두 칸을 한 번에 넘기지 못하게.
    const statusFilter = admin.calls.find((call) => call.table === 'payment_cancel_requests' && call.method === 'in')
    expect(statusFilter?.args[1]).toEqual(['REQUESTED', 'SUCCEEDED'])
  })

  it('🔴 이용권을 안 쓴 정상 취소는 상한과 무관하다 — 사용량 조회조차 하지 않는다', async () => {
    const admin = chargeAdmin({ unused: 10, lossHistory: [lossHistory(300_000), lossHistory(300_000)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result.success).toBe(true)
    // 손실 취소 이력이 상한을 한참 넘겼는데도 통과했다 = 이 경로가 상한을 보지 않는다.
    const capRead = admin.calls.filter((call) => call.table === 'payment_cancel_requests' && call.method === 'gt')
    expect(capRead).toHaveLength(0)
    expect(rpcArgs(admin).p_loss_credits).toBe(0)
  })

  it('마스터(admin)는 면제된다 — 판정은 privileges.ts 단일 기준', async () => {
    authAs('user-1', 'admin')
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(300_000), lossHistory(300_000)] })
    mockCreateAdmin.mockReturnValue(admin.client)
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 4, shortfall: 6, userId: 'user-1' })

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.success).toBe(true)
    expect(rpcArgs(admin).p_exempt).toBe(true)
  })

  it('테스터는 면제가 아니다 — 무제한 권한은 마스터뿐', async () => {
    authAs('user-1', 'tester')
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(10_000, 300), lossHistory(10_000, 100)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.lossCapBlocked).toBe(true)
  })

  it('🔴 따닥 — 사전 판정을 통과해도 잠금 아래 RPC 가 막으면 토스를 부르지 않는다', async () => {
    const admin = chargeAdmin({
      ...SPENT,
      lossHistory: [],
      rpc: {
        data: {
          ok: false,
          blocked_reason: 'COUNT_EXCEEDED',
          next_available_at: new Date(Date.now() + 100 * DAY).toISOString(),
        },
        error: null,
      },
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.success).toBe(false)
    expect(result.lossCapBlocked).toBe(true)
    expect(mockTossCancel).not.toHaveBeenCalled()
    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('상한 판정은 2차 동의보다 «먼저» 나온다 — 동의까지 받고 거절하지 않는다', async () => {
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(10_000, 300), lossHistory(10_000, 100)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE' })

    expect(result.lossCapBlocked).toBe(true)
    expect(result.requiresLossAcknowledgement).toBeUndefined()
  })

  it('RPC 가 중복 요청을 알리면 상한 문구가 아니라 처리 중 안내를 준다', async () => {
    const admin = chargeAdmin({
      ...SPENT,
      rpc: { data: { ok: false, blocked_reason: 'DUPLICATE_OPEN_REQUEST' }, error: null },
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result.lossCapBlocked).toBeUndefined()
    expect(result.error).toContain('이미 처리 중인')
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('상한 수치는 RPC 로도 함께 넘긴다 — DB 가 최종 판정할 근거', async () => {
    const admin = chargeAdmin({ ...SPENT })
    mockCreateAdmin.mockReturnValue(admin.client)
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 4, shortfall: 6, userId: 'user-1' })

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(rpcArgs(admin)).toMatchObject({
      p_max_count: 2,
      p_max_amount: 100_000,
      p_window_days: 365,
      p_loss_credits: 6,
    })
  })
})

describe('getChargeCancelOverview — 화면에 내려보내는 상태', () => {
  function overviewAdmin(options: { unused: number; lossHistory?: unknown[] }) {
    return makeAdmin({
      payments: [{ data: [PAYMENT], error: null }],
      entitlement_grants: [{ data: [grantRow(options.unused)], error: null }],
      payment_cancel_requests: [{ data: options.lossHistory ?? [], error: null }],
    })
  }

  it('이용권 구매 결제만 보여준다 — 옛 복채 충전은 목록에 없다', async () => {
    const admin = overviewAdmin({ unused: 10 })
    mockCreateAdmin.mockReturnValue(admin.client)

    await getChargeCancelOverview()

    const kindFilter = admin.calls.find(
      (call) => call.table === 'payments' && call.method === 'eq' && call.args[0] === 'bokchae_type'
    )
    expect(kindFilter?.args[1]).toBe('pass')
  })

  it('🔴 옛 지갑 잔액을 DTO 에 싣지 않는다', async () => {
    mockCreateAdmin.mockReturnValue(overviewAdmin({ unused: 10 }).client)

    const overview = await getChargeCancelOverview()

    expect(overview).not.toHaveProperty('walletBalance')
  })

  it('손실 취소 대상이 없으면 상한을 조회하지 않는다 — 정상 사용자에게 질의 0회', async () => {
    const admin = overviewAdmin({ unused: 10 })
    mockCreateAdmin.mockReturnValue(admin.client)

    const overview = await getChargeCancelOverview()

    expect(overview.items[0].plan.verdict).toBe('FULL_REFUNDABLE')
    expect(overview.items[0].packLabel).toBe('이용권 10장')
    expect(overview.lossCap).toEqual({ available: true, nextAvailableAt: null })
    expect(admin.calls.some((call) => call.table === 'payment_cancel_requests')).toBe(false)
  })

  it('상한을 소진한 계정에는 손실 경로를 닫아 보여준다', async () => {
    const admin = overviewAdmin({
      unused: 4,
      lossHistory: [lossHistory(10_000, 300), lossHistory(10_000, 100)],
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const overview = await getChargeCancelOverview()

    expect(overview.items[0].plan.verdict).toBe('PARTIALLY_SPENT')
    expect(overview.lossCap.available).toBe(false)
    expect(overview.lossCap.message).toContain(SUPPORT_LABEL)
  })

  it('🔴 상한 DTO 에 잔여 횟수·금액을 싣지 않는다 — 「아직 한 번 남았네」 유인 차단', async () => {
    const admin = overviewAdmin({ unused: 4, lossHistory: [lossHistory(37_000, 10)] })
    mockCreateAdmin.mockReturnValue(admin.client)

    const overview = await getChargeCancelOverview()

    expect(overview.lossCap).toEqual({ available: true, nextAvailableAt: null })
    expect(JSON.stringify(overview.lossCap)).not.toContain('37000')
  })
})

describe('submitMembershipCancel', () => {
  // 이용일수는 올림이라 «정확히 5일 전»으로 잡으면 밀리초 오차만으로 6일이 된다.
  // 하루 한가운데(4.5일 전)에 두어 시간이 흘러도 «5일 이용»으로 고정한다.
  const START = new Date(Date.now() - 4.5 * DAY).toISOString()
  const END = new Date(Date.now() + 25.5 * DAY).toISOString()

  function membershipAdmin(
    overrides: {
      lastPayment?: unknown
      used?: number
      usageError?: { message: string }
      /** open_membership_cancel_request 응답 대역 — 기본은 접수 성공 + 잠금 아래 읽은 사용량 */
      open?: QueryResult
    } = {}
  ) {
    const open = overrides.open ?? {
      data: { ok: true, request_id: 'req-2', used: overrides.used ?? 0 },
      error: null,
    }
    return makeAdmin(
      {
        subscriptions: [
          {
            data: {
              id: 'sub-1',
              status: 'ACTIVE',
              current_period_start: START,
              current_period_end: END,
              start_date: null,
              end_date: null,
              next_billing_date: END,
              plan: { name: '싱글 멤버십', tier: 'SINGLE', price: 12_800, monthly_passes: 5 },
            },
            error: null,
          },
          { data: null, error: null },
        ],
        subscription_payments: [
          {
            data:
              overrides.lastPayment === undefined
                ? { id: 'subpay-1', payment_key: 'pk_sub_1', amount: 12_800, cancelled_amount: 0 }
                : overrides.lastPayment,
            error: null,
          },
          { data: null, error: null },
        ],
        subscription_usage: [
          overrides.usageError
            ? { data: null, error: overrides.usageError }
            : { data: { used: overrides.used ?? 0 }, error: null },
        ],
        payment_cancel_requests: [
          { data: { id: 'req-2' }, error: null },
          { data: null, error: null },
        ],
      },
      undefined,
      { open_membership_cancel_request: open }
    )
  }

  it('기본(기간 만료 해지)은 환불도 토스 호출도 없다', async () => {
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'PERIOD_END', reasonCode: 'LOW_USAGE' })

    expect(result).toMatchObject({ success: true, refundAmount: 0 })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('다음 결제를 두 겹으로 끊는다 — status CANCELLED + next_billing_date null', async () => {
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitMembershipCancel({ mode: 'PERIOD_END', reasonCode: 'LOW_USAGE' })

    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).toMatchObject({ status: 'CANCELLED', next_billing_date: null })
  })

  it('기간 만료 해지는 이용 기간을 앞당기지 않는다(약관 제6조 제5항)', async () => {
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitMembershipCancel({ mode: 'PERIOD_END', reasonCode: 'LOW_USAGE' })

    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).not.toHaveProperty('current_period_end')
  })

  it('즉시 해지는 잔여기간 일할 금액을 부분 취소로 환불한다', async () => {
    mockTossCancel.mockResolvedValue({
      ok: true,
      payment: { status: 'PARTIAL_CANCELED', totalAmount: 12_800, balanceAmount: 2_133, cancels: [] },
    })
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    // 30일 중 5일 이용 · 이번 달 이용권 미사용 → 12,800 × 25/30 = 10,666.7 → 10,667
    expect(result).toMatchObject({ success: true, refundAmount: 10_667 })
    expect(mockTossCancel).toHaveBeenCalledWith(
      expect.objectContaining({ paymentKey: 'pk_sub_1', cancelAmount: 10_667 })
    )

    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).toHaveProperty('current_period_end')
  })

  it('🔴 즉시 해지의 사용량은 접수 RPC 가 잠금 아래에서 읽는다 — 사용 경로와 같은 창(구독 시작일 앵커)을 넘긴다', async () => {
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    const open = admin.calls.find((call) => call.table === 'rpc:open_membership_cancel_request')
    expect(open?.args[0]).toMatchObject({
      p_user_id: 'user-1',
      p_subscription_id: 'sub-1',
      p_subscription_payment_id: 'subpay-1',
      p_window_start: START,
      p_gross_amount: 12_800,
    })
    // 즉시 해지 접수를 표에 직접 넣지 않는다 — 잠금 밖에서 넣으면 토스를 기다리는 사이 월 몫이 쓰인다.
    const directInsert = admin.calls.filter(
      (call) => call.table === 'payment_cancel_requests' && call.method === 'insert'
    )
    expect(directInsert).toHaveLength(0)
  })

  it('이미 진행 중인 해지 접수가 있으면 환불을 또 내보내지 않는다', async () => {
    const admin = membershipAdmin({
      open: { data: { ok: false, blocked_reason: 'DUPLICATE_OPEN_REQUEST' }, error: null },
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(result.success).toBe(false)
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('이번 달 이용권을 많이 썼으면 그 비율만큼 공제한다 — 기간보다 크면 이용권 비율이 이긴다', async () => {
    mockCreateAdmin.mockReturnValue(membershipAdmin({ used: 4 }).client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    // 4/5 = 80% 공제 → 12,800 × 0.2 = 2,560
    expect(result).toMatchObject({ success: true, refundAmount: 2_560 })
  })

  it('멤버십은 지급한 것이 없으니 회수 RPC 를 부르지 않는다', async () => {
    mockCreateAdmin.mockReturnValue(membershipAdmin().client)

    await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('이번 달 이용권을 다 쓴 뒤 즉시 해지하면 환불 없이 해지만 된다', async () => {
    const admin = membershipAdmin({ used: 5 })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(result).toMatchObject({ success: true, refundAmount: 0 })
    // 환불액 0원이면 토스 취소 API 를 부르지 않는다(0원 취소는 오류가 된다).
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('🔴 사용량을 확인하지 못하면 즉시 해지(환불)를 막는다 — 환불액을 추측하지 않는다', async () => {
    const admin = membershipAdmin({ open: { data: null, error: { message: 'timeout' } } })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(result.success).toBe(false)
    expect(mockTossCancel).not.toHaveBeenCalled()
    expect(admin.calls.some((call) => call.table === 'subscriptions' && call.method === 'update')).toBe(false)
  })

  it('사용량 조회가 실패해도 기간 만료 해지는 된다 — 환불이 없으니 사용량이 필요 없다', async () => {
    mockCreateAdmin.mockReturnValue(membershipAdmin({ usageError: { message: 'timeout' } }).client)

    const result = await submitMembershipCancel({ mode: 'PERIOD_END', reasonCode: 'LOW_USAGE' })

    expect(result).toMatchObject({ success: true, refundAmount: 0 })
  })

  it('환불 대상 결제가 없으면 즉시 해지를 막는다', async () => {
    mockCreateAdmin.mockReturnValue(membershipAdmin({ lastPayment: null }).client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('환불 대상 결제')
  })

  it('알 수 없는 해지 방식은 거부한다', async () => {
    mockCreateAdmin.mockReturnValue(membershipAdmin().client)

    const result = await submitMembershipCancel({ mode: 'DELETE_EVERYTHING', reasonCode: 'PRICE' })

    expect(result).toEqual({ success: false, error: '해지 방식을 선택해주세요.' })
  })
})
