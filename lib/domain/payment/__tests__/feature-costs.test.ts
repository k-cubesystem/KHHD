import {
  FEATURE_COST,
  featureCostByCategory,
  isFreeFeatureCategory,
  formatFeatureCost,
  deductKeyLabel,
} from '@/lib/domain/payment/feature-costs'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

/**
 * 표시 = 실사용 단언 (R-P0-1 · 2026-09-18 이용권 전환).
 *
 * 값은 **이용권 장 수**다. 서버(lib/services/feature-charge.ts)가 costKey 로 이 표를 다시 읽어 쓰므로
 * 화면의 «이용권 N장»과 실제로 쓰는 장 수는 이 표 한 곳에서 나온다.
 *  - 풀이 1회 = 1장 (사주·궁합·관상·손금·풍수·테마·처방전·오방기 추가·속풀이 10문)
 *  - 긴 풀이·여러 사람 = 2장 (재물 심층·종합사주풀이·함께 보기)
 *  - 신년·오늘·이미지 생성 = 무료(과금 코드 없음)
 * 위 값이 바뀌면(표시 drift) 이 테스트가 깨져 약관·상품 안내와의 불일치를 잡는다.
 */
describe('FEATURE_COST — 표시 = 실사용 단일 소스', () => {
  it('풀이 1회는 이용권 1장이다', () => {
    for (const key of [
      'saju',
      'compatibility',
      'face',
      'palm',
      'fengshui',
      'themeFortune',
      'circleNarrative',
      'obangkiDraw',
      'shamanQuestions',
    ] as const) {
      expect(`${key}=${FEATURE_COST[key].display}`).toBe(`${key}=1`)
    }
  })

  it('긴 풀이·여러 사람을 읽는 풀이는 2장이다', () => {
    expect(FEATURE_COST.wealth.display).toBe(2)
    expect(FEATURE_COST.samhap.display).toBe(2)
    expect(FEATURE_COST.togetherNarrative.display).toBe(2)
  })

  it('무료 기능은 0 이며 free 플래그가 참이다', () => {
    for (const key of ['newYear', 'today', 'imageGeneration'] as const) {
      expect(FEATURE_COST[key].display).toBe(0)
      expect(FEATURE_COST[key].free).toBe(true)
    }
  })

  it('유료 기능은 free 플래그가 거짓이고 장 수는 양의 정수다', () => {
    for (const [key, cost] of Object.entries(FEATURE_COST)) {
      if (cost.free) continue
      expect(`${key}: ${Number.isInteger(cost.display) && cost.display > 0}`).toBe(`${key}: true`)
    }
  })

  it('MISSION 카테고리 → 장 수 매핑이 단일 소스를 따른다', () => {
    expect(featureCostByCategory('FACE')).toBe(1)
    expect(featureCostByCategory('HAND')).toBe(1)
    expect(featureCostByCategory('FENGSHUI')).toBe(1)
    expect(featureCostByCategory('WEALTH')).toBe(2)
    expect(featureCostByCategory('SAJU')).toBe(1)
    expect(featureCostByCategory('COMPATIBILITY')).toBe(1)
    expect(featureCostByCategory('SAMHAP')).toBe(2)
    expect(featureCostByCategory('NEW_YEAR')).toBe(0)
    expect(featureCostByCategory('TODAY')).toBe(0)
    expect(featureCostByCategory('UNKNOWN')).toBe(0)
    expect(isFreeFeatureCategory('SAJU')).toBe(false)
    expect(isFreeFeatureCategory('FACE')).toBe(false)
    expect(isFreeFeatureCategory('TODAY')).toBe(true)
  })

  it('표시 문자열은 "무료" 또는 "이용권 N장" 형태로 통일된다', () => {
    expect(formatFeatureCost('saju')).toBe('이용권 1장')
    expect(formatFeatureCost('today')).toBe('무료')
    expect(formatFeatureCost('face')).toBe('이용권 1장')
    expect(formatFeatureCost('wealth')).toBe('이용권 2장')
  })

  it('🔴 표시 문자열에 잔액형 재화 어휘가 없다', () => {
    for (const key of Object.keys(FEATURE_COST) as Array<keyof typeof FEATURE_COST>) {
      expect(findBannedPassTerms(formatFeatureCost(key))).toEqual([])
    }
  })

  /**
   * 회귀선: 이용권 사용 내역의 이름.
   *
   * 🔴 복채 시절 라이브에서 USE 트랜잭션 11건 중 5건이 `SAJU (2만냥 복채 사용)` 처럼 **내부 키가 그대로**
   *    찍혀 있었다. 이름을 `feature_costs` 표에서 읽었는데 그 표가 0행이었기 때문이다.
   *    이름도 값과 같은 자리(코드)에서 온다.
   */
  it('사용 키는 사람이 읽는 이름으로 바뀐다 — 내부 키가 내역에 새지 않는다', () => {
    expect(deductKeyLabel('SAJU')).toBe('사주 풀이')
    expect(deductKeyLabel('FACE')).toBe('관상 풀이')
    expect(deductKeyLabel('HAND')).toBe('손금 풀이')
    expect(deductKeyLabel('FENGSHUI')).toBe('풍수 풀이')
    expect(deductKeyLabel('COMPATIBILITY')).toBe('궁합 풀이')
    expect(deductKeyLabel('SAMHAP')).toBe('종합사주풀이')
    expect(deductKeyLabel('wealth_analysis')).toBe('재물운 심층')
    expect(deductKeyLabel('together_narrative')).toBe('함께 보기')
    expect(deductKeyLabel('OBANGKI_DRAW')).toBe('오방기 점괘')
    expect(deductKeyLabel('SHAMAN_QUESTIONS')).toBe('속풀이 질문 10문')
  })

  it('동적 키(테마)도 접두사로 이름이 붙는다', () => {
    expect(deductKeyLabel('theme_love_2026')).toBe('인기테마운세')
  })

  it('미등록 키는 원문을 돌려준다 — 내역이 비는 것보다 낫다', () => {
    expect(deductKeyLabel('UNKNOWN_FEATURE')).toBe('UNKNOWN_FEATURE')
  })
})
