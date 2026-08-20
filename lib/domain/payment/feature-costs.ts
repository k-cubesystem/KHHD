/**
 * 복채 비용 단일 소스 — 표시(display)의 유일한 진실.
 *
 * 배경: 같은 기능의 표시 가격이 6곳(TALISMAN_COSTS_DISPLAY · MISSION_CATEGORIES ·
 * FORTUNE_MISSIONS · 스튜디오 하드코딩 · seasonal · ai_prompts)에서 서로 달랐다.
 * 관상은 목록 5만냥 / 실차감 2만냥, 사주·궁합·신년은 1~2만냥으로 표시되지만 실제론 무료였다.
 * 이 모듈이 표시의 단일 소스이며, 값은 각 액션의 실차감과 일치한다(표시 = 실차감).
 *
 * 표시 = 실차감 원칙 유지: display 값은 각 액션의 실차감과 일치한다. deductTalisman customAmount 를
 *    이 소스에서 끌어와 표시와 강제 일치시킨다(표시만 부풀리지 않는다).
 *
 * 2026-07-23 사용자 결정: 전 기능 개별 과금(무료 배지 제거). 사주·궁합을 2만냥 유료로 전환.
 * 실차감 실측(2026-07-23):
 *  - 사주(cheonjiin)·궁합(compatibility) = 2만냥 (신규 유료 — saju-result·compatibility 클라이언트 deductTalisman)
 *  - 신년(year2026)·오늘(daily) = 차감 없음(무료)
 *  - 관상(FACE)·손금(HAND)·풍수(FENGSHUI) = 2만냥
 *  - 재물(wealth_analysis) = 5만냥 / 이미지생성(IMAGE_GEN) = 5만냥 / 종합사주풀이(samhap) = 5만냥
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

export interface FeatureCost {
  /** 표시 복채(만냥). 실차감과 동일. */
  readonly display: number
  /** 무료 기능 여부 — 0을 숨기지 말고 "무료" 배지로 자랑한다. */
  readonly free: boolean
}

export const FEATURE_COST = {
  saju: { display: 2, free: false },
  compatibility: { display: 2, free: false },
  newYear: { display: 0, free: true },
  today: { display: 0, free: true },
  face: { display: 2, free: false },
  palm: { display: 2, free: false },
  fengshui: { display: 2, free: false },
  wealth: { display: 5, free: false },
  imageGeneration: { display: 5, free: false },
  // 삼합(三合) 종합 리포트 — 신규 프리미엄 기능(사주+관상+손금 종합). 표시=실차감 5만냥.
  samhap: { display: 5, free: false },
  // 인기테마운세 개별 풀이 — 사주 1인 골격 + AI 1회라 사주·관상과 같은 무게(기획 §7-1 «기본» 단).
  // 🔴 5만냥을 쓰지 않는다 — 같은 값이면 재물 심층과 구분이 안 된다.
  //    무료 미끼 테마(§7-1)는 이 키를 안 쓰고 차감 경로 자체를 타지 않는다(themes.ts themeReadingCostKey).
  themeFortune: { display: 2, free: false },
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

/**
 * 신규 가입 축하 복채(만냥) — **지급**(wallet-grant grantSignupBonus)과 **표시**(이벤트 유입 CTA)의 단일 출처.
 * 이벤트로 들어온 비로그인 방문자에게 가입 이유를 숫자로 보여주는 문구가 이 값을 읽는다.
 */
export const SIGNUP_BONUS_TALISMANS = 50

/** 가입 보너스로 볼 수 있는 사주 풀이 횟수 — "50만냥(사주 25회분)" 문구용. */
export const SIGNUP_BONUS_SAJU_COUNT = Math.floor(SIGNUP_BONUS_TALISMANS / FEATURE_COST.saju.display)

/**
 * 복채 사용 내역에 보이는 이름.
 *
 * 🔴 예전에는 `feature_costs` 표에서 label 을 읽었다. 그 표는 **0행**이라 조회가 늘 실패했고,
 *    내역에 `SAJU (2만냥 복채 사용)` 처럼 내부 키가 그대로 찍혔다(라이브 USE 11건 중 5건).
 *    이름도 값과 같은 자리에서 온다 — 표시의 단일 출처는 이 파일이다.
 */
const DEDUCT_KEY_LABEL: Record<string, string> = {
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
}

/**
 * 차감 featureKey → 사람이 읽는 이름. 동적 키(테마·이용권)는 접두사로 판정한다.
 * 미등록 키는 원문을 그대로 돌려준다 — 내역이 비는 것보다 낫다.
 */
export function deductKeyLabel(featureKey: string): string {
  const known = DEDUCT_KEY_LABEL[featureKey]
  if (known) return known
  if (featureKey.startsWith('theme_')) return '인기테마운세'
  if (featureKey.startsWith('VOUCHER_')) return '이용권'
  return featureKey
}
