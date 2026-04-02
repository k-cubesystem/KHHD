import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''
const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

  const results = { processed: subscriptions.length, success: 0, failed: 0, errors: [] as string[] }

  for (const subscription of subscriptions) {
    const plan = subscription.plan as { name: string; price: number; interval: string; talismans_per_period: number }
    if (!plan || !subscription.billing_key) {
      results.failed++
      results.errors.push(`${subscription.id}: missing plan or billing_key`)
      continue
    }

    const orderId = `SUB_${subscription.user_id.slice(0, 8)}_${Date.now()}`

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

      const result = await response.json()

      const periodStart = new Date(subscription.current_period_end)
      const periodEnd = new Date(periodStart)
      if (plan.interval === 'MONTH') {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }

      if (!response.ok) {
        const retryCount = (subscription.retry_count || 0) + 1

        await supabase.from('subscription_payments').insert({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          order_id: orderId,
          amount: plan.price,
          status: 'FAILED',
          failure_code: result.code,
          failure_reason: result.message,
        })

        if (retryCount >= 3) {
          await supabase
            .from('subscriptions')
            .update({ status: 'PAYMENT_FAILED', retry_count: retryCount })
            .eq('id', subscription.id)
        } else {
          const nextRetry = new Date()
          nextRetry.setDate(nextRetry.getDate() + 1)
          await supabase
            .from('subscriptions')
            .update({ retry_count: retryCount, next_billing_date: nextRetry.toISOString() })
            .eq('id', subscription.id)
        }

        results.failed++
        results.errors.push(`${subscription.user_id}: ${result.message}`)
        logger.error('[Billing Cron] Payment failed:', { userId: subscription.user_id, code: result.code })
        continue
      }

      // 결제 성공
      await supabase.from('subscription_payments').insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        payment_key: result.paymentKey,
        order_id: orderId,
        amount: plan.price,
        status: 'SUCCESS',
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        talismans_granted: plan.talismans_per_period,
      })

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

      // 복채 지급
      await supabase.rpc('add_talismans_by_user', {
        p_user_id: subscription.user_id,
        p_amount: plan.talismans_per_period,
        p_type: 'SUBSCRIPTION',
        p_description: `${plan.name} 구독 갱신 — 복채 ${plan.talismans_per_period}만냥 지급`,
      })

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
