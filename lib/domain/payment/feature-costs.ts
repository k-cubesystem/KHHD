/**
 * 이용권 비용 단일 소스 — 표시(display)와 실사용의 유일한 진실.
 *
 * 2026-09-18 복채(잔액) → 이용권 전환(PRD-voucher-system-v1): `display` 는 **이용권 장 수**다.
 *  - 풀이 1회 = 1장.
 *  - 여러 사람을 한 번에 읽거나(함께 보기) 긴 풀이(재물 심층·종합사주풀이)는 2장.
 *  - 옛 복채 가격 ÷ 사주 2만냥 = 1 · 1.5 · 2.5 를 **내림 쪽**으로 잡았다(1·2·2) — 이용자에게 불리해지지 않게.
 *
 * 표시 = 실사용 원칙: 화면의 «이용권 N장»과 서버가 실제로 쓰는 장 수는 이 파일 한 곳에서 나온다.
 * 서버(lib/services/feature-charge.ts)는 호출부가 넘긴 숫자를 믿지 않고 costKey 로 여기서 다시 읽는다.
 */

export type FeatureCostKey =
  | 'saju'
  | 'compatibility'
  | 'newYear'
  | 'today'
  | 'face'
  | 'palm'
  | 'fengshui'
  | 'wealth'
  | 'imageGeneration'
  | 'samhap'
  | 'themeFortune'
  | 'circleNarrative'
  | 'togetherNarrative'
  | 'obangkiDraw'
  | 'shamanQuestions'

export interface FeatureCost {
  /** 쓰는 이용권 장 수. 무료면 0. */
  readonly display: number
  /** 무료 기능 여부 — 0을 숨기지 말고 "무료" 배지로 자랑한다. */
  readonly free: boolean
}

export const FEATURE_COST = {
  saju: { display: 1, free: false },
  compatibility: { display: 1, free: false },
  newYear: { display: 0, free: true },
  today: { display: 0, free: true },
  face: { display: 1, free: false },
  palm: { display: 1, free: false },
  fengshui: { display: 1, free: false },
  wealth: { display: 2, free: false },
  // 이미지 생성은 과금 코드가 없는 자리표시자다(app/actions/ai/image.ts generateDestinyImage).
  // 🔴 과금하지 않는 기능을 유료로 적으면 표시광고법 문제 — 실제대로 무료.
  imageGeneration: { display: 0, free: true },
  samhap: { display: 2, free: false },
  // 인기테마운세 개별 풀이 — 사주 1인 골격 + AI 1회. 무료 미끼 테마는 이 키를 안 쓴다(themes.ts themeReadingCostKey).
  themeFortune: { display: 1, free: false },
  // 처방전·그룹 지도 AI 풀이 — FLASH 1회.
  circleNarrative: { display: 1, free: false },
  // 둘·셋·넷 함께 보기 — 사람 수만큼 명식이 들어가 처방전보다 무겁다(옛 3만냥 차등 유지).
  togetherNarrative: { display: 2, free: false },
  // 오방기 — 하루 무료 3회를 넘긴 점괘 한 번.
  obangkiDraw: { display: 1, free: false },
  // 속풀이 질문권 — 이용권 1장으로 질문 10문(30일)을 연다.
  shamanQuestions: { display: 1, free: false },
} as const satisfies Record<FeatureCostKey, FeatureCost>

/** MISSION_CATEGORIES / FORTUNE_MISSIONS 의 category 값 → FeatureCostKey */
export const MISSION_CATEGORY_TO_COST_KEY: Record<string, FeatureCostKey> = {
  SAJU: 'saju',
  FACE: 'face',
  HAND: 'palm',
  FENGSHUI: 'fengshui',
  COMPATIBILITY: 'compatibility',
  TODAY: 'today',
  WEALTH: 'wealth',
  NEW_YEAR: 'newYear',
  SAMHAP: 'samhap',
}

