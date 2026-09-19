'use server'
import { SUPPORT_ASK } from '@/lib/domain/support/contact'

import { tossBillingSecretKey, tossGeneralSecretKey } from '@/lib/config/toss-keys'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revokePaymentPasses, type SelfCancelIntent } from '@/lib/services/pass-revoke'
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
import {
  evaluateLossCap,
  isLossCapBlockedReason,
  lossCapBlockedMessage,
  lossCapWindowStart,
  toLossCapStatus,
  LOSS_CANCEL_MAX_AMOUNT,
  LOSS_CANCEL_MAX_COUNT,
  LOSS_CANCEL_WINDOW_DAYS,
  LOSS_CAP_OPEN,
  type LossCapDecision,
  type LossCapStatus,
  type LossCapUsage,
} from '@/lib/domain/payment/loss-cap'
import { formatPassUnits, membershipWindow } from '@/lib/domain/entitlement/pass'
import { getUserRole } from '@/lib/supabase/helpers'
import { hasUnlimitedAccess } from '@/lib/auth/privileges'
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
 *      4) 이용권 회수는 `revokePaymentPasses()`(service_role RPC) 단일 경로로만.
 *         이 파일에서 entitlement_grants 를 직접 INSERT/UPDATE 하지 않는다.
 *      5) 손실 처리 상한(최근 365일 · 계정당 2회 / 10만원)의 **최종 판정은 DB 함수**
 *         `open_charge_cancel_request` 가 잠금 아래에서 한다. 여기서 하는 사전 판정은 «안내»용이다
 *         — 따닥으로 두 요청이 동시에 들어오면 애플리케이션 레벨 검사는 둘 다 통과시킨다.
 */

const CANCEL_RATE_LIMIT = { interval: 60_000, uniqueTokenPerInterval: 5 } as const

/** 이 시간이 지나도 REQUESTED 로 남아 있는 요청은 «응답을 못 받고 죽은 것»으로 보고 실패 확정한다. */
const STALE_REQUEST_MINUTES = 10

/**
 * 🔴 취소는 **결제가 일어난 상점의 키**로 불러야 한다.
 * 이용권 구매는 일반결제 상점(khaehwjxqe), 멤버십은 정기결제 상점(bill_khaehqj1a) 소관이다.
 * 한쪽 키로 다른 상점 결제를 취소하려 하면 토스가 거절한다 — 사용자는 «환불이 안 된다» 만 본다.
 */

function reasonLabel(code: string): string {
  return CANCEL_REASONS.find((item) => item.code === code)?.label ?? code
}

/** 토스에 보낼 취소 사유 문자열. 사용자 메모는 넣지 않는다(외부 전송 최소화). */
function tossCancelReason(code: string): string {
  return `구매자 요청 — ${reasonLabel(code)}`
}

const BLOCKED_MESSAGES: Readonly<Record<string, string>> = {
  ALREADY_CANCELLED: '이미 취소된 결제입니다.',
  NOT_A_CHARGE: '이용권 구매 결제만 취소할 수 있습니다.',
  NOT_COMPLETED: `결제가 완료되지 않아 취소할 수 없습니다. ${SUPPORT_ASK}`,
  NOTHING_GRANTED: `발급된 이용권이 없어 자동 취소 대상이 아닙니다. ${SUPPORT_ASK}`,
  UNUSED_ALREADY_REFUNDED: `쓰지 않은 이용권은 이미 환불되었습니다. 남은 금액은 사용하신 이용권의 몫입니다. ${SUPPORT_ASK}`,
}

const STATE_CHANGED_MESSAGE = '방금 이용권 사용 내역이 바뀌었습니다. 화면을 새로고침한 뒤 금액을 다시 확인해주세요.'

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

interface GrantUnitsRow {
  payment_id: string | null
  quantity: number
  consumed: number
  revoked: number
}

/**
 * 결제별로 발급된 이용권 중 아직 쓰지 않은 장 수. 조회에 실패하면 null — 판정을 추측하지 않는다.
 * 기한이 지난 장도 «쓰지 않은 장»이다(회수 RPC 도 기한을 보지 않는다).
 */
