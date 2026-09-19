/**
 * 결제 취소 이용권 회수(revokePaymentPasses) 배선 검증.
 *
 * 핵심 계약(옛 clawbackPaymentCredits 에서 승계):
 *  1. 이용권 변경은 service_role RPC(ent_revoke_for_payment) 안에서만 — 여기서 발급 표를 직접 건드리지 않는다.
 *  2. 멱등키는 `PAYMENT_CANCEL:<paymentKey>:<취소거래키>` 로 취소 거래마다 고유하다.
 *  3. 전액/부분 취소가 각각 올바른 회수 목표를 RPC 에 넘긴다.
 *  4. 이미 써서 회수 못 한 몫(shortfall)은 Error 를 첫 인자로 한 logger.error → Sentry 경보로 나간다.
 *  5. 셀프 취소의 회수량은 금액 비율이 아니라 «접수 때 확정한 장 수»다 — 웹훅도 접수 기록에서 같은 의도를 읽는다.
 *  6. 셀프 취소와 웹훅은 멱등키가 갈린다(:self) — 먼저 온 쪽이 덜 회수해도 뒤에 온 쪽이 마저 회수한다.
 *  7. 옛 복채 충전 결제는 회수 RPC 를 타지 않는다(만냥 ≠ 장).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

jest.mock('server-only', () => ({}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { revokePaymentPasses } from '../pass-revoke'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockLogger = logger as jest.Mocked<typeof logger>

interface PaymentRow {
  id: string
  user_id: string
  payment_key: string
  amount: number
  credits_purchased: number
  credits_remaining: number
  bokchae_type: string
  cancelled_amount: number | null
  cancelled_at: string | null
}

/** 이용권 10장(39,800원) 구매 — 아직 아무것도 회수되지 않은 상태 */
const PAYMENT: PaymentRow = {
  id: 'pay-1',
  user_id: 'user-1',
  payment_key: 'pk_live_1',
  amount: 39_800,
  credits_purchased: 10,
  credits_remaining: 10,
  bokchae_type: 'pass',
  cancelled_amount: 0,
  cancelled_at: null,
}

type RpcResult = { data: unknown; error: { message: string } | null }

interface CancelRequestRow {
  /** 접수 때 확정한 환불 금액 — 웹훅은 이 값이 취소 거래 금액과 같을 때만 접수 의도를 쓴다 */
  refund_amount: number
  verdict: string
  accepted_loss: boolean
  granted_credits: number
  ledger_remaining: number
  recoverable_credits: number
}

/** payments 조회 · 셀프 취소 접수 기록 조회 · 회수 RPC 를 흉내 내는 admin 대역. */
function adminStub(options: {
  payment?: PaymentRow | null
  lookupError?: { message: string } | null
  /** 이 결제의 셀프 취소 접수 기록(없으면 상담원 콘솔 취소로 본다) */
  cancelRequest?: CancelRequestRow | null
  rpc?: RpcResult
}) {
  const updates: Array<{ table: string; patch: unknown }> = []
  const eq = jest.fn()
  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {}
    const filters: Record<string, unknown> = {}
    for (const method of ['select', 'in', 'order', 'limit']) builder[method] = () => builder
    builder.eq = (...args: unknown[]) => {
      eq(...args)
      filters[String(args[0])] = args[1]
      return builder
    }
    builder.update = (patch: unknown) => {
      updates.push({ table, patch })
      return builder
    }
    builder.maybeSingle = () =>
      Promise.resolve(
        table === 'payments'
          ? { data: options.payment === undefined ? PAYMENT : options.payment, error: options.lookupError ?? null }
          : {
              // 접수 기록 조회는 환불 금액으로 거른다 — 대역도 그 조건을 지킨다.
              data:
                options.cancelRequest && filters.refund_amount === options.cancelRequest.refund_amount
                  ? options.cancelRequest
                  : null,
              error: null,
            }
      )
    builder.then = (resolve: (value: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve)
    return builder
  })
  const rpc = jest
    .fn()
    .mockResolvedValue(
      options.rpc ?? { data: { applied: true, reason: 'OK', revoked: 0, shortfall: 0, user_id: 'user-1' }, error: null }
    )

  return { client: { from, rpc } as unknown as ReturnType<typeof createAdminClient>, from, eq, rpc, updates }
}

function rpcOk(revoked: number, shortfall = 0): RpcResult {
  return { data: { applied: true, reason: 'OK', revoked, shortfall, user_id: 'user-1' }, error: null }
}

