import { getModelConfig, type AIProvider } from '@/lib/config/ai-models'
import { generateWithClaude } from '@/lib/services/claude-client'
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
    })
    return { ...result, provider: 'claude', model }
  }

  // Gemini
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: options.systemPrompt || undefined,
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
