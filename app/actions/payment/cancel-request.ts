'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clawbackPaymentCredits } from '@/lib/services/wallet-grant'
import { requestTossCancel } from '@/lib/domain/payment/toss-cancel'
import {
  CANCEL_REASONS,
  classifyChargeCancel,
  computeMembershipRefund,
  isMembershipCancelMode,
  validateCancelReason,
  type CancelActionResult,
  type ChargeCancelItem,
  type ChargeCancelOverview,
  type ChargeCancelPlan,
  type ChargeCancelSubmission,
  type MembershipCancelOverview,
  type MembershipCancelSubmission,
} from '@/lib/domain/payment/self-cancel'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

/**
 * 결제 취소 셀프서비스 서버 액션.
 *
 * 🔴 `'use server'` 의 모든 export 는 로그인 유저가 직접 호출 가능한 공개 엔드포인트다.
 *    따라서 아래 규율을 함수마다 내장한다.
 *      1) 인가 — 결제·구독 조회에 **항상 `user_id = 본인`** 을 건다(다른 사람 결제 취소 차단).
 *      2) rate limit — 취소는 돈이 움직이는 경로라 분당 5회로 좁힌다.
 *      3) 판정은 **서버에서 다시 계산**한다. 클라이언트가 보낸 금액·판정은 쓰지 않는다.
 *      4) 지갑 잔액 변경은 `clawbackPaymentCredits()`(service_role RPC) 단일 경로로만.
 *         이 파일에서 wallets 를 직접 INSERT/UPDATE 하지 않는다.
 */

const CANCEL_RATE_LIMIT = { interval: 60_000, uniqueTokenPerInterval: 5 } as const

/** 이 시간이 지나도 REQUESTED 로 남아 있는 요청은 «응답을 못 받고 죽은 것»으로 보고 실패 확정한다. */
const STALE_REQUEST_MS = 10 * 60_000

const tossSecretKey = process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''

function reasonLabel(code: string): string {
  return CANCEL_REASONS.find((item) => item.code === code)?.label ?? code
}

/** 토스에 보낼 취소 사유 문자열. 사용자 메모는 넣지 않는다(외부 전송 최소화). */
function tossCancelReason(code: string): string {
  return `구매자 요청 — ${reasonLabel(code)}`
}

const BLOCKED_MESSAGES: Readonly<Record<string, string>> = {
  ALREADY_CANCELLED: '이미 취소된 결제입니다.',
  NOT_A_CHARGE: '복채 충전 결제만 취소할 수 있습니다.',
  NOT_COMPLETED: '결제가 완료되지 않아 취소할 수 없습니다. 고객센터로 문의해주세요.',
  NOTHING_GRANTED: '지급된 복채가 없어 자동 취소 대상이 아닙니다. 고객센터로 문의해주세요.',
}

interface PaymentRow {
  id: string
  order_id: string
  payment_key: string
  amount: number
  cancelled_amount: number | null
  credits_purchased: number
  credits_remaining: number
  status: string
  bokchae_type: string | null
  created_at: string
}

async function getWalletBalance(userId: string): Promise<number> {
  const admin = createAdminClient()
  const { data } = await admin.from('wallets').select('balance').eq('user_id', userId).maybeSingle()
  const balance = (data as { balance?: number } | null)?.balance
  return typeof balance === 'number' && Number.isFinite(balance) ? balance : 0
}

function packLabelFor(plan: ChargeCancelPlan): string {
  return `복채 ${plan.grantedCredits}만냥`
}

// ────────────────────────────────────────────────────────────
// 1. 복채 충전 취소
// ────────────────────────────────────────────────────────────

