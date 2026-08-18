'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getFunnelAnalysis, getRetentionCohort, getUTMPerformance } from '@/app/actions/admin/dashboard'
import { FUNNEL } from '@/lib/analytics/funnel'
import { logger } from '@/lib/utils/logger'
import { requireAdmin } from '@/lib/admin/require-admin'

/**
 * 어드민 분석 조회 — 집계는 전부 DB RPC(SECURITY DEFINER, admin 전용)가 한다.
 * 이 파일은 날짜 파싱·형태 정리·기존 함수(getUTMPerformance 등)와의 합류만 담당한다.
 * 🔴 권한: **액션마다 requireAdmin 을 지난다.** 미들웨어·레이아웃은 «화면 진입» 을 막을 뿐이고,
 *    여기서 쓰는 `createAdminClient()` 는 service_role 이라 **RLS 를 통째로 우회한다** —
 *    「RLS(is_admin)가 막아 준다」는 이 파일에 성립하지 않는다.
 *    `'use server'` export 는 공개 엔드포인트다(회사 매출·퍼널 수치가 통째로 나가는 자리).
 */

export type RangeKey = '7d' | '30d' | '90d'

function rangeToDates(range: RangeKey): { start: string; end: string; days: number } {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * 86400_000)
  const f = (d: Date) => d.toISOString().slice(0, 10)
  return { start: f(start), end: f(end), days }
}

export interface DailyRow {
  day: string
  sessions: number
  visitors: number
  new_visitors: number
  pageviews: number
  signups: number
  revenue: number
}

export async function getAnalyticsOverview(range: RangeKey) {
  const actor = await requireAdmin()
  if (!actor.authorized) throw new Error(actor.error)

  const { start, end, days } = rangeToDates(range)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('analytics_daily_overview', { p_start: start, p_end: end })
  if (error) {
    logger.error('[analytics] overview', error.message)
    return { success: false as const, error: error.message }
  }
  const rows: DailyRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
    day: String(r.day),
    sessions: Number(r.sessions ?? 0),
    visitors: Number(r.visitors ?? 0),
    new_visitors: Number(r.new_visitors ?? 0),
    pageviews: Number(r.pageviews ?? 0),
    signups: Number(r.signups ?? 0),
    revenue: Number(r.revenue ?? 0),
  }))
  const sum = (k: keyof DailyRow) => rows.reduce((a, r) => a + Number(r[k]), 0)
  const totals = {
    sessions: sum('sessions'),
    visitors: sum('visitors'),
    new_visitors: sum('new_visitors'),
    pageviews: sum('pageviews'),
    signups: sum('signups'),
    revenue: sum('revenue'),
    days,
  }
  return { success: true as const, rows, totals, start, end }
}

export async function getAnalyticsAcquisition(range: RangeKey) {
  const actor = await requireAdmin()
  if (!actor.authorized) throw new Error(actor.error)

  const { start, end } = rangeToDates(range)
  const admin = createAdminClient()
  const [acq, utm] = await Promise.all([
    admin.rpc('analytics_acquisition', { p_start: start, p_end: end }),
    getUTMPerformance(new Date(start), new Date(end)),
  ])
  if (acq.error) return { success: false as const, error: acq.error.message }
  return {
    success: true as const,
    channels: (acq.data ?? []) as Array<{
      source: string
      medium: string
      sessions: number
      visitors: number
      signups: number
    }>,
    campaigns: utm.success
      ? ((utm.data ?? []) as Array<{
          utm_source: string
          utm_campaign: string
          total_visits: number
          conversions: number
          conversion_rate: number
        }>)
      : [],
  }
}

export async function getAnalyticsBehavior(range: RangeKey) {
  const actor = await requireAdmin()
  if (!actor.authorized) throw new Error(actor.error)

  const { start, end } = rangeToDates(range)
  const admin = createAdminClient()
  const [pages, events, tech] = await Promise.all([
    admin.rpc('analytics_top_pages', { p_start: start, p_end: end, p_limit: 30 }),
    admin.rpc('analytics_top_events', { p_start: start, p_end: end, p_limit: 40 }),
    admin.rpc('analytics_tech', { p_start: start, p_end: end }),
  ])
  if (pages.error || events.error || tech.error) {
    return {
      success: false as const,
      error: pages.error?.message ?? events.error?.message ?? tech.error?.message ?? '조회 실패',
    }
  }
  return {
    success: true as const,
    pages: (pages.data ?? []) as Array<{ path: string; pageviews: number; sessions: number; entrances: number }>,
    events: (events.data ?? []) as Array<{
      activity_type: string
      activity_category: string | null
      events: number
      users: number
    }>,
    tech: (tech.data ?? []) as Array<{ dimension: string; value: string; sessions: number }>,
  }
}

export async function getAnalyticsConversion(range: RangeKey) {
  const actor = await requireAdmin()
  if (!actor.authorized) throw new Error(actor.error)

  const { start, end, days } = rangeToDates(range)
  const [funnel, retention] = await Promise.all([
    getFunnelAnalysis(new Date(start), new Date(end)),
    getRetentionCohort(days),
  ])
  // 퍼널은 정의 순서대로 채워 넣는다(데이터 없는 단계도 0으로 보이게 — 이탈 지점을 «없음»이 아니라 «0»으로 읽어야 한다)
  const byName = new Map<string, number>()
  if (funnel.success) {
    for (const r of (funnel.data ?? []) as Array<{ step_name: string; total_users: number }>)
      byName.set(r.step_name, Number(r.total_users))
  }
  const steps = Object.entries(FUNNEL)
    .sort((a, b) => a[1] - b[1])
    .map(([name, step]) => ({ name, step, users: byName.get(name) ?? 0 }))
  return {
    success: true as const,
    funnel: steps,
    retention: retention.success ? retention.data : null,
  }
}

export async function getAnalyticsRealtime() {
  const actor = await requireAdmin()
  if (!actor.authorized) throw new Error(actor.error)

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('analytics_realtime')
  if (error) return { success: false as const, error: error.message }
  const row = Array.isArray(data) ? data[0] : data
  return {
    success: true as const,
    activeVisitors: Number(row?.active_visitors ?? 0),
    activeSessions: Number(row?.active_sessions ?? 0),
    topPaths: (row?.top_paths ?? []) as Array<{ path: string; n: number }>,
  }
}
