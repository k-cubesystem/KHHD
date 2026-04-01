'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { getUserRole } from '@/lib/supabase/helpers'
import { logger } from '@/lib/utils/logger'

// 권한 체크 헬퍼
async function checkAdminPermission() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const role = await getUserRole(supabase, user.id)
  return role === 'admin'
}

// 1. Recent Activity 조회
export async function getRecentActivities(limit: number = 50) {
  if (isEdgeEnabled('admin')) {
    return invokeEdgeSafe('admin', { action: 'getRecentActivities', limit })
  }
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_recent_activities', { p_limit: limit })

  if (error) {
    logger.error(error)
    return { success: false, error: error.message }
  }

  return { success: true, activities: data }
}

// 2. UTM 성과 분석
export async function getUTMPerformance(startDate?: Date, endDate?: Date) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_utm_performance', {
    p_start_date: startDate?.toISOString().split('T')[0] || undefined,
    p_end_date: endDate?.toISOString().split('T')[0] || undefined,
  })

  if (error) {
    logger.error(error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// 3. Funnel 분석
export async function getFunnelAnalysis(startDate?: Date, endDate?: Date) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('get_funnel_analysis', {
    p_start_date: startDate?.toISOString().split('T')[0] || undefined,
    p_end_date: endDate?.toISOString().split('T')[0] || undefined,
  })

  if (error) {
    logger.error(error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// 4. 시간대별 트래픽 — RPC 없이 직접 집계 (activity_logs + payments)
export async function getHourlyTraffic(hours: number = 24) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  // 시간대별 버킷 미리 생성 (데이터 없는 시간도 0으로 표시)
  type Bucket = {
    hour_timestamp: string
    total_visits: number
    new_signups: number
    unique_user_ids: string[]
    total_revenue: number
  }
  const buckets: Record<string, Bucket> = {}
  for (let i = hours; i >= 0; i--) {
    const d = new Date(Date.now() - i * 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    const key = d.toISOString()
    buckets[key] = {
      hour_timestamp: key,
      total_visits: 0,
      new_signups: 0,
      unique_user_ids: [],
      total_revenue: 0,
    }
  }

  // activity_logs 집계
  const { data: activities, error: actErr } = await supabase
    .from('activity_logs')
    .select('created_at, activity_type, user_id')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (actErr) {
    logger.error('[getHourlyTraffic] activity_logs error:', actErr)
    return { success: false, error: actErr.message }
  }

  for (const a of activities ?? []) {
    const d = new Date(a.created_at)
    d.setMinutes(0, 0, 0)
    const key = d.toISOString()
    if (!buckets[key]) continue
    buckets[key].total_visits++
    if (a.user_id) buckets[key].unique_user_ids.push(a.user_id)
    if (a.activity_type === 'signup') buckets[key].new_signups++
  }

  // payments 수익 집계
  const { data: payments } = await supabase
    .from('payments')
    .select('created_at, amount')
    .eq('status', 'completed')
    .gte('created_at', since)

  for (const p of payments ?? []) {
    const d = new Date(p.created_at)
    d.setMinutes(0, 0, 0)
    const key = d.toISOString()
    if (!buckets[key]) continue
    buckets[key].total_revenue += p.amount || 0
  }

  const data = Object.values(buckets)
    .sort((a, b) => a.hour_timestamp.localeCompare(b.hour_timestamp))
    .map((b) => ({
      hour_timestamp: b.hour_timestamp,
      total_visits: b.total_visits,
      unique_users: new Set(b.unique_user_ids).size,
      new_signups: b.new_signups,
      total_revenue: b.total_revenue,
    }))

  return { success: true, data }
}

// 5. 리텐션 코호트 분석 (D1/D7/D30)
export async function getRetentionCohort(days: number = 30) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: signups, error: signupErr } = await supabase
    .from('profiles')
    .select('id, created_at')
    .gte('created_at', since)

  if (signupErr || !signups) {
    logger.error('[getRetentionCohort]', signupErr)
    return { success: false, error: signupErr?.message ?? 'signups 조회 실패' }
  }

  const userIds = signups.map((u) => u.id)
  if (userIds.length === 0) {
    return { success: true, data: { totalSignups: 0, d1: 0, d7: 0, d30: 0, d1Rate: 0, d7Rate: 0, d30Rate: 0 } }
  }

  const { data: activities } = await supabase
    .from('activity_logs')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .gte('created_at', since)

  const userActivity = new Map<string, Set<string>>()
  for (const a of activities ?? []) {
    if (!a.user_id) continue
    if (!userActivity.has(a.user_id)) userActivity.set(a.user_id, new Set())
    userActivity.get(a.user_id)!.add(new Date(a.created_at).toISOString().split('T')[0])
  }

  let d1 = 0
  let d7 = 0
  let d30 = 0
  for (const signup of signups) {
    const signupDate = new Date(signup.created_at)
    const dates = userActivity.get(signup.id)
    if (!dates) continue

    const dayOffset = (n: number) => {
      const d = new Date(signupDate)
      d.setDate(d.getDate() + n)
      return d.toISOString().split('T')[0]
    }

    if (dates.has(dayOffset(1))) d1++
    if (dates.has(dayOffset(7))) d7++
    if (dates.has(dayOffset(30))) d30++
  }

  const total = signups.length
  return {
    success: true,
    data: {
      totalSignups: total,
      d1,
      d7,
      d30,
      d1Rate: total > 0 ? Math.round((d1 / total) * 100) : 0,
      d7Rate: total > 0 ? Math.round((d7 / total) * 100) : 0,
      d30Rate: total > 0 ? Math.round((d30 / total) * 100) : 0,
    },
  }
}

// 6. 전환율 분석 (가입→무료분석→결제)
export async function getConversionMetrics() {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [profilesRes, analysisRes, paymentsRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase
      .from('activity_logs')
      .select('user_id', { count: 'exact', head: true })
      .eq('activity_type', 'analysis')
      .gte('created_at', thirtyDaysAgo),
    supabase
      .from('payments')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo),
  ])

  const signups = profilesRes.count ?? 0
  const analyses = analysisRes.count ?? 0
  const payments = paymentsRes.count ?? 0

  return {
    success: true,
    data: {
      signups,
      analyses,
      payments,
      signupToAnalysis: signups > 0 ? Math.round((analyses / signups) * 100) : 0,
      analysisToPaid: analyses > 0 ? Math.round((payments / analyses) * 100) : 0,
      signupToPaid: signups > 0 ? Math.round((payments / signups) * 100) : 0,
    },
  }
}

