'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { canUseTalisman, incrementDailyUsage, getUserTierLimits } from './membership'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { getUserRole } from '@/lib/supabase/helpers'
import { logger } from '@/lib/utils/logger'

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
 * Get feature cost from database.
 * Cached for 5 minutes since feature costs rarely change.
 */
export async function getFeatureCost(featureKey: string): Promise<number> {
  const getCachedFeatureCost = unstable_cache(
    async (key: string) => {
      const supabase = await createClient()

      // 1. Try finding in AI Prompts (Preferred configuration source)
      const { data: prompt } = await supabase.from('ai_prompts').select('talisman_cost').eq('key', key).single()

      if (prompt && prompt.talisman_cost !== null) {
        return prompt.talisman_cost
      }

      // 2. Fallback to legacy feature_costs table
      const { data, error } = await supabase
        .from('feature_costs')
        .select('cost')
        .eq('key', key)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return 1 // Default fallback
      }

      return data.cost
    },
    [`feature-cost-${featureKey}`],
    {
      revalidate: 300, // 5분 캐시
      tags: ['feature-costs'],
    }
  )

  return getCachedFeatureCost(featureKey)
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

  if (role === 'admin') {
    return 999 // Unlimited display for admin
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
  customAmount?: number
): Promise<{
  success: boolean
  error?: string
  remainingBalance?: number
  errorType?: string
  currentTier?: string
}> {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'deductTalisman', featureKey, customAmount })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  // Check if admin (unlimited)
  const role = await getUserRole(supabase, user.id)

  if (role === 'admin') {
    return { success: true, remainingBalance: 999 }
  }

  // Check daily talisman usage limit (멤버십 일일 한도 체크)
  const dailyCheck = await canUseTalisman()
  if (!dailyCheck.allowed) {
    const limits = await getUserTierLimits()
    return {
      success: false,
      error: dailyCheck.message,
      errorType: 'DAILY_LIMIT',
      currentTier: limits?.tier || 'SINGLE',
    }
  }

  // Get cost
  const cost = customAmount || (await getFeatureCost(featureKey))

  // --- Atomic deduction via RPC ---
  // PostgreSQL function: deduct_wallet_balance(p_user_id UUID, p_amount INT)
  // Returns new balance on success, -1 if wallet not found, -2 if insufficient balance
  const { data: rpcResult, error: rpcError } = await supabase.rpc('deduct_wallet_balance', {
    p_user_id: user.id,
    p_amount: cost,
  })

  let newBalance: number

  if (rpcError) {
    // RPC not available — fallback to conditional UPDATE with .gte() guard
    logger.warn('[Wallet] RPC deduct_wallet_balance unavailable, using fallback:', rpcError.message)

    // Step 1: Read current balance
    const { data: wallet, error: walletError } = await supabase
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
    const { data: updated, error: updateError } = await supabase
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

  // Log transaction
  const { data: featureCostData } = await supabase.from('feature_costs').select('label').eq('key', featureKey).single()

  await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    amount: -cost,
    type: 'USE',
    feature_key: featureKey,
    description: `${featureCostData?.label || featureKey} (${cost}만냥 복채 사용)`,
  })

  // Increment daily usage counter
  await incrementDailyUsage(cost)

  return { success: true, remainingBalance: newBalance }
}

/**
 * Add talismans to user wallet (for payments)
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

  // Atomic balance increment via RPC — prevents race conditions
  const { data: newBalance, error: rpcError } = await supabase.rpc('add_wallet_balance', {
    p_user_id: user.id,
    p_amount: amount,
  })

  if (rpcError) {
    logger.error('[Wallet] add_wallet_balance RPC failed, using fallback:', rpcError)
    // Fallback: upsert with increment — still better than read-then-write
    const { error: upsertError } = await supabase
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
