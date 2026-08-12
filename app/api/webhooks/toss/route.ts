import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { clawbackPaymentCredits } from '@/lib/services/wallet-grant'
import { computeCancelClawback, type TossCancelRecord } from '@/lib/domain/payment/cancel-clawback'

const tossSecretKey = process.env.TOSS_PAYMENTS_SECRET_KEY

// Supabase Admin Client (Service Role) - lazy initialization
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Toss Payments Webhook Events
type TossWebhookEvent = {
  eventType: string
  createdAt: string
  data: {
    paymentKey?: string
    orderId?: string
    status?: string
    billingKey?: string
    customerKey?: string
    /** 결제 총액(원) */
    totalAmount?: number
    /** 취소 후 남은 결제 금액(원) — 0 이면 전액 취소 */
    balanceAmount?: number
    /** 취소 거래 목록 — 부분 취소는 여기에 누적된다 */
    cancels?: TossCancelRecord[] | null
    // ... other fields
  }
}

function verifyTossWebhookAuth(request: NextRequest): boolean {
  if (!tossSecretKey) {
    // 환경변수 미설정 시 무조건 거부 — 프로덕션 보안 강제
    logger.error('[Toss Webhook] TOSS_PAYMENTS_SECRET_KEY not set — rejecting request')
    return false
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    logger.error('[Toss Webhook] Missing Authorization header')
    return false
  }

  // Toss Payments webhook Authorization 형식: Basic base64(secretKey:)
  if (!authHeader.startsWith('Basic ')) {
    logger.error('[Toss Webhook] Authorization header is not Basic scheme')
    return false
  }

  const base64Credentials = authHeader.slice('Basic '.length)

  // Toss 웹훅 Authorization 형식: Basic base64("secretKey:") — 콜론 뒤 비밀번호 없음
  const expectedToken = Buffer.from(`${tossSecretKey}:`).toString('base64')
  const receivedToken = base64Credentials

  // 타이밍 공격 방지를 위해 crypto.timingSafeEqual 사용
  const expectedBuf = Buffer.from(expectedToken)
  const receivedBuf = Buffer.from(receivedToken)

  if (expectedBuf.length !== receivedBuf.length) {
    logger.error('[Toss Webhook] Authorization token length mismatch')
    return false
  }

  return timingSafeEqual(expectedBuf, receivedBuf)
}

