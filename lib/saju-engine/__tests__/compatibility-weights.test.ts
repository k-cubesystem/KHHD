import { CATEGORY_WEIGHTS } from '../compatibility-engine'

describe('궁합 엔진 카테고리 가중치', () => {
  it('모든 관계 타입 가중치는 8개이고 합이 1.00 (±0.001)', () => {
    for (const weights of Object.values(CATEGORY_WEIGHTS)) {
      expect(weights).toHaveLength(8)
      const sum = weights.reduce((a, b) => a + b, 0)
      expect(Math.abs(sum - 1)).toBeLessThan(0.001)
    }
  })

  it('siblings 가중치 타입이 신설됐다 (형제 십성 축 강조)', () => {
    expect(CATEGORY_WEIGHTS.siblings).toBeDefined()
    expect(CATEGORY_WEIGHTS.siblings).toHaveLength(8)
    const sum = CATEGORY_WEIGHTS.siblings.reduce((a, b) => a + b, 0)
    expect(Math.abs(sum - 1)).toBeLessThan(0.001)
    // 십성(인덱스 4) 가중치가 다른 축보다 가장 큼
    const sipseong = CATEGORY_WEIGHTS.siblings[4]
    expect(Math.max(...CATEGORY_WEIGHTS.siblings)).toBe(sipseong)
  })
})
