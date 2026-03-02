'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkAdminPermission() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export interface RevenueStats {
  today: number
  week: number
  month: number
  todayCount: number
  weekCount: number
  monthCount: number
}

export interface ActiveUserStats {
  dau: number
  wau: number
  mau: number
}

export interface CategoryStat {
  category: string
  count: number
}

export interface GeminiStats {
  todayCalls: number
  weekCalls: number
  monthCalls: number
  todayErrors: number
  weekErrors: number
  errorRate: number
  avgLatencyMs: number
  avgLatencyByType: { action_type: string; avg_ms: number; count: number }[]
}

export interface DailyRevenue {
  date: string
  amount: number
  count: number
}

export interface DailyActiveUsers {
  date: string
  dau: number
  analyses: number
}

export interface MonitoringStats {
  revenue: RevenueStats
  activeUsers: ActiveUserStats
  topCategories: CategoryStat[]
  gemini: GeminiStats
  dailyRevenue: DailyRevenue[]
  dailyUsers: DailyActiveUsers[]
}

export async function getMonitoringStats(): Promise<{ success: boolean; data?: MonitoringStats; error?: string }> {
  if (!(await checkAdminPermission())) {
    return { success: false, error: '권한 없음' }
  }

  const supabase = createAdminClient()
  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now)
  monthStart.setDate(now.getDate() - 30)
  monthStart.setHours(0, 0, 0, 0)

  const [
    todayPayments,
    weekPayments,
    monthPayments,
    dauData,
    wauData,
    mauData,
    categoryData,
    geminiToday,
    geminiWeek,
    geminiErrors,
    geminiLatency,
    geminiLatencyByType,
    dailyRevenueData,
    dailyUsersData,
  ] = await Promise.all([
    // Revenue: today
    supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', todayStart.toISOString()),

    // Revenue: week
    supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', weekStart.toISOString()),

    // Revenue: month
    supabase.from('payments').select('amount').eq('status', 'completed').gte('created_at', monthStart.toISOString()),

    // DAU: unique users with analysis today
    supabase.from('analysis_history').select('user_id').gte('created_at', todayStart.toISOString()),

    // WAU
    supabase.from('analysis_history').select('user_id').gte('created_at', weekStart.toISOString()),

    // MAU
    supabase.from('analysis_history').select('user_id').gte('created_at', monthStart.toISOString()),

    // Top categories
    supabase.from('analysis_history').select('category').gte('created_at', monthStart.toISOString()),

    // Gemini calls today
    supabase.from('gemini_usage_logs').select('id, status').gte('created_at', todayStart.toISOString()),

    // Gemini calls week
    supabase.from('gemini_usage_logs').select('id, status').gte('created_at', weekStart.toISOString()),

    // Gemini errors week
    supabase.from('gemini_usage_logs').select('id').eq('status', 'error').gte('created_at', weekStart.toISOString()),

    // Average latency overall
    supabase
      .from('gemini_usage_logs')
      .select('latency_ms')
      .gte('created_at', weekStart.toISOString())
      .not('latency_ms', 'is', null),

    // Latency by action type
    supabase
      .from('gemini_usage_logs')
      .select('action_type, latency_ms')
      .gte('created_at', weekStart.toISOString())
      .not('latency_ms', 'is', null),

    // Daily revenue for last 30 days
    supabase
      .from('payments')
      .select('created_at, amount')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: true }),

    // Daily active users for last 30 days
    supabase
      .from('analysis_history')
      .select('created_at, user_id')
      .gte('created_at', monthStart.toISOString())
      .order('created_at', { ascending: true }),
  ])

  // Aggregate revenue
  const revenue: RevenueStats = {
    today: todayPayments.data?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0,
    week: weekPayments.data?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0,
    month: monthPayments.data?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0,
    todayCount: todayPayments.data?.length ?? 0,
    weekCount: weekPayments.data?.length ?? 0,
    monthCount: monthPayments.data?.length ?? 0,
  }

  // Unique users
  const dau = new Set(dauData.data?.map((r) => r.user_id)).size
  const wau = new Set(wauData.data?.map((r) => r.user_id)).size
  const mau = new Set(mauData.data?.map((r) => r.user_id)).size
  const activeUsers: ActiveUserStats = { dau, wau, mau }

  // Top categories
  const catCount: Record<string, number> = {}
  for (const row of categoryData.data ?? []) {
    catCount[row.category] = (catCount[row.category] || 0) + 1
  }
  const topCategories: CategoryStat[] = Object.entries(catCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Gemini stats
  const todayCalls = geminiToday.data?.length ?? 0
  const weekCalls = geminiWeek.data?.length ?? 0
  const todayErrors = geminiToday.data?.filter((r) => r.status === 'error').length ?? 0
  const weekErrors = geminiErrors.data?.length ?? 0
  const errorRate = weekCalls > 0 ? Math.round((weekErrors / weekCalls) * 100 * 10) / 10 : 0
  const latencies = geminiLatency.data?.map((r) => r.latency_ms).filter(Boolean) ?? []
  const avgLatencyMs =
    latencies.length > 0 ? Math.round(latencies.reduce((s: number, v: number) => s + v, 0) / latencies.length) : 0

  // Latency by action type
  const latByType: Record<string, { sum: number; count: number }> = {}
  for (const row of geminiLatencyByType.data ?? []) {
    if (!row.action_type || !row.latency_ms) continue
    if (!latByType[row.action_type]) latByType[row.action_type] = { sum: 0, count: 0 }
    latByType[row.action_type].sum += row.latency_ms
    latByType[row.action_type].count += 1
  }
  const avgLatencyByType = Object.entries(latByType)
    .map(([action_type, { sum, count }]) => ({
      action_type,
      avg_ms: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.avg_ms - a.avg_ms)
    .slice(0, 10)

  const monthCalls =
    (
      await supabase
        .from('gemini_usage_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
    ).count ?? 0

  const gemini: GeminiStats = {
    todayCalls,
    weekCalls,
    monthCalls: Number(monthCalls),
    todayErrors,
    weekErrors,
    errorRate,
    avgLatencyMs,
    avgLatencyByType,
  }

  // Daily revenue buckets
  const revByDay: Record<string, { amount: number; count: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    revByDay[key] = { amount: 0, count: 0 }
  }
  for (const p of dailyRevenueData.data ?? []) {
    const key = p.created_at.split('T')[0]
    if (revByDay[key]) {
      revByDay[key].amount += p.amount || 0
      revByDay[key].count += 1
    }
  }
  const dailyRevenue: DailyRevenue[] = Object.entries(revByDay).map(([date, v]) => ({
    date,
    amount: v.amount,
    count: v.count,
  }))

  // Daily users buckets
  const usersByDay: Record<string, Set<string>> = {}
  const analysesByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    usersByDay[key] = new Set()
    analysesByDay[key] = 0
  }
  for (const r of dailyUsersData.data ?? []) {
    const key = r.created_at.split('T')[0]
    if (usersByDay[key]) {
      if (r.user_id) usersByDay[key].add(r.user_id)
      analysesByDay[key] = (analysesByDay[key] || 0) + 1
    }
  }
  const dailyUsers: DailyActiveUsers[] = Object.entries(usersByDay).map(([date, users]) => ({
    date,
    dau: users.size,
    analyses: analysesByDay[date] || 0,
  }))

  return {
    success: true,
    data: {
      revenue,
      activeUsers,
      topCategories,
      gemini,
      dailyRevenue,
      dailyUsers,
    },
  }
}
