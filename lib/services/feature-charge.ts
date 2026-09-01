import 'server-only'

import { deductTalisman } from '@/app/actions/payment/wallet'
import { refundBokchae } from '@/lib/services/bokchae'
import { UNLIMITED_BALANCE } from '@/lib/auth/privileges'
import { FEATURE_COST, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { logger } from '@/lib/utils/logger'

/**
 * 유료 풀이의 과금을 **서버 액션 안에서** 처리한다.
 *
 * ## 왜 있나
 * 사주·궁합·관상·손금·풍수는 2026-09-01 까지 **클라이언트가 차감한 뒤 액션을 부르는** 구조였다.
 * 액션은 `'use server'` export = 공개 엔드포인트이므로, 브라우저에서 액션을 직접 부르면
 * 차감 없이 유료 풀이가 나왔다. 화면을 아무리 잠가도 서버가 강제하지 않으면 게이트가 아니다.
 * (대조군: 재물·삼합·테마운세는 처음부터 액션 안에서 차감했다.)
 *
 * ## 규율
 * - **캐시 확인보다 뒤에서** 부른다. 캐시 적중은 새 연산이 아니므로 과금하지 않는다.
 *   종전 구조는 클라가 먼저 차감하고 캐시 적중이면 되돌리는 왕복이었다 — 그 왕복이 사라진다.
 * - 실패 시 되돌릴 수 있게 `refundOnFailure` 를 돌려준다. 마스터·무제한은 실차감이 없으므로 null.
 * - 실패 응답에는 `errorType` 을 실어 보낸다. 화면의 「복채가 부족해요」 모달이 그 값으로 뜬다
 *   (hooks/use-insufficient-bokchae.ts 의 handleDeductResult).
 */
export type FeatureChargeOutcome =
  | { ok: true; remainingBalance?: number; refundOnFailure: (() => Promise<void>) | null }
  | { ok: false; failure: { success: false; error: string; errorType?: string; currentTier?: string } }

export async function chargeFeature(params: {
  userId: string
  /** wallet 내역·환급 조회가 쓰는 키. analysis_history.category 와 같은 값이어야 환급 어뷰즈 차단이 작동한다. */
  featureKey: string
  /** 표시 가격의 단일 출처. 서버가 이 키로 값을 도출하므로 호출부가 숫자를 적지 않는다. */
  costKey: FeatureCostKey
  /** 환불 내역에 남는 이름. */
  label: string
}): Promise<FeatureChargeOutcome> {
  const cost = FEATURE_COST[params.costKey].display

  // 무료 기능은 차감 경로를 아예 타지 않는다 — 0 을 차감하려 들면 wallet 이 거절한다.
  if (cost <= 0) return { ok: true, refundOnFailure: null }

  const deduct = await deductTalisman(params.featureKey, cost)

  if (!deduct.success) {
    return {
      ok: false,
      failure: {
        success: false,
        error: deduct.error || '복채가 부족합니다. 충전 후 다시 시도해 주세요.',
        errorType: deduct.errorType,
        currentTier: deduct.currentTier,
      },
    }
  }

  // 마스터·무제한은 실차감이 없다 — 되돌릴 것도 없다.
  const refundOnFailure =
    deduct.remainingBalance === UNLIMITED_BALANCE
      ? null
      : async () => {
          try {
            await refundBokchae(params.userId, cost, `${params.label} 실패 환불 (${cost}만냥)`)
          } catch (e) {
            logger.error('[FeatureCharge] 환불 실패:', e)
          }
        }

  return { ok: true, remainingBalance: deduct.remainingBalance, refundOnFailure }
}
