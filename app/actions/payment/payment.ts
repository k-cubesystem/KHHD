'use server'
import { SUPPORT_ASK } from '@/lib/domain/support/contact'
import { tossGeneralSecretKey } from '@/lib/config/toss-keys'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { settlePassPurchase } from '@/lib/services/pass-purchase'
import { PASS_MAX_ORDER_AMOUNT, passExpiryFrom } from '@/lib/domain/entitlement/pass'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

// 이용권 구매는 일반결제 상점(khaehwjxqe) 소관이다.
const secretKey = tossGeneralSecretKey

/** 이용권 주문번호 접두사 — 결제창(pass-checkout-client)이 만든다. 구독(SUB_)과 섞이면 웹훅 분기가 틀어진다. */
const PASS_ORDER_PREFIX = 'PASS_'

/** 토스가 «이 결제는 이미 승인됐다»고 알리는 코드 — 앞선 시도가 승인까지 가고 그 뒤에 끊긴 경우다. */
const ALREADY_APPROVED_CODES: ReadonlySet<string> = new Set(['ALREADY_PROCESSED_PAYMENT'])

const UNIQUE_VIOLATION = '23505'

interface PassPlanRow {
  id: string
  name: string
  credits: number
  price: number
  valid_days: number | null
}

interface ExistingPaymentRow {
  id: string
  user_id: string
  payment_key: string | null
  amount: number
  credits_purchased: number
  status: string
}

/** 이미 승인된 결제를 토스에서 다시 읽는다. 승인 완료(DONE)이고 주문번호가 같을 때만 돌려준다. */
async function readApprovedPayment(
  paymentKey: string,
  orderId: string,
  basicAuth: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    if (!response.ok) return null
    const body = (await response.json()) as Record<string, unknown>
    return body.status === 'DONE' && body.orderId === orderId ? body : null
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error('[Payment] 승인된 결제 조회 실패'), { orderId })
    return null
  }
}

/**
 * 이용권 구매 승인 — 결제 기록(pending) → 토스 승인 → 확정(completed)·이용권 발급.
 *
 * 🔴 가격·장 수·유효기간은 전부 DB(price_plans, product_kind='pass')에서 다시 읽는다. 클라이언트가 보낸 것은
 *    «몇 장짜리를 골랐는가»뿐이고, 금액은 토스 승인 요청과 응답 양쪽에서 대조한다.
 * 🔴 기록을 토스 승인 «전에» 남긴다. 승인 뒤에 남기면 그 INSERT 가 실패했을 때 돈만 나가고 기록도 이용권도 없으며,
 *    재시도(토스가 이미 승인됨으로 거절)·웹훅(갱신할 행이 없음)·셀프 취소(목록에 없음) 어느 것으로도 복구되지 않는다.
 *    기록이 먼저 있으면 같은 주문으로 다시 들어와도, 창을 닫아도(웹훅), 같은 확정 함수로 수렴한다.
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
  if (!Number.isInteger(expectedAmount) || expectedAmount <= 0 || expectedAmount > PASS_MAX_ORDER_AMOUNT) {
    logger.error(new Error('[Payment] 이용권 팩 가격이 1회 결제 상한을 벗어남 — 승인하지 않음'), {
      planId: plan.id,
      price: expectedAmount,
    })
    throw new Error(`지금은 이 상품을 결제할 수 없습니다. ${SUPPORT_ASK}`)
  }

  // 결제 기록은 admin 으로 쓴다 — 사용자 세션으로 쓰면 RLS 에 조용히 막혀도 모른 채 발급까지 간다.
  const { error: insertError } = await admin.from('payments').insert({
    user_id: user.id,
    payment_key: paymentKey,
    order_id: orderId,
    amount: expectedAmount,
    credits_purchased: passes,
    credits_remaining: passes,
    status: 'pending',
    bokchae_type: 'pass',
  })

  if (insertError) {
    if (insertError.code !== UNIQUE_VIOLATION) {
      // 토스를 부르기 전이다 — 돈은 나가지 않았다.
      logger.error(new Error('[Payment] 결제 기록 저장 실패 — 승인하지 않음'), {
        userId: user.id,
        orderId,
        message: insertError.message,
      })
      throw new Error('결제를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }

    // 같은 주문으로 다시 들어왔다(새로고침·재시도). 본인의 같은 결제일 때만 이어 간다.
    const { data: existingData } = await admin
      .from('payments')
      .select('id, user_id, payment_key, amount, credits_purchased, status')
      .eq('order_id', orderId)
      .maybeSingle()
    const existing = existingData as ExistingPaymentRow | null
    const sameOrder =
      !!existing &&
      existing.user_id === user.id &&
      existing.payment_key === paymentKey &&
      existing.amount === expectedAmount &&
      existing.credits_purchased === passes
    if (!sameOrder) {
      logger.warn('[Payment] 이미 쓰인 주문번호·결제키로 승인 시도:', { userId: user.id, orderId })
      throw new Error('잘못된 주문번호입니다.')
    }
  }

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

  let result = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    const approved =
      typeof result.code === 'string' && ALREADY_APPROVED_CODES.has(result.code)
        ? await readApprovedPayment(paymentKey, orderId, basicAuth)
        : null

    if (!approved) {
      logger.error('[Payment] Toss confirm failed:', { code: result.code, message: result.message, orderId })
      // 승인되지 않은 주문은 닫는다. 이미 확정된 행(completed)은 건드리지 않는다.
      await admin.from('payments').update({ status: 'failed' }).eq('order_id', orderId).eq('status', 'pending')
      throw new Error(typeof result.message === 'string' ? result.message : '결제 승인에 실패했습니다.')
    }
    result = approved
  }

  if (result.totalAmount !== expectedAmount) {
    logger.error(new Error('[Payment] 승인 금액 불일치 — 확정·발급하지 않음'), {
      orderId,
      expected: expectedAmount,
      actual: result.totalAmount,
    })
    throw new Error('결제 금액이 일치하지 않습니다.')
  }

  const settled = await settlePassPurchase({ orderId, approvedAmount: expectedAmount })
  if (!settled.ok) {
    // 돈은 나갔다 — 기록(pending 또는 grant_failed)이 남아 있어 웹훅·수동 발급으로 이어진다.
    if (settled.reason !== 'GRANT_FAILED') {
      logger.error(new Error('[Payment] 결제 승인 뒤 확정 실패 — 수동 확인 필요'), {
        userId: user.id,
        orderId,
        reason: settled.reason,
      })
    }
    throw new Error(
      settled.reason === 'GRANT_FAILED'
        ? `결제는 완료되었으나 이용권 발급에 실패했습니다. ${SUPPORT_ASK}`
        : `결제는 완료되었으나 기록 저장에 실패했습니다. ${SUPPORT_ASK}`
    )
  }

  return {
    ...result,
    grantedPasses: settled.passes,
    validDays: settled.validDays,
    expiresAt: passExpiryFrom(Date.now(), settled.validDays)?.toISOString() ?? '',
  }
}
