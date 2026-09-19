import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { computeCancelClawback, type TossCancelRecord } from '@/lib/domain/payment/cancel-clawback'

/**
 * 결제 취소 → 발급한 이용권 회수.
 *
 * 옛 `clawbackPaymentCredits`(복채 회수)의 규약을 그대로 승계한다.
 *  - 목표 회수량은 «누적 취소 금액 비율»로 잡고(computeCancelClawback), DB 가 «목표 − 이미 처리분»의 증분만 적용한다.
 *  - 멱등 2중: 취소 거래 단위 키(PAYMENT_CANCEL:<paymentKey>:<txKey>) + 원장 증분.
 *  - 이미 쓴 장은 회수하지 않는다. 부족분(shortfall)은 Sentry 경보로 사람에게 넘긴다.
 *
 * 🔴 호출자는 서명 검증을 마친 토스 웹훅, 또는 본인 확인을 마친 셀프 취소 액션뿐이어야 한다.
 */

/**
 * 셀프 취소의 회수 의도 — 금액 비율이 아니라 «접수 때 확정한 장 수»로 회수한다.
 *
 * 🔴 7일 경과 취소는 수수료(10%)만큼 환불액이 작다. 금액 비율로 목표를 잡으면 10장 중 9장을 환불받고도
 *    8장만 회수돼 1장이 남는다. 전액 취소(fullRevoke)는 발급 전량, 미사용분 환불은 접수 때의 미사용 전량이 목표다.
 */
export interface SelfCancelIntent {
  /** 구매 전체 취소 — 발급 전량을 회수하고 결제를 refunded 로 닫는다 */
  fullRevoke: boolean
  /** 누적 회수 목표 장 수(결제 원장 기준 절대값) */
  targetRevoked: number
}

/** 토스 웹훅 페이로드는 필드가 빠져 올 수 있다 — 빠진 값은 computeCancelClawback 이 규약대로 메운다. */
export interface PaymentRevokeInput {
  orderId: string
  tossStatus?: string | null
  totalAmount?: number | null
  balanceAmount?: number | null
  cancels?: readonly TossCancelRecord[] | null
  /**
   * 셀프 취소 액션이 넘긴다. 없으면(웹훅) 이 결제의 취소 접수 기록에서 같은 의도를 읽는다 —
   * 웹훅이 셀프 경로보다 먼저 오거나 셀프 경로가 토스 취소 직후 죽어도 회수량이 같아진다.
   */
  selfCancel?: SelfCancelIntent
}

export interface PaymentRevokeResult {
  applied: boolean
  reason:
    | 'OK'
    | 'NO_PAYMENT'
    | 'NO_CANCEL_AMOUNT'
    | 'NOTHING_TO_REVOKE'
    | 'ALREADY_PROCESSED'
    | 'INVALID_KEY'
    | 'LOOKUP_FAILED'
    | 'RPC_FAILED'
  /** 실제로 회수된 이용권 장수 */
  revoked: number
  /** 이미 써서 회수하지 못한 장수(수동 처리 대상) */
  shortfall: number
  userId?: string
}

const KNOWN_REASONS: ReadonlySet<string> = new Set([
  'OK',
  'NO_PAYMENT',
  'NOTHING_TO_REVOKE',
  'ALREADY_PROCESSED',
  'INVALID_KEY',
])

interface RevokeRpcPayload {
  applied: boolean
  reason: string
  revoked: number
  shortfall: number
  userId?: string
}

function parseRevokePayload(value: unknown): RevokeRpcPayload | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  if (typeof r.applied !== 'boolean' || typeof r.reason !== 'string') return null
  const revoked = typeof r.revoked === 'number' ? r.revoked : 0
  const shortfall = typeof r.shortfall === 'number' ? r.shortfall : 0
  const userId = typeof r.user_id === 'string' ? r.user_id : undefined
  return { applied: r.applied, reason: r.reason, revoked, shortfall, userId }
}

