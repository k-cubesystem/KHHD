/**
 * 결제 취소 셀프서비스 서버 액션의 «공개 엔드포인트» 계약.
 *
 * 못 박는 것:
 *  1. 인가 — 결제 조회에 반드시 `user_id = 본인` 이 걸린다(남의 결제 취소 차단).
 *  2. rate limit 이 토스 호출보다 먼저 끊는다.
 *  3. (b) 갈래는 손실 처리 동의 없이는 토스를 부르지 않는다.
 *  4. 회수는 `clawbackPaymentCredits` 단일 경로 + **전액 회수 강제**(수수료 때문에 복채가 남으면 안 된다).
 *  5. 멤버십 해지는 지갑을 건드리지 않고, 다음 결제를 두 겹으로 끊는다.
 *  6. 손실 처리 상한 — 접수는 `open_charge_cancel_request` RPC 단일 경로(잠금 아래 판정),
 *     손실 0 취소는 상한과 무관, 마스터는 면제.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { clawbackPaymentCredits } from '@/lib/services/wallet-grant'
import { requestTossCancel } from '@/lib/domain/payment/toss-cancel'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))
jest.mock('@/lib/services/wallet-grant', () => ({ clawbackPaymentCredits: jest.fn() }))
jest.mock('@/lib/domain/payment/toss-cancel', () => ({ requestTossCancel: jest.fn() }))

import { getChargeCancelOverview, submitChargeCancel, submitMembershipCancel } from '../cancel-request'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockClawback = clawbackPaymentCredits as jest.MockedFunction<typeof clawbackPaymentCredits>
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
function makeAdmin(results: Record<string, QueryResult[]>, rpcResult?: QueryResult) {
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
    return Promise.resolve(rpcResult ?? { data: { ok: true, request_id: 'req-1' }, error: null })
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

const PAYMENT = {
  id: 'pay-1',
  order_id: 'order-1',
  payment_key: 'pk_live_1',
  amount: 10_000,
  cancelled_amount: 0,
  credits_purchased: 20,
  credits_remaining: 20,
  status: 'completed',
  bokchae_type: 'charge',
  created_at: new Date(Date.now() - DAY).toISOString(),
}

function chargeAdmin(
  options: {
    payment?: unknown
    balance?: number
    /** 이동창 안의 손실 처리 이력 — 상한 사전 판정이 읽는다 */
    lossHistory?: unknown[]
    /** open_charge_cancel_request 응답 대역 */
    rpc?: QueryResult
  } = {}
) {
  return makeAdmin(
    {
      payments: [{ data: options.payment === undefined ? PAYMENT : options.payment, error: null }],
      wallets: [{ data: { balance: options.balance ?? 20 }, error: null }],
      payment_cancel_requests: [
        // 1) 상한 사용량 조회(손실 취소일 때만) 2) 이후 결과 갱신(update)
        { data: options.lossHistory ?? [], error: null },
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
      totalAmount: 10_000,
      balanceAmount: 0,
      cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-1' }],
    },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  allowRate()
  authAs('user-1')
  mockClawback.mockResolvedValue({ applied: true, reason: 'OK', clawed: 20, shortfall: 0, userId: 'user-1' })
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
})

describe('submitChargeCancel — 세 갈래 분기', () => {
  it('(a) 전액 남아 있으면 바로 취소하고 전액 환불한다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ balance: 50 }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toMatchObject({ success: true, refundAmount: 10_000, lossCredits: 0, clawedCredits: 20 })
    expect(mockTossCancel).toHaveBeenCalledWith(
      expect.objectContaining({ paymentKey: 'pk_live_1', cancelAmount: 10_000 })
    )
  })

  it('(b) 소진분이 있으면 손실 처리 동의 전에는 토스를 부르지 않는다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ balance: 8 }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE' })

    expect(result.success).toBe(false)
    expect(result.requiresLossAcknowledgement).toBe(true)
    expect(result.error).toContain('12만냥')
    expect(mockTossCancel).not.toHaveBeenCalled()
  })

  it('(b) 손실 처리에 동의하면 진행하고 부족분을 기록한다', async () => {
    mockClawback.mockResolvedValue({ applied: true, reason: 'OK', clawed: 8, shortfall: 12, userId: 'user-1' })
    mockCreateAdmin.mockReturnValue(chargeAdmin({ balance: 8 }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(result).toMatchObject({ success: true, refundAmount: 10_000, lossCredits: 12, clawedCredits: 8 })
  })

  it('(c) 이미 취소된 결제는 접수 자체를 막는다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin({ payment: { ...PAYMENT, status: 'refunded' } }).client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(result).toEqual({ success: false, error: '이미 취소된 결제입니다.' })
    expect(mockTossCancel).not.toHaveBeenCalled()
  })
})

