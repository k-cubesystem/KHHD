/**
 * 가족 미션 5종(정예화) 순수 로직.
 *
 * 미션은 사주·관상·손금·풍수·궁합 5종만 센다.
 * 오늘운세(TODAY)·재물운(WEALTH)·신년운세(NEW_YEAR)는 미션에서 제외한다.
 *
 * side-effect 없음(순수 함수) — 단위테스트 대상.
 */

/** 가족 미션 5종(운대 % 산정 대상). */
export const FAMILY_MISSION_CATEGORIES = ['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY'] as const
export type FamilyMissionCategory = (typeof FAMILY_MISSION_CATEGORIES)[number]

/** 미션 총 개수(운대 분모). */
export const FAMILY_MISSION_TOTAL = FAMILY_MISSION_CATEGORIES.length // 5

/**
 * 가족 종합사주풀이 해금 요건 — 개인 4상(궁합 제외).
 * 궁합은 상대가 필요한 관계 분석이라 개인 종합의 선행 요건에서 뺀다.
 */
export const FAMILY_CORE_CATEGORIES = ['SAJU', 'FACE', 'HAND', 'FENGSHUI'] as const
export type FamilyCoreCategory = (typeof FAMILY_CORE_CATEGORIES)[number]

/**
 * 완료 카테고리 중 가족 미션 5종에 드는 개수(교집합).
 * TODAY/WEALTH/NEW_YEAR 등 5종 밖 카테고리와 중복은 무시한다.
 */
export function countFamilyMissions(completedCategories: readonly string[]): number {
  const done = new Set(completedCategories)
  let count = 0
  for (const category of FAMILY_MISSION_CATEGORIES) {
    if (done.has(category)) count++
  }
  return count
}

/** 개인 4상(SAJU·FACE·HAND·FENGSHUI) 모두 완료 → 가족 종합사주풀이 해금 가능. */
export function isFamilyCoreComplete(completedCategories: readonly string[]): boolean {
  const done = new Set(completedCategories)
  return FAMILY_CORE_CATEGORIES.every((category) => done.has(category))
}
