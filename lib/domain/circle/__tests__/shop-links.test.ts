import {
  SHOP_KEYWORD_MAX,
  SHOP_LINKS_PER_REQUEST,
  coupangSearchUrl,
  normalizeShopKeywords,
} from '@/lib/domain/circle/shop-links'

describe('쿠팡 검색 URL', () => {
  it('키워드를 인코딩해 검색 주소를 만든다', () => {
    expect(coupangSearchUrl('무드등')).toBe(
      'https://www.coupang.com/np/search?q=%EB%AC%B4%EB%93%9C%EB%93%B1&channel=user'
    )
    expect(coupangSearchUrl('붉은 계열 머그')).toContain('q=%EB%B6%89%EC%9D%80%20')
  })
})

describe('키워드 정리', () => {
  it('공백 정리·중복 제거·빈 값 제거·상한', () => {
    expect(normalizeShopKeywords(['  무드등 ', '무드등', '', '홍차'])).toEqual(['무드등', '홍차'])
    expect(normalizeShopKeywords(['가'.repeat(SHOP_KEYWORD_MAX + 10)])[0]).toHaveLength(SHOP_KEYWORD_MAX)
    const many = Array.from({ length: SHOP_LINKS_PER_REQUEST + 3 }, (_, i) => `k${i}`)
    expect(normalizeShopKeywords(many)).toHaveLength(SHOP_LINKS_PER_REQUEST)
  })
})
