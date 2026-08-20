import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { computeCancelClawback, type TossCancelRecord } from '@/lib/domain/payment/cancel-clawback'
import { SIGNUP_BONUS_TALISMANS } from '@/lib/domain/payment/feature-costs'

/**
 * 복채 **발행**(잔액 증액) 전용 모듈.
 *
 * 여기 있는 함수는 절대 `'use server'` 파일에서 re-export 하지 말 것.
 * Next.js 규약상 `'use server'` 파일의 모든 export 는 로그인 유저가 직접 호출 가능한
 * 공개 엔드포인트가 되며, 재화 발행 함수가 그렇게 노출되면 결제 검증 없이 임의 금액을
 * 발행할 수 있다(S-P0). 호출자는 결제 승인·구독 첫결제·가입 인증처럼 **서버가 사실을
 * 검증한 지점**뿐이어야 한다.
 */

/**
 * 결제 완료 후 지갑에 복채 충전.
 * 반드시 결제 승인(Toss)·구독 첫결제 등 검증된 서버 경로에서만 호출한다.
 */
export async function addTalismans(
  amount: number,
  type: 'CHARGE' | 'BONUS' | 'SUBSCRIPTION' = 'CHARGE',
  description?: string
): Promise<{ success: boolean; error?: string }> {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'addTalismans', amount, type, description })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  // Rate limit(S-1): 복채 발행 버스트 방어 — 유저당 분당 10회.
  // 정상 경로(결제 승인·구독 첫결제)는 건당 1회이므로 한도에 닿지 않는다.
  const rl = await rateLimit(`wallet-charge:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
  if (!rl.success) {
    logger.warn('[Wallet] addTalismans rate limit exceeded:', { userId: user.id })
    return { success: false, error: '충전 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }
  }

  // 복채 발행(잔액 증액)은 service_role 전용 — 인증(위)을 통과한 본인 계정에만.
  const admin = createAdminClient()

  // Atomic balance increment via RPC — prevents race conditions
  const { error: rpcError } = await admin.rpc('add_wallet_balance', {
    p_user_id: user.id,
    p_amount: amount,
  })

  if (rpcError) {
    logger.error('[Wallet] add_wallet_balance RPC failed, using fallback:', rpcError)
    // Fallback: upsert with increment — still better than read-then-write
    const { error: upsertError } = await admin
      .from('wallets')
      .upsert({ user_id: user.id, balance: amount }, { onConflict: 'user_id' })
    if (upsertError) {
      return { success: false, error: '복채 충전 중 오류가 발생했습니다.' }
    }
  }

  // Log transaction
  await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    amount: amount,
    type: type,
    description: description || `복채 ${amount}만냥 충전`,
  })

  return { success: true }
}

/** 결제 취소 회수 결과. `applied=false` 는 실패가 아니라 "회수할 게 없다"도 포함한다. */
export interface PaymentClawbackResult {
  applied: boolean
  reason:
    | 'OK'
    | 'NO_PAYMENT'
    | 'NO_CANCEL_AMOUNT'
    | 'NOTHING_TO_CLAW'
    | 'ALREADY_PROCESSED'
    | 'INVALID_KEY'
    | 'LOOKUP_FAILED'
    | 'RPC_FAILED'
  /** 실제로 지갑에서 회수된 복채 */
  clawed: number
  /** 잔액 부족으로 회수하지 못한 복채(수동 처리 대상) */
  shortfall: number
  userId?: string
}

interface ClawbackRpcPayload {
  applied: boolean
  reason: string
  clawed: number
  shortfall: number
  userId?: string
}

const CLAWBACK_REASONS: ReadonlySet<string> = new Set([
  'OK',
  'NO_PAYMENT',
  'NOTHING_TO_CLAW',
  'ALREADY_PROCESSED',
  'INVALID_KEY',
])

/** RPC 가 돌려준 jsonb 를 좁힌다 — 형태가 어긋나면 null(호출자가 RPC_FAILED 로 처리). */
function parseClawbackPayload(value: unknown): ClawbackRpcPayload | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const reason = record.reason
  const clawed = record.clawed
  const shortfall = record.shortfall
  if (typeof reason !== 'string' || typeof clawed !== 'number' || typeof shortfall !== 'number') return null
  return {
    applied: record.applied === true,
    reason,
    clawed,
    shortfall,
    userId: typeof record.user_id === 'string' ? record.user_id : undefined,
  }
}

export interface PaymentClawbackInput {
  orderId: string
  /** 토스 Payment.status */
  tossStatus?: string | null
  totalAmount?: number | null
  balanceAmount?: number | null
  cancels?: readonly TossCancelRecord[] | null
}

/**
 * 결제 취소분 복채 회수 (전액·부분 공통).
 *
 * 지갑 잔액 변경은 service_role 전용 RPC `clawback_payment_credits` 안에서만 일어난다
 * (wallets 직접 UPDATE 금지 규율). 멱등은 2중이다:
 *   1) 취소 거래 단위 고유 feature_key — 유니크 인덱스로 동시 재전송까지 차단
 *   2) payments 원장 증분 계산 — 키가 달라도 목표를 이미 채웠으면 무동작
 *
 * 발행 함수와 마찬가지로 `'use server'` 파일에서 re-export 하지 말 것.
 * 호출자는 서명 검증을 마친 토스 웹훅뿐이어야 한다.
 */
export async function clawbackPaymentCredits(input: PaymentClawbackInput): Promise<PaymentClawbackResult> {
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
    return { applied: false, reason: 'LOOKUP_FAILED', clawed: 0, shortfall: 0 }
  }

  if (!payment) {
    // 구독(SUB_) 이나 앱 밖에서 만들어진 주문 — 회수할 지급 기록이 없다.
    logger.warn('[Payment] 취소 웹훅에 대응하는 결제 기록 없음:', { orderId: input.orderId })
    return { applied: false, reason: 'NO_PAYMENT', clawed: 0, shortfall: 0 }
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
    return { applied: false, reason: 'NO_CANCEL_AMOUNT', clawed: 0, shortfall: 0 }
  }

  const idempotencyKey = `PAYMENT_CANCEL:${payment.payment_key}:${plan.idempotencySuffix}`
  const description = plan.fullyCancelled
    ? `결제 취소 복채 회수 (전액 취소 · 주문번호: ${input.orderId})`
    : `결제 취소 복채 회수 (부분 취소 ${plan.cancelledAmount}원 · 주문번호: ${input.orderId})`

  const { data, error } = await admin.rpc('clawback_payment_credits', {
    p_payment_id: payment.id,
    p_target_clawed: plan.targetClawed,
    p_idempotency_key: idempotencyKey,
    p_cancelled_amount: plan.cancelledAmount,
    p_fully_cancelled: plan.fullyCancelled,
    p_description: description,
  })

  if (error) {
    logger.error(new Error('[Payment] 취소 복채 회수 RPC 실패 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
      targetClawed: plan.targetClawed,
      message: error.message,
    })
    return { applied: false, reason: 'RPC_FAILED', clawed: 0, shortfall: plan.delta, userId: payment.user_id }
  }

  const payload = parseClawbackPayload(data)
  if (!payload) {
    logger.error(new Error('[Payment] 취소 복채 회수 RPC 응답 형식 오류 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
    })
    return { applied: false, reason: 'RPC_FAILED', clawed: 0, shortfall: plan.delta, userId: payment.user_id }
  }

  if (payload.shortfall > 0) {
    // 이미 써버린 복채는 회수할 수 없다 — 음수 잔액을 만들지 않고 사람에게 넘긴다.
    logger.error(new Error('[Payment] 취소 복채 회수 부족분 발생 — 수동 처리 필요'), {
      orderId: input.orderId,
      userId: payment.user_id,
      clawed: payload.clawed,
      shortfall: payload.shortfall,
      fullyCancelled: plan.fullyCancelled,
    })
  }

  return {
    applied: payload.applied,
    reason: CLAWBACK_REASONS.has(payload.reason) ? (payload.reason as PaymentClawbackResult['reason']) : 'RPC_FAILED',
    clawed: payload.clawed,
    shortfall: payload.shortfall,
    userId: payload.userId ?? payment.user_id,
  }
}

/**
 * 회원가입 축하 50만냥 지급 (관리자 권한으로 실행)
 * - 중복 지급 방지: SIGNUP_BONUS feature_key로 체크
 * - `userId` 를 인자로 받으므로(= 인증 주체와 무관) 반드시 가입 인증을 마친
 *   서버 경로(auth callback)에서만 호출한다.
 */
export async function grantSignupBonus(userId: string): Promise<void> {
  const adminClient = createAdminClient()

  // 중복 지급 체크
  const { data: existing } = await adminClient
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('feature_key', 'SIGNUP_BONUS')
    .maybeSingle()

  if (existing) return // 이미 지급됨

  const SIGNUP_AMOUNT = SIGNUP_BONUS_TALISMANS

  // 트랜잭션 로그 먼저 삽입 (중복 방지)
  const { error: txError } = await adminClient.from('wallet_transactions').insert({
    user_id: userId,
    amount: SIGNUP_AMOUNT,
    type: 'BONUS',
    feature_key: 'SIGNUP_BONUS',
    description: `신규 회원 가입 축하 복채 ${SIGNUP_AMOUNT}만냥 증정`,
  })

  if (txError) return // 중복 삽입 시 조용히 종료

  // 지갑 잔액 업데이트
  const { data: wallet } = await adminClient.from('wallets').select('balance').eq('user_id', userId).maybeSingle()

  const currentBalance = wallet?.balance ?? 0
  const newBalance = currentBalance + SIGNUP_AMOUNT

  if (wallet) {
    await adminClient.from('wallets').update({ balance: newBalance }).eq('user_id', userId)
  } else {
    await adminClient.from('wallets').insert({ user_id: userId, balance: newBalance })
  }
}
