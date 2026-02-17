/**
 * Gemini API Deduplicator + Retry
 *
 * 서버리스(Vercel) 환경에서도 작동하는 중복 요청 방지:
 * - 같은 key로 동시에 들어온 요청은 하나의 Promise로 합쳐서 처리
 * - 429 발생 시 에러에서 retryDelay 추출 후 자동 재시도 (최대 3회)
 * - 모듈 레벨 Map은 동일 Lambda 인스턴스 내 동시 요청에만 작동하지만,
 *   서버사이드 전환(Phase 1)으로 Race Condition 자체가 차단됨
 */

const MAX_RETRIES = 3

// 현재 진행 중인 요청 Map (동일 인스턴스 내 중복 방지)
const pendingRequests = new Map<string, Promise<any>>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractRetryDelayMs(error: unknown): number {
  const msg = error instanceof Error ? error.message : String(error)
  const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i) || msg.match(/"retryDelay":"(\d+)s"/)
  if (match) return Math.ceil(parseFloat(match[1])) * 1000
  return 45_000
}

function is429Error(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED')
  )
}

/**
 * Gemini API 호출을 감싸는 Deduplicator + Retry
 *
 * @param key - 요청 식별자 (예: 'cheonjiin:targetId-123')
 * @param fn  - 실제 Gemini generateContent 호출 함수
 */
export async function withGeminiRateLimit<T>(key: string, fn: () => Promise<T>): Promise<T>
export async function withGeminiRateLimit<T>(fn: () => Promise<T>): Promise<T>
export async function withGeminiRateLimit<T>(
  keyOrFn: string | (() => Promise<T>),
  fn?: () => Promise<T>
): Promise<T> {
  // 하위 호환: key 없이 fn만 전달한 경우
  const key = typeof keyOrFn === 'string' ? keyOrFn : `anon:${Date.now()}`
  const executor = typeof keyOrFn === 'function' ? keyOrFn : fn!

  // 같은 key로 이미 진행 중인 요청이 있으면 그것을 공유
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  const promise = executeWithRetry(executor).finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

async function executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0

  while (attempt <= MAX_RETRIES) {
    try {
      return await fn()
    } catch (error) {
      if (is429Error(error) && attempt < MAX_RETRIES) {
        const delayMs = extractRetryDelayMs(error)
        console.warn(`[Gemini] 429 - ${delayMs / 1000}초 후 재시도 (${attempt + 1}/${MAX_RETRIES})`)
        await sleep(delayMs)
        attempt++
      } else {
        throw error
      }
    }
  }

  throw new Error('[Gemini] 최대 재시도 횟수 초과')
}
