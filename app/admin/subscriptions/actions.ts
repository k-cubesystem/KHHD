'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'

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

async function checkAdminRole() {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('인증되지 않은 사용자입니다.')
  return user
}

// 구독 통계 조회
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  await checkAdminRole()
  const supabase = await createClient()

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
  await checkAdminRole()
  const supabase = await createClient()

  let query = supabase.from('subscriptions').select(
    `
            *,
            plan:membership_plans(id, name, price),
            profile:profiles(email, role)
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

  return {
    subscriptions: (data || []) as AdminSubscription[],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

// 구독 상태 변경 (관리자용)
export async function updateSubscriptionStatus(
  subscriptionId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  // 🔴 «누가» 를 알아야 감사에 남길 수 있다 — checkAdminRole 은 권한만 보고 행위자를 안 준다.
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }
  // 타인 구독 대상이므로 admin(service_role) 필수 — 유저클라는 RLS에 막힘 (Fable 검토 R9)
  const supabase = createAdminClient()

  const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']
  if (!validStatuses.includes(newStatus)) {
    return { success: false, error: '유효하지 않은 상태입니다.' }
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'CANCELLED') {
    updateData.cancelled_at = new Date().toISOString()
    updateData.cancel_reason = '관리자에 의해 해지됨'
  }

  // 감사용 전 상태 스냅샷 — 「무엇에서 무엇으로」가 남아야 되돌릴 수 있다.
  const { data: before } = await supabase
    .from('subscriptions')
    .select('status, user_id')
    .eq('id', subscriptionId)
    .single()

  const { error } = await supabase.from('subscriptions').update(updateData).eq('id', subscriptionId)

  if (error) {
    logger.error('[Admin] Update subscription status error:', error)
    return { success: false, error: '상태 변경에 실패했습니다.' }
  }

  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'subscription_status_change',
    targetUser: before?.user_id ?? null,
    detail: { subscriptionId, before: before?.status ?? null, after: newStatus },
  })

  return { success: true }
}

// 수동 부적 지급
export async function grantTalismans(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  if (amount <= 0 || amount > 100) {
    return { success: false, error: '부적 수량은 1~100 사이여야 합니다.' }
  }

  // 직접 wallet 업데이트 (Service Role 필요 — 타인 지갑 대상이므로 admin 클라이언트 필수)
  const supabase = createAdminClient()

  // 먼저 wallet 존재 확인
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()

  if (!wallet) {
    // wallet이 없으면 생성
    await supabase.from('wallets').insert({ user_id: userId, balance: amount })
  } else {
    // 기존 balance에 추가
    await supabase
      .from('wallets')
      .update({ balance: wallet.balance + amount })
      .eq('user_id', userId)
  }

  // 트랜잭션 기록
  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: amount,
    type: 'BONUS',
    description: `관리자 지급: ${reason}`,
  })

  // 🔴 돈이다. 지갑 거래내역과 별개로 «누가 왜 줬는지» 를 감사에 남긴다.
  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'talisman_grant',
    targetUser: userId,
    detail: { amount, reason, before: wallet?.balance ?? 0, after: (wallet?.balance ?? 0) + amount },
  })

  return { success: true }
}

// 멤버십 플랜 목록 조회 (관리자용)
export async function getMembershipPlansAdmin() {
  await checkAdminRole()
  const supabase = await createClient()

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
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }
  const supabase = await createClient()

  const { data: before } = await supabase
    .from('membership_plans')
    .select('name, price, talismans_per_period, is_active')
    .eq('id', planId)
    .single()

  const { error } = await supabase.from('membership_plans').update(updates).eq('id', planId)

  if (error) {
    logger.error('[Admin] Update plan error:', error)
    return { success: false, error: '플랜 업데이트에 실패했습니다.' }
  }

  // 🔴 가격·혜택 문구는 표시광고법 사안이다. 사후에 「누가 언제 얼마로 바꿨나」를 못 대면 곤란해진다.
  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'plan_update',
    detail: { planId, before: before ?? null, after: updates },
  })

  return { success: true }
}