// 7. 빠른 액션: 전체 공지 발송
export async function sendGlobalNotification(title: string, message: string) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()

  // 모든 사용자 조회
  const { data: users } = await supabase.from('profiles').select('id')

  if (!users) return { success: false, error: '사용자 조회 실패' }

  // 알림 일괄 삽입 (notifications 테이블이 있다고 가정)
  const notifications = users.map((u) => ({
    user_id: u.id,
    title,
    message,
    type: 'admin_announcement',
    is_read: false,
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    logger.error(error)
    return { success: false, error: error.message }
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'notification',
    description: `전체 공지 발송: ${title}`,
    metadata: { title, message, recipient_count: users.length },
  })

  return { success: true, count: users.length }
}

// 8. 빠른 액션: 쿠폰 일괄 발급
export async function issueCouponToAll(couponCode: string, talismanAmount: number, expiryDays: number = 30) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()

  const { data: users } = await supabase.from('profiles').select('id')
  if (!users) return { success: false, error: '사용자 조회 실패' }

  // 쿠폰 일괄 생성
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiryDays)

  const coupons = users.map((u) => ({
    user_id: u.id,
    code: couponCode,
    talisman_amount: talismanAmount,
    is_used: false,
    expires_at: expiresAt.toISOString(),
  }))

  const { error } = await supabase.from('coupons').insert(coupons)

  if (error) {
    logger.error(error)
    return { success: false, error: error.message }
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'coupon',
    description: `전체 쿠폰 발급: ${couponCode} (부적 ${talismanAmount}장)`,
    metadata: { code: couponCode, amount: talismanAmount, recipient_count: users.length },
  })

  return { success: true, count: users.length }
}

// 9. 빠른 액션: 이벤트 생성
export async function createEvent(eventData: {
  title: string
  description: string
  cta_text: string
  cta_link: string
  icon?: string
  priority?: number
  start_date?: Date
  end_date?: Date
}) {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('event_banners')
    .insert({
      title: eventData.title,
      description: eventData.description,
      cta_text: eventData.cta_text,
      cta_link: eventData.cta_link,
      icon: eventData.icon || '🎉',
      priority: eventData.priority || 0,
      is_active: true,
      start_date: eventData.start_date?.toISOString(),
      end_date: eventData.end_date?.toISOString(),
    })
    .select()

  if (error) {
    logger.error(error)
    return { success: false, error: error.message }
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'event',
    description: `새 이벤트 생성: ${eventData.title}`,
    metadata: { event_id: data?.[0]?.id, title: eventData.title },
  })

  return { success: true, event: data?.[0] }
}
