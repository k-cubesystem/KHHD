/**
 * Rate Limiter v2 -- Supabase DB 기반 (서버리스 인스턴스 간 공유)
 *
 * Vercel 서버리스에서 in-memory Map은 인스턴스마다 독립이므로 무효.
 * Supabase rate_limit_entries 테이블 기반 sliding window counter로 교체.
 *
 * - 기본 모드: 'db' (Supabase)
 * - Fallback: 'memory' (환경변수 RATE_LIMIT_MODE=memory 또는 DB 실패 시)
 * - 기존 rateLimit() 인터페이스 100% 호환
 */

import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================
// Types
// ============================================================

interface RateLimitConfig {
  /** Window size in milliseconds */
  interval: number
  /** Max requests per window */
  uniqueTokenPerInterval: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  /** Epoch ms when the current window resets */
  reset: number
}

type RateLimitMode = 'db' | 'memory'

// ============================================================
// Mode detection
// ============================================================

function getMode(): RateLimitMode {
  const env = process.env.RATE_LIMIT_MODE
  if (env === 'memory') return 'memory'
  return 'db'
}

// ============================================================
// In-memory fallback (기존 로직 보존)
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function rateLimitMemory(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const resetTime = now + config.interval
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return {
      success: true,
      limit: config.uniqueTokenPerInterval,
      remaining: config.uniqueTokenPerInterval - 1,
      reset: resetTime,
    }
  }

  if (record.count >= config.uniqueTokenPerInterval) {
    return {
      success: false,
      limit: config.uniqueTokenPerInterval,
      remaining: 0,
      reset: record.resetTime,
    }
  }

  record.count++
  return {
    success: true,
    limit: config.uniqueTokenPerInterval,
    remaining: config.uniqueTokenPerInterval - record.count,
    reset: record.resetTime,
  }
}

// Memory cleanup (fallback 사용 시에만 의미 있음)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_KEY = '__rate_limit_cleanup_registered__'
  const g = globalThis as Record<string, unknown>
  if (!g[CLEANUP_KEY]) {
    g[CLEANUP_KEY] = true
    setInterval(() => {
      const now = Date.now()
      const keys = Array.from(rateLimitMap.keys())
      for (const key of keys) {
        const value = rateLimitMap.get(key)
        if (value && now > value.resetTime) {
          rateLimitMap.delete(key)
        }
      }
    }, 60_000)
  }
}

// ============================================================
// Supabase DB 기반 rate limit
// ============================================================

async function rateLimitDb(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(config.interval / 1000)
  const maxRequests = config.uniqueTokenPerInterval

  const admin = createAdminClient()

  // 단일 RPC 호출로 원자적 check-and-increment
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: identifier,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  })

  if (error) {
    // DB 오류 시 memory fallback (서비스 중단 방지)
    console.error('[RateLimit] DB RPC 오류, memory fallback:', error.message)
    return rateLimitMemory(identifier, config)
  }

  const row = data as {
    allowed: boolean
    current_count: number
    max_requests: number
    reset_at: string
  }

  const resetEpoch = new Date(row.reset_at).getTime()

  return {
    success: row.allowed,
    limit: row.max_requests,
    remaining: Math.max(0, row.max_requests - row.current_count),
    reset: resetEpoch,
  }
}

// ============================================================
// Public API (기존 시그니처 100% 유지)
// ============================================================

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1분
    uniqueTokenPerInterval: 10, // 10 요청
  },
): Promise<RateLimitResult> {
  const mode = getMode()

  if (mode === 'memory') {
    return rateLimitMemory(identifier, config)
  }

  try {
    return await rateLimitDb(identifier, config)
  } catch (err) {
    // 예외 발생 시 memory fallback
    const message = err instanceof Error ? err.message : String(err)
    console.error('[RateLimit] DB 예외, memory fallback:', message)
    return rateLimitMemory(identifier, config)
  }
}

/**
 * IP 기반 rate limit 헬퍼.
 * identifier에 IP를 포함한 키를 자동 생성합니다.
 */
export async function rateLimitByIp(
  ip: string,
  action: string,
  config?: RateLimitConfig,
): Promise<RateLimitResult> {
  return rateLimit(`${action}:ip:${ip}`, config)
}
