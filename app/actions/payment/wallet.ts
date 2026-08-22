'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { incrementDailyUsage, getUserTierLimits } from './membership'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { getUserRole } from '@/lib/supabase/helpers'
import { computeSpendPlan } from '@/lib/domain/payment/spend-plan'
import { deductKeyLabel } from '@/lib/domain/payment/feature-costs'
import { hasUnlimitedAccess, UNLIMITED_BALANCE } from '@/lib/auth/privileges'
import { logger } from '@/lib/utils/logger'

/** 오늘 일일 한도 소비량(무료분만 카운트) */
async function getUsedToday(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await admin
    .from('daily_usage_logs')
    .select('talismans_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle()
  return data?.talismans_used ?? 0
}

/** 충전(CHARGE) 잔여 복채 — 일일 한도 초과 소비의 재원. 실패 시 0(보수적). */
async function getChargeExemptRemaining(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<number> {
  const { data, error } = await admin.rpc('get_charge_exempt_remaining', { p_user_id: userId })
  if (error) {
    logger.error('[Wallet] get_charge_exempt_remaining error:', error.message)
    return 0
  }
  return typeof data === 'number' ? data : 0
}

const TESTER_DAILY_AMOUNT = 50 // 테스터 일일 자동충전 복채 (50만냥)

/**
 * 테스터 일일 복채 자동충전
 * - 오늘 이미 충전했으면 스킵
 * - 충전 기록은 wallet_transactions (feature_key='TESTER_DAILY')으로 관리
 */
async function grantTesterDailyBokchae(userId: string): Promise<void> {
  const adminClient = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // 오늘 이미 충전했는지 확인
  const { data: existing } = await adminClient
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('feature_key', 'TESTER_DAILY')
    .gte('created_at', `${today}T00:00:00.000Z`)
    .maybeSingle()

  if (existing) return // 오늘 이미 충전됨

  // 트랜잭션 레코드를 먼저 삽입하여 동시 요청 방지
  // (DB unique constraint: user_id + feature_key + DATE(created_at))
  const { error: txError } = await adminClient.from('wallet_transactions').insert({
    user_id: userId,
    amount: TESTER_DAILY_AMOUNT,
    type: 'BONUS',
    feature_key: 'TESTER_DAILY',
    description: `테스터 일일 복채 자동충전 (${TESTER_DAILY_AMOUNT}만냥)`,
  })

  // 중복 삽입(동시 요청)이면 조용히 종료
  if (txError) return

  // 지갑 잔액 조회 후 충전
  const { data: wallet } = await adminClient.from('wallets').select('balance').eq('user_id', userId).maybeSingle()

  const currentBalance = wallet?.balance ?? 0
  const newBalance = currentBalance + TESTER_DAILY_AMOUNT

  if (wallet) {
    await adminClient.from('wallets').update({ balance: newBalance }).eq('user_id', userId)
  } else {
    await adminClient.from('wallets').insert({ user_id: userId, balance: newBalance })
  }
}

/**
 * Get user's wallet balance
 */
export async function getWalletBalance(): Promise<number> {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'getWalletBalance' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 0

  // Check if admin/tester
  const role = await getUserRole(supabase, user.id)

  if (hasUnlimitedAccess(role)) {
    return UNLIMITED_BALANCE
  }

  // 테스터: 매일 50만냥 자동충전 후 실제 잔액 반환
  if (role === 'tester') {
    await grantTesterDailyBokchae(user.id).catch(() => {})
  }

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

  return wallet?.balance || 0
}

/**
 * Deduct talismans from user wallet
 *
 * Race condition 방지: RPC 함수(deduct_wallet_balance)를 우선 사용하여
 * UPDATE wallets SET balance = balance - $cost WHERE balance >= $cost 원자적 차감.
 * RPC 미설정 시 fallback으로 .gte() 조건부 UPDATE 사용.
 */
export async function deductTalisman(
  featureKey: string,
  /**
   * 차감할 복채(만냥). **필수** — 값은 lib/domain/payment/feature-costs.ts 에서 온다.
   *
   * 🔴 예전에는 생략하면 `ai_prompts.talisman_cost` 를 읽었다. 그 표는 낡아
   *    `cheonjiin_analysis: 0`(실제 2만냥) 이었고, 키 이름도 이 호출부와 달라 조회가
   *    실패하면 조용히 **1만냥**으로 떨어졌다. «표시 = 실차감» 규율이 뚫리는 자리라
   *    생략 자체를 막는다(컴파일 타임 잠금).
   */
  amount: number
): Promise<{
  success: boolean
  error?: string
  remainingBalance?: number
  errorType?: string
  currentTier?: string
}> {
  // 'use server' export = 공개 엔드포인트. amount 는 클라이언트가 임의로 줄 수 있다.
  // 음수·0·비정수를 여기서 자르지 않으면 RPC 가 예외를 던지고, 그 예외가
  // «RPC 미설정» 폴백으로 해석되어 가드 없는 UPDATE 로 잔액이 **증액**된다.
  if (!Number.isInteger(amount) || amount <= 0) {
    logger.error('[Wallet] deductTalisman rejected invalid amount:', { featureKey, amount })
    return { success: false, error: '잘못된 차감 금액입니다.' }
  }
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'deductTalisman', featureKey, customAmount: amount })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  // Check if admin (unlimited)
  const role = await getUserRole(supabase, user.id)

  if (hasUnlimitedAccess(role)) {
    return { success: true, remainingBalance: UNLIMITED_BALANCE }
  }

  const cost = amount

  // 복채 차감은 service_role 전용 — 인증(위)을 통과한 본인 계정에만.
  const admin = createAdminClient()

  // 일일 한도 계획: 무료분은 티어 일일한도까지, 초과분은 충전(CHARGE) 잔여로만.
  // (사용자 확정 2026-07-12: 충전분 캡 무관, 무료분만 캡)
  const limits = await getUserTierLimits()
  const dailyLimit = limits?.daily_talisman_limit ?? 0
  const [usedToday, chargeExemptRemaining] = await Promise.all([
    getUsedToday(admin, user.id),
    getChargeExemptRemaining(admin, user.id),
  ])
  const plan = computeSpendPlan({ cost, dailyLimit, usedToday, chargeExemptRemaining })
  if (!plan.allowed) {
    const message =
      plan.reason === 'INSUFFICIENT_CHARGED'
        ? `오늘의 무료 복채 한도를 초과했습니다. 복채를 충전하면 계속 이용할 수 있어요. (충전 잔여 ${chargeExemptRemaining}만냥)`
        : dailyLimit > 0
          ? `오늘의 일일 복채 한도에 도달했습니다. (${usedToday}/${dailyLimit}만냥) 복채를 충전하거나 자정에 리셋됩니다.`
          : '복채를 충전하면 이용할 수 있어요.'
    return {
      success: false,
      error: message,
      errorType: 'DAILY_LIMIT',
      currentTier: limits?.tier || 'SINGLE',
    }
  }

  // --- Atomic deduction via RPC ---
  // PostgreSQL function: deduct_wallet_balance(p_user_id UUID, p_amount INT)
  // Returns new balance on success, -1 if wallet not found, -2 if insufficient balance
  const { data: rpcResult, error: rpcError } = await admin.rpc('deduct_wallet_balance', {
    p_user_id: user.id,
    p_amount: cost,
  })

  let newBalance: number

  if (rpcError) {
    // RPC not available — fallback to conditional UPDATE with .gte() guard
    logger.warn('[Wallet] RPC deduct_wallet_balance unavailable, using fallback:', rpcError.message)

    // Step 1: Read current balance
    const { data: wallet, error: walletError } = await admin
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      return { success: false, error: '지갑 정보를 찾을 수 없습니다.' }
    }

    if (wallet.balance < cost) {
      const limits = await getUserTierLimits()
      return {
        success: false,
        error: `복채가 부족합니다. (필요: ${cost}만냥, 보유: ${wallet.balance}만냥)`,
        errorType: 'INSUFFICIENT_BALANCE',
        currentTier: limits?.tier || 'SINGLE',
      }
    }

    // Step 2: Conditional UPDATE — .gte('balance', cost) ensures no negative balance
    // even if another request deducted between read and write
    const { data: updated, error: updateError } = await admin
      .from('wallets')
      .update({ balance: wallet.balance - cost })
      .eq('user_id', user.id)
      .gte('balance', cost)
      .select('balance')
      .single()

    if (updateError || !updated) {
      return {
        success: false,
        error: '복채 차감 중 동시 요청이 감지되었습니다. 다시 시도해주세요.',
      }
    }

    newBalance = updated.balance
  } else {
    // RPC succeeded — interpret return value
    const rpcBalance = rpcResult as number

    if (rpcBalance === -1) {
      return { success: false, error: '지갑 정보를 찾을 수 없습니다.' }
    }

    if (rpcBalance === -2) {
      const { data: currentWallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()
      const limits = await getUserTierLimits()
      return {
        success: false,
        error: `복채가 부족합니다. (필요: ${cost}만냥, 보유: ${currentWallet?.balance ?? 0}만냥)`,
        errorType: 'INSUFFICIENT_BALANCE',
        currentTier: limits?.tier || 'SINGLE',
      }
    }

    newBalance = rpcBalance
  }

  // Log transaction — 이 장부가 get_charge_exempt_remaining 의 사용액 합산 재원이다.
  // 삽입이 조용히 실패하면 충전면제 잔여가 과대계상되어 일일 상한이 뚫린다(회계 누수).
  // 차감(잔액)과 같은 admin 경로로 쓰고, 실패는 반드시 표면화한다.
  const { error: txLogError } = await admin.from('wallet_transactions').insert({
    user_id: user.id,
    amount: -cost,
    type: 'USE',
    feature_key: featureKey,
    description: `${deductKeyLabel(featureKey)} (${cost}만냥 복채 사용)`,
  })
  if (txLogError) {
    logger.error('[Wallet] USE 트랜잭션 기록 실패 — 충전면제 회계 누수 위험:', {
      featureKey,
      cost,
      message: txLogError.message,
    })
  }

  // Increment daily usage counter — 무료분(fromCap)만 카운트. 충전분(overCap)은 한도 무관.
  if (plan.fromCap > 0) {
    await incrementDailyUsage(plan.fromCap)
  }

  return { success: true, remainingBalance: newBalance }
}

