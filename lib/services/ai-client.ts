import { getModelConfig, GEMINI_OUTPUT_TOKENS_FLOOR, type AIProvider } from '@/lib/config/ai-models'
import { generateWithClaude, type ImagePart } from '@/lib/services/claude-client'
import { FinishReason, GoogleGenerativeAI } from '@google/generative-ai'
import { logUsage } from '@/lib/services/gemini-rate-limiter'
import { thoughtTokensOf } from '@/lib/domain/gemini/usage'
import { logger } from '@/lib/utils/logger'

const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''

export interface AIGenerateOptions {
  featureKey: string
  systemPrompt?: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  providerOverride?: AIProvider
  modelOverride?: string
  images?: ImagePart[]
  /** JSON 응답 강제 모드 (Gemini responseMimeType 활용) */
  jsonMode?: boolean
  /**
   * 사용량 로깅용 action_type. 미지정 시 featureKey 를 그대로 사용.
   * 대시보드 라벨(lib/domain/gemini/actions)과 1:1 이어야 한다.
   */
  actionType?: string
  /** 사용량 로깅용 user_id (선택 — 원가 집계엔 불필요, per-user 귀속용) */
  userId?: string | null
}

export interface AIGenerateResult {
  text: string
  provider: AIProvider
  model: string
  inputTokens: number
  /** 본문 토큰. 🔴 Gemini 는 여기에 «생각»이 없다 — 원가는 logUsage 가 생각까지 더해서 센다. */
  outputTokens: number
}

export async function generateAIContent(options: AIGenerateOptions): Promise<AIGenerateResult> {
  const config = getModelConfig(options.featureKey)
  const provider = options.providerOverride || config.provider
  const model = options.modelOverride || config.model
  const actionType = options.actionType ?? options.featureKey
  const startedAt = Date.now()

  let result: AIGenerateResult
  /** 출력 단가로 과금되지만 `candidatesTokenCount` 에는 없는 토큰. Claude 는 출력에 이미 포함(이중 계상 금지). */
  let thoughtTokens = 0

  if (provider === 'claude') {
    const claude = await generateWithClaude({
      model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      images: options.images,
    })
    result = { ...claude, provider: 'claude', model }
  } else {
    // Gemini — 고도화 설정
    // 🔴 이 한도는 «생각 토큰 + 본문»의 합이다(GEMINI_OUTPUT_TOKENS_FLOOR 주석에 실측치).
    const maxOutputTokens = options.maxTokens || GEMINI_OUTPUT_TOKENS_FLOOR
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: options.systemPrompt || undefined,
      generationConfig: {
        maxOutputTokens,
        // 샘플링은 2026-09-23 A/B(유료 테마 풀이, 안마다 3회 실호출) 뒤 **그대로 둔다** — Gemini 3 기본값
        // (1.0 / 0.95 / 64)과 본문 길이·JSON 성공·문장 중복이 모두 같았고 생각 토큰만 2.4배였다(920 → 2,169).
        temperature: options.temperature ?? 0.8,
        topP: 0.95,
        topK: 40,
        // JSON 모드: 스키마 준수율 대폭 향상
        ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    })

    const gen = await genModel.generateContent(options.userPrompt)
    const response = gen.response
    const usage = response.usageMetadata
    thoughtTokens = thoughtTokensOf(usage)
    // 🔴 잘림은 오류로 오지 않는다 — «짧은 답»으로 온다. 그래서 보이게 만든다(logger.warn = Sentry 경보).
    if (response.candidates?.[0]?.finishReason === FinishReason.MAX_TOKENS) {
      logger.warn('[ai-client] Gemini 응답이 출력 한도에서 잘렸다 — 한도는 «생각 + 본문»의 합이다', {
        actionType,
        model,
        maxOutputTokens,
        thoughtsTokenCount: thoughtTokens,
        candidatesTokenCount: usage?.candidatesTokenCount ?? 0,
      })
    }
    result = {
      text: response.text(),
      provider: 'gemini',
      model,
      inputTokens: usage?.promptTokenCount || 0,
      outputTokens: usage?.candidatesTokenCount || 0,
    }
  }

  // 중앙 사용량·비용 계측 (부가 기능 — fire-and-forget, 본 응답을 막지 않음)
  void logUsage({
    userId: options.userId ?? null,
    model,
    actionType,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    thoughtTokens,
    latencyMs: Date.now() - startedAt,
    status: 'success',
  }).catch(() => {})

  return result
}