async function readUnusedPassesByPayment(userId: string, paymentIds: string[]): Promise<Map<string, number> | null> {
  const unused = new Map<string, number>()
  if (paymentIds.length === 0) return unused

  const { data, error } = await createAdminClient()
    .from('entitlement_grants')
    .select('payment_id, quantity, consumed, revoked')
    .eq('user_id', userId)
    .in('payment_id', paymentIds)

  if (error) {
    logger.error(new Error('[PaymentCancel] 결제별 이용권 조회 실패'), { userId, message: error.message })
    return null
  }
  for (const row of (data ?? []) as GrantUnitsRow[]) {
    if (!row.payment_id) continue
    const left = Math.max(0, row.quantity - row.consumed - row.revoked)
    unused.set(row.payment_id, (unused.get(row.payment_id) ?? 0) + left)
  }
  return unused
}

function packLabelFor(plan: ChargeCancelPlan): string {
  return formatPassUnits(plan.grantedCredits)
}

// ────────────────────────────────────────────────────────────
// 손실 처리 상한 — 읽기(안내용). 최종 차단은 DB 함수가 한다.
// ────────────────────────────────────────────────────────────

interface LossRequestRow {
  loss_amount: number | null
  created_at: string
}

/**
 * 이동창(최근 365일) 안의 손실 처리 사용량.
 *
 * 진행 중(REQUESTED)도 센다 — 토스 응답을 기다리는 사이에 두 번째 요청이 통과하면
 * 상한을 한 번에 두 칸 넘길 수 있다. 실패(FAILED)는 환불이 나가지 않았으므로 세지 않는다.
 */
async function readLossCapUsage(userId: string): Promise<LossCapUsage> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_cancel_requests')
    .select('loss_amount, created_at')
    .eq('user_id', userId)
    .eq('kind', 'CHARGE')
    .gt('loss_credits', 0)
    .in('status', ['REQUESTED', 'SUCCEEDED'])
    .gte('created_at', lossCapWindowStart().toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    logger.warn('[PaymentCancel] 손실 상한 사용량 조회 실패:', { userId, message: error.message })
    // 읽기에 실패했다고 상한을 열어주면 안 되지만, 막아버리면 정상 사용자가 갇힌다.
    // → 안내는 «열림»으로 두고, 실제 차단은 DB 함수가 잠금 아래에서 판정한다.
    return { count: 0, amount: 0, oldestAt: null }
  }

  const rows = (data ?? []) as LossRequestRow[]
  const amount = rows.reduce((sum, row) => sum + Math.max(0, row.loss_amount ?? 0), 0)
  return { count: rows.length, amount, oldestAt: rows[0]?.created_at ?? null }
}

interface OpenCancelOutcome {
  ok: boolean
  requestId: string | null
  blockedReason: string | null
  nextAvailableAt: string | null
}

/** `open_charge_cancel_request` 의 jsonb 응답 파서. RPC 반환은 unknown 이므로 형태를 확인하고 받는다. */
function parseOpenResult(value: unknown): OpenCancelOutcome | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.ok !== 'boolean') return null
  return {
    ok: raw.ok,
    requestId: typeof raw.request_id === 'string' ? raw.request_id : null,
    blockedReason: typeof raw.blocked_reason === 'string' ? raw.blocked_reason : null,
    nextAvailableAt: typeof raw.next_available_at === 'string' ? raw.next_available_at : null,
  }
}

interface OpenMembershipCancelOutcome {
  ok: boolean
  requestId: string | null
  /** 잠금 아래에서 읽은 이번 창 사용 장 수 */
  used: number
}

function parseMembershipOpenResult(value: unknown): OpenMembershipCancelOutcome | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.ok !== 'boolean') return null
  return {
    ok: raw.ok,
    requestId: typeof raw.request_id === 'string' ? raw.request_id : null,
    used: typeof raw.used === 'number' && Number.isFinite(raw.used) ? Math.max(0, raw.used) : 0,
  }
}

/** 마스터(admin)는 상한 면제 — 판정 기준은 lib/auth/privileges.ts 단일 출처. */
async function isLossCapExempt(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const role = await getUserRole(supabase, userId)
  return hasUnlimitedAccess(role)
}

// ────────────────────────────────────────────────────────────
// 1. 이용권 구매 취소
// ────────────────────────────────────────────────────────────

