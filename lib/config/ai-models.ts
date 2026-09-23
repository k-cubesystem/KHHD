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

// Gemini models — 텍스트 생성은 gemini-3.8-flash 로 통일(2026-09-14 갱신, CEO 「3.8 나왔으니 AI 분석 전부 3.8로」).
// 🔴 gemini-3.5-pro 는 아직 출시되지 않았다 — «PRO 티어»가 Flash 를 가리키는 것은 그 때문이다.
//    3.7 → 3.8 은 최신 GA 로의 이동. 단가는 3.7 과 같다($1.50/$7.50, 인트로 $0.75/$3.75 ~2026-12-31).
//    2026-09-14 실측: 프로젝트 키의 models API 목록(55개)에 gemini-3.8-flash 가 있다(공식 문서 Stable).
// 이미지 생성은 별도 modality라 이미지 전용 모델 유지.
export const GEMINI_PRO = 'gemini-3.8-flash'
export const GEMINI_FLASH = 'gemini-3.8-flash'
export const GEMINI_IMAGE = 'gemini-3.1-flash-image-preview'

/**
 * Gemini 3.x 텍스트 호출의 출력 한도 **최소 안전선**(= `generateAIContent` 의 기본값).
 *
 * 🔴 `maxOutputTokens` 는 «생각 토큰 + 본문»의 합이다. gemini-3.8-flash 는 생각이 기본으로 켜져 있고
 *    (models API `thinking: true`), 한도가 작으면 생각이 한도를 먹고 **본문이 잘린 채 돌아온다 —
 *    오류가 아니라 «짧은 답»으로**.
 *
 * 생각을 줄이는 손잡이는 있다(2026-09-23 실측, SDK 0.24.1 은 타입에 없어도 `generationConfig` 를 그대로 넘긴다):
 * `thinkingLevel: 'low'|'medium'|'high'` 는 받아들여지고 `'minimal'` 은 400(이 모델 미지원),
 * 레거시 `thinkingBudget: 0` 도 받아들여져 생각이 0 이 됐다. **지금은 쓰지 않는다** — 분류 표본에서
 * 생각을 끄자 판정이 달라졌고(apply → question), 여기서 고치려는 것은 품질이 아니라 «잘림»이기 때문이다.
 *
 * 2026-09-23 실측(같은 프롬프트·실호출):
 *   - 대화 요약 한도 400 → finishReason MAX_TOKENS · 생각 386 · 본문 10토큰(13자)
 *   - 기억 추출 한도 512 → 생각 395 + 본문 101 = 한도의 97%
 *   - 이벤트 간이 풀이 한도 1,200 → 1,028 사용. 한도를 8,192 로 풀면 **생각만 1,465**
 *   - 유료 테마 풀이(8,192) → 생각 2,851 + 본문 1,781 = 57%
 *
 * 과금은 «쓴 만큼»이라 한도를 올려도 안 쓰면 비용이 늘지 않는다. 길이는 한도가 아니라
 * 프롬프트와 검증으로 정한다. 새 호출도 이 값 아래로 내리지 말 것
 * (게이트: `lib/services/__tests__/gemini-output-budget.test.ts`).
 */
export const GEMINI_OUTPUT_TOKENS_FLOOR = 8192

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
  // 종합사주풀이(삼재교차법) — 최고가 상품. 미등록 시 flash 폴백 함정이 있어 명시 등록.
  samhap: resolveModel('pro'),

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
  // Threads 이벤트 간이 풀이·댓글 분류 — 무료 소재라 flash. 사람 승인 후 발송(반자동)이라 pro 불필요.
  'event-reading': resolveModel('flash'),
  'threads-classify': resolveModel('flash'),
}

export function getModelConfig(featureKey: string): AIModelConfig {
  return FEATURE_MODELS[featureKey] || resolveModel('flash')
}
