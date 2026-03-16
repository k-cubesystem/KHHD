import { timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

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
      case 'PAYMENT.DONE':
        await handlePaymentDone(body.data)
        break

      case 'PAYMENT.FAILED':
        await handlePaymentFailed(body.data)
        break

      case 'PAYMENT.CANCELED':
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

// 결제 완료 처리
async function handlePaymentDone(data: TossWebhookEvent['data']) {
  const { paymentKey, orderId } = data
  if (!orderId) return

  // 구독 결제인지 확인 (orderId가 SUB_로 시작)
  if (orderId.startsWith('SUB_')) {
    await getSupabaseAdmin().from('subscription_payments').update({ status: 'SUCCESS' }).eq('order_id', orderId)

    logger.log('[Webhook] Subscription payment confirmed:', orderId)
  } else {
    // 일반 결제
    await getSupabaseAdmin().from('payments').update({ status: 'completed' }).eq('order_id', orderId)

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

// 결제 취소 처리
async function handlePaymentCanceled(data: TossWebhookEvent['data']) {
  const { orderId } = data
  if (!orderId) return

  if (orderId.startsWith('SUB_')) {
    await getSupabaseAdmin().from('subscription_payments').update({ status: 'CANCELLED' }).eq('order_id', orderId)
  } else {
    await getSupabaseAdmin().from('payments').update({ status: 'cancelled' }).eq('order_id', orderId)
  }

  logger.log('[Webhook] Payment cancelled:', orderId)
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
