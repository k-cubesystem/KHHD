'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { ACTION_TO_PROMPT_KEY } from '@/lib/domain/gemini/actions'
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
  const [statsRes, promptsRes, usdKrwRate] = await Promise.all([
    supabase.rpc('get_gemini_action_stats', { days_back: daysBack }),
    supabase.from('ai_prompts').select('key, talisman_cost'),
    getUsdKrwRate(),
  ])

  if (statsRes.error) {
    logger.error('[gemini-usage] getGeminiCostVsPrice stats error:', statsRes.error)
    return []
  }

  const priceByKey = new Map<string, number>()
  for (const row of (promptsRes.data ?? []) as Array<{ key: string; talisman_cost: number | null }>) {
    if (row.talisman_cost !== null) priceByKey.set(row.key, row.talisman_cost)
  }

  const stats = (statsRes.data ?? []) as GeminiActionStat[]
  return stats.map((s): GeminiCostVsPrice => {
    const calls = Number(s.call_count) || 0
    const totalUsd = Number(s.total_cost_usd) || 0
    const avgCostKrw = calls > 0 ? Math.round((totalUsd / calls) * usdKrwRate) : 0

    const promptKey = ACTION_TO_PROMPT_KEY[s.action_type] ?? null
    const bokchaeCost = promptKey ? (priceByKey.get(promptKey) ?? null) : null
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