/** category 값으로 이용권 장 수 조회. 미매핑은 0. */
export function featureCostByCategory(category: string): number {
  const key = MISSION_CATEGORY_TO_COST_KEY[category]
  return key ? FEATURE_COST[key].display : 0
}

/** category 가 무료 기능인지. */
export function isFreeFeatureCategory(category: string): boolean {
  const key = MISSION_CATEGORY_TO_COST_KEY[category]
  return key ? FEATURE_COST[key].free : false
}

/** 표시 문자열: 무료면 "무료", 아니면 "이용권 N장"(단위 통일). */
export function formatFeatureCost(key: FeatureCostKey): string {
  const c = FEATURE_COST[key]
  return c.free ? '무료' : `이용권 ${c.display}장`
}

/**
 * 이용권 내역에 보이는 이름. 이름도 값과 같은 자리에서 온다 — 표시의 단일 출처는 이 파일이다.
 */
const CHARGE_KEY_LABEL: Record<string, string> = {
  SAJU: '사주 풀이',
  FACE: '관상 풀이',
  HAND: '손금 풀이',
  FENGSHUI: '풍수 풀이',
  COMPATIBILITY: '궁합 풀이',
  SAMHAP: '종합사주풀이',
  WEALTH: '재물운 심층',
  wealth_analysis: '재물운 심층',
  IMAGE_GEN: '이미지 생성',
  NEW_YEAR: '신년운세',
  TODAY: '오늘의 운세',
  circle_narrative: '기운 풀이',
  together_narrative: '함께 보기',
  OBANGKI_DRAW: '오방기 점괘',
  SHAMAN_QUESTIONS: '속풀이 질문 10문',
}

/**
 * 과금 featureKey → **서버가 되도출하는 정본 장 수**.
 *
 * 여기 등재된 키는 서버가 값을 다시 도출해 대조한다. 값이 상황마다 달라지는 동적 키(theme_*)는
 * 여기 두지 않는다 — 그쪽은 서버 액션 안에서 costKey 로 서버가 계산한다.
 */
const CANONICAL_CHARGE_UNITS: Record<string, number> = {
  SAJU: FEATURE_COST.saju.display,
  COMPATIBILITY: FEATURE_COST.compatibility.display,
  FACE: FEATURE_COST.face.display,
  HAND: FEATURE_COST.palm.display,
  FENGSHUI: FEATURE_COST.fengshui.display,
  SAMHAP: FEATURE_COST.samhap.display,
  WEALTH: FEATURE_COST.wealth.display,
  wealth_analysis: FEATURE_COST.wealth.display,
  IMAGE_GEN: FEATURE_COST.imageGeneration.display,
  NEW_YEAR: FEATURE_COST.newYear.display,
  TODAY: FEATURE_COST.today.display,
  circle_narrative: FEATURE_COST.circleNarrative.display,
  together_narrative: FEATURE_COST.togetherNarrative.display,
  OBANGKI_DRAW: FEATURE_COST.obangkiDraw.display,
  SHAMAN_QUESTIONS: FEATURE_COST.shamanQuestions.display,
}

/**
 * 이 featureKey 의 정본 장 수. 동적 키처럼 정본이 없으면 null.
 * null 이면 «검증할 수 없다»는 뜻이지 «아무 값이나 된다»는 뜻이 아니다 — 호출부가 판단한다.
 */
export function canonicalDeductCost(featureKey: string): number | null {
  const known = CANONICAL_CHARGE_UNITS[featureKey]
  return typeof known === 'number' ? known : null
}

/**
 * featureKey → 사람이 읽는 이름. 동적 키(테마)는 접두사로 판정한다.
 * 미등록 키는 원문을 그대로 돌려준다 — 내역이 비는 것보다 낫다.
 */
export function deductKeyLabel(featureKey: string): string {
  const known = CHARGE_KEY_LABEL[featureKey]
  if (known) return known
  if (featureKey.startsWith('theme_')) return '인기테마운세'
  if (featureKey.startsWith('VOUCHER_')) return '이용권'
  return featureKey
}
