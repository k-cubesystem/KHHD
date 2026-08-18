'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { bokchaeForAction, getActionLabel } from '@/lib/domain/gemini/actions'
import { KRW_PER_TALISMAN } from '@/lib/constants'

export interface GeminiDailyStat {
  stat_date: string
  model: string
  call_count: number
  success_count: number
  error_count: number
  cached_count: number
  total_tokens: number
  total_cost_usd: number
}

export interface GeminiActionStat {
  action_type: string
  call_count: number
  success_count: number
  avg_tokens: number
  total_tokens: number
  total_cost_usd: number
}

export interface GeminiTodaySummary {
  total_calls: number
  success_calls: number
  error_calls: number
  rate_limited_calls: number
  cached_calls: number
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
  avg_latency_ms: number
}

export interface GeminiRecentLog {
  id: string
  user_id: string | null
  model: string
  action_type: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost_usd: number | null
  latency_ms: number | null
  status: string
  error_code: string | null
  cached: boolean
  created_at: string
}

export interface GeminiRpmConfig {
  tokens: number
  max_tokens: number
  window_seconds: number
  model: string
  refill_at: string
}

export interface GeminiCostVsPrice {
  action_type: string
  call_count: number
  total_cost_usd: number
  /** 호출당 평균 원가(₩, 반올림) */
  avg_cost_krw: number
  /** 현재 복채 가격(만냥) — ai_prompts.talisman_cost. null = 미설정/내부기능 */
  bokchae_cost: number | null
  /** 복채 가격 원화 환산(₩) */
  bokchae_krw: number | null
  /** 원가율(%) = 호출당 원가 ÷ 복채 매출. null = 무료/미설정 */
  cost_ratio_pct: number | null
}

/**
 * 기능별 "원가 vs 복채" — 가격 책정 근거.
 * get_gemini_action_stats(원가) 를 ai_prompts.talisman_cost(복채)와 조인한다.
 */
export async function getGeminiCostVsPrice(daysBack: number = 30): Promise<GeminiCostVsPrice[]> {
  const supabase = await createClient()
  const [statsRes, usdKrwRate] = await Promise.all([
    supabase.rpc('get_gemini_action_stats', { days_back: daysBack }),
    getUsdKrwRate(),
  ])

  if (statsRes.error) {
    logger.error('[gemini-usage] getGeminiCostVsPrice stats error:', statsRes.error)
    return []
  }

  // 🔴 판가는 ai_prompts 가 아니라 feature-costs 단일 출처에서 가져온다.
  //    DB 표는 낡아 있었다(cheonjiin_analysis: 0 — 실제 2만냥). 0 이 «무료»로 읽혀
  //    원가율이 통째로 «측정 안 됨»이 됐다.
  const stats = (statsRes.data ?? []) as GeminiActionStat[]
  return stats.map((s): GeminiCostVsPrice => {
    const calls = Number(s.call_count) || 0
    const totalUsd = Number(s.total_cost_usd) || 0
    const avgCostKrw = calls > 0 ? Math.round((totalUsd / calls) * usdKrwRate) : 0

    const bokchaeCost = bokchaeForAction(s.action_type)
    const bokchaeKrw = bokchaeCost !== null ? bokchaeCost * KRW_PER_TALISMAN : null

    // 원가율: 복채 매출 대비 원가. 무료(0)·미설정(null)은 산정 불가 → null
    const costRatioPct =
      bokchaeKrw !== null && bokchaeKrw > 0 ? Math.round((avgCostKrw / bokchaeKrw) * 1000) / 10 : null

    return {
      action_type: s.action_type,
      call_count: calls,
      total_cost_usd: totalUsd,
      avg_cost_krw: avgCostKrw,
      bokchae_cost: bokchaeCost,
      bokchae_krw: bokchaeKrw,
      cost_ratio_pct: costRatioPct,
    }
  })
}

export async function getGeminiDailyStats(daysBack: number = 30): Promise<GeminiDailyStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_daily_stats', { days_back: daysBack })
  if (error) {
    logger.error('[gemini-usage] getGeminiDailyStats error:', error)
    return []
  }
  return (data ?? []) as GeminiDailyStat[]
}

export async function getGeminiActionStats(daysBack: number = 30): Promise<GeminiActionStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_action_stats', { days_back: daysBack })
  if (error) {
    logger.error('[gemini-usage] getGeminiActionStats error:', error)
    return []
  }
  return (data ?? []) as GeminiActionStat[]
}

export async function getGeminiTodaySummary(): Promise<GeminiTodaySummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_today_summary')
  if (error || !data) {
    logger.error('[gemini-usage] getGeminiTodaySummary error:', error)
    return {
      total_calls: 0,
      success_calls: 0,
      error_calls: 0,
      rate_limited_calls: 0,
      cached_calls: 0,
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      avg_latency_ms: 0,
    }
  }
  return data as GeminiTodaySummary
}

