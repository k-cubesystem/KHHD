'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get user's membership tier and limits
 */
export async function getUserTierLimits() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Check if user is tester - give special privileges
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'tester') {
    return {
      tier: 'TESTER',
      daily_talisman_limit: 100, // 100만냥/day
      relationship_limit: 10, // 가족 10명
      storage_limit: 10, // 기록 10개
      is_subscribed: true,
    }
  }

  // Get active subscription and plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, status, membership_plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!subscription || !subscription.membership_plans) {
    // No active subscription - return default limits
    return {
      tier: null,
      daily_talisman_limit: 0,
      relationship_limit: 3, // Free users can add up to 3
      storage_limit: 10,
      is_subscribed: false,
    }
  }

  const plan = Array.isArray(subscription.membership_plans)
    ? subscription.membership_plans[0]
    : subscription.membership_plans

  return {
    tier: plan.tier,
    daily_talisman_limit: plan.daily_talisman_limit,
    relationship_limit: plan.relationship_limit,
    storage_limit: plan.storage_limit,
    is_subscribed: true,
  }
}

/**
 * Check if user can add more relationships
 */
export async function canAddRelationship(): Promise<{
  allowed: boolean
  current: number
  limit: number
  message?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, current: 0, limit: 0, message: '로그인이 필요합니다.' }
  }

  // Get tier limits
  const limits = await getUserTierLimits()
  const relationshipLimit = limits?.relationship_limit || 3

  // Count current relationships
  const { count } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const currentCount = count || 0

  if (currentCount >= relationshipLimit) {
    const upgradeMessage = limits?.is_subscribed
      ? '업그레이드하여 더 많은 인연을 등록하세요.'
      : '멤버십에 가입하여 더 많은 인연을 등록하세요.'

    return {
      allowed: false,
      current: currentCount,
      limit: relationshipLimit,
      message: `인연 등록 한도에 도달했습니다. (${currentCount}/${relationshipLimit}) ${upgradeMessage}`,
    }
  }

  return {
    allowed: true,
    current: currentCount,
    limit: relationshipLimit,
  }
}

/**
 * Check daily talisman usage limit
 */
export async function canUseTalisman(): Promise<{
  allowed: boolean
  used: number
  limit: number
  message?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, used: 0, limit: 0, message: '로그인이 필요합니다.' }
  }

  // Get tier limits
  const limits = await getUserTierLimits()

  if (!limits?.is_subscribed) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      message: '멤버십에 가입하여 일일 복채 혜택을 받으세요.',
    }
  }

  const dailyLimit = limits.daily_talisman_limit

  // Get today's usage
  const { data: usageLog } = await supabase
    .from('daily_usage_logs')
    .select('talismans_used')
    .eq('user_id', user.id)
    .eq('usage_date', new Date().toISOString().split('T')[0]) // Today's date (YYYY-MM-DD)
    .single()

  const usedToday = usageLog?.talismans_used || 0

  if (usedToday >= dailyLimit) {
    return {
      allowed: false,
      used: usedToday,
      limit: dailyLimit,
      message: `오늘의 일일 복채 한도에 도달했습니다. (${usedToday}/${dailyLimit}만냥) 자정에 리셋됩니다.`,
    }
  }

  return {
    allowed: true,
    used: usedToday,
    limit: dailyLimit,
  }
}

/**
 * Increment daily talisman usage
 */
export async function incrementDailyUsage(
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const today = new Date().toISOString().split('T')[0]

  // Upsert usage log
  const { error } = await supabase.from('daily_usage_logs').upsert(
    {
      user_id: user.id,
      usage_date: today,
      talismans_used: amount,
    },
    {
      onConflict: 'user_id,usage_date',
      ignoreDuplicates: false,
    }
  )

  // If record exists, increment
  if (error && error.code === '23505') {
    // Unique constraint violation - record exists, increment it
    const { data: existing } = await supabase
      .from('daily_usage_logs')
      .select('talismans_used')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single()

    if (existing) {
      const { error: updateError } = await supabase
        .from('daily_usage_logs')
        .update({ talismans_used: existing.talismans_used + amount })
        .eq('user_id', user.id)
        .eq('usage_date', today)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    }
  } else if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Check storage limit
 */
export async function canStoreResult(): Promise<{
  allowed: boolean
  current: number
  limit: number
  message?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { allowed: false, current: 0, limit: 0, message: '로그인이 필요합니다.' }
  }

  // Get tier limits
  const limits = await getUserTierLimits()
  const storageLimit = limits?.storage_limit || 10

  // Count stored results (saju_records table)
  const { count } = await supabase
    .from('saju_records')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', user.id)

  const currentCount = count || 0

  // 999 means unlimited
  if (storageLimit === 999) {
    return {
      allowed: true,
      current: currentCount,
      limit: storageLimit,
    }
  }

  if (currentCount >= storageLimit) {
    const upgradeMessage = limits?.is_subscribed
      ? '더 높은 등급으로 업그레이드하여 저장 공간을 늘리세요.'
      : '멤버십에 가입하여 더 많은 결과를 저장하세요.'

    return {
      allowed: false,
      current: currentCount,
      limit: storageLimit,
      message: `저장 공간이 부족합니다. (${currentCount}/${storageLimit}) ${upgradeMessage}`,
    }
  }

  return {
    allowed: true,
    current: currentCount,
    limit: storageLimit,
  }
}

/**
 * Get user's current limits summary
 */
export async function getUserLimitsSummary() {
  const limits = await getUserTierLimits()
  const relationshipCheck = await canAddRelationship()
  const talismanCheck = await canUseTalisman()
  const storageCheck = await canStoreResult()

  return {
    tier: limits?.tier,
    is_subscribed: limits?.is_subscribed || false,
    relationships: {
      current: relationshipCheck.current,
      limit: relationshipCheck.limit,
      remaining: relationshipCheck.limit - relationshipCheck.current,
    },
    daily_talismans: {
      used: talismanCheck.used,
      limit: talismanCheck.limit,
      remaining: talismanCheck.limit - talismanCheck.used,
    },
    storage: {
      current: storageCheck.current,
      limit: storageCheck.limit,
      remaining: storageCheck.limit === 999 ? '무제한' : storageCheck.limit - storageCheck.current,
    },
  }
}
