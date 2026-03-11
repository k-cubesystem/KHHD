/**
 * 중앙 AI 모델 상수
 * 모든 AI 모델 참조는 이 파일의 상수를 사용할 것
 */

// Provider types
export type AIProvider = 'gemini' | 'claude'

// Gemini models (existing)
export const GEMINI_PRO = 'gemini-3.1-pro-preview'
export const GEMINI_FLASH = 'gemini-3-flash-preview'
export const GEMINI_IMAGE = 'gemini-3.1-flash-image-preview'

// Claude models (new)
export const CLAUDE_OPUS = 'claude-opus-4-6'
export const CLAUDE_SONNET = 'claude-sonnet-4-6'

// Default provider (can be overridden per feature)
export const DEFAULT_PROVIDER: AIProvider = (process.env.AI_PROVIDER as AIProvider) || 'gemini'

// Feature-to-model mapping
export interface AIModelConfig {
  provider: AIProvider
  model: string
}

// Backward compatible exports
export const MODEL_PRO = GEMINI_PRO
export const MODEL_FLASH = GEMINI_FLASH
export const MODEL_IMAGE = GEMINI_IMAGE

// Feature configs - which model each feature uses
export const FEATURE_MODELS: Record<string, AIModelConfig> = {
  saju: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_OPUS : GEMINI_PRO },
  cheonjiin: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_OPUS : GEMINI_PRO },
  compatibility: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_OPUS : GEMINI_PRO },
  image: { provider: 'gemini', model: GEMINI_PRO }, // Image analysis always Gemini (vision)
  'generate-image': { provider: 'gemini', model: GEMINI_IMAGE }, // Image gen always Gemini
  'shaman-chat': { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  'fortune-analysis': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH,
  },
  trend: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  wealth: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  year2026: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  daily: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  invite: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  engine: { provider: DEFAULT_PROVIDER, model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH },
  'celebrity-compatibility': {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_OPUS : GEMINI_PRO,
  },
}

export function getModelConfig(featureKey: string): AIModelConfig {
  return (
    FEATURE_MODELS[featureKey] || {
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_PROVIDER === 'claude' ? CLAUDE_SONNET : GEMINI_FLASH,
    }
  )
}
