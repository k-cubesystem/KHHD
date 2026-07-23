import {
  FEATURE_COST,
  featureCostByCategory,
  isFreeFeatureCategory,
  formatFeatureCost,
} from '@/lib/domain/payment/feature-costs'

/**
 * 표시 = 실차감 단언 (R-P0-1).
 *
 * 실차감 실측(2026-07-23, 전 기능 개별 과금 전환):
 *  - 관상 FACE=2  : app/protected/studio/face/page.tsx → deductTalisman('FACE', FEATURE_COST.face.display)
 *  - 손금 HAND=2  : app/protected/studio/palm/page.tsx → deductTalisman('HAND', FEATURE_COST.palm.display)
 *  - 풍수 FENGSHUI=2: app/protected/studio/fengshui/page.tsx → deductTalisman('FENGSHUI', FEATURE_COST.fengshui.display)
 *  - 사주 SAJU=2  : app/protected/analysis/saju-result/saju-result-client.tsx → deductTalisman('SAJU', 2)
 *  - 궁합 COMPATIBILITY=2: app/protected/analysis/compatibility/compatibility-client.tsx → deductTalisman('COMPATIBILITY', 2)
 *  - 재물 wealth=5 : app/actions/ai/wealth.ts → WEALTH_ANALYSIS_COST = FEATURE_COST.wealth.display
 *  - 이미지생성=5 : 계측 기준(ai_prompts.image_generation)
 *  - 신년·오늘 = 차감 없음(무료) — 해당 액션에 deductTalisman 미존재 확인
 * 위 값이 바뀌면(표시 drift) 이 테스트가 깨져 실차감과의 불일치를 잡는다.
 */
describe('FEATURE_COST — 표시 = 실차감 단일 소스', () => {
  it('유료 기능 표시가 실차감과 일치한다', () => {
    expect(FEATURE_COST.face.display).toBe(2)
    expect(FEATURE_COST.palm.display).toBe(2)
    expect(FEATURE_COST.fengshui.display).toBe(2)
    expect(FEATURE_COST.saju.display).toBe(2)
    expect(FEATURE_COST.compatibility.display).toBe(2)
    expect(FEATURE_COST.wealth.display).toBe(5)
    expect(FEATURE_COST.imageGeneration.display).toBe(5)
  })

  it('무료 기능은 0 이며 free 플래그가 참이다', () => {
    for (const key of ['newYear', 'today'] as const) {
      expect(FEATURE_COST[key].display).toBe(0)
      expect(FEATURE_COST[key].free).toBe(true)
    }
  })

  it('유료 기능은 free 플래그가 거짓이다', () => {
    for (const key of ['face', 'palm', 'fengshui', 'saju', 'compatibility', 'wealth', 'imageGeneration'] as const) {
      expect(FEATURE_COST[key].free).toBe(false)
    }
  })

  it('MISSION 카테고리 → 비용 매핑이 단일 소스를 따른다', () => {
    expect(featureCostByCategory('FACE')).toBe(2)
    expect(featureCostByCategory('HAND')).toBe(2)
    expect(featureCostByCategory('FENGSHUI')).toBe(2)
    expect(featureCostByCategory('WEALTH')).toBe(5)
    expect(featureCostByCategory('SAJU')).toBe(2)
    expect(featureCostByCategory('COMPATIBILITY')).toBe(2)
    expect(featureCostByCategory('NEW_YEAR')).toBe(0)
    expect(featureCostByCategory('TODAY')).toBe(0)
    expect(isFreeFeatureCategory('SAJU')).toBe(false)
    expect(isFreeFeatureCategory('FACE')).toBe(false)
    expect(isFreeFeatureCategory('TODAY')).toBe(true)
  })

  it('표시 문자열은 "무료" 또는 "복채 N만냥" 형태로 통일된다 ("N복채" 금지)', () => {
    expect(formatFeatureCost('saju')).toBe('복채 2만냥')
    expect(formatFeatureCost('today')).toBe('무료')
    expect(formatFeatureCost('face')).toBe('복채 2만냥')
    expect(formatFeatureCost('wealth')).toBe('복채 5만냥')
    expect(formatFeatureCost('face')).not.toMatch(/\d복채/)
  })
})