/** 본인의 취소 가능 이용권 구매 내역 + 판정. 화면이 보여주는 모든 숫자는 여기서 나온다. */
export async function getChargeCancelOverview(): Promise<ChargeCancelOverview> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { items: [], lossCap: LOSS_CAP_OPEN }

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('payments')
    .select(
      'id, order_id, payment_key, amount, cancelled_amount, credits_purchased, credits_remaining, status, bokchae_type, created_at'
    )
    .eq('user_id', user.id)
    .eq('bokchae_type', 'pass')
    .in('status', ['completed', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(20)

  const payments = (rows ?? []) as PaymentRow[]
  const unusedByPayment = await readUnusedPassesByPayment(
    user.id,
    payments.map((row) => row.id)
  )

  const items: ChargeCancelItem[] = payments.map((row) => {
    const plan = classifyChargeCancel({
      paidAmount: row.amount,
      cancelledAmount: row.cancelled_amount,
      grantedCredits: row.credits_purchased,
      ledgerRemaining: row.credits_remaining,
      // 조회 실패면 안내는 낙관적으로 두고, 실제 판정은 접수 때 다시 한다(그때도 실패하면 접수하지 않는다).
      unusedPasses: unusedByPayment ? (unusedByPayment.get(row.id) ?? 0) : row.credits_remaining,
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

  // 손실이 나는 취소가 하나도 없으면 상한을 조회할 이유가 없다(정상 사용자에게 질의 0회).
  const needsLossPath = items.some((item) => item.plan.verdict === 'PARTIALLY_SPENT')
  const lossCap = needsLossPath ? await readLossCapStatus(supabase, user.id) : LOSS_CAP_OPEN

  return { items, lossCap }
}

/** 화면 안내용 상한 상태. 🔴 잔여 횟수·금액은 절대 DTO 에 싣지 않는다(악용 유인). */
async function readLossCapStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<LossCapStatus> {
  const [exempt, usage] = await Promise.all([isLossCapExempt(supabase, userId), readLossCapUsage(userId)])
  // lossCredits: 1 = 「손실이 나는 취소를 하려 한다면」 이라는 질의.
  return toLossCapStatus(evaluateLossCap({ lossCredits: 1, usage, exempt }))
}

/**
 * 이용권 구매 취소 실행.
 *
 * 흐름: 인가 → 판정 재계산 → 요청 기록(REQUESTED, 잠금 아래 미사용분 재확인) → 토스 취소 API → 이용권 회수(RPC) → 결과 기록.
 *
 * 일부를 쓴 결제에는 두 길이 있다.
 *  - 기본(`unusedOnly`): 쓰지 않은 장만 환불 — 약관 제7조 제2항의 산식. 손실이 없으므로 손실 처리 상한과 무관하다.
 *  - 2차(`acceptLoss`): 결제 전체 취소. 쓴 장의 값은 회사가 손실로 떠안는다(연 2회·10만원 상한).
 *
 * 🔴 회수량은 **금액 비율이 아니라 접수 때 확정한 장 수**다(`SelfCancelIntent`). 7일 경과 수수료(10%) 때문에
 *    환불액이 작아도 전체 취소는 발급 전량을, 미사용분 환불은 미사용 전량을 회수한다.
 * 🔴 접수 행이 REQUESTED 인 동안 DB(`ent_consume`)는 이 결제의 이용권을 쓰지 못하게 막는다 —
 *    토스를 기다리는 사이에 이용권이 쓰여 «환불도 받고 풀이도 받는» 틈이 없다.
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
  const unusedByPayment = await readUnusedPassesByPayment(user.id, [payment.id])
  if (!unusedByPayment) {
    return { success: false, error: '이용권 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }
  const plan = classifyChargeCancel({
    paidAmount: payment.amount,
    cancelledAmount: payment.cancelled_amount,
    grantedCredits: payment.credits_purchased,
    ledgerRemaining: payment.credits_remaining,
    unusedPasses: unusedByPayment.get(payment.id) ?? 0,
    status: payment.status,
    bokchaeType: payment.bokchae_type,
    paidAt: payment.created_at,
  })

  if (plan.verdict === 'NOT_CANCELLABLE') {
    return { success: false, error: BLOCKED_MESSAGES[plan.blockedReason ?? ''] ?? '취소할 수 없는 결제입니다.' }
  }
  // 결제 행만 있고 발급 기록이 없는 결제는 회수할 것이 없다 — 환불부터 내보내지 않는다.
  if (!unusedByPayment.has(payment.id)) {
    return { success: false, error: BLOCKED_MESSAGES.NOTHING_GRANTED }
  }

  const unusedQuote = plan.verdict === 'PARTIALLY_SPENT' && input.unusedOnly === true ? plan.unusedRefund : null
  if (plan.verdict === 'PARTIALLY_SPENT' && input.unusedOnly === true && !unusedQuote) {
    return { success: false, error: STATE_CHANGED_MESSAGE }
  }

  // (b) 갈래 — 손실이 나는 취소. 상한을 먼저 보고, 그다음 2차 동의를 받는다.
  //     순서를 뒤집으면 「동의까지 다 해놓고 마지막에 거절」이 되어 안내가 불친절해진다.
  const lossPlanned = plan.verdict === 'PARTIALLY_SPENT' && plan.lossCredits > 0 && !unusedQuote
  const exempt = lossPlanned ? await isLossCapExempt(supabase, user.id) : false

  if (lossPlanned) {
    const usage = await readLossCapUsage(user.id)
    const decision = evaluateLossCap({ lossCredits: plan.lossCredits, usage, exempt })
    if (!decision.allowed) {
      logger.warn('[PaymentCancel] 손실 처리 상한 초과 — 요청 차단:', {
        userId: user.id,
        paymentId: payment.id,
        blockedReason: decision.blockedReason,
        usedCount: usage.count,
        usedAmount: usage.amount,
      })
      return { success: false, lossCapBlocked: true, error: lossCapBlockedMessage(decision) }
    }
  }

  if (plan.verdict === 'PARTIALLY_SPENT' && !unusedQuote && input.acceptLoss !== true) {
    return {
      success: false,
      requiresLossAcknowledgement: true,
      lossCredits: plan.lossCredits,
      error: `구매하신 이용권 중 ${plan.spentCredits}장을 이미 사용하셔서 자동 취소가 어렵습니다.`,
    }
  }

  // 🔴 접수는 DB 함수 단일 경로. 굳은 요청 정리 → 상한 집계 → 판정 → INSERT 가
  //    사용자 단위 advisory lock 아래 한 트랜잭션으로 일어난다(따닥 방어).
  //    애플리케이션에서 「세고 나서 넣는」 방식은 동시 요청 둘을 모두 통과시킨다.
  const amounts = unusedQuote ?? {
    grossAmount: plan.grossAmount,
    feeAmount: plan.feeAmount,
    refundAmount: plan.refundAmount,
  }
  const plannedLossCredits = unusedQuote ? 0 : plan.lossCredits
  const plannedLossAmount = unusedQuote ? 0 : plan.lossAmount
  const alreadyRevoked = Math.max(0, plan.grantedCredits - payment.credits_remaining)
  const intent: SelfCancelIntent = unusedQuote
    ? { fullRevoke: false, targetRevoked: alreadyRevoked + plan.recoverableCredits }
    : { fullRevoke: true, targetRevoked: plan.grantedCredits }

  const idempotencyKey = `HHD-CANCEL-${randomUUID()}`
  const { data: openedRaw, error: openError } = await admin.rpc('open_charge_cancel_request', {
    p_user_id: user.id,
    p_payment_id: payment.id,
    p_idempotency_key: idempotencyKey,
    p_reason_code: reason.reasonCode,
    p_reason_memo: reason.memo || null,
    p_verdict: plan.verdict,
    p_accepted_loss: plan.verdict === 'PARTIALLY_SPENT' && !unusedQuote,
    p_granted_credits: plan.grantedCredits,
    p_ledger_remaining: payment.credits_remaining,
    p_recoverable_credits: plan.recoverableCredits,
    p_loss_credits: plannedLossCredits,
    p_loss_amount: plannedLossAmount,
    p_gross_amount: amounts.grossAmount,
    p_fee_amount: amounts.feeAmount,
    p_refund_amount: amounts.refundAmount,
    p_within_withdrawal_period: plan.withinWithdrawalPeriod,
    p_elapsed_days: plan.elapsedDays,
    p_exempt: exempt,
    p_stale_after_minutes: STALE_REQUEST_MINUTES,
    p_max_count: LOSS_CANCEL_MAX_COUNT,
    p_max_amount: LOSS_CANCEL_MAX_AMOUNT,
    p_window_days: LOSS_CANCEL_WINDOW_DAYS,
  })

  const opened = parseOpenResult(openedRaw)
  if (openError || !opened) {
    logger.error(new Error('[PaymentCancel] 취소 요청 접수 실패'), {
      userId: user.id,
      paymentId: payment.id,
      message: openError?.message,
    })
    return { success: false, error: '취소 요청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }

  if (!opened.ok || !opened.requestId) {
    if (isLossCapBlockedReason(opened.blockedReason)) {
      // 사전 판정을 통과했는데 여기서 걸렸다 = 동시 요청이 먼저 자리를 채웠다.
      const decision: LossCapDecision = {
        allowed: false,
        exempt: false,
        blockedReason: opened.blockedReason,
        nextAvailableAt: opened.nextAvailableAt,
      }
      logger.warn('[PaymentCancel] 손실 처리 상한 초과 — 잠금 아래에서 차단:', {
        userId: user.id,
        paymentId: payment.id,
        blockedReason: opened.blockedReason,
      })
      return { success: false, lossCapBlocked: true, error: lossCapBlockedMessage(decision) }
    }
    if (opened.blockedReason === 'STATE_CHANGED') {
      // 판정을 읽은 뒤 접수하기 전에 이용권이 쓰였다 — 잠금 아래에서 다시 센 값이 다르다.
      return { success: false, error: STATE_CHANGED_MESSAGE }
    }
    logger.warn('[PaymentCancel] 취소 요청 접수 거절:', {
      userId: user.id,
      paymentId: payment.id,
      blockedReason: opened.blockedReason,
    })
    return { success: false, error: '이미 처리 중인 취소 요청이 있습니다. 잠시 후 다시 확인해주세요.' }
  }
  const requestId = opened.requestId

  const outcome = await requestTossCancel({
    secretKey: tossGeneralSecretKey,
    paymentKey: payment.payment_key,
    cancelReason: tossCancelReason(reason.reasonCode),
    cancelAmount: amounts.refundAmount,
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

  // 회수는 단일 경로로. 회수량은 접수 때 확정한 장 수(intent)다.
  const revoke = await revokePaymentPasses({
    orderId: payment.order_id,
    tossStatus: outcome.payment.status,
    totalAmount: outcome.payment.totalAmount ?? payment.amount,
    balanceAmount: outcome.payment.balanceAmount,
    cancels: outcome.payment.cancels,
    selfCancel: intent,
  })

  // 🔴 «회수하지 못했다»와 «회수 호출이 실패했다»는 다르다. 뒤쪽을 손실로 적으면 미사용 취소가
  //    사용자의 연 2회 손실 상한을 깎는다 — 손실은 RPC 가 실제로 돌려준 부족분만 센다.
  const revokeUnsettled = revoke.reason === 'RPC_FAILED' || revoke.reason === 'LOOKUP_FAILED'
  const realShortfall = revoke.reason === 'OK' ? revoke.shortfall : 0
  const lossCredits = Math.max(plannedLossCredits, realShortfall)
  const lossAmount =
    plan.grantedCredits > 0 ? Math.floor((plan.grossAmount * lossCredits) / plan.grantedCredits) : plannedLossAmount

  await admin
    .from('payment_cancel_requests')
    .update({
      status: 'SUCCEEDED',
      clawed_credits: revoke.revoked,
      loss_credits: lossCredits,
      loss_amount: lossAmount,
      ...(revokeUnsettled ? { toss_error_code: 'REVOKE_PENDING' } : {}),
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (revokeUnsettled) {
    logger.error(new Error('[PaymentCancel] 환불은 나갔으나 이용권 회수 미완 — 재시도·수동 처리 필요'), {
      userId: user.id,
      requestId,
      paymentId: payment.id,
      reason: revoke.reason,
      targetRevoked: intent.targetRevoked,
    })
  } else if (revoke.reason === 'ALREADY_PROCESSED') {
    logger.error(new Error('[PaymentCancel] 셀프 취소 회수 키가 이미 처리됨 — 결제 상태·회수량 확인 필요'), {
      userId: user.id,
      requestId,
      paymentId: payment.id,
    })
  }

  if (lossCredits > 0) {
    // 손실 처리는 회사가 돈을 잃는 사건이다 — Error 를 첫 인자로 넘겨 Sentry 로 올린다.
    logger.error(new Error('[PaymentCancel] 취소 손실 처리 발생 — 이미 써서 회수하지 못한 이용권'), {
      userId: user.id,
      requestId,
      lossCredits,
      lossAmount,
      refundAmount: amounts.refundAmount,
    })
  }

  revalidatePath('/protected/payment/cancel')
  revalidatePath('/protected/store')

  return { success: true, refundAmount: amounts.refundAmount, lossCredits, revokedPasses: revoke.revoked }
}

// ────────────────────────────────────────────────────────────
// 2. 멤버십 중도 해지
// ────────────────────────────────────────────────────────────

interface SubscriptionPlanRow {
  name: string | null
  tier: string | null
  price: number | null
  monthly_passes: number | null
}

interface SubscriptionRow {
  id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  start_date: string | null
  end_date: string | null
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
  monthlyPasses: 0,
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
    usedPasses: 0,
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
      'id, status, current_period_start, current_period_end, start_date, end_date, next_billing_date, plan:membership_plans(name, tier, price, monthly_passes)'
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

/** 이 구독의 지금 창 시작 시각(ISO). 사용 경로(lib/services/entitlement)와 같은 규칙 · 같은 앵커. 창이 없으면 null. */
function currentWindowStart(subscription: SubscriptionRow): string | null {
  const anchor = subscription.current_period_start ?? subscription.start_date
  if (!anchor) return null
  const end = subscription.current_period_end ?? subscription.end_date
  const window = membershipWindow(new Date(anchor).getTime(), end ? new Date(end).getTime() : null, Date.now())
  return window?.startIso ?? null
}

/**
 * 이번 달 창에서 쓴 멤버십 이용권 장 수. 조회에 실패하면 null.
 *
 * 창을 다르게 잡으면 subscription_usage 의 다른 행을 읽어 «안 썼다»로 계산된다.
 */
async function readWindowUsedPasses(userId: string, subscription: SubscriptionRow): Promise<number | null> {
  const windowStart = currentWindowStart(subscription)
  if (!windowStart) return 0

  const { data, error } = await createAdminClient()
    .from('subscription_usage')
    .select('used')
    .eq('user_id', userId)
    .eq('period_start', windowStart)
    .eq('scope', 'reading')
    .maybeSingle()

  if (error) {
    logger.error(new Error('[MembershipCancel] 이번 달 이용권 사용량 조회 실패'), { userId, message: error.message })
    return null
  }
  const used = (data as { used?: number } | null)?.used
  return typeof used === 'number' && Number.isFinite(used) ? used : 0
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
  const usedPasses = await readWindowUsedPasses(user.id, subscription)
  const refund = computeMembershipRefund({
    price: lastPayment?.amount ?? plan.price ?? 0,
    periodStart: subscription.current_period_start,
    periodEnd: subscription.current_period_end,
    monthlyPasses: plan.monthly_passes ?? 0,
    usedPasses: usedPasses ?? 0,
    alreadyRefunded: lastPayment?.cancelled_amount ?? 0,
  })

  return {
    hasSubscription: true,
    planName: plan.name ?? '멤버십',
    tier: plan.tier ?? '',
    price: lastPayment?.amount ?? plan.price ?? 0,
    monthlyPasses: plan.monthly_passes ?? 0,
    periodStart: subscription.current_period_start,
    periodEnd: subscription.current_period_end,
    nextBillingDate: subscription.next_billing_date,
    // 사용량을 모르면 환불액을 약속하지 않는다 — 즉시 환불 안내를 닫는다.
    refundable: !!lastPayment?.payment_key && usedPasses !== null,
    refund,
  }
}

/**
 * 멤버십 해지.
 *
 * 🔴 멤버십은 아무것도 지급하지 않으므로 회수할 것도 없다 — 이 함수는 이용권을 건드리지 않는다.
 *    (다만 일할 환불액 계산에서 «이번 달 쓴 이용권»은 이용분으로 반영된다 — 회수가 아니라 정산이다.)
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
  const immediate = input.mode === 'IMMEDIATE_REFUND'
  const price = lastPayment?.amount ?? plan.price ?? 0
  const idempotencyKey = `HHD-SUBCANCEL-${randomUUID()}`

  let requestId: string
  let refundAmount = 0

  if (immediate) {
    // 🔴 환불액은 «이번 창에서 쓴 장 수»로 정해진다. 접수와 사용량 읽기를 DB 잠금 아래 한 번에 하고,
    //    접수 행이 REQUESTED 인 동안 ent_consume 은 멤버십 몫을 열지 않는다 — 토스를 기다리는 사이에
    //    한 달치를 다 쓰고 기간 비율만 공제받는 틈이 없다.
    const { data: openedRaw, error: openError } = await admin.rpc('open_membership_cancel_request', {
      p_user_id: user.id,
      p_subscription_id: subscription.id,
      p_subscription_payment_id: lastPayment?.id ?? null,
      p_idempotency_key: idempotencyKey,
      p_reason_code: reason.reasonCode,
      p_reason_memo: reason.memo || null,
      p_granted_credits: plan.monthly_passes ?? 0,
      p_gross_amount: price,
      p_window_start: currentWindowStart(subscription),
    })
    const opened = parseMembershipOpenResult(openedRaw)
    if (openError || !opened) {
      logger.error(new Error('[MembershipCancel] 해지 요청 접수 실패'), {
        userId: user.id,
        message: openError?.message,
      })
      return { success: false, error: '해지 요청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요.' }
    }
    if (!opened.ok || !opened.requestId) {
      return { success: false, error: '이미 처리 중인 해지 요청이 있습니다. 잠시 후 다시 확인해주세요.' }
    }
    requestId = opened.requestId

    refundAmount = computeMembershipRefund({
      price,
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
      monthlyPasses: plan.monthly_passes ?? 0,
      usedPasses: opened.used,
      alreadyRefunded: lastPayment?.cancelled_amount ?? 0,
    }).refundAmount

    if (refundAmount > 0 && !lastPayment?.payment_key) {
      await admin
        .from('payment_cancel_requests')
        .update({ status: 'FAILED', toss_error_code: 'NO_REFUND_TARGET', processed_at: new Date().toISOString() })
        .eq('id', requestId)
      return { success: false, error: `환불 대상 결제를 찾을 수 없습니다. ${SUPPORT_ASK}` }
    }
    await admin.from('payment_cancel_requests').update({ refund_amount: refundAmount }).eq('id', requestId)
  } else {
    const { data: requestRow, error: insertError } = await admin
      .from('payment_cancel_requests')
      .insert({
        user_id: user.id,
        kind: 'MEMBERSHIP',
        subscription_id: subscription.id,
        subscription_payment_id: lastPayment?.id ?? null,
        reason_code: reason.reasonCode,
        reason_memo: reason.memo || null,
        verdict: 'PERIOD_END',
        granted_credits: plan.monthly_passes ?? 0,
        recoverable_credits: 0,
        gross_amount: price,
        refund_amount: 0,
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
    requestId = (requestRow as { id: string }).id
  }

  // 환불이 필요한 경우에만 토스를 부른다(환불액 0원이면 API 호출 자체가 오류가 된다).
  if (immediate && refundAmount > 0 && lastPayment?.payment_key) {
    const outcome = await requestTossCancel({
      secretKey: tossBillingSecretKey,
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
    return { success: false, error: `해지 처리 중 오류가 발생했습니다. ${SUPPORT_ASK}` }
  }

  await admin.from('payment_cancel_requests').update({ status: 'SUCCEEDED', processed_at: now }).eq('id', requestId)

  revalidatePath('/protected/membership')
  revalidatePath('/protected/membership/cancel')

  return { success: true, refundAmount, lossCredits: 0, revokedPasses: 0 }
}
