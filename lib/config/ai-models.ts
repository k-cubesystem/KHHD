/**
 * 중앙 AI 모델 상수
 * 모든 AI 모델 참조는 이 파일의 상수를 사용할 것
 *
 * Claude로 전환하려면:
 * 1. Anthropic 크레딧 충전
 * 2. Vercel에 ANTHROPIC_API_KEY 추가
 * 3. AI_PROVIDER=claude 환경변수 설정
 */

// Provider types
export type AIProvider = 'gemini' | 'claude'

// Gemini models
export const GEMINI_PRO = 'gemini-3.1-pro-preview'
export const GEMINI_FLASH = 'gemini-3-flash-preview'
export const GEMINI_IMAGE = 'gemini-3.1-flash-image-preview'

// Claude models
export const CLAUDE_OPUS = 'claude-opus-4-6'
export const CLAUDE_SONNET = 'claude-sonnet-4-6'

// Provider 선택: 환경변수 AI_PROVIDER로 전환 가능 (기본: gemini)
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

function resolveModel(tier: 'pro' | 'flash'): AIModelConfig {
  if (DEFAULT_PROVIDER === 'claude') {
    return {
      provider: 'claude',
      model: tier === 'pro' ? CLAUDE_OPUS : CLAUDE_SONNET,
    }
  }
  return {
    provider: 'gemini',
    model: tier === 'pro' ? GEMINI_PRO : GEMINI_FLASH,
  }
}

// Feature configs — AI_PROVIDER 환경변수로 일괄 전환 가능
export const FEATURE_MODELS: Record<string, AIModelConfig> = {
  // PRO 티어: 사주/천지인/궁합/관상/손금/풍수
  saju: resolveModel('pro'),
  saju_detail: resolveModel('pro'),
  cheonjiin: resolveModel('pro'),
  compatibility: resolveModel('pro'),
  image: resolveModel('pro'),
  'celebrity-compatibility': resolveModel('pro'),

  // 이미지 생성: Gemini 고정 (Imagen)
  'generate-image': { provider: 'gemini', model: GEMINI_IMAGE },

  // FLASH 티어: 채팅/운세/트렌드
  'shaman-chat': resolveModel('flash'),
  'fortune-analysis': resolveModel('flash'),
  trend: resolveModel('flash'),
  wealth: resolveModel('flash'),
  year2026: resolveModel('flash'),
  daily: resolveModel('flash'),
  invite: resolveModel('flash'),
  engine: resolveModel('flash'),
}

export function getModelConfig(featureKey: string): AIModelConfig {
  return FEATURE_MODELS[featureKey] || resolveModel('flash')
}
