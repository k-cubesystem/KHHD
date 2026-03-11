'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canUseTalisman, incrementDailyUsage, getUserTierLimits } from './membership'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

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
 * Get feature cost from database
 */
export async function getFeatureCost(featureKey: string): Promise<number> {
  const supabase = await createClient()

  // 1. Try finding in AI Prompts (Preferred configuration source)
  const { data: prompt } = await supabase.from('ai_prompts').select('talisman_cost').eq('key', featureKey).single()

  if (prompt && prompt.talisman_cost !== null) {
    return prompt.talisman_cost
  }

  // 2. Fallback to legacy feature_costs table
  const { data, error } = await supabase
    .from('feature_costs')
    .select('cost')
    .eq('key', featureKey)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return 1 // Default fallback
  }

  return data.cost
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
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'admin') {
    return 999 // Unlimited display for admin
  }

  // 테스터: 매일 50만냥 자동충전 후 실제 잔액 반환
  if (profile?.role === 'tester') {
    await grantTesterDailyBokchae(user.id).catch(() => {})
  }

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

  return wallet?.balance || 0
}

/**
 * Deduct talismans from user wallet
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
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'admin') {
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

  // Get current balance
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

  // Deduct balance
  const newBalance = wallet.balance - cost
  const { error: updateError } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', user.id)

  if (updateError) {
    return { success: false, error: '복채 차감 중 오류가 발생했습니다.' }
  }

  // Log transaction
  const { data: featureCost } = await supabase.from('feature_costs').select('label').eq('key', featureKey).single()

  await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    amount: -cost,
    type: 'USE',
    feature_key: featureKey,
    description: `${featureCost?.label || featureKey} (${cost}만냥 복채 사용)`,
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

  // Get current balance
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

  const currentBalance = wallet?.balance || 0
  const newBalance = currentBalance + amount

  // Update balance
  const { error: updateError } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', user.id)

  if (updateError) {
    return { success: false, error: '복채 충전 중 오류가 발생했습니다.' }
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
    description: `신규 회원 가입 축하 복채 ${SIGNUP_AMOUNT}만냥 증정 🎁`,
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
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
