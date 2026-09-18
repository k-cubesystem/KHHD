/**
 * @jest-environment node
 */
/**
 * 토스 취소 웹훅 → 이용권 회수 배선 검증 (결함 재발 방지).
 *
 * 원결함(복채 시절): 취소 웹훅이 payments.status 만 건드리고 지급분을 회수하지 않아,
 *         취소 승인 후에도 산 것이 그대로 남아 쓰였다(금전 손실). 이용권 전환 뒤에도 같은 자리를 지킨다.
 *
 * 핵심 계약:
 *  1. 전액/부분 취소 모두 회수 경로를 탄다 — 부분 취소는 PAYMENT_STATUS_CHANGED 로만 도착한다.
 *  2. 인증 실패 요청은 회수 경로에 진입하지 못한다.
 *  3. 구독(SUB_) 주문은 이용권 회수 대상이 아니다 — 멤버십은 아무것도 지급하지 않는다.
 */
import { revokePaymentPasses } from '@/lib/services/pass-revoke'

const SECRET = 'test_sk_webhook'

jest.mock('@/lib/services/pass-revoke', () => ({
  revokePaymentPasses: jest.fn(async () => ({ applied: true, reason: 'OK', revoked: 5, shortfall: 0 })),
}))

import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

const supabaseUpdateEq = jest.fn().mockResolvedValue({ error: null })
const supabaseInsert = jest.fn().mockResolvedValue({ error: null })
const supabaseFrom = jest.fn(() => ({
  update: jest.fn(() => ({ eq: supabaseUpdateEq })),
  insert: supabaseInsert,
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: supabaseFrom })),
}))

const mockRevoke = revokePaymentPasses as jest.MockedFunction<typeof revokePaymentPasses>

// 라우트는 모듈 로드 시점에 시크릿을 읽는다 — 환경변수를 먼저 세운 뒤 지연 로드해야 한다.
type PostHandler = (typeof import('../route'))['POST']
let POST: PostHandler

beforeAll(async () => {
  process.env.TOSS_PAYMENTS_SECRET_KEY = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  ;({ POST } = await import('../route'))
})

function webhookRequest(body: unknown, secret: string = SECRET) {
  return new Request('https://k-haehwadang.com/api/webhooks/toss', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }) as unknown as Parameters<PostHandler>[0]
}

describe('토스 취소 웹훅 — 이용권 회수 배선', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 5, shortfall: 0 })
  })

  it('전액 취소(PAYMENT_STATUS_CHANGED/CANCELED)에 이용권을 회수한다', async () => {
    const response = await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-08-11T00:00:00+09:00',
        data: {
          paymentKey: 'pk_live_1',
          orderId: 'order-1',
          status: 'CANCELED',
          totalAmount: 10_000,
          balanceAmount: 0,
          cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-full' }],
        },
      })
    )

    expect(response.status).toBe(200)
    expect(mockRevoke).toHaveBeenCalledWith({
      orderId: 'order-1',
      tossStatus: 'CANCELED',
      totalAmount: 10_000,
      balanceAmount: 0,
      cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-full' }],
    })
  })

  it('부분 취소(PARTIAL_CANCELED)도 회수 경로를 탄다', async () => {
    await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-08-11T00:00:00+09:00',
        data: {
          paymentKey: 'pk_live_1',
          orderId: 'order-1',
          status: 'PARTIAL_CANCELED',
          totalAmount: 10_000,
          balanceAmount: 7_000,
          cancels: [{ cancelAmount: 3_000, cancelStatus: 'DONE', transactionKey: 'tk-part' }],
        },
      })
    )

    expect(mockRevoke).toHaveBeenCalledWith(expect.objectContaining({ tossStatus: 'PARTIAL_CANCELED' }))
  })

  it('회수가 일어나면 사용자 알림 1건을 남긴다', async () => {
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 3, shortfall: 0, userId: 'user-1' })

    await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-08-11T00:00:00+09:00',
        data: { orderId: 'order-1', status: 'CANCELED', totalAmount: 10_000, balanceAmount: 0 },
      })
    )

    expect(supabaseFrom).toHaveBeenCalledWith('notifications')
    expect(supabaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', type: 'payment_cancelled' })
    )
  })

  it('🔴 회수 알림 문구에 잔액형 재화 어휘가 없다', async () => {
    mockRevoke.mockResolvedValue({ applied: true, reason: 'OK', revoked: 3, shortfall: 0, userId: 'user-1' })

    await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-09-18T00:00:00+09:00',
        data: { orderId: 'PASS_1', status: 'CANCELED', totalAmount: 19_800, balanceAmount: 0 },
      })
    )

    const row = supabaseInsert.mock.calls[0]?.[0] as { title: string; message: string }
    expect(row.message).toContain('이용권 3장')
    expect(findBannedPassTerms(`${row.title} ${row.message}`)).toEqual([])
  })

  it('회수량이 0 이면 알림을 남기지 않는다', async () => {
    mockRevoke.mockResolvedValue({ applied: false, reason: 'ALREADY_PROCESSED', revoked: 0, shortfall: 0 })

    await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-08-11T00:00:00+09:00',
        data: { orderId: 'order-1', status: 'CANCELED' },
      })
    )

    expect(supabaseInsert).not.toHaveBeenCalled()
  })

  it('인증 실패 요청은 회수 경로에 진입하지 못한다', async () => {
    const response = await POST(
      webhookRequest(
        {
          eventType: 'PAYMENT_STATUS_CHANGED',
          createdAt: '2026-08-11T00:00:00+09:00',
          data: { orderId: 'order-1', status: 'CANCELED' },
        },
        'wrong_secret_key_of_same_length'
      )
    )

    expect(response.status).toBe(401)
    expect(mockRevoke).not.toHaveBeenCalled()
  })

  it('구독(SUB_) 주문은 이용권 회수 대상이 아니다', async () => {
    await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-08-11T00:00:00+09:00',
        data: { orderId: 'SUB_order-1', status: 'CANCELED' },
      })
    )

    expect(mockRevoke).not.toHaveBeenCalled()
    expect(supabaseFrom).toHaveBeenCalledWith('subscription_payments')
  })

  it('완료(DONE) 이벤트는 회수를 부르지 않는다', async () => {
    await POST(
      webhookRequest({
        eventType: 'PAYMENT_STATUS_CHANGED',
        createdAt: '2026-08-11T00:00:00+09:00',
        data: { orderId: 'order-1', status: 'DONE' },
      })
    )

    expect(mockRevoke).not.toHaveBeenCalled()
    expect(supabaseFrom).toHaveBeenCalledWith('payments')
  })
})
