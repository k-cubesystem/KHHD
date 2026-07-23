/**
 * 관상·손금 종합 점수 산출 — assessment(좋음/보통/주의) 가중 합산으로 0~100 자연 분포.
 *
 * 배경: 기존 점수 = assessment(4/6/8) 평균×10 → 40~80 협소 분포로 등급 밴드(high80/mid60)에
 *       도달하기 어려웠다(A-3). 이 순수 모듈은 좋음/보통/주의 비율을 넓은 곡선으로 편다.
 *
 * 설계:
 *  - 각 항목 값: 좋음 1.0 / 보통 0.55 / 주의 0.2
 *  - 가중 평균 w ∈ [0.2, 1.0] → 선형 스케일 score = 17.75 + 76.25·w
 *    · 전부 좋음(w=1.0)   ≈ 94 (high)
 *    · 전부 보통(w=0.55)  ≈ 60 (mid 경계)
 *    · 전부 주의(w=0.2)   ≈ 33 (growth, "30대")
 *    · 대부분 좋음+일부 보통 ≈ 85+ (high 도달 가능 — titles.ts 밴드 불변 전제)
 *  - 데이터 전무(가중치 합 0)면 중립값 60(NaN 방어).
 *  - 관상 가중: 부위(3) > 오관(2) > 삼정(1). 손금: 삼대주선(3) > 특수선(1.5) + fortuneOverview 완성도 보너스(0~3).
 *
 * 순수 함수(side-effect 없음) — 단위테스트로 분포를 고정한다.
 */

import type { Assessment } from './feature-parse'

/** assessment별 기여 값(0~1). */
const ASSESSMENT_VALUE: Record<Assessment, number> = {
  좋음: 1.0,
  보통: 0.55,
  주의: 0.2,
}

/** 선형 스케일 계수: w=1.0→94, w=0.2→33. */
const SCALE_BASE = 17.75
const SCALE_SLOPE = 76.25

/** 데이터 전무 시 중립 폴백(mid 경계). */
export const NEUTRAL_SCORE = 60

interface WeightedItem {
  value: number
  weight: number
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

/** (assessment | null | undefined)[] → 존재하는 항목만 WeightedItem 로. */
function toItems(assessments: readonly (Assessment | null | undefined)[], weight: number): WeightedItem[] {
  const items: WeightedItem[] = []
  for (const a of assessments) {
    if (a && a in ASSESSMENT_VALUE) items.push({ value: ASSESSMENT_VALUE[a], weight })
  }
  return items
}

/**
 * 가중 항목들 → 0~100 점수. 항목이 없으면 NEUTRAL_SCORE.
 */
export function computeAnalysisScore(items: readonly WeightedItem[]): number {
  const totalWeight = items.reduce((s, it) => s + it.weight, 0)
  if (totalWeight <= 0) return NEUTRAL_SCORE
  const weighted = items.reduce((s, it) => s + it.value * it.weight, 0)
  const w = weighted / totalWeight // [0.2, 1.0]
  const score = SCALE_BASE + SCALE_SLOPE * w
  return clamp(Math.round(score), 0, 100)
}

/**
 * 관상 종합 점수. 부위(6, 가중3) > 오관(5, 가중2) > 삼정(3, 가중1).
 * 각 배열에는 파싱된 항목의 assessment 를 넣되, 미스는 null/undefined 로 둔다(제외).
 */
export function computeFaceScore(input: {
  fiveFeatures: readonly (Assessment | null | undefined)[]
  threeStops: readonly (Assessment | null | undefined)[]
  sixParts: readonly (Assessment | null | undefined)[]
}): number {
  const items: WeightedItem[] = [
    ...toItems(input.sixParts, 3),
    ...toItems(input.fiveFeatures, 2),
    ...toItems(input.threeStops, 1),
  ]
  return computeAnalysisScore(items)
}

/**
 * 손금 종합 점수. 삼대주선(가중3) > 특수선(가중1.5) + fortuneOverview 완성도 보너스(최대 +3).
 * fortunePresentCount: 채워진 4대 운세 텍스트 개수(0~4). 리딩이 풍부할수록 소폭 가점.
 */
export function computePalmScore(input: {
  majorLines: readonly (Assessment | null | undefined)[]
  specialLines: readonly (Assessment | null | undefined)[]
  fortunePresentCount: number
}): number {
  const items: WeightedItem[] = [...toItems(input.majorLines, 3), ...toItems(input.specialLines, 1.5)]
  const base = computeAnalysisScore(items)
  const bonus = Math.round((clamp(input.fortunePresentCount, 0, 4) / 4) * 3)
  return clamp(base + bonus, 0, 100)
}
