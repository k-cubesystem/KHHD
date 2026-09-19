import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { grantPasses } from '@/lib/services/entitlement'
import { PASS_VALID_DAYS, formatPassUnits } from '@/lib/domain/entitlement/pass'
import { logger } from '@/lib/utils/logger'

/**
 * 이용권 구매 확정 — 토스가 승인한 결제를 `pending → completed` 로 올리고 이용권을 발급한다.
 *
 * 결제 기록은 토스를 부르기 «전에» pending 으로 먼저 남긴다(app/actions/payment/payment.ts). 그래야 승인 뒤에
 * 서버가 죽거나 사용자가 창을 닫아도 웹훅(PAYMENT DONE)이 같은 함수로 마저 확정할 수 있다 —
 * 예전에는 승인 뒤 기록 INSERT 가 실패하면 돈만 나가고 기록도 이용권도 없었다.
 *
 * 🔴 orderId 를 받는 확정 함수다. `'use server'` 파일에서 export·re-export 하지 않는다.
 * 호출자는 토스 승인을 방금 받은 서버 액션, 또는 서명 검증을 마친 웹훅뿐이어야 한다.
 */

interface PassPaymentRow {
  id: string
  user_id: string
  order_id: string
  amount: number
  credits_purchased: number
  status: string
  bokchae_type: string | null
}

export type SettlePassPurchaseResult =
  | { ok: true; paymentId: string; userId: string; passes: number; validDays: number }
  | {
      ok: false
      reason: 'NO_PAYMENT' | 'NOT_A_PASS_ORDER' | 'AMOUNT_MISMATCH' | 'NOT_SETTLEABLE' | 'GRANT_FAILED' | 'ERROR'
    }

/**
 * 확정할 수 있는 상태. 취소(refunded)만 되살리지 않는다.
 *
 * 🔴 failed·grant_failed 도 확정한다. 이 함수의 호출자는 둘 다 «토스가 승인 완료(DONE)를 확인해 준 뒤»에만 들어온다.
 *    성공 화면이 두 번 열리면 뒤쪽 승인 호출이 토스에 거절당해 행을 failed 로 닫는데, 그 순간 앞쪽 호출은
 *    승인을 받는 중이다 — failed 를 확정에서 빼면 돈은 나가고 이용권은 없는 결제가 되고, 웹훅도 같은 함수라 복구되지 않는다.
 *    발급은 멱등 키가 한 번으로 묶으므로 grant_failed 를 다시 시도해도 두 번 발급되지 않는다.
 */
const SETTLEABLE_STATUSES: ReadonlySet<string> = new Set(['pending', 'completed', 'failed', 'grant_failed'])

export async function settlePassPurchase(params: {
  orderId: string
  /** 토스가 승인한 금액(원) — 기록한 금액과 다르면 확정하지 않는다 */
  approvedAmount: number
}): Promise<SettlePassPurchaseResult> {
  const { orderId, approvedAmount } = params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('payments')
    .select('id, user_id, order_id, amount, credits_purchased, status, bokchae_type')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    logger.error(new Error('[PassPurchase] 결제 기록 조회 실패'), { orderId, message: error.message })
    return { ok: false, reason: 'ERROR' }
  }
  const payment = data as PassPaymentRow | null
  if (!payment) return { ok: false, reason: 'NO_PAYMENT' }
  if (payment.bokchae_type !== 'pass') return { ok: false, reason: 'NOT_A_PASS_ORDER' }
  if (!SETTLEABLE_STATUSES.has(payment.status)) return { ok: false, reason: 'NOT_SETTLEABLE' }

  if (payment.amount !== approvedAmount) {
    logger.error(new Error('[PassPurchase] 승인 금액이 결제 기록과 다름 — 확정하지 않음'), {
      orderId,
      recorded: payment.amount,
      approved: approvedAmount,
    })
    return { ok: false, reason: 'AMOUNT_MISMATCH' }
  }

  if (payment.status !== 'completed') {
    const { error: completeError } = await admin
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment.id)
      .in('status', ['pending', 'failed', 'grant_failed'])
    if (completeError) {
      logger.error(new Error('[PassPurchase] 결제 확정 기록 실패 — 수동 확인 필요'), {
        orderId,
        paymentId: payment.id,
        message: completeError.message,
      })
      return { ok: false, reason: 'ERROR' }
    }
  }

  // 유효기간은 팩 설정을 따른다. 판매를 내린 팩이어도 이미 받은 결제는 확정해야 하므로 is_active 를 보지 않는다.
  const { data: planData } = await admin
    .from('price_plans')
    .select('name, valid_days')
    .eq('product_kind', 'pass')
    .eq('credits', payment.credits_purchased)
    .order('is_active', { ascending: false })
    .limit(1)
    .maybeSingle()
  const plan = planData as { name?: string | null; valid_days?: number | null } | null
  const validDays = plan?.valid_days ?? PASS_VALID_DAYS
  const planName = plan?.name ?? formatPassUnits(payment.credits_purchased)

  const grant = await grantPasses({
    userId: payment.user_id,
    source: 'purchase',
    quantity: payment.credits_purchased,
    validDays,
    paymentId: payment.id,
    idempotencyKey: `PURCHASE:${payment.id}`,
    note: `${planName} 구매 (주문번호: ${orderId})`,
  })

  if (!grant.granted && grant.reason !== 'ALREADY_GRANTED') {
    // 승인 액션과 웹훅이 동시에 들어오면 한쪽의 일시 오류가 다른 쪽의 성공을 덮을 수 있다 —
    // 발급 행이 이미 있으면 발급된 결제다. grant_failed 로 굳히면 셀프 취소도 막힌다.
    const { data: issued } = await admin
      .from('entitlement_grants')
      .select('id')
      .eq('payment_id', payment.id)
      .limit(1)
      .maybeSingle()
    if (issued) {
      return {
        ok: true,
        paymentId: payment.id,
        userId: payment.user_id,
        passes: payment.credits_purchased,
        validDays,
      }
    }

    await admin.from('payments').update({ status: 'grant_failed' }).eq('id', payment.id)
    logger.error(new Error('[PassPurchase] 결제 승인 뒤 이용권 발급 실패 — 수동 발급 필요'), {
      userId: payment.user_id,
      paymentId: payment.id,
      orderId,
      reason: grant.reason,
    })
    return { ok: false, reason: 'GRANT_FAILED' }
  }

  return {
    ok: true,
    paymentId: payment.id,
    userId: payment.user_id,
    passes: payment.credits_purchased,
    validDays,
  }
}
