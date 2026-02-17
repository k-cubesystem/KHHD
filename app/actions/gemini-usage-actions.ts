'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function getGeminiDailyStats(daysBack: number = 30): Promise<GeminiDailyStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_daily_stats', { days_back: daysBack })
  if (error) {
    console.error('[gemini-usage] getGeminiDailyStats error:', error)
    return []
  }
  return (data ?? []) as GeminiDailyStat[]
}

export async function getGeminiActionStats(daysBack: number = 30): Promise<GeminiActionStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_action_stats', { days_back: daysBack })
  if (error) {
    console.error('[gemini-usage] getGeminiActionStats error:', error)
    return []
  }
  return (data ?? []) as GeminiActionStat[]
}

export async function getGeminiTodaySummary(): Promise<GeminiTodaySummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gemini_today_summary')
  if (error || !data) {
    console.error('[gemini-usage] getGeminiTodaySummary error:', error)
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
    console.error('[gemini-usage] getGeminiRecentLogs error:', error)
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
    console.error('[gemini-usage] getGeminiRpmConfig error:', error)
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
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'usd_krw_rate')
    .single()
  return data?.value ? Number(data.value) : 1380
}
