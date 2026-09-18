'use server'
import { SUPPORT_ASK } from '@/lib/domain/support/contact'
import { tossGeneralSecretKey } from '@/lib/config/toss-keys'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantPasses } from '@/lib/services/entitlement'
import { PASS_VALID_DAYS, passExpiryFrom } from '@/lib/domain/entitlement/pass'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

// 이용권 구매는 일반결제 상점(khaehwjxqe) 소관이다.
const secretKey = tossGeneralSecretKey

/** 이용권 주문번호 접두사 — 결제창(pass-checkout-client)이 만든다. 구독(SUB_)과 섞이면 웹훅 분기가 틀어진다. */
const PASS_ORDER_PREFIX = 'PASS_'

interface PassPlanRow {
  id: string
  name: string
  credits: number
  price: number
  valid_days: number | null
}

/**
 * 이용권 구매 승인 — 토스 승인 → 결제 기록 → 이용권 발급.
 *
 * 🔴 가격·장 수·유효기간은 전부 DB(price_plans, product_kind='pass')에서 다시 읽는다. 클라이언트가 보낸 것은
 *    «몇 장짜리를 골랐는가»뿐이고, 금액은 토스 승인 요청과 응답 양쪽에서 대조한다.
 * 🔴 첫 구매 2배·팩 보너스는 없다(폐지) — 결제 1건 = 발급 1건 = 산 장 수 그대로.
 */
export async function confirmPayment(paymentKey: string, orderId: string, passes: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('인증되지 않은 사용자입니다.')

  // Rate limit(S-1): 결제 승인 버스트 방어 — 유저당 분당 10회. 정상 결제는 1건/분 수준이다.
  const rl = await rateLimit(`payment-confirm:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
  if (!rl.success) {
    logger.warn('[Payment] Rate limit exceeded:', { userId: user.id })
    throw new Error('결제 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.')
  }

  if (typeof orderId !== 'string' || !orderId.startsWith(PASS_ORDER_PREFIX)) {
    throw new Error('잘못된 주문번호입니다.')
  }
  if (!Number.isInteger(passes) || passes <= 0) {
    throw new Error('잘못된 이용권 상품입니다.')
  }

  const admin = createAdminClient()
  const { data: planData, error: planError } = await admin
    .from('price_plans')
    .select('id, name, credits, price, valid_days')
    .eq('credits', passes)
    .eq('product_kind', 'pass')
    .eq('is_active', true)
    .maybeSingle()

  const plan = planData as PassPlanRow | null
  if (planError || !plan) {
    throw new Error(`잘못된 이용권 상품입니다. (${passes}장)`)
  }
  const expectedAmount = plan.price
  const validDays = plan.valid_days ?? PASS_VALID_DAYS

  const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: expectedAmount,
    }),
  })

  const result = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    logger.error('[Payment] Toss confirm failed:', { code: result.code, message: result.message, orderId })
    throw new Error(typeof result.message === 'string' ? result.message : '결제 승인에 실패했습니다.')
  }

  if (result.totalAmount !== expectedAmount) {
    logger.error('[Payment] Amount mismatch:', {
      expected: expectedAmount,
      actual: result.totalAmount,
    })
    throw new Error('결제 금액이 일치하지 않습니다.')
  }

  // 결제 기록은 admin 으로 쓴다 — 사용자 세션으로 쓰면 RLS 에 조용히 막혀도 모른 채 발급까지 간다.
  const { data: inserted, error: insertError } = await admin
    .from('payments')
    .insert({
      user_id: user.id,
      payment_key: paymentKey,
      order_id: orderId,
      amount: expectedAmount,
      credits_purchased: passes,
      credits_remaining: passes,
      status: 'completed',
      bokchae_type: 'pass',
    })
    .select('id')
    .single()

  const paymentId = (inserted as { id?: string } | null)?.id
  if (insertError || !paymentId) {
    logger.error(new Error('[Payment] 결제 승인 뒤 기록 저장 실패 — 수동 발급 필요'), {
      userId: user.id,
      orderId,
      message: insertError?.message,
    })
    throw new Error(`결제는 완료되었으나 기록 저장에 실패했습니다. ${SUPPORT_ASK}`)
  }

  const grant = await grantPasses({
    userId: user.id,
    source: 'purchase',
    quantity: passes,
    validDays,
    paymentId,
    idempotencyKey: `PURCHASE:${paymentId}`,
    note: `${plan.name} 구매 (주문번호: ${orderId})`,
  })

  if (!grant.granted && grant.reason !== 'ALREADY_GRANTED') {
    await admin.from('payments').update({ status: 'grant_failed' }).eq('id', paymentId)
    logger.error(new Error('[Payment] 결제 승인 뒤 이용권 발급 실패 — 수동 발급 필요'), {
      userId: user.id,
      paymentId,
      orderId,
      reason: grant.reason,
    })
    throw new Error(`결제는 완료되었으나 이용권 발급에 실패했습니다. ${SUPPORT_ASK}`)
  }

  return {
    ...result,
    grantedPasses: passes,
    validDays,
    expiresAt: passExpiryFrom(Date.now(), validDays)?.toISOString() ?? '',
  }
}
