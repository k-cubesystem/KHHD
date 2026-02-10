interface RateLimitConfig {
  interval: number // ms
  uniqueTokenPerInterval: number
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = {
    interval: 60 * 1000, // 1분
    uniqueTokenPerInterval: 10, // 10 요청
  }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
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

// 정리 함수 (메모리 관리)
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000) // 1분마다 정리