export async function getGeminiRecentLogs(logLimit: number = 50): Promise<GeminiRecentLog[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_recent_logs', { log_limit: logLimit })
  if (error) {
    logger.error('[gemini-usage] getGeminiRecentLogs error:', error)
    return []
  }
  return (data ?? []) as GeminiRecentLog[]
}

export async function getGeminiRpmConfig(): Promise<GeminiRpmConfig | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gemini_token_bucket')
    .select('tokens, max_tokens, window_seconds, model, refill_at')
    .eq('id', 1)
    .single()
  if (error) {
    logger.error('[gemini-usage] getGeminiRpmConfig error:', error)
    return null
  }
  return data as GeminiRpmConfig
}

export async function updateGeminiRpm(
  newRpm: number,
  newModel?: string
): Promise<{ success: boolean; error?: string; data?: GeminiRpmConfig }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('update_gemini_rpm', {
    new_rpm: newRpm,
    new_model: newModel ?? null,
  })
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, data: data as GeminiRpmConfig }
}

export async function getUsdKrwRate(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'usd_krw_rate').single()
  return data?.value ? Number(data.value) : 1380
}

export interface GeminiUserUsageRow {
  user_id: string
  email: string | null
  full_name: string | null
  calls: number
  total_tokens: number
  cost_usd: number
  cost_krw: number
  /** 이 회원이 가장 많이 쓴 기능 상위 3개 — 「무엇에 썼나」를 한 줄로 보여준다. */
  top_actions: Array<{ action_type: string; label: string; calls: number; cost_krw: number }>
}

/**
 * **누가 · 무엇에 · 얼마나** 썼는지. 원가 관리의 실질 단위다.
 *
 * 🔴 액션별 합계만으로는 «한 사람이 몰아 쓰는 것»을 못 본다. 어뷰징·무료 남용은 회원 단위로만
 *    드러난다(복채를 안 받는 내부 기능 — 고민상담·신탁 — 이 특히 그렇다).
 *
 * ⚠️ `user_id` 가 없는 호출(크론·시스템)은 「시스템」으로 묶는다. 버리면 합계가 안 맞는다.
 */
export async function getGeminiUserUsage(daysBack: number = 30, limit: number = 30): Promise<GeminiUserUsageRow[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: logs, error }, usdKrwRate] = await Promise.all([
    supabase
      .from('gemini_api_logs')
      .select('user_id, action_type, total_tokens, estimated_cost_usd')
      .gte('created_at', since),
    getUsdKrwRate(),
  ])

  if (error) {
    logger.error('[gemini-usage] getGeminiUserUsage error:', error)
    return []
  }

  const SYSTEM = 'system'
  type Acc = { calls: number; tokens: number; usd: number; byAction: Map<string, { calls: number; usd: number }> }
  const acc = new Map<string, Acc>()

  for (const row of logs ?? []) {
    const key = row.user_id ?? SYSTEM
    const entry = acc.get(key) ?? { calls: 0, tokens: 0, usd: 0, byAction: new Map() }
    entry.calls += 1
    entry.tokens += Number(row.total_tokens) || 0
    entry.usd += Number(row.estimated_cost_usd) || 0

    const action = row.action_type || 'unknown'
    const a = entry.byAction.get(action) ?? { calls: 0, usd: 0 }
    a.calls += 1
    a.usd += Number(row.estimated_cost_usd) || 0
    entry.byAction.set(action, a)

    acc.set(key, entry)
  }

  const ids = Array.from(acc.keys()).filter((k) => k !== SYSTEM)
  const profileById = new Map<string, { email: string | null; full_name: string | null }>()
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', ids)
    for (const p of profiles ?? []) profileById.set(p.id, { email: p.email ?? null, full_name: p.full_name ?? null })
  }

  return Array.from(acc.entries())
    .map(([userId, entry]): GeminiUserUsageRow => {
      const profile = profileById.get(userId)
      return {
        user_id: userId,
        email: userId === SYSTEM ? null : (profile?.email ?? null),
        full_name: userId === SYSTEM ? '시스템(크론·내부)' : (profile?.full_name ?? null),
        calls: entry.calls,
        total_tokens: entry.tokens,
        cost_usd: entry.usd,
        cost_krw: Math.round(entry.usd * usdKrwRate),
        top_actions: Array.from(entry.byAction.entries())
          .map(([action_type, v]) => ({
            action_type,
            label: getActionLabel(action_type),
            calls: v.calls,
            cost_krw: Math.round(v.usd * usdKrwRate),
          }))
          .sort((a, b) => b.cost_krw - a.cost_krw || b.calls - a.calls)
          .slice(0, 3),
      }
    })
    .sort((a, b) => b.cost_krw - a.cost_krw || b.calls - a.calls)
    .slice(0, limit)
}
