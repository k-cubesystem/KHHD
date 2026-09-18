/**
 * 결제 취소 이용권 회수(revokePaymentPasses) 배선 검증.
 *
 * 핵심 계약(옛 clawbackPaymentCredits 에서 승계):
 *  1. 이용권 변경은 service_role RPC(ent_revoke_for_payment) 안에서만 — 여기서 발급 표를 직접 건드리지 않는다.
 *  2. 멱등키는 `PAYMENT_CANCEL:<paymentKey>:<취소거래키>` 로 취소 거래마다 고유하다.
 *  3. 전액/부분 취소가 각각 올바른 회수 목표를 RPC 에 넘긴다.
 *  4. 이미 써서 회수 못 한 몫(shortfall)은 Error 를 첫 인자로 한 logger.error → Sentry 경보로 나간다.
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
}

/** 이용권 10장(39,800원) 구매 — 아직 아무것도 회수되지 않은 상태 */
const PAYMENT: PaymentRow = {
  id: 'pay-1',
  user_id: 'user-1',
  payment_key: 'pk_live_1',
  amount: 39_800,
  credits_purchased: 10,
  credits_remaining: 10,
}

type RpcResult = { data: unknown; error: { message: string } | null }

/** payments 조회 + 회수 RPC 만 흉내 내는 admin 대역. */
function adminStub(options: {
  payment?: PaymentRow | null
  lookupError?: { message: string } | null
  rpc?: RpcResult
}) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: options.payment === undefined ? PAYMENT : options.payment,
    error: options.lookupError ?? null,
  })
  const eq = jest.fn(() => ({ maybeSingle }))
  const select = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ select }))
  const rpc = jest
    .fn()
    .mockResolvedValue(
      options.rpc ?? { data: { applied: true, reason: 'OK', revoked: 0, shortfall: 0, user_id: 'user-1' }, error: null }
    )

  return { client: { from, rpc } as unknown as ReturnType<typeof createAdminClient>, from, eq, rpc }
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

    expect(admin.from).toHaveBeenCalledTimes(1)
    expect(admin.from).toHaveBeenCalledWith('payments')
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
