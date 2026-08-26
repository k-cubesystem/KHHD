'use server'

import { requireAdminClient } from '@/lib/auth/admin-guard'
import { logger } from '@/lib/utils/logger'

export interface AdminSubscription {
  id: string
  user_id: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  next_billing_date: string | null
  last_payment_date: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  plan: {
    id: string
    name: string
    price: number
  } | null
  profile: {
    email: string
    role: string
  } | null
}

export interface SubscriptionStats {
  totalActive: number
  totalCancelled: number
  totalExpired: number
  totalFailed: number
  monthlyRevenue: number
}

/**
 * 이 파일의 액션들은 남의 구독·지갑을 읽고 쓴다.
 * 유저 세션 클라이언트로는 RLS(subscriptions/wallets 모두 select-own만 존재)에 막혀
 * 0행이 매칭되고도 error가 나지 않아 «성공했다고 표시되지만 아무것도 안 바뀌는» 상태가 된다.
 * 반드시 관리자 관문이 돌려주는 service_role 클라이언트를 쓴다.
 */

// 구독 통계 조회
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const supabase = await requireAdminClient()

  const { data: subscriptions } = await supabase.from('subscriptions').select(`
            status,
            plan:membership_plans(price)
        `)

  const stats: SubscriptionStats = {
    totalActive: 0,
    totalCancelled: 0,
    totalExpired: 0,
    totalFailed: 0,
    monthlyRevenue: 0,
  }

  if (subscriptions) {
    for (const sub of subscriptions) {
      switch (sub.status) {
        case 'ACTIVE':
          stats.totalActive++
          if (sub.plan && typeof sub.plan === 'object' && 'price' in sub.plan) {
            stats.monthlyRevenue += (sub.plan as { price: number }).price
          }
          break
        case 'CANCELLED':
          stats.totalCancelled++
          break
        case 'EXPIRED':
          stats.totalExpired++
          break
        case 'PAYMENT_FAILED':
          stats.totalFailed++
          break
      }
    }
  }

  return stats
}

// 구독 목록 조회
export async function getSubscriptions(
  page: number = 1,
  limit: number = 20,
  statusFilter?: string
): Promise<{
  subscriptions: AdminSubscription[]
  total: number
  totalPages: number
}> {
  const supabase = await requireAdminClient()

  // profiles는 subscriptions와 직접 FK가 없어 임베드하면 PGRST200으로 쿼리 전체가 실패한다.
  // (양쪽 다 auth.users를 가리킬 뿐이다) → 아래에서 따로 조회해 붙인다.
  let query = supabase.from('subscriptions').select(
    `
            *,
            plan:membership_plans(id, name, price)
        `,
    { count: 'exact' }
  )

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) {
    logger.error('[Admin] Get subscriptions error:', error)
    return { subscriptions: [], total: 0, totalPages: 0 }
  }

  const rows = data || []
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
  const profileMap = new Map<string, { email: string; role: string }>()

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .in('id', userIds)

    if (profileError) {
      logger.error('[Admin] 구독자 프로필 조회 실패:', profileError)
    }
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { email: p.email ?? '', role: p.role ?? 'user' })
    }
  }

  return {
    subscriptions: rows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null })) as AdminSubscription[],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

// 구독 상태 변경 (관리자용)
export async function updateSubscriptionStatus(
  subscriptionId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await requireAdminClient()

  const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: '유효하지 않은 상태입니다.' }
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'CANCELLED') {
    updateData.cancelled_at = new Date().toISOString()
    updateData.cancel_reason = '관리자에 의해 해지됨'
  }

  const { error } = await supabase.from('subscriptions').update(updateData).eq('id', subscriptionId)

  if (error) {
    logger.error('[Admin] Update subscription status error:', error)
    return { success: false, error: '상태 변경에 실패했습니다.' }
  }

  return { success: true }
}

// 수동 부적 지급
export async function grantTalismans(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await requireAdminClient()

  if (!Number.isInteger(amount) || amount <= 0 || amount > 100) {
    return { success: false, error: '부적 수량은 1~100 사이의 정수여야 합니다.' }
  }

  const { data: wallet, error: readError } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) {
    logger.error('[Admin] grantTalismans 지갑 조회 실패:', readError)
    return { success: false, error: '지갑 조회에 실패했습니다.' }
  }

  const writeError = wallet
    ? (
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance + amount })
          .eq('user_id', userId)
      ).error
    : (await supabase.from('wallets').insert({ user_id: userId, balance: amount })).error

  if (writeError) {
    logger.error('[Admin] grantTalismans 지갑 갱신 실패:', writeError)
    return { success: false, error: '복채 지급에 실패했습니다.' }
  }

  const { error: logError } = await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: amount,
    type: 'BONUS',
    description: `관리자 지급: ${reason}`,
  })

  if (logError) logger.error('[Admin] grantTalismans 거래기록 실패:', logError)

  return { success: true }
}

// 멤버십 플랜 목록 조회 (관리자용)
export async function getMembershipPlansAdmin() {
  const supabase = await requireAdminClient()

  const { data, error } = await supabase.from('membership_plans').select('*').order('sort_order', { ascending: true })

  if (error) {
    logger.error('[Admin] Get plans error:', error)
    return []
  }

  return data || []
}

// 멤버십 플랜 업데이트
export async function updateMembershipPlan(
  planId: string,
  updates: {
    name?: string
    price?: number
    talismans_per_period?: number
    is_active?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await requireAdminClient()

  const { error } = await supabase.from('membership_plans').update(updates).eq('id', planId)

  if (error) {
    logger.error('[Admin] Update plan error:', error)
    return { success: false, error: '플랜 업데이트에 실패했습니다.' }
  }

  return { success: true }
}