describe('submitChargeCancel — 회수 경로', () => {
  it('수수료로 부분 취소가 되더라도 복채는 전량 회수시킨다', async () => {
    const admin = chargeAdmin({ payment: { ...PAYMENT, created_at: new Date(Date.now() - 30 * DAY).toISOString() } })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    // 30일 경과 → 10% 수수료 → 토스에는 9,000원 부분 취소
    expect(mockTossCancel).toHaveBeenCalledWith(expect.objectContaining({ cancelAmount: 9_000 }))
    expect(result.refundAmount).toBe(9_000)

    // 그러나 회수는 전액 취소 취급 — 10% 어치 복채가 지갑에 남으면 안 된다.
    expect(mockClawback).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', tossStatus: 'CANCELED', balanceAmount: 0 })
    )
  })

  it('멱등키는 토스가 돌려준 취소 거래로 만들어지도록 cancels 를 그대로 넘긴다', async () => {
    mockCreateAdmin.mockReturnValue(chargeAdmin().client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    expect(mockClawback).toHaveBeenCalledWith(
      expect.objectContaining({
        cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-1' }],
      })
    )
  })

  it('토스 취소가 실패하면 복채를 회수하지 않는다', async () => {
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
    expect(mockClawback).not.toHaveBeenCalled()
  })

  it('지갑 테이블을 직접 쓰지 않는다 — 잔액 변경은 RPC 전용', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'MISTAKE' })

    const walletWrites = admin.calls.filter(
      (call) => call.table === 'wallets' && ['insert', 'update', 'delete'].includes(call.method)
    )
    expect(walletWrites).toHaveLength(0)
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

  it('취소 요청 기록에 사유·메모가 남는다', async () => {
    const admin = chargeAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'OTHER', memo: '<b>화면이 안 떠요</b>' })

    expect(rpcArgs(admin)).toMatchObject({
      p_user_id: 'user-1',
      p_payment_id: 'pay-1',
      p_reason_code: 'OTHER',
      p_reason_memo: 'b화면이 안 떠요/b',
      p_verdict: 'FULL_REFUNDABLE',
    })
  })
})

