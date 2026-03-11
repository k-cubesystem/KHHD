/**
 * Gemini API Rate Limiter v2
 *
 * 변경 사항:
 * - sleep() 재시도 제거 → Vercel 타임아웃 방지 (즉시 RateLimitError throw)
 * - 인메모리 Map 제거 → Supabase FOR UPDATE 원자적 토큰 버킷으로 교체
 * - 모든 Gemini 호출 자동 기록 (gemini_api_logs 테이블)
 * - 모델별 비용 추정 (USD + KRW)
 */

import { createClient } from '@/lib/supabase/server'

// ============================================================
// 모델별 토큰 단가 (USD per 1M tokens, 2026년 기준)
// ============================================================
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash-lite': { input: 0.0375, output: 0.15 },
  'gemini-2.0-flash-exp': { input: 0.075, output: 0.3 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-3-flash-preview': { input: 0.075, output: 0.3 },
  'gemini-3.1-pro-preview': { input: 1.25, output: 5.0 },
  'gemini-2.5-flash-preview': { input: 0.075, output: 0.3 },
  // Claude models
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] ?? {
    input: 0.075,
    output: 0.3,
  }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

// ============================================================
// RateLimitError: sleep 없이 즉시 throw (Vercel 타임아웃 방지)
// ============================================================
export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`[Gemini] 요청 한도 초과. ${retryAfterSeconds}초 후 다시 시도해주세요.`)
    this.name = 'RateLimitError'
  }
}

// ============================================================
// 내부: Supabase RPC로 토큰 획득
// ============================================================
async function acquireToken(): Promise<{
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
  model: string
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('acquire_gemini_token')
    if (error) {
      // RPC 오류 시 허용 (DB 이슈로 API 차단하지 않음)
      console.error('[Gemini RateLimit] RPC 오류, 통과 처리:', error.message)
      return { allowed: true, remaining: -1, model: 'unknown' }
    }
    return {
      allowed: data.allowed,
      remaining: data.remaining ?? 0,
      retryAfterSeconds: data.retry_after_seconds,
      model: data.model ?? 'gemini-3-flash-preview',
    }
  } catch (e) {
    // 예외 시 허용 처리 (DB 연결 문제가 API를 막으면 안 됨)
    console.error('[Gemini RateLimit] 예외, 통과 처리:', e)
    return { allowed: true, remaining: -1, model: 'unknown' }
  }
}

// ============================================================
// 내부: 사용량 비동기 기록 (호출 결과를 기다리지 않음)
// ============================================================
async function logUsage(params: {
  userId?: string | null
  model: string
  actionType: string
  inputTokens?: number | null
  outputTokens?: number | null
  latencyMs: number
  status: string
  errorCode?: string | null
  cached?: boolean
}): Promise<void> {
  try {
    const supabase = await createClient()
    const totalTokens = (params.inputTokens ?? 0) + (params.outputTokens ?? 0)
    const estimatedCostUsd =
      params.inputTokens !== null &&
      params.inputTokens !== undefined &&
      params.outputTokens !== null &&
      params.outputTokens !== undefined
        ? estimateCostUsd(params.model, params.inputTokens, params.outputTokens)
        : null

    await supabase.from('gemini_api_logs').insert({
      user_id: params.userId ?? null,
      model: params.model,
      action_type: params.actionType,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      total_tokens: totalTokens > 0 ? totalTokens : null,
      estimated_cost_usd: estimatedCostUsd,
      latency_ms: params.latencyMs,
      status: params.status,
      error_code: params.errorCode ?? null,
      cached: params.cached ?? false,
    })
  } catch (e) {
    // 로깅 실패는 무시 (분석 기능을 막으면 안 됨)
    console.error('[Gemini Usage Log] 기록 실패:', e)
  }
}

// ============================================================
// 공개 API: withGeminiRateLimit
// ============================================================
export interface GeminiRateLimitOptions {
  userId?: string | null
  model?: string
  actionType?: string
  cached?: boolean
}

/**
 * Gemini API 호출 래퍼
 *
 * @param fn        실제 generateContent 호출 함수
 * @param options   userId, model, actionType, cached 정보 (사용량 기록용)
 *
 * - Supabase 토큰 버킷으로 RPM 제한 (모든 인스턴스 공유)
 * - sleep() 없이 즉시 RateLimitError throw (Vercel 타임아웃 방지)
 * - 호출 결과(토큰, 비용, 지연시간)를 gemini_api_logs에 자동 기록
 */
export async function withGeminiRateLimit<T>(fn: () => Promise<T>, options: GeminiRateLimitOptions = {}): Promise<T> {
  const { userId = null, model = 'gemini-3-flash-preview', actionType = 'unknown', cached = false } = options

  // 1. 토큰 획득 시도
  const tokenResult = await acquireToken()
  if (!tokenResult.allowed) {
    const retryAfter = tokenResult.retryAfterSeconds ?? 60
    // rate_limited 상태 기록
    logUsage({
      userId,
      model,
      actionType,
      latencyMs: 0,
      status: 'rate_limited',
      errorCode: `retry_in_${retryAfter}s`,
    }).catch(() => {})
    throw new RateLimitError(retryAfter)
  }

  // 2. 실제 호출
  const startTime = Date.now()
  try {
    const result = await fn()
    const latencyMs = Date.now() - startTime

    // 3. 토큰 사용량 추출 (Gemini response.usageMetadata)
    let inputTokens: number | null = null
    let outputTokens: number | null = null

    const r = result as any
    if (r?.response?.usageMetadata) {
      inputTokens = r.response.usageMetadata.promptTokenCount ?? null
      outputTokens = r.response.usageMetadata.candidatesTokenCount ?? null
    } else if (r?.usageMetadata) {
      inputTokens = r.usageMetadata.promptTokenCount ?? null
      outputTokens = r.usageMetadata.candidatesTokenCount ?? null
    }

    // 4. 성공 기록 (비동기, 결과 대기 없음)
    logUsage({
      userId,
      model,
      actionType,
      inputTokens,
      outputTokens,
      latencyMs,
      status: 'success',
      cached: false,
    }).catch(() => {})

    return result
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : String(error)

    // 에러 종류 분류
    let status = 'error'
    let errorCode: string | null = null

    if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')) {
      status = '429'
      errorCode = '429_quota_exceeded'
    } else if (msg.includes('400') || msg.includes('Bad Request')) {
      status = '400'
      errorCode = msg.includes('token') ? '400_token_limit' : '400_bad_request'
    } else if (msg.includes('timeout') || msg.includes('DEADLINE_EXCEEDED')) {
      status = 'timeout'
      errorCode = 'timeout'
    }

    // 에러 기록 (비동기)
    logUsage({ userId, model, actionType, latencyMs, status, errorCode }).catch(() => {})

    // 즉시 throw (sleep 없음)
    throw error
  }
}
