import { getModelConfig, type AIProvider } from '@/lib/config/ai-models'
import { generateWithClaude, type ImagePart } from '@/lib/services/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logUsage } from '@/lib/services/gemini-rate-limiter'

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
  outputTokens: number
}

export async function generateAIContent(options: AIGenerateOptions): Promise<AIGenerateResult> {
  const config = getModelConfig(options.featureKey)
  const provider = options.providerOverride || config.provider
  const model = options.modelOverride || config.model
  const actionType = options.actionType ?? options.featureKey
  const startedAt = Date.now()

  let result: AIGenerateResult

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
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: options.systemPrompt || undefined,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 8192,
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
    latencyMs: Date.now() - startedAt,
    status: 'success',
  }).catch(() => {})

  return result
}