describe('submitChargeCancel — 손실 처리 상한', () => {
  /** 손실이 나는 상황: 지급 20만냥 중 12만냥 소진(잔액 8) */
  const SPENT = { balance: 8 }

  it('상한 미만이면 그대로 통과한다', async () => {
    const admin = chargeAdmin({ ...SPENT, lossHistory: [lossHistory(30_000)] })
    mockCreateAdmin.mockReturnValue(admin.client)
    mockClawback.mockResolvedValue({ applied: true, reason: 'OK', clawed: 8, shortfall: 12, userId: 'user-1' })

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
    expect(mockClawback).not.toHaveBeenCalled()
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

  it('🔴 복채를 안 쓴 정상 취소는 상한과 무관하다 — 사용량 조회조차 하지 않는다', async () => {
    const admin = chargeAdmin({ balance: 50, lossHistory: [lossHistory(300_000), lossHistory(300_000)] })
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
    mockClawback.mockResolvedValue({ applied: true, reason: 'OK', clawed: 8, shortfall: 12, userId: 'user-1' })

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
    expect(mockClawback).not.toHaveBeenCalled()
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
    mockClawback.mockResolvedValue({ applied: true, reason: 'OK', clawed: 8, shortfall: 12, userId: 'user-1' })

    await submitChargeCancel({ paymentId: 'pay-1', reasonCode: 'PRICE', acceptLoss: true })

    expect(rpcArgs(admin)).toMatchObject({
      p_max_count: 2,
      p_max_amount: 100_000,
      p_window_days: 365,
      p_loss_credits: 12,
    })
  })
})

describe('getChargeCancelOverview — 화면에 내려보내는 상한 상태', () => {
  function overviewAdmin(options: { balance: number; lossHistory?: unknown[] }) {
    return makeAdmin({
      payments: [{ data: [PAYMENT], error: null }],
      wallets: [{ data: { balance: options.balance }, error: null }],
      payment_cancel_requests: [{ data: options.lossHistory ?? [], error: null }],
    })
  }

  it('손실 취소 대상이 없으면 상한을 조회하지 않는다 — 정상 사용자에게 질의 0회', async () => {
    const admin = overviewAdmin({ balance: 50 })
    mockCreateAdmin.mockReturnValue(admin.client)

    const overview = await getChargeCancelOverview()

    expect(overview.items[0].plan.verdict).toBe('FULL_REFUNDABLE')
    expect(overview.lossCap).toEqual({ available: true, nextAvailableAt: null })
    expect(admin.calls.some((call) => call.table === 'payment_cancel_requests')).toBe(false)
  })

  it('상한을 소진한 계정에는 손실 경로를 닫아 보여준다', async () => {
    const admin = overviewAdmin({
      balance: 8,
      lossHistory: [lossHistory(10_000, 300), lossHistory(10_000, 100)],
    })
    mockCreateAdmin.mockReturnValue(admin.client)

    const overview = await getChargeCancelOverview()

    expect(overview.items[0].plan.verdict).toBe('PARTIALLY_SPENT')
    expect(overview.lossCap.available).toBe(false)
    expect(overview.lossCap.message).toContain('고객센터')
  })

  it('🔴 상한 DTO 에 잔여 횟수·금액을 싣지 않는다 — 「아직 한 번 남았네」 유인 차단', async () => {
    const admin = overviewAdmin({ balance: 8, lossHistory: [lossHistory(37_000, 10)] })
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

  function membershipAdmin(overrides: { lastPayment?: unknown; balance?: number } = {}) {
    return makeAdmin({
      subscriptions: [
        {
          data: {
            id: 'sub-1',
            status: 'ACTIVE',
            current_period_start: START,
            current_period_end: END,
            next_billing_date: END,
            plan: { name: '싱글 멤버십', tier: 'SINGLE', price: 9_900, talismans_per_period: 10 },
          },
          error: null,
        },
        { data: null, error: null },
      ],
      subscription_payments: [
        {
          data:
            overrides.lastPayment === undefined
              ? { id: 'subpay-1', payment_key: 'pk_sub_1', amount: 9_900, cancelled_amount: 0 }
              : overrides.lastPayment,
          error: null,
        },
        { data: null, error: null },
      ],
      wallets: [{ data: { balance: overrides.balance ?? 10 }, error: null }],
      payment_cancel_requests: [
        { data: { id: 'req-2' }, error: null },
        { data: null, error: null },
      ],
    })
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

  it('기간 만료 해지는 이용 기간을 앞당기지 않는다(약관 제6조 4항)', async () => {
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    await submitMembershipCancel({ mode: 'PERIOD_END', reasonCode: 'LOW_USAGE' })

    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).not.toHaveProperty('current_period_end')
  })

  it('즉시 해지는 잔여기간 일할 금액을 부분 취소로 환불한다', async () => {
    mockTossCancel.mockResolvedValue({
      ok: true,
      payment: { status: 'PARTIAL_CANCELED', totalAmount: 9_900, balanceAmount: 1_650, cancels: [] },
    })
    const admin = membershipAdmin()
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    // 30일 중 5일 이용 · 복채 미사용 → 9,900 × 25/30 = 8,250
    expect(result).toMatchObject({ success: true, refundAmount: 8_250 })
    expect(mockTossCancel).toHaveBeenCalledWith(
      expect.objectContaining({ paymentKey: 'pk_sub_1', cancelAmount: 8_250 })
    )

    const update = admin.calls.find((call) => call.table === 'subscriptions' && call.method === 'update')
    expect(update?.args[0]).toHaveProperty('current_period_end')
  })

  it('구독 복채는 회수하지 않는다 — 회수 RPC 를 부르지 않는다', async () => {
    mockCreateAdmin.mockReturnValue(membershipAdmin().client)

    await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(mockClawback).not.toHaveBeenCalled()
  })

  it('지급 복채를 다 쓴 뒤 즉시 해지하면 환불 없이 해지만 된다', async () => {
    const admin = membershipAdmin({ balance: 0 })
    mockCreateAdmin.mockReturnValue(admin.client)

    const result = await submitMembershipCancel({ mode: 'IMMEDIATE_REFUND', reasonCode: 'PRICE' })

    expect(result).toMatchObject({ success: true, refundAmount: 0 })
    // 환불액 0원이면 토스 취소 API 를 부르지 않는다(0원 취소는 오류가 된다).
    expect(mockTossCancel).not.toHaveBeenCalled()
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
