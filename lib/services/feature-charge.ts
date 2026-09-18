import 'server-only'

import { consumePass, refundPass } from '@/lib/services/entitlement'
import { FEATURE_COST, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { NO_PASS_ERROR, formatPassUnits, type PassErrorType } from '@/lib/domain/entitlement/pass'
import { logger } from '@/lib/utils/logger'

/**
 * 유료 풀이의 이용권 사용을 **서버 액션 안에서** 처리한다.
 *
 * ## 왜 있나
 * 2026-09-01 까지 일부 풀이는 «클라이언트가 먼저 차감한 뒤 액션을 부르는» 구조였다.
 * 액션은 `'use server'` export = 공개 엔드포인트이므로, 브라우저에서 액션을 직접 부르면
 * 차감 없이 유료 풀이가 나왔다. 화면을 아무리 잠가도 서버가 강제하지 않으면 게이트가 아니다.
 *
 * ## 규율 (2026-09-18 이용권 전환 뒤에도 그대로)
 * - **캐시 확인보다 뒤에서** 부른다. 캐시 적중은 새 연산이 아니므로 이용권을 쓰지 않는다.
 * - 장 수는 호출부가 적지 않는다 — costKey 로 서버가 FEATURE_COST 에서 다시 읽는다.
 * - 실패 시 되돌릴 수 있게 `refundOnFailure` 를 돌려준다. 관리자·검수 통과면 null.
 * - 실패 응답에는 `errorType: 'NO_PASS'` 를 실어 보낸다. 화면의 「이용권이 부족해요」 안내가
 *   그 값으로 뜬다(hooks/use-insufficient-pass.ts).
 */
export type FeatureChargeOutcome =
  | { ok: true; refundOnFailure: (() => Promise<void>) | null }
  | { ok: false; failure: { success: false; error: string; errorType: PassErrorType; requiredUnits: number } }

export async function chargeFeature(params: {
  userId: string
  /** 이용권 내역·환급 조회가 쓰는 키. analysis_history.category 와 같은 값이어야 추적이 맞는다. */
  featureKey: string
  /** 장 수의 단일 출처. 서버가 이 키로 값을 도출하므로 호출부가 숫자를 적지 않는다. */
  costKey: FeatureCostKey
  /** 로그에 남는 이름. */
  label: string
}): Promise<FeatureChargeOutcome> {
  const cost = FEATURE_COST[params.costKey]

  // 무료 기능은 사용 경로를 아예 타지 않는다.
  if (cost.free || cost.display <= 0) return { ok: true, refundOnFailure: null }

  const units = cost.display
  const result = await consumePass({ userId: params.userId, featureKey: params.featureKey, units })

  if (!result.ok) {
    if (result.reason === 'INSUFFICIENT') {
      return {
        ok: false,
        failure: {
          success: false,
          error: `${params.label}에는 ${formatPassUnits(units)}이 필요해요. 이용권을 구매하거나 멤버십으로 이용할 수 있어요.`,
          errorType: NO_PASS_ERROR,
          requiredUnits: units,
        },
      }
    }
    logger.error(new Error('[FeatureCharge] 이용권 사용 실패'), {
      userId: params.userId,
      featureKey: params.featureKey,
      reason: result.reason,
    })
    return {
      ok: false,
      failure: {
        success: false,
        error: '이용권을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
        errorType: 'CHARGE_FAILED',
        requiredUnits: units,
      },
    }
  }

  if (result.bypass) return { ok: true, refundOnFailure: null }

  const ledgerIds = result.ledgerIds
  return {
    ok: true,
    // 실패 처리 중의 2차 실패가 풀이 실패 응답까지 삼키지 않게 — 던지지 않고 경보만 남긴다.
    refundOnFailure: async () => {
      const restored = await refundPass(params.userId, ledgerIds).catch((err: unknown) => {
        logger.error(err instanceof Error ? err : new Error('[FeatureCharge] 이용권 되돌림 예외'), {
          userId: params.userId,
          featureKey: params.featureKey,
        })
        return 0
      })
      if (restored <= 0) {
        logger.error(new Error('[FeatureCharge] 실패한 풀이의 이용권을 되돌리지 못함'), {
          userId: params.userId,
          featureKey: params.featureKey,
          label: params.label,
        })
      }
    },
  }
}
