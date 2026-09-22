'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/helpers'
import { getActiveMembership } from '@/lib/auth/subscription'
import { hasUnlimitedAccess, UNLIMITED_TIER_LIMITS } from '@/lib/auth/privileges'
import { FREE_TIER_LIMITS, UNLIMITED_STORAGE_LIMIT } from '@/lib/domain/payment/membership-benefits'
import { DEFAULT_MEMBER_CATEGORY, MEMBER_CATEGORY_META, type MemberCategory } from '@/lib/domain/family/member-category'

type ServerClient = Awaited<ReturnType<typeof createClient>>

interface TierLimits {
  tier: string | null
  relationship_limit: number
  storage_limit: number
  is_subscribed: boolean
}

interface LimitCheck {
  allowed: boolean
  current: number
  limit: number
  message?: string
}

const FREE_LIMITS: TierLimits = {
  tier: null,
  relationship_limit: FREE_TIER_LIMITS.relationshipLimit,
  storage_limit: FREE_TIER_LIMITS.storageLimit,
  is_subscribed: false,
}

/** 검수 계정 — 등급과 무관한 고정 한도(갈래마다 10명 · 기록 20개). */
const TESTER_LIMITS: TierLimits = {
  tier: 'TESTER',
  relationship_limit: 10,
  storage_limit: 20,
  is_subscribed: true,
}

const LOGIN_REQUIRED: LimitCheck = { allowed: false, current: 0, limit: 0, message: '로그인이 필요합니다.' }

/**
 * 등급 한도(인연·기록 보관). 멤버십 판정은 lib/auth/subscription(getActiveMembership) 한 곳을 따른다.
 *
 * 🔴 status='ACTIVE' 만 보면 «기간 끝 해지»를 누른 즉시 무료 한도(보관 5개)로 떨어지고, 결제 기간이 남았는데도
 *    다음 기록 저장 때 오래된 기록이 지워진다(history.ts 자동 정리 — 약관 제6조 제5항 위반).
 *    이용권 월 몫·등급 기능과 같은 판정을 써야 한도만 먼저 끊기지 않는다.
 */
async function readTierLimits(supabase: ServerClient, userId: string): Promise<TierLimits> {
  const [role, membership] = await Promise.all([getUserRole(supabase, userId), getActiveMembership(userId)])

  if (hasUnlimitedAccess(role)) return { ...UNLIMITED_TIER_LIMITS }
  if (role === 'tester') return { ...TESTER_LIMITS }
  if (!membership?.planId) return { ...FREE_LIMITS }

  const { data } = await supabase
    .from('membership_plans')
    .select('tier, relationship_limit, storage_limit')
    .eq('id', membership.planId)
    .maybeSingle()

  const plan = data as { tier: string | null; relationship_limit: number; storage_limit: number } | null
  if (!plan) return { ...FREE_LIMITS }

  return {
    tier: plan.tier,
    relationship_limit: plan.relationship_limit,
    storage_limit: plan.storage_limit,
    is_subscribed: true,
  }
}

/**
 * 등급과 한도(인연·기록 보관). 이용권 장 수는 여기서 다루지 않는다 — 정본은 이용권 요약(getMyPassSummary).
 */
export async function getUserTierLimits(): Promise<TierLimits | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  return readTierLimits(supabase, user.id)
}

/**
 * 인연을 하나 더 등록할 수 있는가 — **갈래별로 따로 센다**(CEO 지시 2026-08-16).
 *
 * 🔴 합산으로 세면 지인을 많이 등록한 사람의 «가족 자리»가 줄어든다. 가족은 지울 수 없는
 *    사람들이고 지인은 늘었다 줄었다 하는 목록이라, 한 통에 담으면 늘 가족이 밀린다.
 *    그래서 한도 하나(relationship_limit)를 **갈래마다 각각** 적용한다.
 */
