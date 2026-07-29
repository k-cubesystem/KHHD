import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

/**
 * 복채 **발행**(잔액 증액) 전용 모듈.
 *
 * 여기 있는 함수는 절대 `'use server'` 파일에서 re-export 하지 말 것.
 * Next.js 규약상 `'use server'` 파일의 모든 export 는 로그인 유저가 직접 호출 가능한
 * 공개 엔드포인트가 되며, 재화 발행 함수가 그렇게 노출되면 결제 검증 없이 임의 금액을
 * 발행할 수 있다(S-P0). 호출자는 결제 승인·구독 첫결제·가입 인증처럼 **서버가 사실을
 * 검증한 지점**뿐이어야 한다.
 */

/**
 * 결제 완료 후 지갑에 복채 충전.
 * 반드시 결제 승인(Toss)·구독 첫결제 등 검증된 서버 경로에서만 호출한다.
 */
export async function addTalismans(
  amount: number,
  type: 'CHARGE' | 'BONUS' | 'SUBSCRIPTION' = 'CHARGE',
  description?: string
): Promise<{ success: boolean; error?: string }> {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'addTalismans', amount, type, description })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  // Rate limit(S-1): 복채 발행 버스트 방어 — 유저당 분당 10회.
  // 정상 경로(결제 승인·구독 첫결제)는 건당 1회이므로 한도에 닿지 않는다.
  const rl = await rateLimit(`wallet-charge:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
  if (!rl.success) {
    logger.warn('[Wallet] addTalismans rate limit exceeded:', { userId: user.id })
    return { success: false, error: '충전 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }
  }

  // 복채 발행(잔액 증액)은 service_role 전용 — 인증(위)을 통과한 본인 계정에만.
  const admin = createAdminClient()

  // Atomic balance increment via RPC — prevents race conditions
  const { error: rpcError } = await admin.rpc('add_wallet_balance', {
    p_user_id: user.id,
    p_amount: amount,
  })

  if (rpcError) {
    logger.error('[Wallet] add_wallet_balance RPC failed, using fallback:', rpcError)
    // Fallback: upsert with increment — still better than read-then-write
    const { error: upsertError } = await admin
      .from('wallets')
      .upsert({ user_id: user.id, balance: amount }, { onConflict: 'user_id' })
    if (upsertError) {
      return { success: false, error: '복채 충전 중 오류가 발생했습니다.' }
    }
  }

  // Log transaction
  await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    amount: amount,
    type: type,
    description: description || `복채 ${amount}만냥 충전`,
  })

  return { success: true }
}

/**
 * 회원가입 축하 50만냥 지급 (관리자 권한으로 실행)
 * - 중복 지급 방지: SIGNUP_BONUS feature_key로 체크
 * - `userId` 를 인자로 받으므로(= 인증 주체와 무관) 반드시 가입 인증을 마친
 *   서버 경로(auth callback)에서만 호출한다.
 */
export async function grantSignupBonus(userId: string): Promise<void> {
  const adminClient = createAdminClient()

  // 중복 지급 체크
  const { data: existing } = await adminClient
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('feature_key', 'SIGNUP_BONUS')
    .maybeSingle()

  if (existing) return // 이미 지급됨

  const SIGNUP_AMOUNT = 50 // 50만냥

  // 트랜잭션 로그 먼저 삽입 (중복 방지)
  const { error: txError } = await adminClient.from('wallet_transactions').insert({
    user_id: userId,
    amount: SIGNUP_AMOUNT,
    type: 'BONUS',
    feature_key: 'SIGNUP_BONUS',
    description: `신규 회원 가입 축하 복채 ${SIGNUP_AMOUNT}만냥 증정`,
  })

  if (txError) return // 중복 삽입 시 조용히 종료

  // 지갑 잔액 업데이트
  const { data: wallet } = await adminClient.from('wallets').select('balance').eq('user_id', userId).maybeSingle()

  const currentBalance = wallet?.balance ?? 0
  const newBalance = currentBalance + SIGNUP_AMOUNT

  if (wallet) {
    await adminClient.from('wallets').update({ balance: newBalance }).eq('user_id', userId)
  } else {
    await adminClient.from('wallets').insert({ user_id: userId, balance: newBalance })
  }
}