export async function POST(request: NextRequest) {
  try {
    // Toss Payments Basic Auth 검증
    if (!verifyTossWebhookAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: TossWebhookEvent = await request.json()
    logger.log('[Toss Webhook] Received:', body.eventType)

    switch (body.eventType) {
      // 토스 개발자센터에 등록되는 실제 결제 이벤트 타입. 상태는 data.status 로 실려 오며,
      // 부분 취소(PARTIAL_CANCELED)는 이 경로로만 도착한다.
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChanged(body.data)
        break

      case 'PAYMENT.DONE':
        await handlePaymentDone(body.data)
        break

      case 'PAYMENT.FAILED':
        await handlePaymentFailed(body.data)
        break

      case 'PAYMENT.CANCELED':
      case 'PAYMENT.PARTIAL_CANCELED':
        await handlePaymentCanceled(body.data)
        break

      case 'BILLING_KEY.DELETED':
        await handleBillingKeyDeleted(body.data)
        break

      case 'CARD.EXPIRED':
        await handleCardExpired(body.data)
        break

      default:
        logger.log('[Toss Webhook] Unhandled event:', body.eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Toss Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// 결제 상태 변경 처리 — 토스 표준 이벤트(PAYMENT_STATUS_CHANGED)의 상태별 분기
async function handlePaymentStatusChanged(data: TossWebhookEvent['data']) {
  switch (data.status) {
    case 'DONE':
      await handlePaymentDone(data)
      break

    case 'CANCELED':
    case 'PARTIAL_CANCELED':
      await handlePaymentCanceled(data)
      break

    case 'ABORTED':
    case 'EXPIRED':
      await handlePaymentFailed(data)
      break

    default:
      logger.log('[Toss Webhook] Unhandled payment status:', data.status)
  }
}

// 결제 완료 처리
async function handlePaymentDone(data: TossWebhookEvent['data']) {
  const { orderId } = data
  if (!orderId) return

  // 구독 결제인지 확인 (orderId가 SUB_로 시작)
  if (orderId.startsWith('SUB_')) {
    await getSupabaseAdmin().from('subscription_payments').update({ status: 'SUCCESS' }).eq('order_id', orderId)

    logger.log('[Webhook] Subscription payment confirmed:', orderId)
  } else {
    // 일반 결제. 이미 취소·회수된 결제는 되살리지 않는다 — 지난 DONE 웹훅이 재전송돼도
    // refunded 가 completed 로 뒤집히면 매출·원장이 어긋난다.
    await getSupabaseAdmin()
      .from('payments')
      .update({ status: 'completed' })
      .eq('order_id', orderId)
      .neq('status', 'refunded')

    logger.log('[Webhook] Payment confirmed:', orderId)
  }
}

// 결제 실패 처리
async function handlePaymentFailed(data: TossWebhookEvent['data']) {
  const { orderId } = data
  if (!orderId) return

  if (orderId.startsWith('SUB_')) {
    await getSupabaseAdmin().from('subscription_payments').update({ status: 'FAILED' }).eq('order_id', orderId)

    // 구독 상태 업데이트 필요 시 추가
    logger.log('[Webhook] Subscription payment failed:', orderId)
  } else {
    await getSupabaseAdmin().from('payments').update({ status: 'failed' }).eq('order_id', orderId)

    logger.log('[Webhook] Payment failed:', orderId)
  }
}

// 결제 취소 처리 — 지급된 복채를 되받는다(전액·부분 공통)
async function handlePaymentCanceled(data: TossWebhookEvent['data']) {
  const { orderId } = data
  if (!orderId) return

  if (orderId.startsWith('SUB_')) {
    await handleSubscriptionPaymentCanceled(orderId, data)
    return
  }

  // 충전 결제 취소: 회수하지 않으면 취소된 돈으로 산 복채가 그대로 남아 쓰인다(금전 손실).
  // 회수·원장 갱신·상태(전액 취소 시 refunded)는 모두 RPC 안에서 원자적으로 처리된다.
  const result = await clawbackPaymentCredits({
    orderId,
    tossStatus: data.status,
    totalAmount: data.totalAmount,
    balanceAmount: data.balanceAmount,
    cancels: data.cancels,
  })

  logger.log('[Webhook] Payment cancelled:', orderId, result.reason, `clawed=${result.clawed}`)

  if (result.clawed > 0 && result.userId) {
    await notifyClawback(result.userId, result.clawed)
  }
}

/**
 * 구독 결제 취소.
 *
 * 🔴 부분 취소(멤버십 중도 해지 일할 환불)를 CANCELLED 로 적으면 «환불받은 만큼만 돌려준 결제»가
 *    통째로 취소된 것처럼 기록된다. 전액 취소일 때만 상태를 내리고, 금액은 언제나 누적한다.
 */
async function handleSubscriptionPaymentCanceled(orderId: string, data: TossWebhookEvent['data']) {
  const admin = getSupabaseAdmin()
  const { data: row } = await admin
    .from('subscription_payments')
    .select('id, amount, cancelled_amount')
    .eq('order_id', orderId)
    .maybeSingle()

  if (!row) {
    logger.warn('[Webhook] 취소 웹훅에 대응하는 구독 결제 기록 없음:', { orderId })
    return
  }

  const record = row as { id: string; amount: number; cancelled_amount: number | null }
  const plan = computeCancelClawback({
    tossStatus: data.status,
    totalAmount: data.totalAmount,
    balanceAmount: data.balanceAmount,
    cancels: data.cancels,
    paidAmount: record.amount,
    creditsGranted: 0,
    creditsRemaining: 0,
  })

  // 단조 증가 — 웹훅이 재전송돼도 누적 금액이 되돌아가지 않는다.
  const cancelledAmount = Math.max(record.cancelled_amount ?? 0, plan.cancelledAmount)
  const update: Record<string, string | number> = {
    cancelled_amount: cancelledAmount,
    cancelled_at: new Date().toISOString(),
  }
  if (plan.fullyCancelled) update.status = 'CANCELLED'

  await admin.from('subscription_payments').update(update).eq('id', record.id)
  logger.log('[Webhook] Subscription payment cancelled:', orderId, `full=${plan.fullyCancelled}`)
}

// 복채 회수 알림 1건 — 부수 기능이므로 실패해도 웹훅 처리를 막지 않는다.
async function notifyClawback(userId: string, clawed: number) {
  const { error } = await getSupabaseAdmin()
    .from('notifications')
    .insert({
      user_id: userId,
      title: '결제 취소로 복채가 회수되었습니다',
      message: `결제 취소 처리에 따라 복채 ${clawed}만냥이 지갑에서 회수되었습니다.`,
      type: 'payment_cancelled',
      is_read: false,
    })

  if (error) {
    logger.warn('[Webhook] 복채 회수 알림 실패:', { userId, message: error.message })
  }
}

// 빌링키 삭제 처리 (카드 해지 등)
async function handleBillingKeyDeleted(data: TossWebhookEvent['data']) {
  const { customerKey } = data
  if (!customerKey) return

  // 해당 customerKey의 구독을 찾아 해지 처리
  const { data: subscription } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('id')
    .eq('customer_key', customerKey)
    .single()

  if (subscription) {
    await getSupabaseAdmin()
      .from('subscriptions')
      .update({
        status: 'CANCELLED',
        billing_key: null,
        cancelled_at: new Date().toISOString(),
        cancel_reason: '빌링키 삭제됨 (카드 해지)',
      })
      .eq('id', subscription.id)

    logger.log('[Webhook] Subscription cancelled due to billing key deletion:', customerKey)
  }
}

// 카드 만료 처리
async function handleCardExpired(data: TossWebhookEvent['data']) {
  const { customerKey } = data
  if (!customerKey) return

  // 해당 사용자에게 알림 발송 로직 추가 가능
  logger.log('[Webhook] Card expired for customer:', customerKey)

  // 구독 상태 업데이트
  await getSupabaseAdmin()
    .from('subscriptions')
    .update({ status: 'PAYMENT_FAILED' })
    .eq('customer_key', customerKey)
    .eq('status', 'ACTIVE')
}

// Health check (GET)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Toss Payments Webhook',
    timestamp: new Date().toISOString(),
  })
}
