const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }> }
  }>
}

// Simple in-memory rate limiter
const requestTimes: number[] = []
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 15 // requests per window

function checkRateLimit(): boolean {
  const now = Date.now()
  // Remove old entries
  while (requestTimes.length > 0 && requestTimes[0] < now - RATE_LIMIT_WINDOW) {
    requestTimes.shift()
  }
  if (requestTimes.length >= RATE_LIMIT_MAX) return false
  requestTimes.push(now)
  return true
}

// Simple in-memory cache
const cache = new Map<string, { data: string; expires: number }>()
const CACHE_TTL = 5 * 60_000 // 5 minutes

function getCached(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: string) {
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL })
}

export async function generateContent(
  prompt: string,
  options: {
    model?: string
    cacheKey?: string
    systemInstruction?: string
  } = {}
): Promise<string> {
  const { model = 'gemini-3-flash-preview', cacheKey, systemInstruction } = options

  // Check cache
  if (cacheKey) {
    const cached = getCached(cacheKey)
    if (cached) return cached
  }

  // Rate limit
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }

  const apiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')
  if (!apiKey) throw new Error('Gemini API key not configured')

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${error}`)
  }

  const data: GeminiResponse = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // Cache result
  if (cacheKey && text) {
    setCache(cacheKey, text)
  }

  return text
}
