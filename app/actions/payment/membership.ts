'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/helpers'
import { hasUnlimitedAccess, UNLIMITED_TIER_LIMITS } from '@/lib/auth/privileges'
import { FREE_TIER_LIMITS } from '@/lib/domain/payment/membership-benefits'
import { DEFAULT_MEMBER_CATEGORY, MEMBER_CATEGORY_META, type MemberCategory } from '@/lib/domain/family/member-category'

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
  const role = await getUserRole(supabase, user.id)

  // 마스터: 가족·기록·일일한도 전부 개방 (구독 여부 무관)
  if (hasUnlimitedAccess(role)) {
    return { ...UNLIMITED_TIER_LIMITS }
  }

  if (role === 'tester') {
    return {
      tier: 'TESTER',
      daily_talisman_limit: 100, // 100만냥/day
      relationship_limit: 10, // 갈래마다 10명 (가족 10 · 지인 10)
      storage_limit: 20, // 기록 20개 — 멤버십과 같은 한도
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
    // 무료 사용자 한도 — 화면(등급 비교표)과 같은 출처를 쓴다. membership-benefits.ts 참조.
    return {
      tier: null,
      daily_talisman_limit: FREE_TIER_LIMITS.dailyTalismanLimit,
      relationship_limit: FREE_TIER_LIMITS.relationshipLimit,
      storage_limit: FREE_TIER_LIMITS.storageLimit,
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
/**
 * 인연을 하나 더 등록할 수 있는가 — **갈래별로 따로 센다**(CEO 지시 2026-08-16).
 *
 * 🔴 합산으로 세면 지인을 많이 등록한 사람의 «가족 자리»가 줄어든다. 가족은 지울 수 없는
 *    사람들이고 지인은 늘었다 줄었다 하는 목록이라, 한 통에 담으면 늘 가족이 밀린다.
 *    그래서 한도 하나(relationship_limit)를 **갈래마다 각각** 적용한다 — 가족 10 · 지인 10.
 */
export async function canAddRelationship(category: MemberCategory = DEFAULT_MEMBER_CATEGORY): Promise<{
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

  // 같은 갈래만 센다 — 지인을 채워도 가족 자리는 그대로 남는다.
  const { count } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('member_category', category)

  const currentCount = count || 0

  // 마스터는 getUserTierLimits 의 admin 분기(UNLIMITED_TIER_LIMITS)로 여기 도달 —
  // 999 를 상한이 아니라 무제한으로 해석한다(canStoreResult 와 동일 규약).
  if (relationshipLimit >= UNLIMITED_TIER_LIMITS.relationship_limit) {
    return {
      allowed: true,
      current: currentCount,
      limit: relationshipLimit,
    }
  }

  if (currentCount >= relationshipLimit) {
    const upgradeMessage = limits?.is_subscribed
      ? '더 높은 등급으로 업그레이드하여 더 많은 인연의 복을 관리하세요.'
      : '복지기 멤버십에 가입하여 더 많은 인연의 복을 관리하세요.'

    return {
      allowed: false,
      current: currentCount,
      limit: relationshipLimit,
      message: `${MEMBER_CATEGORY_META[category].label} 등록 한도에 도달했습니다. (${currentCount}/${relationshipLimit}) ${upgradeMessage}`,
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
  const dailyLimit = limits?.daily_talisman_limit ?? 0

  // Get today's usage (무료분 소비량)
  const { data: usageLog } = await supabase
    .from('daily_usage_logs')
    .select('talismans_used')
    .eq('user_id', user.id)
    .eq('usage_date', new Date().toISOString().split('T')[0]) // Today's date (YYYY-MM-DD)
    .maybeSingle()

  const usedToday = usageLog?.talismans_used || 0
  const capRemaining = Math.max(0, dailyLimit - usedToday)

  // 무료 한도가 남았거나, 충전 복채가 있으면 사용 가능(충전분 캡 무관 — 2026-07-12 정책)
  const admin = createAdminClient()
  const { data: charged } = await admin.rpc('get_charge_exempt_remaining', { p_user_id: user.id })
  const chargeExemptRemaining = typeof charged === 'number' ? charged : 0

  if (capRemaining <= 0 && chargeExemptRemaining <= 0) {
    return {
      allowed: false,
      used: usedToday,
      limit: dailyLimit,
      message:
        dailyLimit > 0
          ? `오늘의 일일 복채 한도에 도달했습니다. (${usedToday}/${dailyLimit}만냥) 복채를 충전하거나 자정에 리셋됩니다.`
          : '복채를 충전하면 이용할 수 있어요.',
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
export async function incrementDailyUsage(amount: number = 1): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const today = new Date().toISOString().split('T')[0]

  // 일일 사용량 기록은 service_role 전용(유저가 자기 한도를 리셋하지 못하도록 — Fable 검토 R4).
  const admin = createAdminClient()

  // Upsert usage log
  const { error } = await admin.from('daily_usage_logs').upsert(
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
    const { data: existing } = await admin
      .from('daily_usage_logs')
      .select('talismans_used')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .single()

    if (existing) {
      const { error: updateError } = await admin
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
