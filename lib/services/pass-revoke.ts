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

/** 토스 웹훅 페이로드는 필드가 빠져 올 수 있다 — 빠진 값은 computeCancelClawback 이 규약대로 메운다. */
export interface PaymentRevokeInput {
  orderId: string
  tossStatus?: string | null
  totalAmount?: number | null
  balanceAmount?: number | null
  cancels?: readonly TossCancelRecord[] | null
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

export async function revokePaymentPasses(input: PaymentRevokeInput): Promise<PaymentRevokeResult> {
  const admin = createAdminClient()

  const { data: payment, error: lookupError } = await admin
    .from('payments')
    .select('id, user_id, payment_key, amount, credits_purchased, credits_remaining')
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

  const idempotencyKey = `PAYMENT_CANCEL:${payment.payment_key}:${plan.idempotencySuffix}`
  const description = plan.fullyCancelled
    ? `결제 취소 이용권 회수 (전액 취소 · 주문번호: ${input.orderId})`
    : `결제 취소 이용권 회수 (부분 취소 ${plan.cancelledAmount}원 · 주문번호: ${input.orderId})`

  const { data, error } = await admin.rpc('ent_revoke_for_payment', {
    p_payment_id: payment.id,
    p_target_revoked: plan.targetClawed,
    p_idempotency_key: idempotencyKey,
    p_cancelled_amount: plan.cancelledAmount,
    p_fully_cancelled: plan.fullyCancelled,
    p_description: description,
  })

  if (error) {
    logger.error(new Error('[Payment] 취소 이용권 회수 RPC 실패 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
      target: plan.targetClawed,
      message: error.message,
    })
    return { applied: false, reason: 'RPC_FAILED', revoked: 0, shortfall: plan.delta, userId: payment.user_id }
  }

  const payload = parseRevokePayload(data)
  if (!payload) {
    logger.error(new Error('[Payment] 취소 이용권 회수 RPC 응답 형식 오류 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
    })
    return { applied: false, reason: 'RPC_FAILED', revoked: 0, shortfall: plan.delta, userId: payment.user_id }
  }

  if (payload.shortfall > 0) {
    logger.error(new Error('[Payment] 취소 이용권 회수 부족분 발생 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
      revoked: payload.revoked,
      shortfall: payload.shortfall,
      fullyCancelled: plan.fullyCancelled,
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