interface CancelRequestIntentRow {
  verdict: string | null
  accepted_loss: boolean | null
  granted_credits: number | null
  ledger_remaining: number | null
  recoverable_credits: number | null
}

/** 셀프 취소 접수 기록 → 회수 의도. 접수 기록이 없으면(상담원 콘솔 취소 등) null — 금액 비율로 회수한다. */
async function readSelfCancelIntent(
  admin: ReturnType<typeof createAdminClient>,
  paymentId: string,
  grantedCredits: number
): Promise<SelfCancelIntent | null> {
  const { data, error } = await admin
    .from('payment_cancel_requests')
    .select('verdict, accepted_loss, granted_credits, ledger_remaining, recoverable_credits')
    .eq('payment_id', paymentId)
    .eq('kind', 'CHARGE')
    .in('status', ['REQUESTED', 'SUCCEEDED'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error(new Error('[Payment] 셀프 취소 접수 기록 조회 실패 — 금액 비율로 회수'), {
      paymentId,
      message: error.message,
    })
    return null
  }
  const row = data as CancelRequestIntentRow | null
  if (!row) return null

  if (row.verdict === 'PARTIALLY_SPENT' && row.accepted_loss !== true) {
    const granted = row.granted_credits ?? grantedCredits
    const alreadyRevoked = Math.max(0, granted - (row.ledger_remaining ?? granted))
    return { fullRevoke: false, targetRevoked: alreadyRevoked + Math.max(0, row.recoverable_credits ?? 0) }
  }
  return { fullRevoke: true, targetRevoked: grantedCredits }
}

export async function revokePaymentPasses(input: PaymentRevokeInput): Promise<PaymentRevokeResult> {
  const admin = createAdminClient()

  const { data: payment, error: lookupError } = await admin
    .from('payments')
    .select(
      'id, user_id, payment_key, amount, credits_purchased, credits_remaining, bokchae_type, cancelled_amount, cancelled_at'
    )
    .eq('order_id', input.orderId)
    .maybeSingle()

  if (lookupError) {
    logger.error(new Error('[Payment] 취소 회수 대상 결제 조회 실패'), {
      orderId: input.orderId,
      message: lookupError.message,
    })
    return { applied: false, reason: 'LOOKUP_FAILED', revoked: 0, shortfall: 0 }
  }

  if (!payment) {
    // 구독(SUB_) 이나 앱 밖에서 만들어진 주문 — 회수할 발급 기록이 없다.
    logger.warn('[Payment] 취소 웹훅에 대응하는 결제 기록 없음:', { orderId: input.orderId })
    return { applied: false, reason: 'NO_PAYMENT', revoked: 0, shortfall: 0 }
  }

  const plan = computeCancelClawback({
    tossStatus: input.tossStatus,
    totalAmount: input.totalAmount,
    balanceAmount: input.balanceAmount,
    cancels: input.cancels,
    paidAmount: payment.amount,
    creditsGranted: payment.credits_purchased,
    creditsRemaining: payment.credits_remaining,
  })

  if (plan.cancelledAmount <= 0 && !plan.fullyCancelled) {
    logger.warn('[Payment] 취소 금액을 판별하지 못해 회수를 건너뜀:', { orderId: input.orderId })
    return { applied: false, reason: 'NO_CANCEL_AMOUNT', revoked: 0, shortfall: 0 }
  }

  if (payment.bokchae_type !== 'pass') {
    // 옛 복채 충전 결제 — credits_purchased 가 «만냥»이라 장 수로 회수하면 단위가 틀린다. 묶인 이용권도 없다.
    // 취소 사실만 적는다(매출 집계 netRevenue 가 이 값을 읽는다). 규칙은 회수 RPC 와 같다 — 금액은 늘기만 한다.
    const { error: legacyError } = await admin
      .from('payments')
      .update({
        cancelled_amount: Math.max(payment.cancelled_amount ?? 0, plan.cancelledAmount),
        cancelled_at: payment.cancelled_at ?? new Date().toISOString(),
        ...(plan.fullyCancelled ? { status: 'refunded' } : {}),
      })
      .eq('id', payment.id)
    if (legacyError) {
      logger.error(new Error('[Payment] 옛 결제 취소 기록 실패'), {
        orderId: input.orderId,
        message: legacyError.message,
      })
    }
    logger.warn('[Payment] 이용권 결제가 아닌 결제의 취소 — 회수 없이 취소 사실만 기록:', {
      orderId: input.orderId,
      legacyBokchaeType: payment.bokchae_type,
      legacyCredits: payment.credits_purchased,
    })
    return { applied: false, reason: 'NOTHING_TO_REVOKE', revoked: 0, shortfall: 0, userId: payment.user_id }
  }

  const intent = input.selfCancel ?? (await readSelfCancelIntent(admin, payment.id, payment.credits_purchased))
  const fullyCancelled = plan.fullyCancelled || intent?.fullRevoke === true
  const targetRevoked = Math.min(
    payment.credits_purchased,
    Math.max(plan.targetClawed, fullyCancelled ? payment.credits_purchased : 0, intent?.targetRevoked ?? 0)
  )
  const alreadyRevoked = Math.max(0, payment.credits_purchased - payment.credits_remaining)
  const pendingDelta = Math.min(Math.max(targetRevoked - alreadyRevoked, 0), payment.credits_remaining)

  // 셀프 취소와 웹훅은 같은 취소 거래를 두 번 알린다. 키를 나눠 둬야 먼저 온 쪽이 덜 회수했어도
  // 뒤에 온 쪽이 나머지를 마저 회수한다 — 이중 회수는 «목표 − 이미 처리분» 증분 산식이 막는다.
  const keyTail = input.selfCancel ? `${plan.idempotencySuffix}:self` : plan.idempotencySuffix
  const idempotencyKey = `PAYMENT_CANCEL:${payment.payment_key}:${keyTail}`
  const description = fullyCancelled
    ? `결제 취소 이용권 회수 (전액 취소 · 주문번호: ${input.orderId})`
    : `결제 취소 이용권 회수 (부분 취소 ${plan.cancelledAmount}원 · 주문번호: ${input.orderId})`

  const { data, error } = await admin.rpc('ent_revoke_for_payment', {
    p_payment_id: payment.id,
    p_target_revoked: targetRevoked,
    p_idempotency_key: idempotencyKey,
    p_cancelled_amount: plan.cancelledAmount,
    p_fully_cancelled: fullyCancelled,
    p_description: description,
  })

  if (error) {
    logger.error(new Error('[Payment] 취소 이용권 회수 RPC 실패 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
      target: targetRevoked,
      message: error.message,
    })
    return { applied: false, reason: 'RPC_FAILED', revoked: 0, shortfall: pendingDelta, userId: payment.user_id }
  }

  const payload = parseRevokePayload(data)
  if (!payload) {
    logger.error(new Error('[Payment] 취소 이용권 회수 RPC 응답 형식 오류 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
    })
    return { applied: false, reason: 'RPC_FAILED', revoked: 0, shortfall: pendingDelta, userId: payment.user_id }
  }

  if (payload.shortfall > 0) {
    logger.error(new Error('[Payment] 취소 이용권 회수 부족분 발생 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
      revoked: payload.revoked,
      shortfall: payload.shortfall,
      fullyCancelled,
    })
  }

  return {
    applied: payload.applied,
    reason: KNOWN_REASONS.has(payload.reason) ? (payload.reason as PaymentRevokeResult['reason']) : 'RPC_FAILED',
    revoked: payload.revoked,
    shortfall: payload.shortfall,
    userId: payload.userId ?? payment.user_id,
  }
}
