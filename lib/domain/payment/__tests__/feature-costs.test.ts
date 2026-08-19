import {
  FEATURE_COST,
  featureCostByCategory,
  isFreeFeatureCategory,
  formatFeatureCost,
  deductKeyLabel,
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
  /**
   * 회귀선: 복채 사용 내역의 이름.
   *
   * 🔴 라이브에서 USE 트랜잭션 11건 중 5건이 `SAJU (2만냥 복채 사용)` 처럼 **내부 키가 그대로**
   *    찍혀 있었다. 이름을 `feature_costs` 표에서 읽었는데 그 표가 0행이었기 때문이다.
   *    이름도 값과 같은 자리(코드)에서 온다.
   */
  it('차감 키는 사람이 읽는 이름으로 바뀐다 — 내부 키가 내역에 새지 않는다', () => {
    expect(deductKeyLabel('SAJU')).toBe('사주 풀이')
    expect(deductKeyLabel('FACE')).toBe('관상 풀이')
    expect(deductKeyLabel('HAND')).toBe('손금 풀이')
    expect(deductKeyLabel('FENGSHUI')).toBe('풍수 풀이')
    expect(deductKeyLabel('COMPATIBILITY')).toBe('궁합 풀이')
    expect(deductKeyLabel('SAMHAP')).toBe('종합사주풀이')
    expect(deductKeyLabel('wealth_analysis')).toBe('재물운 심층')
  })

  it('동적 키(테마·이용권)도 접두사로 이름이 붙는다', () => {
    expect(deductKeyLabel('theme_love_2026')).toBe('인기테마운세')
    expect(deductKeyLabel('VOUCHER_1DAY')).toBe('이용권')
  })

  it('미등록 키는 원문을 돌려준다 — 내역이 비는 것보다 낫다', () => {
    expect(deductKeyLabel('UNKNOWN_FEATURE')).toBe('UNKNOWN_FEATURE')
  })
})