async function checkRelationship(
  supabase: ServerClient,
  userId: string,
  limits: TierLimits,
  category: MemberCategory
): Promise<LimitCheck> {
  const relationshipLimit = limits.relationship_limit || FREE_TIER_LIMITS.relationshipLimit

  const { count } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('member_category', category)

  const currentCount = count || 0

  // 마스터(UNLIMITED_TIER_LIMITS)의 999 는 상한이 아니라 «상한 없음»이다(canStoreResult 와 동일 규약).
  if (relationshipLimit >= UNLIMITED_TIER_LIMITS.relationship_limit) {
    return { allowed: true, current: currentCount, limit: relationshipLimit }
  }

  if (currentCount >= relationshipLimit) {
    const upgradeMessage = limits.is_subscribed
      ? '더 높은 등급으로 업그레이드하여 더 많은 인연의 복을 관리하세요.'
      : '복지기 멤버십에 가입하여 더 많은 인연의 복을 관리하세요.'

    return {
      allowed: false,
      current: currentCount,
      limit: relationshipLimit,
      message: `${MEMBER_CATEGORY_META[category].label} 등록 한도에 도달했습니다. (${currentCount}/${relationshipLimit}) ${upgradeMessage}`,
    }
  }

  return { allowed: true, current: currentCount, limit: relationshipLimit }
}

async function checkStorage(supabase: ServerClient, userId: string, limits: TierLimits): Promise<LimitCheck> {
  const storageLimit = limits.storage_limit || FREE_TIER_LIMITS.storageLimit

  const { count } = await supabase
    .from('saju_records')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', userId)

  const currentCount = count || 0

  if (storageLimit >= UNLIMITED_STORAGE_LIMIT) {
    return { allowed: true, current: currentCount, limit: storageLimit }
  }

  if (currentCount >= storageLimit) {
    const upgradeMessage = limits.is_subscribed
      ? '더 높은 등급으로 업그레이드하여 저장 공간을 늘리세요.'
      : '멤버십에 가입하여 더 많은 결과를 저장하세요.'

    return {
      allowed: false,
      current: currentCount,
      limit: storageLimit,
      message: `저장 공간이 부족합니다. (${currentCount}/${storageLimit}) ${upgradeMessage}`,
    }
  }

  return { allowed: true, current: currentCount, limit: storageLimit }
}

export async function canAddRelationship(category: MemberCategory = DEFAULT_MEMBER_CATEGORY): Promise<LimitCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ...LOGIN_REQUIRED }
  return checkRelationship(supabase, user.id, await readTierLimits(supabase, user.id), category)
}

export async function canStoreResult(): Promise<LimitCheck> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ...LOGIN_REQUIRED }
  return checkStorage(supabase, user.id, await readTierLimits(supabase, user.id))
}

/** 한도 요약 — 등급 판정은 한 번만 하고 두 개수는 나란히 센다. */
export async function getUserLimitsSummary() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const limits = user ? await readTierLimits(supabase, user.id) : null
  const [relationshipCheck, storageCheck] =
    user && limits
      ? await Promise.all([
          checkRelationship(supabase, user.id, limits, DEFAULT_MEMBER_CATEGORY),
          checkStorage(supabase, user.id, limits),
        ])
      : [LOGIN_REQUIRED, LOGIN_REQUIRED]

  return {
    tier: limits?.tier,
    is_subscribed: limits?.is_subscribed || false,
    relationships: {
      current: relationshipCheck.current,
      limit: relationshipCheck.limit,
      remaining: relationshipCheck.limit - relationshipCheck.current,
    },
    storage: {
      current: storageCheck.current,
      limit: storageCheck.limit,
      // null = 개수 제한 없음. 화면에 «무제한»이라는 말을 싣지 않는다.
      remaining: storageCheck.limit >= UNLIMITED_STORAGE_LIMIT ? null : storageCheck.limit - storageCheck.current,
    },
  }
}
