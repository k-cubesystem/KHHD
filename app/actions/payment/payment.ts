'use server'

import { createClient } from '@/lib/supabase/server'
import { addTalismans } from './wallet'
import { logger } from '@/lib/utils/logger'

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''

// 복채 충전 상품 가격 맵 (credits 단위 = 복채 수 = 만냥 단위)
// 서버에서 금액 검증 (클라이언트 데이터 신뢰 안 함)
const BOKCHAE_PRICE_MAP: Record<number, number> = {
  5: 50000, // 소복 씨앗 (복채 5만냥)
  10: 99000, // 행운 꾸러미 (복채 10만냥)
  30: 290000, // 대복 창고 (복채 30만냥)
}

export async function confirmPayment(paymentKey: string, orderId: string, talismans: number = 1) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('인증되지 않은 사용자입니다.')

  const expectedAmount = BOKCHAE_PRICE_MAP[talismans]
  if (!expectedAmount) {
    throw new Error(`잘못된 복채 수량입니다. (${talismans})`)
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

  // 결제 정보 저장
  const { data: insertedPayment, error } = await supabase
    .from('payments')
    .insert({
      user_id: user.id,
      payment_key: paymentKey,
      order_id: orderId,
      amount: expectedAmount,
      credits_purchased: talismans,
      credits_remaining: talismans,
      status: 'completed',
      bokchae_type: 'charge',
    })
    .select()
    .single()

  if (error) {
    logger.error('[Payment] DB Insert Error:', error)
    throw new Error(`결제는 성공했으나 기록 저장 실패: ${error.message}`)
  }

  // 지갑에 복채 충전
  const walletResult = await addTalismans(talismans, 'CHARGE', `복채 ${talismans}만냥 충전 (주문번호: ${orderId})`)

  if (!walletResult.success) {
    logger.error('[Payment] Wallet charge failed, marking payment for retry:', walletResult.error)
    // 결제는 완료됐지만 지갑 충전 실패 — 상태를 wallet_failed로 변경하여 수동/자동 재시도 가능
    await supabase.from('payments').update({ status: 'wallet_failed' }).eq('id', insertedPayment.id)
    throw new Error('결제는 완료되었으나 복채 충전에 실패했습니다. 고객센터에 문의해주세요.')
  }

  return result
}
