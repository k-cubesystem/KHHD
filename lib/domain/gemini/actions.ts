import { FEATURE_COST, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'

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
  ritual_month_line: '초하루 문안',
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
  'ritual_month_line',
] as const

export type EmittedActionType = (typeof EMITTED_ACTION_TYPES)[number]

/**
 * action_type → ai_prompts.key (복채 단가 조회용).
 * null = 사용자 복채 없음(내부 유틸·무료·shrine 기능).
 * 어드민 "원가 vs 복채" 테이블이 이 맵으로 talisman_cost 를 조인한다.
 *
 * ※ wealth·image_generation 은 20260722_feature_cost_seed 로 ai_prompts 행을 추가해
 *   실차감(5만냥)을 노출한다('—' 제거). fortune(테마운세)은 무료라 null 유지.
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
  ritual_month_line: null, // 무료 — 의례 카드 1줄
  wealth: 'wealth',
  image_generation: 'image_generation',
  // 사용자 복채 없음(내부·무료·shrine)
  fortune: null,
  deity_oracle: null,
  summarizer: null,
  memory: null,
}

/**
 * action_type → **복채 단가 키** (`lib/domain/payment/feature-costs.ts`).
 * null = 사용자에게 복채를 받지 않는 내부·무료 기능.
 *
 * ## 🔴 왜 ai_prompts 를 안 쓰나 (2026-08-19 수복)
 * 원가 대비 판가 화면이 거의 전부 「측정 안 됨」이었다. 조인은 맞았는데
 * **`ai_prompts.talisman_cost` 값이 낡아 있었다** — `cheonjiin_analysis: 0`(실제 2만냥),
 * `haehwajigi_compatibility: 0`(실제 2만냥), `saju_analysis_v2: 0`. 0 은 «무료»로 읽혀
 * 원가율이 산정 불가가 된다.
 *
 * 뿌리는 **가격 출처가 둘이었다**는 것이다. 이 프로젝트의 규율은 «표시 = 실차감»이고
 * 그 단일 출처는 `feature-costs.ts` 다. DB 표는 사람이 손대면 즉시 어긋난다.
 * 🔴 판가는 여기(코드)에서만 가져온다. `ACTION_TO_PROMPT_KEY` 는 프롬프트 조회용으로만 남긴다.
 */
export const ACTION_TO_COST_KEY: Record<string, FeatureCostKey | null> = {
  cheonjiin: 'saju',
  cheonjiin_report: 'saju',
  saju_detail: 'saju',
  compatibility: 'compatibility',
  business_compatibility: 'compatibility',
  invite_compatibility: 'compatibility',
  face_destiny: 'face',
  palm_destiny: 'palm',
  fengshui_destiny: 'fengshui',
  wealth: 'wealth',
  image_generation: 'imageGeneration',
  samhap: 'samhap',
  theme_fortune: 'themeFortune',
  trend: 'themeFortune',
  fortune: 'themeFortune',
  year2026: 'newYear',
  daily_fortune: 'today',
  // 사용자 복채 없음(내부)
  shaman_chat: null,
  deity_oracle: null,
  summarizer: null,
  memory: null,
  reading_insights: null,
}

/** 이 호출이 받는 복채(만냥). 내부 기능이면 null. */
export function bokchaeForAction(actionType: string): number | null {
  const key = ACTION_TO_COST_KEY[actionType]
  if (!key) return key === null && actionType in ACTION_TO_COST_KEY ? null : null
  return FEATURE_COST[key].display
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
