/**
 * 복채 비용 단일 소스 — 표시(display)의 유일한 진실.
 *
 * 배경: 같은 기능의 표시 가격이 6곳(TALISMAN_COSTS_DISPLAY · MISSION_CATEGORIES ·
 * FORTUNE_MISSIONS · 스튜디오 하드코딩 · seasonal · ai_prompts)에서 서로 달랐다.
 * 관상은 목록 5만냥 / 실차감 2만냥, 사주·궁합·신년은 1~2만냥으로 표시되지만 실제론 무료였다.
 * 이 모듈이 표시의 단일 소스이며, 값은 각 액션의 실차감과 일치한다(표시 = 실차감).
 *
 * ⚠️ 가격 인상 금지: display 값은 실차감을 반영할 뿐이다. 여기서 값을 올리지 않는다.
 *    실차감(각 액션의 deductTalisman customAmount)을 이 소스로부터 끌어와 표시와 강제 일치시킨다.
 *
 * 실차감 실측(2026-07-22):
 *  - 사주(cheonjiin)·궁합(compatibility)·신년(year2026)·오늘(daily) = 차감 없음(무료)
 *  - 관상(FACE)·손금(HAND)·풍수(FENGSHUI) = 2만냥
 *  - 재물(wealth_analysis) = 5만냥 / 이미지생성(IMAGE_GEN) = 5만냥
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

export interface FeatureCost {
  /** 표시 복채(만냥). 실차감과 동일. */
  readonly display: number
  /** 무료 기능 여부 — 0을 숨기지 말고 "무료" 배지로 자랑한다. */
  readonly free: boolean
}

export const FEATURE_COST = {
  saju: { display: 0, free: true },
  compatibility: { display: 0, free: true },
  newYear: { display: 0, free: true },
  today: { display: 0, free: true },
  face: { display: 2, free: false },
  palm: { display: 2, free: false },
  fengshui: { display: 2, free: false },
  wealth: { display: 5, free: false },
  imageGeneration: { display: 5, free: false },
  // 삼합(三合) 종합 리포트 — 신규 프리미엄 기능(사주+관상+손금 종합). 표시=실차감 5만냥.
  samhap: { display: 5, free: false },
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

/** category 값으로 표시 복채(만냥) 조회. 미매핑은 0. */
export function featureCostByCategory(category: string): number {
  const key = MISSION_CATEGORY_TO_COST_KEY[category]
  return key ? FEATURE_COST[key].display : 0
}

/** category 가 무료 기능인지. */
export function isFreeFeatureCategory(category: string): boolean {
  const key = MISSION_CATEGORY_TO_COST_KEY[category]
  return key ? FEATURE_COST[key].free : false
}

/** 표시 문자열: 무료면 "무료", 아니면 "복채 N만냥"(단위 통일). */
export function formatFeatureCost(key: FeatureCostKey): string {
  const c = FEATURE_COST[key]
  return c.free ? '무료' : `복채 ${c.display}만냥`
}
