import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { tossBillingSecretKey } from '@/lib/config/toss-keys'

// 정기 청구 — 정기결제 상점(bill_khaehqj1a) 소관이다.
const secretKey = tossBillingSecretKey
const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 토스가 «이 주문번호는 이미 처리됐다»고 알리는 코드 — 같은 청구를 두 번 부른 경우다. */
const DUPLICATE_ORDER_CODES: ReadonlySet<string> = new Set(['DUPLICATED_ORDER_ID', 'ALREADY_PROCESSED_PAYMENT'])

interface BillingPlan {
  name: string
  price: number
  interval: string
}

/**
 * 갱신 주문번호 — 구독 · 새 주기 시작일 · 재시도 차수로 **결정**한다.
 *
 * 🔴 Date.now() 로 만들면 크론이 겹쳐 돌 때(재시도·수동 실행) 같은 주기를 두 번 청구한다.
 *    토스는 같은 orderId 의 두 번째 승인을 거절하므로, 주문번호가 결정적이면 이중 청구가 구조적으로 막힌다.
 *    재시도 차수를 넣는 이유: 실패한 주문번호를 다시 쓰다 거절되면 재시도가 영영 성공하지 못한다.
 */
function renewalOrderId(subscriptionId: string, periodStart: Date, retryCount: number): string {
  const day = periodStart.toISOString().slice(0, 10).replace(/-/g, '')
  return `SUB_${subscriptionId}_${day}_${retryCount}`
}

/** 주문번호로 이미 승인된 결제를 찾는다(겹쳐 돈 크론이 먼저 청구한 경우). 승인 완료가 아니면 null. */
async function findApprovedPayment(orderId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    if (!response.ok) return null
    const body = (await response.json()) as Record<string, unknown>
    return body.status === 'DONE' ? body : null
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error('[Billing Cron] 주문 조회 실패'), { orderId })
    return null
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    logger.warn('[Billing Cron] Skipping auth in development mode')
  }

  const supabase = createAdminClient()

  const now = new Date()
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, plan:membership_plans(*)')
    .eq('status', 'ACTIVE')
    .lte('next_billing_date', now.toISOString())

  if (error || !subscriptions) {
    logger.error('[Billing Cron] Query error:', error)
    return NextResponse.json({ error: error?.message ?? 'query failed' }, { status: 500 })
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({ message: 'No billing targets', processed: 0 })
  }

  const results = { processed: subscriptions.length, success: 0, failed: 0, skipped: 0, errors: [] as string[] }

  for (const subscription of subscriptions) {
    const plan = subscription.plan as BillingPlan | null
    if (!plan || !subscription.billing_key || !subscription.current_period_end) {
      results.failed++
      results.errors.push(`${subscription.id}: missing plan, billing_key or current_period_end`)
      continue
    }

    const periodStart = new Date(subscription.current_period_end)
    const periodEnd = new Date(periodStart)
    if (plan.interval === 'MONTH') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    const retryCount: number = subscription.retry_count || 0
    const orderId = renewalOrderId(subscription.id, periodStart, retryCount)

    try {
      const response = await fetch(`https://api.tosspayments.com/v1/billing/${subscription.billing_key}`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerKey: subscription.customer_key,
          amount: plan.price,
          orderId,
          orderName: `${plan.name} 구독 갱신`,
        }),
      })

      let result = (await response.json()) as Record<string, unknown>
      let approved = response.ok

      if (!approved && typeof result.code === 'string' && DUPLICATE_ORDER_CODES.has(result.code)) {
        // 같은 주기를 다른 실행이 이미 청구했다 — 다시 청구하지 않는다. 승인됐으면 기록만 맞춘다.
        const existing = await findApprovedPayment(orderId)
        if (!existing) {
          results.skipped++
          logger.warn('[Billing Cron] 이미 처리 중인 주문 — 건너뜀:', { subscriptionId: subscription.id, orderId })
          continue
        }
        result = existing
        approved = true
      }

      if (!approved) {
        const nextRetryCount = retryCount + 1

        await supabase.from('subscription_payments').insert({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          order_id: orderId,
          amount: plan.price,
          status: 'FAILED',
          failure_code: result.code,
          failure_reason: result.message,
        })

        if (nextRetryCount >= 3) {
          await supabase
            .from('subscriptions')
            .update({ status: 'PAYMENT_FAILED', retry_count: nextRetryCount })
            .eq('id', subscription.id)
        } else {
          const nextRetry = new Date()
          nextRetry.setDate(nextRetry.getDate() + 1)
          await supabase
            .from('subscriptions')
            .update({ retry_count: nextRetryCount, next_billing_date: nextRetry.toISOString() })
            .eq('id', subscription.id)
        }

        results.failed++
        results.errors.push(`${subscription.user_id}: ${String(result.message)}`)
        logger.error('[Billing Cron] Payment failed:', { userId: subscription.user_id, code: result.code })
        continue
      }

      // 결제 성공 — 겹쳐 돈 실행이 이미 적었으면 다시 적지 않는다.
      const { data: recorded } = await supabase
        .from('subscription_payments')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', 'SUCCESS')
        .limit(1)
        .maybeSingle()

      if (!recorded) {
        await supabase.from('subscription_payments').insert({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          payment_key: result.paymentKey,
          order_id: orderId,
          amount: plan.price,
          status: 'SUCCESS',
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
        })
      }

      // 갱신 = 기간 연장뿐. 이용권을 지급하지 않는다 — 이번 달 몫은 새 기간으로 사용량 표가 센다.
      // 기간 끝이 읽은 값 그대로일 때만 민다 — 겹쳐 돈 실행이 기간을 두 번 늘리지 못하게.
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          last_payment_date: now.toISOString(),
          retry_count: 0,
        })
        .eq('id', subscription.id)
        .eq('current_period_end', subscription.current_period_end)

      results.success++
      logger.log('[Billing Cron] Success:', { userId: subscription.user_id, orderId })
    } catch (err) {
      results.failed++
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.errors.push(`${subscription.user_id}: ${msg}`)
      logger.error('[Billing Cron] Exception:', err)
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Billing cron completed',
    stats: results,
  })
}
