'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'
import { adjustPassesAsAdmin } from '@/lib/admin/pass-adjust'

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
    monthly_passes: number
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

// 🔴 subscriptions 의 RLS 는 «본인 것만»(subscriptions_select_own)이다 — 세션 클라이언트로 읽으면 관리자 자기 구독만
//    보여 목록·통계가 텅 빈다. 권한 확인 뒤 service_role 로 읽는다.

// 구독 통계 조회
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  await checkAdminRole()
  const supabase = createAdminClient()

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('status, billing_key, plan:membership_plans(price)')

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
          // 관리자 부여(결제 없음)는 매출이 아니다 — 정기결제 키가 있는 구독만 센다.
          if (sub.billing_key && sub.plan && typeof sub.plan === 'object' && 'price' in sub.plan) {
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

const SUBSCRIPTION_LIST_COLUMNS =
  'id, user_id, status, current_period_start, current_period_end, next_billing_date, last_payment_date, cancelled_at, cancel_reason, created_at, plan:membership_plans(id, name, price, monthly_passes)'

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
  const supabase = createAdminClient()

  // 🔴 billing_key·customer_key 는 화면으로 내보내지 않는다 — 열을 골라 읽는다(select * 금지).
  let query = supabase.from('subscriptions').select(SUBSCRIPTION_LIST_COLUMNS, { count: 'exact' })

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

  const rows = (data ?? []) as unknown as Array<Omit<AdminSubscription, 'profile'>>

  // subscriptions.user_id 는 auth.users 를 가리킨다 — profiles 와 잇는 FK 가 없어 임베드(profile:profiles)는
  // PostgREST 가 관계를 못 찾아 목록 전체가 실패한다. 따로 읽어 붙인다.
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)))
  const profileById = new Map<string, { email: string; role: string }>()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .in('id', userIds)
    if (profileError) logger.warn('[Admin] 구독 목록 프로필 조회 실패', { message: profileError.message })
    for (const p of (profiles ?? []) as Array<{ id: string; email: string | null; role: string | null }>) {
      profileById.set(p.id, { email: p.email ?? '', role: p.role ?? 'user' })
    }
  }

  return {
    subscriptions: rows.map((row) => ({ ...row, profile: profileById.get(row.user_id) ?? null })),
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

/**
 * 이용권 수동 발급 — 회원 상세의 조정과 같은 길(adjustPassesAsAdmin)을 쓴다. 감사에 남는다.
 * `requestKey` 는 발급 창을 열 때 한 번 만든다 — 같은 키로는 한 번만 발급된다.
 */
export async function grantPassesToSubscriber(
  userId: string,
  quantity: number,
  reason: string,
  validDays: number | null,
  requestKey: string
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, error: '발급할 이용권은 1장 이상이어야 해요.' }
  }

  const result = await adjustPassesAsAdmin({
    actor,
    targetUserId: userId,
    delta: quantity,
    reason,
    validDays,
    requestKey,
    via: 'subscriptions',
  })
  return result.success ? { success: true } : { success: false, error: result.error }
}