const FULL_CANCEL = {
  orderId: 'PASS_order-1',
  tossStatus: 'CANCELED',
  totalAmount: 39_800,
  balanceAmount: 0,
  cancels: [{ cancelAmount: 39_800, cancelStatus: 'DONE', transactionKey: 'tk-full' }],
}

const CANCEL_WITHOUT_RECORDS = {
  orderId: 'PASS_order-1',
  tossStatus: 'CANCELED',
  totalAmount: 39_800,
  balanceAmount: 0,
  cancels: null,
}

describe('revokePaymentPasses — 전액 취소', () => {
  beforeEach(() => jest.clearAllMocks())

  it('발급 전량을 회수 목표로 RPC 에 넘기고 refunded 로 표시한다', async () => {
    const admin = adminStub({ rpc: rpcOk(10) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses(FULL_CANCEL)

    expect(result).toEqual({ applied: true, reason: 'OK', revoked: 10, shortfall: 0, userId: 'user-1' })
    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({
        p_payment_id: 'pay-1',
        p_target_revoked: 10,
        p_idempotency_key: 'PAYMENT_CANCEL:pk_live_1:tk-full',
        p_cancelled_amount: 39_800,
        p_fully_cancelled: true,
      })
    )
  })

  it('발급 표를 직접 건드리지 않는다 — 이용권 변경은 RPC 전용', async () => {
    const admin = adminStub({ rpc: rpcOk(10) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses(CANCEL_WITHOUT_RECORDS)

    const tables = admin.from.mock.calls.map((call) => call[0])
    expect(tables).not.toContain('entitlement_grants')
    expect(tables).not.toContain('entitlement_ledger')
    expect(tables).not.toContain('subscription_usage')
    expect(admin.updates).toEqual([])
  })
})

describe('revokePaymentPasses — 셀프 취소의 회수량은 접수 때 확정한 장 수', () => {
  beforeEach(() => jest.clearAllMocks())

  /** 7일 경과 전체 취소 — 수수료 10% 를 뗀 35,820원만 환불돼 토스 상태는 PARTIAL_CANCELED 다 */
  const LATE_FULL_CANCEL = {
    orderId: 'PASS_order-1',
    tossStatus: 'PARTIAL_CANCELED',
    totalAmount: 39_800,
    balanceAmount: 3_980,
    cancels: [{ cancelAmount: 35_820, cancelStatus: 'DONE', transactionKey: 'tk-late' }],
  }

  it('🔴 7일 경과 전체 취소 — 환불액은 90% 여도 발급 전량을 회수하고 refunded 로 닫는다', async () => {
    const admin = adminStub({ rpc: rpcOk(10) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses({ ...LATE_FULL_CANCEL, selfCancel: { fullRevoke: true, targetRevoked: 10 } })

    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 10, p_fully_cancelled: true, p_cancelled_amount: 35_820 })
    )
  })

  it('🔴 미사용분 환불(10장 중 1장 사용, 7일 경과) — 금액 비율(8장)이 아니라 미사용 9장을 회수하고 결제는 닫지 않는다', async () => {
    const admin = adminStub({ rpc: rpcOk(9) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses({
      orderId: 'PASS_order-1',
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 39_800,
      balanceAmount: 7_562,
      cancels: [{ cancelAmount: 32_238, cancelStatus: 'DONE', transactionKey: 'tk-unused' }],
      selfCancel: { fullRevoke: false, targetRevoked: 9 },
    })

    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 9, p_fully_cancelled: false, p_cancelled_amount: 32_238 })
    )
  })

  it('셀프 취소와 웹훅은 멱등키가 갈린다 — 같은 취소 거래여도 :self 가 붙는다', async () => {
    const admin = adminStub({ rpc: rpcOk(10) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses({ ...LATE_FULL_CANCEL, selfCancel: { fullRevoke: true, targetRevoked: 10 } })
    await revokePaymentPasses(LATE_FULL_CANCEL)

    const keys = admin.rpc.mock.calls.map((call) => (call[1] as { p_idempotency_key: string }).p_idempotency_key)
    expect(keys).toEqual(['PAYMENT_CANCEL:pk_live_1:tk-late:self', 'PAYMENT_CANCEL:pk_live_1:tk-late'])
  })

  it('🔴 웹훅이 먼저 와도 접수 기록에서 같은 의도를 읽는다 — 전체 취소면 발급 전량', async () => {
    const admin = adminStub({
      rpc: rpcOk(10),
      cancelRequest: {
        refund_amount: 35_820,
        verdict: 'FULL_REFUNDABLE',
        accepted_loss: false,
        granted_credits: 10,
        ledger_remaining: 10,
        recoverable_credits: 10,
      },
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses(LATE_FULL_CANCEL)

    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 10, p_fully_cancelled: true })
    )
  })

  it('웹훅 — 접수 기록이 «미사용분 환불»이면 그때의 미사용 장 수를 목표로 삼는다', async () => {
    const admin = adminStub({
      rpc: rpcOk(9),
      cancelRequest: {
        refund_amount: 32_238,
        verdict: 'PARTIALLY_SPENT',
        accepted_loss: false,
        granted_credits: 10,
        ledger_remaining: 10,
        recoverable_credits: 9,
      },
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses({
      orderId: 'PASS_order-1',
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 39_800,
      balanceAmount: 7_562,
      cancels: [{ cancelAmount: 32_238, cancelStatus: 'DONE', transactionKey: 'tk-unused' }],
    })

    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 9, p_fully_cancelled: false })
    )
  })

  it('🔴 접수 기록이 있어도 금액이 다른 취소 거래에는 쓰지 않는다 — 굳은 접수가 상담원의 소액 환불을 전량 회수로 바꾸면 안 된다', async () => {
    const admin = adminStub({
      rpc: rpcOk(1),
      cancelRequest: {
        refund_amount: 39_800,
        verdict: 'FULL_REFUNDABLE',
        accepted_loss: false,
        granted_credits: 10,
        ledger_remaining: 10,
        recoverable_credits: 10,
      },
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses({
      orderId: 'PASS_order-1',
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 39_800,
      balanceAmount: 35_820,
      cancels: [{ cancelAmount: 3_980, cancelStatus: 'DONE', transactionKey: 'tk-agent' }],
    })

    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 1, p_fully_cancelled: false })
    )
  })

  it('접수 기록이 없으면(상담원 콘솔 취소) 금액 비율로 회수한다', async () => {
    const admin = adminStub({ rpc: rpcOk(9) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses(LATE_FULL_CANCEL)

    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 9, p_fully_cancelled: false })
    )
  })
})