/** 본인의 취소 가능 충전 내역 + 판정. 화면이 보여주는 모든 숫자는 여기서 나온다. */
export async function getChargeCancelOverview(): Promise<ChargeCancelOverview> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { walletBalance: 0, items: [] }

  const admin = createAdminClient()
  const [{ data: rows }, walletBalance] = await Promise.all([
    admin
      .from('payments')
      .select(
        'id, order_id, payment_key, amount, cancelled_amount, credits_purchased, credits_remaining, status, bokchae_type, created_at'
      )
      .eq('user_id', user.id)
      .eq('bokchae_type', 'charge')
      .in('status', ['completed', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(20),
    getWalletBalance(user.id),
  ])

  const payments = (rows ?? []) as PaymentRow[]
  const items: ChargeCancelItem[] = payments.map((row) => {
    const plan = classifyChargeCancel({
      paidAmount: row.amount,
      cancelledAmount: row.cancelled_amount,
      grantedCredits: row.credits_purchased,
      ledgerRemaining: row.credits_remaining,
      walletBalance,
      status: row.status,
      bokchaeType: row.bokchae_type,
      paidAt: row.created_at,
    })
    return {
      paymentId: row.id,
      orderId: row.order_id,
      paidAt: row.created_at,
      paidAmount: row.amount,
      packLabel: packLabelFor(plan),
      plan,
    }
  })

  return { walletBalance, items }
}

/**
 * 복채 충전 취소 실행.
 *
 * 흐름: 인가 → 판정 재계산 → 요청 기록(REQUESTED) → 토스 취소 API → 복채 회수(기존 RPC) → 결과 기록.
 *
 * 🔴 회수는 **전액 회수**로 고정한다. 7일 경과 수수료(10%) 때문에 토스 쪽은 부분 취소가 되지만,
 *    사용자 입장에서 이 충전은 «취소»된 것이므로 남은 복채를 10% 남겨두면 안 된다.
 *    → `clawbackPaymentCredits` 에 `tossStatus='CANCELED' / balanceAmount=0` 을 넘겨 전량 회수시킨다.
 *    멱등키는 토스가 돌려준 실제 `transactionKey` 로 만들어지므로, 뒤늦게 도착하는 웹훅은
 *    같은 키에 걸려 `ALREADY_PROCESSED` 가 되고 이중 회수가 일어나지 않는다.
 */
export async function submitChargeCancel(input: ChargeCancelSubmission): Promise<CancelActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const rl = await rateLimit(`payment-cancel:${user.id}`, CANCEL_RATE_LIMIT)
  if (!rl.success) {
    logger.warn('[PaymentCancel] rate limit exceeded:', { userId: user.id })
    return { success: false, error: '취소 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }
  }

  const reason = validateCancelReason({ reasonCode: input.reasonCode, memo: input.memo })
  if (!reason.ok) return { success: false, error: reason.error }

  const admin = createAdminClient()

  // 인가: 본인 결제만. user_id 조건이 빠지면 남의 결제를 취소할 수 있게 된다.
  const { data: paymentRow, error: lookupError } = await admin
    .from('payments')
    .select(
      'id, order_id, payment_key, amount, cancelled_amount, credits_purchased, credits_remaining, status, bokchae_type, created_at'
    )
    .eq('id', input.paymentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (lookupError) {
    logger.error(new Error('[PaymentCancel] 결제 조회 실패'), { userId: user.id, message: lookupError.message })
    return { success: false, error: '결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }
  if (!paymentRow) return { success: false, error: '취소할 결제를 찾을 수 없습니다.' }

  const payment = paymentRow as PaymentRow
  const walletBalance = await getWalletBalance(user.id)
  const plan = classifyChargeCancel({
    paidAmount: payment.amount,
    cancelledAmount: payment.cancelled_amount,
    grantedCredits: payment.credits_purchased,
    ledgerRemaining: payment.credits_remaining,
    walletBalance,
    status: payment.status,
    bokchaeType: payment.bokchae_type,
    paidAt: payment.created_at,
  })

  if (plan.verdict === 'NOT_CANCELLABLE') {
    return { success: false, error: BLOCKED_MESSAGES[plan.blockedReason ?? ''] ?? '취소할 수 없는 결제입니다.' }
  }

  // (b) 갈래 — 기본은 취소 불가. 2차 경로에서 손실 처리에 동의해야 진행된다.
  if (plan.verdict === 'PARTIALLY_SPENT' && input.acceptLoss !== true) {
    return {
      success: false,
      requiresLossAcknowledgement: true,
      lossCredits: plan.lossCredits,
      error: `충전하신 복채 중 ${plan.spentCredits}만냥을 이미 사용하셔서 자동 취소가 어렵습니다.`,
    }
  }

  // 🔴 결제 1건당 REQUESTED 는 하나만 존재할 수 있다(부분 유니크 인덱스 = 따닥 방어).
  //    그런데 토스 응답 직전에 프로세스가 죽으면 그 행이 REQUESTED 로 남아 **영구 잠금**이 된다.
  //    시간이 지난(=응답을 못 받은) 요청은 실패로 확정해 다시 시도할 길을 열어둔다.
  const staleBefore = new Date(Date.now() - STALE_REQUEST_MS).toISOString()
  await admin
    .from('payment_cancel_requests')
    .update({ status: 'FAILED', toss_error_code: 'STALE_REQUEST', processed_at: new Date().toISOString() })
    .eq('payment_id', payment.id)
    .eq('status', 'REQUESTED')
    .lt('created_at', staleBefore)

  const idempotencyKey = `HHD-CANCEL-${randomUUID()}`
  const { data: requestRow, error: insertError } = await admin
    .from('payment_cancel_requests')
    .insert({
      user_id: user.id,
      kind: 'CHARGE',
      payment_id: payment.id,
      reason_code: reason.reasonCode,
      reason_memo: reason.memo || null,
      verdict: plan.verdict,
      accepted_loss: plan.verdict === 'PARTIALLY_SPENT',
      granted_credits: plan.grantedCredits,
      ledger_remaining: payment.credits_remaining,
      recoverable_credits: plan.recoverableCredits,
      loss_credits: plan.lossCredits,
      loss_amount: plan.lossAmount,
      gross_amount: plan.grossAmount,
      fee_amount: plan.feeAmount,
      refund_amount: plan.refundAmount,
      within_withdrawal_period: plan.withinWithdrawalPeriod,
      elapsed_days: plan.elapsedDays,
      status: 'REQUESTED',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .maybeSingle()

  if (insertError || !requestRow) {
    // 부분 유니크 인덱스(payment_id, status='REQUESTED')에 걸리면 이미 처리 중이라는 뜻이다.
    logger.warn('[PaymentCancel] 취소 요청 기록 실패:', { userId: user.id, message: insertError?.message })
    return { success: false, error: '이미 처리 중인 취소 요청이 있습니다. 잠시 후 다시 확인해주세요.' }
  }
  const requestId = (requestRow as { id: string }).id

  const outcome = await requestTossCancel({
    secretKey: tossSecretKey,
    paymentKey: payment.payment_key,
    cancelReason: tossCancelReason(reason.reasonCode),
    cancelAmount: plan.refundAmount,
    idempotencyKey,
  })

  if (!outcome.ok) {
    await admin
      .from('payment_cancel_requests')
      .update({
        status: 'FAILED',
        toss_error_code: outcome.code,
        toss_error_message: outcome.message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    logger.error(new Error('[PaymentCancel] 토스 결제 취소 실패'), {
      userId: user.id,
      requestId,
      code: outcome.code,
      httpStatus: outcome.httpStatus,
      retryable: outcome.retryable,
    })
    return { success: false, error: outcome.message }
  }

  // 회수는 기존 단일 경로로. 전액 회수 강제(위 주석 참고).
  const clawback = await clawbackPaymentCredits({
    orderId: payment.order_id,
    tossStatus: 'CANCELED',
    totalAmount: outcome.payment.totalAmount ?? payment.amount,
    balanceAmount: 0,
    cancels: outcome.payment.cancels,
  })

  const lossCredits = Math.max(plan.lossCredits, clawback.shortfall)
  const lossAmount =
    plan.grantedCredits > 0 ? Math.floor((plan.grossAmount * lossCredits) / plan.grantedCredits) : plan.lossAmount

  await admin
    .from('payment_cancel_requests')
    .update({
      status: 'SUCCEEDED',
      clawed_credits: clawback.clawed,
      loss_credits: lossCredits,
      loss_amount: lossAmount,
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (lossCredits > 0) {
    // 손실 처리는 회사가 돈을 잃는 사건이다 — Error 를 첫 인자로 넘겨 Sentry 로 올린다.
    logger.error(new Error('[PaymentCancel] 취소 손실 처리 발생 — 회수하지 못한 복채'), {
      userId: user.id,
      requestId,
      lossCredits,
      lossAmount,
      refundAmount: plan.refundAmount,
    })
  }

  revalidatePath('/protected/payment/cancel')
  revalidatePath('/protected/store')

  return { success: true, refundAmount: plan.refundAmount, lossCredits, clawedCredits: clawback.clawed }
}

// ────────────────────────────────────────────────────────────
// 2. 멤버십 중도 해지
// ────────────────────────────────────────────────────────────

interface SubscriptionPlanRow {
  name: string | null
  tier: string | null
  price: number | null
  talismans_per_period: number | null
}

interface SubscriptionRow {
  id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  next_billing_date: string | null
  plan: SubscriptionPlanRow | SubscriptionPlanRow[] | null
}

interface LastSubscriptionPaymentRow {
  id: string
  payment_key: string | null
  amount: number
  cancelled_amount: number | null
}

function firstPlan(plan: SubscriptionRow['plan']): SubscriptionPlanRow | null {
  if (!plan) return null
  return Array.isArray(plan) ? (plan[0] ?? null) : plan
}

const EMPTY_MEMBERSHIP_OVERVIEW: MembershipCancelOverview = {
  hasSubscription: false,
  planName: '',
  tier: '',
  price: 0,
  grantedCredits: 0,
  periodStart: null,
  periodEnd: null,
  nextBillingDate: null,
  refundable: false,
  refund: {
    totalDays: 0,
    usedDays: 0,
    remainingDays: 0,
    dayUsageRatio: 0,
    creditUsageRatio: 0,
    usageRatio: 0,
    refundAmount: 0,
    keptCredits: 0,
    consumedCredits: 0,
  },
}

async function loadActiveSubscription(userId: string): Promise<{
  subscription: SubscriptionRow
  plan: SubscriptionPlanRow
  lastPayment: LastSubscriptionPaymentRow | null
} | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('subscriptions')
    .select(
      'id, status, current_period_start, current_period_end, next_billing_date, plan:membership_plans(name, tier, price, talismans_per_period)'
    )
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subscription = data as SubscriptionRow | null
  const plan = firstPlan(subscription?.plan ?? null)
  if (!subscription || !plan) return null

  const { data: paymentData } = await admin
    .from('subscription_payments')
    .select('id, payment_key, amount, cancelled_amount')
    .eq('subscription_id', subscription.id)
    .eq('user_id', userId)
    .eq('status', 'SUCCESS')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { subscription, plan, lastPayment: (paymentData as LastSubscriptionPaymentRow | null) ?? null }
}

/** 해지 화면이 보여줄 잔여기간·환불 예상액. */
export async function getMembershipCancelOverview(): Promise<MembershipCancelOverview> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return EMPTY_MEMBERSHIP_OVERVIEW

  const loaded = await loadActiveSubscription(user.id)
  if (!loaded) return EMPTY_MEMBERSHIP_OVERVIEW

  const { subscription, plan, lastPayment } = loaded
  const walletBalance = await getWalletBalance(user.id)
  const refund = computeMembershipRefund({
    price: lastPayment?.amount ?? plan.price ?? 0,
    periodStart: subscription.current_period_start,
    periodEnd: subscription.current_period_end,
    grantedCredits: plan.talismans_per_period ?? 0,
    walletBalance,
    alreadyRefunded: lastPayment?.cancelled_amount ?? 0,
  })

  return {
    hasSubscription: true,
    planName: plan.name ?? '멤버십',
    tier: plan.tier ?? '',
    price: lastPayment?.amount ?? plan.price ?? 0,
    grantedCredits: plan.talismans_per_period ?? 0,
    periodStart: subscription.current_period_start,
    periodEnd: subscription.current_period_end,
    nextBillingDate: subscription.next_billing_date,
    refundable: !!lastPayment?.payment_key,
    refund,
  }
}

/**
 * 멤버십 해지.
 *
 * 🔴 CEO 결정 — 구독으로 지급된 복채는 **회수하지 않는다.** 이 함수는 지갑을 건드리지 않는다.
 *    (다만 일할 환불액 계산에서 «이미 쓴 복채»는 이용분으로 반영된다 — 회수가 아니라 정산이다.)
 *
 * 다음 결제 중단은 두 겹으로 막는다.
 *   1) `status = 'CANCELLED'` — 빌링 크론이 `status='ACTIVE'` 만 긁는다.
 *   2) `next_billing_date = null` — 크론의 `lte(next_billing_date, now)` 에도 걸리지 않는다.
 */
export async function submitMembershipCancel(input: MembershipCancelSubmission): Promise<CancelActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const rl = await rateLimit(`membership-cancel:${user.id}`, CANCEL_RATE_LIMIT)
  if (!rl.success) {
    logger.warn('[MembershipCancel] rate limit exceeded:', { userId: user.id })
    return { success: false, error: '해지 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }
  }

  if (!isMembershipCancelMode(input.mode)) return { success: false, error: '해지 방식을 선택해주세요.' }
  const reason = validateCancelReason({ reasonCode: input.reasonCode, memo: input.memo })
  if (!reason.ok) return { success: false, error: reason.error }

  const loaded = await loadActiveSubscription(user.id)
  if (!loaded) return { success: false, error: '활성화된 멤버십이 없습니다.' }

  const { subscription, plan, lastPayment } = loaded
  const admin = createAdminClient()
  const walletBalance = await getWalletBalance(user.id)
  const price = lastPayment?.amount ?? plan.price ?? 0
  const refund = computeMembershipRefund({
    price,
    periodStart: subscription.current_period_start,
    periodEnd: subscription.current_period_end,
    grantedCredits: plan.talismans_per_period ?? 0,
    walletBalance,
    alreadyRefunded: lastPayment?.cancelled_amount ?? 0,
  })

  const immediate = input.mode === 'IMMEDIATE_REFUND'
  const refundAmount = immediate ? refund.refundAmount : 0

  if (immediate && refundAmount > 0 && !lastPayment?.payment_key) {
    return { success: false, error: '환불 대상 결제를 찾을 수 없습니다. 고객센터로 문의해주세요.' }
  }

  const idempotencyKey = `HHD-SUBCANCEL-${randomUUID()}`
  const { data: requestRow, error: insertError } = await admin
    .from('payment_cancel_requests')
    .insert({
      user_id: user.id,
      kind: 'MEMBERSHIP',
      subscription_id: subscription.id,
      subscription_payment_id: lastPayment?.id ?? null,
      reason_code: reason.reasonCode,
      reason_memo: reason.memo || null,
      verdict: immediate ? 'IMMEDIATE_REFUND' : 'PERIOD_END',
      granted_credits: plan.talismans_per_period ?? 0,
      recoverable_credits: refund.keptCredits,
      gross_amount: price,
      refund_amount: refundAmount,
      status: 'REQUESTED',
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .maybeSingle()

  if (insertError || !requestRow) {
    logger.error(new Error('[MembershipCancel] 해지 요청 기록 실패'), {
      userId: user.id,
      message: insertError?.message,
    })
    return { success: false, error: '해지 요청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }
  const requestId = (requestRow as { id: string }).id

  // 환불이 필요한 경우에만 토스를 부른다(환불액 0원이면 API 호출 자체가 오류가 된다).
  if (immediate && refundAmount > 0 && lastPayment?.payment_key) {
    const outcome = await requestTossCancel({
      secretKey: tossSecretKey,
      paymentKey: lastPayment.payment_key,
      cancelReason: `멤버십 중도 해지 일할 환불 — ${reasonLabel(reason.reasonCode)}`,
      cancelAmount: refundAmount,
      idempotencyKey,
    })

    if (!outcome.ok) {
      await admin
        .from('payment_cancel_requests')
        .update({
          status: 'FAILED',
          toss_error_code: outcome.code,
          toss_error_message: outcome.message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      logger.error(new Error('[MembershipCancel] 토스 부분 취소 실패'), {
        userId: user.id,
        requestId,
        code: outcome.code,
        httpStatus: outcome.httpStatus,
      })
      return { success: false, error: outcome.message }
    }

    await admin
      .from('subscription_payments')
      .update({
        cancelled_amount: (lastPayment.cancelled_amount ?? 0) + refundAmount,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', lastPayment.id)
      .eq('user_id', user.id)
  }

  const now = new Date().toISOString()
  const subscriptionUpdate: Record<string, string | null> = {
    status: 'CANCELLED',
    cancelled_at: now,
    cancel_reason: `[${reason.reasonCode}] ${reasonLabel(reason.reasonCode)}${reason.memo ? ` — ${reason.memo}` : ''}`,
    // 두 번째 방어선 — 크론이 status 를 잘못 읽더라도 결제 대상에서 빠진다.
    next_billing_date: null,
  }
  if (immediate) {
    // 즉시 해지: 기간을 지금으로 닫아 멤버십 게이트도 함께 내린다.
    subscriptionUpdate.current_period_end = now
    subscriptionUpdate.end_date = now
  }

  const { error: updateError } = await admin
    .from('subscriptions')
    .update(subscriptionUpdate)
    .eq('id', subscription.id)
    .eq('user_id', user.id)

  if (updateError) {
    logger.error(new Error('[MembershipCancel] 구독 상태 갱신 실패 — 환불은 이미 나갔을 수 있음'), {
      userId: user.id,
      requestId,
      message: updateError.message,
    })
    await admin
      .from('payment_cancel_requests')
      .update({ status: 'FAILED', toss_error_code: 'SUBSCRIPTION_UPDATE_FAILED', processed_at: now })
      .eq('id', requestId)
    return { success: false, error: '해지 처리 중 오류가 발생했습니다. 고객센터로 문의해주세요.' }
  }

  await admin.from('payment_cancel_requests').update({ status: 'SUCCEEDED', processed_at: now }).eq('id', requestId)

  revalidatePath('/protected/membership')
  revalidatePath('/protected/membership/cancel')

  return { success: true, refundAmount, lossCredits: 0, clawedCredits: 0 }
}
