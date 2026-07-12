/**
 * AI 기능 복채 차감 계획 (순수 함수 · 테스트 가능).
 *
 * 정책(사용자 확정 2026-07-12): **충전분은 일일 한도와 무관, 무료분만 한도.**
 * - 일일 한도(dailyLimit)는 멤버십 티어의 free-grant 소비를 제한한다.
 * - 한도를 넘는 소비는 사용자가 "충전(CHARGE)"한 복채로만 가능하다.
 * - chargeExemptRemaining = 충전 잔여(충전총액 − 총사용액, 충전분 우선소진 가정 → 비누수 하한).
 */
export interface SpendPlanInput {
  cost: number
  dailyLimit: number
  usedToday: number
  chargeExemptRemaining: number
}

export interface SpendPlan {
  allowed: boolean
  /** 일일 무료 한도에서 소비되는 양(= incrementDailyUsage 대상) */
  fromCap: number
  /** 한도 초과분(충전 복채에서 소비) */
  overCap: number
  reason?: 'DAILY_LIMIT' | 'INSUFFICIENT_CHARGED'
}

export function computeSpendPlan({ cost, dailyLimit, usedToday, chargeExemptRemaining }: SpendPlanInput): SpendPlan {
  const safeCost = Math.max(0, cost)
  const capRemaining = Math.max(0, dailyLimit - usedToday)
  const fromCap = Math.min(safeCost, capRemaining)
  const overCap = safeCost - fromCap

  if (overCap > 0 && chargeExemptRemaining < overCap) {
    // 한도 여유가 아예 없었으면(무료분 소진/비구독) DAILY_LIMIT,
    // 한도 일부를 썼는데 충전분이 모자라면 INSUFFICIENT_CHARGED
    return {
      allowed: false,
      fromCap,
      overCap,
      reason: capRemaining > 0 ? 'INSUFFICIENT_CHARGED' : 'DAILY_LIMIT',
    }
  }

  return { allowed: true, fromCap, overCap }
}