describe('revokePaymentPasses — 옛 복채 충전 결제', () => {
  beforeEach(() => jest.clearAllMocks())

  it('🔴 회수 RPC 를 타지 않는다(만냥을 장 수로 회수하지 않는다) — 취소 사실만 적는다', async () => {
    const admin = adminStub({
      payment: { ...PAYMENT, bokchae_type: 'charge', amount: 200_000, credits_purchased: 33, credits_remaining: 33 },
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses({
      orderId: 'BOKCHAE_1',
      tossStatus: 'CANCELED',
      totalAmount: 200_000,
      balanceAmount: 0,
      cancels: [{ cancelAmount: 200_000, cancelStatus: 'DONE', transactionKey: 'tk-legacy' }],
    })

    expect(result).toEqual({ applied: false, reason: 'NOTHING_TO_REVOKE', revoked: 0, shortfall: 0, userId: 'user-1' })
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.updates).toHaveLength(1)
    expect(admin.updates[0]).toMatchObject({
      table: 'payments',
      patch: { cancelled_amount: 200_000, status: 'refunded' },
    })
    expect(mockLogger.error).not.toHaveBeenCalled()
  })
})

describe('revokePaymentPasses — 부분 취소', () => {
  beforeEach(() => jest.clearAllMocks())

  it('실취소 금액 비율만큼만 회수하고 상태는 유지한다', async () => {
    const admin = adminStub({ rpc: rpcOk(3) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses({
      orderId: 'PASS_order-1',
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 39_800,
      balanceAmount: 27_860,
      cancels: [{ cancelAmount: 11_940, cancelStatus: 'DONE', transactionKey: 'tk-part' }],
    })

    expect(result.revoked).toBe(3)
    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({
        p_target_revoked: 3,
        p_cancelled_amount: 11_940,
        p_fully_cancelled: false,
        p_idempotency_key: 'PAYMENT_CANCEL:pk_live_1:tk-part',
      })
    )
  })

  it('2차 부분 취소는 누적 목표를 넘기고, 증분 계산은 원장을 가진 RPC 가 한다', async () => {
    const admin = adminStub({
      payment: { ...PAYMENT, credits_remaining: 7 },
      rpc: rpcOk(2),
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses({
      orderId: 'PASS_order-1',
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 39_800,
      balanceAmount: 19_900,
      cancels: [
        { cancelAmount: 11_940, cancelStatus: 'DONE', transactionKey: 'tk-1' },
        { cancelAmount: 7_960, cancelStatus: 'DONE', transactionKey: 'tk-2' },
      ],
    })

    // 누적 목표 5 — RPC 가 원장에서 기회수 3 을 빼고 2 만 회수한다.
    expect(admin.rpc).toHaveBeenCalledWith(
      'ent_revoke_for_payment',
      expect.objectContaining({ p_target_revoked: 5, p_idempotency_key: 'PAYMENT_CANCEL:pk_live_1:tk-2' })
    )
  })
})

describe('revokePaymentPasses — 멱등(웹훅 재전송)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('이미 처리된 취소 거래는 다시 회수하지 않는다', async () => {
    const admin = adminStub({
      payment: { ...PAYMENT, credits_remaining: 0 },
      rpc: { data: { applied: false, reason: 'ALREADY_PROCESSED', revoked: 0, shortfall: 0 }, error: null },
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses(FULL_CANCEL)

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('ALREADY_PROCESSED')
    expect(result.revoked).toBe(0)
  })

  it('재전송에도 멱등키가 동일해야 DB 유니크 인덱스가 막을 수 있다', async () => {
    const admin = adminStub({ rpc: rpcOk(10) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses(FULL_CANCEL)
    await revokePaymentPasses(FULL_CANCEL)

    const keys = admin.rpc.mock.calls.map((call) => (call[1] as { p_idempotency_key: string }).p_idempotency_key)
    expect(keys).toEqual(['PAYMENT_CANCEL:pk_live_1:tk-full', 'PAYMENT_CANCEL:pk_live_1:tk-full'])
  })

  it('회수할 증분이 없으면 RPC 가 NOTHING_TO_REVOKE 를 돌려주고 회수가 없다', async () => {
    const admin = adminStub({
      payment: { ...PAYMENT, credits_remaining: 0 },
      rpc: { data: { applied: false, reason: 'NOTHING_TO_REVOKE', revoked: 0, shortfall: 0 }, error: null },
    })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses(CANCEL_WITHOUT_RECORDS)

    expect(result).toEqual({
      applied: false,
      reason: 'NOTHING_TO_REVOKE',
      revoked: 0,
      shortfall: 0,
      userId: 'user-1',
    })
  })
})

describe('revokePaymentPasses — 이미 쓴 이용권', () => {
  beforeEach(() => jest.clearAllMocks())

  it('남은 만큼만 회수하고 부족분을 Sentry 경보로 올린다', async () => {
    const admin = adminStub({ rpc: rpcOk(3, 7) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses(FULL_CANCEL)

    expect(result.revoked).toBe(3)
    expect(result.shortfall).toBe(7)

    // logger.error 는 **첫 인자가 Error 일 때만** captureException 으로 이어진다.
    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    const [firstArg, context] = mockLogger.error.mock.calls[0]
    expect(firstArg).toBeInstanceOf(Error)
    expect((firstArg as Error).message).toContain('수동 처리 필요')
    expect(context).toEqual(expect.objectContaining({ shortfall: 7, revoked: 3, userId: 'user-1' }))
  })

  it('부족분이 없으면 경보를 올리지 않는다', async () => {
    const admin = adminStub({ rpc: rpcOk(10) })
    mockCreateAdminClient.mockReturnValue(admin.client)

    await revokePaymentPasses(FULL_CANCEL)

    expect(mockLogger.error).not.toHaveBeenCalled()
  })
})

describe('revokePaymentPasses — 방어', () => {
  beforeEach(() => jest.clearAllMocks())

  it('대응하는 결제 기록이 없으면 RPC 를 부르지 않는다', async () => {
    const admin = adminStub({ payment: null })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses({ ...FULL_CANCEL, orderId: 'unknown-order' })

    expect(result.reason).toBe('NO_PAYMENT')
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('취소 금액을 판별할 수 없으면 회수하지 않는다', async () => {
    const admin = adminStub({})
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses({
      orderId: 'PASS_order-1',
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 39_800,
      balanceAmount: 39_800,
      cancels: null,
    })

    expect(result.reason).toBe('NO_CANCEL_AMOUNT')
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('RPC 가 실패하면 회수 실패를 경보로 남긴다', async () => {
    const admin = adminStub({ rpc: { data: null, error: { message: 'connection lost' } } })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses(FULL_CANCEL)

    expect(result.reason).toBe('RPC_FAILED')
    expect(result.shortfall).toBe(10)
    expect(mockLogger.error.mock.calls[0][0]).toBeInstanceOf(Error)
  })

  it('RPC 응답 형식이 어긋나면 성공으로 오인하지 않는다', async () => {
    const admin = adminStub({ rpc: { data: { unexpected: true }, error: null } })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await revokePaymentPasses(FULL_CANCEL)

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('RPC_FAILED')
  })
})
