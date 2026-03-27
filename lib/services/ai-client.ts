import { getModelConfig, type AIProvider } from '@/lib/config/ai-models'
import { generateWithClaude, type ImagePart } from '@/lib/services/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

  if (provider === 'claude') {
    const result = await generateWithClaude({
      model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      images: options.images,
    })
    return { ...result, provider: 'claude', model }
  }

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

  const result = await genModel.generateContent(options.userPrompt)
  const response = result.response
  const text = response.text()
  const usage = response.usageMetadata

  return {
    text,
    provider: 'gemini',
    model,
    inputTokens: usage?.promptTokenCount || 0,
    outputTokens: usage?.candidatesTokenCount || 0,
  }
}
