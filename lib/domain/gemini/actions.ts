/**
 * Gemini 사용량 계측 — action_type ↔ 한글 라벨 단일 소스.
 *
 * gemini_api_logs.action_type 로 방출되는 전 기능의 라벨을 여기서만 정의한다.
 * 어드민 대시보드(gemini-usage-dashboard)와 코스트 테이블이 이 맵을 공유한다.
 *
 * 방출 경로(2026-07-21 세션26 계측 수복 기준):
 *  - generateAIContent 중앙 계측(ai-client.ts): featureKey(또는 actionType override)
 *  - 직접 호출 3곳: shaman_chat / cheonjiin_report / image_generation
 *  - withGeminiRateLimit 6종: invite_compatibility / deity_oracle / daily_fortune /
 *    face_destiny / fengshui_destiny / palm_destiny
 */

export const AI_ACTION_LABELS: Record<string, string> = {
  // ── generateAIContent 중앙 계측 ──
  saju_detail: '사주 상세',
  cheonjiin: '천지인 사주',
  compatibility: '궁합',
  wealth: '재물운',
  year2026: '2026 년운',
  trend: '테마 트렌드',
  fortune: '테마운세',
  business_compatibility: '비즈니스 궁합',
  summarizer: '대화 요약',
  memory: '기억 추출',
  // ── 직접 호출 3곳 ──
  shaman_chat: '고민상담 채팅',
  cheonjiin_report: '천지인 종합비록',
  image_generation: '이미지 생성',
  // ── withGeminiRateLimit 6종 ──
  invite_compatibility: '초대 궁합',
  deity_oracle: '신탁',
  daily_fortune: '오늘운세',
  face_destiny: '관상 운명',
  fengshui_destiny: '풍수 운명',
  palm_destiny: '손금 운명',
  // ── 기타 ──
  unknown: '기타',
}

/**
 * 코드가 실제로 방출하는 action_type 전수.
 * 새 계측 지점을 추가하면 여기에 등록 → 라벨 커버리지 테스트가 누락을 잡는다.
 */
export const EMITTED_ACTION_TYPES = [
  // generateAIContent
  'saju_detail',
  'cheonjiin',
  'compatibility',
  'wealth',
  'year2026',
  'trend',
  'fortune',
  'business_compatibility',
  'summarizer',
  'memory',
  // 직접 호출
  'shaman_chat',
  'cheonjiin_report',
  'image_generation',
  // withGeminiRateLimit
  'invite_compatibility',
  'deity_oracle',
  'daily_fortune',
  'face_destiny',
  'fengshui_destiny',
  'palm_destiny',
] as const

export type EmittedActionType = (typeof EMITTED_ACTION_TYPES)[number]

/**
 * action_type → ai_prompts.key (복채 단가 조회용).
 * null = 사용자 복채 없음(내부 유틸·무료·shrine 기능) 또는 ai_prompts 미등록.
 * 어드민 "원가 vs 복채" 테이블이 이 맵으로 talisman_cost 를 조인한다.
 *
 * ※ wealth·fortune·image_generation 은 ai_prompts 에 항목이 없어 null 처리.
 *   (feature_costs 폴백을 쓰는 기능 — 데이터 정합 필요, 세션26 보고서에 기록)
 */
export const ACTION_TO_PROMPT_KEY: Record<string, string | null> = {
  daily_fortune: 'daily_fortune',
  shaman_chat: 'shaman_chat',
  cheonjiin: 'cheonjiin_analysis',
  cheonjiin_report: 'cheonjiin_analysis',
  saju_detail: 'saju_analysis_v2',
  compatibility: 'haehwajigi_compatibility',
  business_compatibility: 'haehwajigi_compatibility',
  invite_compatibility: 'haehwajigi_compatibility',
  year2026: 'year2026_analysis',
  trend: 'trend_love', // 트렌드 4종 모두 1만냥 동일 — 대표 키
  face_destiny: 'face_reading',
  palm_destiny: 'palm_reading',
  fengshui_destiny: 'fengshui_analysis',
  // 사용자 복채 없음(내부·무료·shrine) 또는 ai_prompts 미등록
  fortune: null,
  wealth: null,
  deity_oracle: null,
  image_generation: null,
  summarizer: null,
  memory: null,
}

/**
 * action_type → 표시 라벨.
 * 미등록 타입은 레거시 trend_* 프리픽스만 보정하고, 그 외엔 원문을 그대로 노출.
 * (구 로그 호환: 계측 표준화 이전엔 trend_love 등 동적 키가 방출됐다)
 */
export function getActionLabel(type: string): string {
  if (AI_ACTION_LABELS[type]) return AI_ACTION_LABELS[type]
  if (type.startsWith('trend_')) return `트렌드: ${type.replace('trend_', '')}`
  return type
}
