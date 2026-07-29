'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addTalismans } from './wallet'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''

/**
 * 로그인 사용자가 복채를 한 번이라도 충전했는지 여부 (첫 구매 2배 판정용).
 * 서버에서만 판단 — 클라이언트 플래그 신뢰 안 함.
 */
export async function hasChargedBefore(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return true // 비로그인은 혜택 미노출(안전)

  const admin = createAdminClient()
  const { count } = await admin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .eq('bokchae_type', 'charge')
  return (count ?? 0) > 0
}

export async function confirmPayment(paymentKey: string, orderId: string, talismans: number = 1) {
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

  // 상품·가격은 DB(price_plans)를 단일 소스로 검증 (클라이언트 데이터 신뢰 안 함).
  const admin = createAdminClient()
  const { data: pack, error: packError } = await admin
    .from('price_plans')
    .select('name, credits, price, bonus_credits')
    .eq('credits', talismans)
    .eq('is_active', true)
    .maybeSingle()

  if (packError || !pack) {
    throw new Error(`잘못된 복채 상품입니다. (${talismans})`)
  }
  const expectedAmount = pack.price

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

  const result = await response.json()

  if (!response.ok) {
    logger.error('[Payment] Toss confirm failed:', { code: result.code, message: result.message, orderId })
    throw new Error(result.message || '결제 승인에 실패했습니다.')
  }

  if (result.totalAmount !== expectedAmount) {
    logger.error('[Payment] Amount mismatch:', {
      expected: expectedAmount,
      actual: result.totalAmount,
    })
    throw new Error('결제 금액이 일치하지 않습니다.')
  }

  // 지급액 계산: 기본(구매) + 팩 보너스, 그리고 첫 구매면 전체 2배.
  // 첫 구매 판정은 이번 결제 기록을 넣기 전에 서버에서 확인.
  const { count: priorCharges } = await admin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .eq('bokchae_type', 'charge')
  const isFirstPurchase = (priorCharges ?? 0) === 0

  const baseCredits = pack.credits + (pack.bonus_credits ?? 0)
  const creditedTotal = isFirstPurchase ? baseCredits * 2 : baseCredits

  const bonusParts: string[] = []
  if ((pack.bonus_credits ?? 0) > 0) bonusParts.push(`보너스 ${pack.bonus_credits}만냥`)
  if (isFirstPurchase) bonusParts.push('첫 구매 2배')
  const bonusNote = bonusParts.length ? ` (${bonusParts.join(' + ')})` : ''

  // 결제 정보 저장 (credits_* = 실제 지갑에 지급되는 총 복채)
  const { data: insertedPayment, error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      payment_key: paymentKey,
      order_id: orderId,
      amount: expectedAmount,
      credits_purchased: creditedTotal,
      credits_remaining: creditedTotal,
      status: 'completed',
      bokchae_type: 'charge',
    })
    .select()
    .single()

  if (error) {
    logger.error('[Payment] DB Insert Error:', error)
    throw new Error(`결제는 성공했으나 기록 저장 실패: ${error.message}`)
  }

  // 지갑에 복채 충전 (기본+보너스+첫구매2배 전액 CHARGE → 일일한도 무관 사용 가능)
  const walletResult = await addTalismans(
    creditedTotal,
    'CHARGE',
    `${pack.name} 복채 ${creditedTotal}만냥 충전${bonusNote} (주문번호: ${orderId})`
  )

  if (!walletResult.success) {
    logger.error('[Payment] Wallet charge failed, marking payment for retry:', walletResult.error)
    // 결제는 완료됐지만 지갑 충전 실패 — 상태를 wallet_failed로 변경하여 수동/자동 재시도 가능
    await supabase.from('payments').update({ status: 'wallet_failed' }).eq('id', insertedPayment.id)
    throw new Error('결제는 완료되었으나 복채 충전에 실패했습니다. 고객센터에 문의해주세요.')
  }

  return { ...result, creditedTotal, isFirstPurchase, baseCredits }
}