/**
 * 스튜디오(관상·손금·풍수) AI 실패 시 복채 환불.
 *
 * 스튜디오는 차감이 클라에서 일어나므로(deductTalisman 직접 호출), 서버는
 * 최근 5분 내 동일 featureKey 차감(USE) 트랜잭션을 확인한 뒤에만 환불한다
 * — 무차감 환불 어뷰즈 방지. 마스터(무제한)는 차감 트랜잭션이 남지 않으므로 자연히 제외된다.
 * 멱등: 동일 차감에 대한 중복 환불(featureKey_REFUND)을 방지한다.
 */
export async function refundStudioCost(featureKey: string): Promise<{ refunded: boolean; amount?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { refunded: false }

  const admin = createAdminClient()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // 최근 5분 내 동일 featureKey 차감(USE) 트랜잭션 확인
  const { data: useTx } = await admin
    .from('wallet_transactions')
    .select('id, amount, created_at')
    .eq('user_id', user.id)
    .eq('feature_key', featureKey)
    .eq('type', 'USE')
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!useTx) return { refunded: false } // 차감 기록 없음(마스터·어뷰즈)

  const refundKey = `${featureKey}_REFUND`
  // 멱등: 해당 차감 이후 이미 환불했는지
  const { data: existingRefund } = await admin
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('feature_key', refundKey)
    .gte('created_at', useTx.created_at)
    .maybeSingle()

  if (existingRefund) return { refunded: false } // 이미 환불됨

  // 성공 검증 — 차감 이후 같은 유형의 완료 기록(analysis_history)이 생겼다면
  // 풀이는 성공한 것이다. 결과는 받고 돈은 돌려받는 어뷰즈를 여기서 끊는다.
  // category 가 featureKey 와 안 겹치는 유형(이용권 등)은 조회가 비어 기존과 동일하게 동작.
  const { data: successRecord } = await admin
    .from('analysis_history')
    .select('id')
    .eq('user_id', user.id)
    .eq('category', featureKey)
    .gte('created_at', useTx.created_at)
    .limit(1)
    .maybeSingle()

  if (successRecord) return { refunded: false } // 성공한 풀이 — 환불 대상 아님

  const amount = Math.abs(useTx.amount)
  if (amount <= 0) return { refunded: false }

  const { error: refundError } = await admin.rpc('add_wallet_balance', { p_user_id: user.id, p_amount: amount })
  if (refundError) {
    logger.error('[Wallet] refundStudioCost add_wallet_balance error:', refundError)
    return { refunded: false }
  }
  await admin.from('wallet_transactions').insert({
    user_id: user.id,
    amount,
    type: 'BONUS',
    feature_key: refundKey,
    description: `${featureKey} 분석 실패 환불 (${amount}만냥)`,
  })
  return { refunded: true, amount }
}

// 복채 발행(addTalismans)·가입 보너스(grantSignupBonus)는 여기서 export 하지 않는다.
// `'use server'` 파일의 export 는 전부 로그인 유저가 직접 호출 가능한 공개 엔드포인트가
// 되므로, 결제 검증 없이 임의 금액을 발행할 수 있게 된다(S-P0).
// → 서버 전용 모듈 `lib/services/wallet-grant.ts` 로 이관(결제 승인·구독 첫결제·가입 인증만 호출).

/**
 * Get wallet transaction history
 */
export async function getWalletTransactions(limit: number = 50) {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'getWalletTransactions', limit })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('wallet_transactions')
    .select('id, user_id, amount, type, feature_key, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
