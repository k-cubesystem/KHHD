import {
  SHOP_KEYWORD_MAX,
  SHOP_LINKS_PER_REQUEST,
  SHOP_LOOKUP_MAX,
  coupangSearchUrl,
  normalizeShopKeywords,
} from '@/lib/domain/circle/shop-links'
import { allNeedKeywords } from '@/lib/domain/circle/element-lore'

describe('쿠팡 검색 URL', () => {
  it('키워드를 인코딩해 검색 주소를 만든다', () => {
    expect(coupangSearchUrl('무드등')).toBe(
      'https://www.coupang.com/np/search?q=%EB%AC%B4%EB%93%9C%EB%93%B1&channel=user'
    )
    expect(coupangSearchUrl('붉은 계열 머그')).toContain('q=%EB%B6%89%EC%9D%80%20')
  })
})

describe('키워드 정리', () => {
  it('공백 정리·중복 제거·빈 값 제거·길이 상한', () => {
    expect(normalizeShopKeywords(['  무드등 ', '무드등', '', '홍차'])).toEqual(['무드등', '홍차'])
    expect(normalizeShopKeywords(['가'.repeat(SHOP_KEYWORD_MAX + 10)])[0]).toHaveLength(SHOP_KEYWORD_MAX)
  })

  it('개수 상한은 기본이 조회 상한(SHOP_LOOKUP_MAX)이고, 새로 만드는 상한(SHOP_LINKS_PER_REQUEST)보다 넉넉하다', () => {
    const many = Array.from({ length: SHOP_LOOKUP_MAX + 3 }, (_, i) => `k${i}`)
    expect(normalizeShopKeywords(many)).toHaveLength(SHOP_LOOKUP_MAX)
    expect(normalizeShopKeywords(many, 3)).toHaveLength(3)
    expect(SHOP_LINKS_PER_REQUEST).toBeLessThan(SHOP_LOOKUP_MAX)
  })

  it('🔴 가족 지도 「필요한 것」의 품목 전부(다섯 기운 × 네 가지)가 조회에서 잘리지 않는다 — 6개로 잘려 木·火 일부만 링크가 붙었던 회귀', () => {
    const all = allNeedKeywords()
    expect(all.length).toBeGreaterThan(SHOP_LINKS_PER_REQUEST)
    expect(normalizeShopKeywords(all)).toEqual([...new Set(all)])
  })
})
