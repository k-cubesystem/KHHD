/**
 * 실물 항목 → 쿠팡 검색 URL (파트너스 딥링크의 원본). 순수 규칙만 — API 호출·캐시는 액션이 한다.
 *
 * 🔴 링크는 «품목명으로 검색한 결과»다. 특정 상품을 고르지 않는다(우리가 파는 것이 아니라 문을 여는 것).
 */

export const SHOP_KEYWORD_MAX = 40
export const SHOP_LINK_TTL_DAYS = 30
/**
 * 한 화면이 캐시에서 한 번에 찾아 줄 수 있는 품목 수 — 가족 지도의 「필요한 것」이 다섯 기운 × 네 가지(20개)를 한 번에 묻는다.
 * 🔴 2026-09-14: 조회까지 6개로 잘라 지도에서 木 넷·火 둘만 링크가 붙었다. 조회 상한과 생성 상한은 따로 둔다.
 */
export const SHOP_LOOKUP_MAX = 40
/** 한 요청이 딥링크 API 로 **새로** 만들 수 있는 링크 수 — 화면마다 API 를 두들기지 않게. 나머지는 다음 방문에 만든다. */
export const SHOP_LINKS_PER_REQUEST = 6

/** 검색 딥링크의 subId — 어느 화면에서 나간 방문인지 리포트에서 갈라 보는 값. */
export const SHOP_SUBID = 'rx_real'

export function coupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}&channel=user`
}

/** 키워드 정리 — 공백 정리, 길이 상한, 빈 값 제거, 중복 제거, 개수 상한(기본 조회 상한). 순서는 입력 순서. */
export function normalizeShopKeywords(raw: readonly string[], limit: number = SHOP_LOOKUP_MAX): string[] {
  const out: string[] = []
  for (const k of raw) {
    const key = k.replace(/\s+/g, ' ').trim().slice(0, SHOP_KEYWORD_MAX)
    if (key && !out.includes(key)) out.push(key)
    if (out.length >= limit) break
  }
  return out
}
