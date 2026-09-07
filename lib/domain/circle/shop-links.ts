/**
 * 실물 항목 → 쿠팡 검색 URL (파트너스 딥링크의 원본). 순수 규칙만 — API 호출·캐시는 액션이 한다.
 *
 * 🔴 링크는 «품목명으로 검색한 결과»다. 특정 상품을 고르지 않는다(우리가 파는 것이 아니라 문을 여는 것).
 */

export const SHOP_KEYWORD_MAX = 40
export const SHOP_LINK_TTL_DAYS = 30
/** 한 화면이 한 번에 만들 수 있는 링크 수 — 딥링크 API 를 화면마다 두들기지 않게. */
export const SHOP_LINKS_PER_REQUEST = 6

/** 검색 딥링크의 subId — 어느 화면에서 나간 방문인지 리포트에서 갈라 보는 값. */
export const SHOP_SUBID = 'rx_real'

export function coupangSearchUrl(keyword: string): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}&channel=user`
}

/** 키워드 정리 — 공백 정리, 상한, 빈 값 제거, 중복 제거. 순서는 입력 순서. */
export function normalizeShopKeywords(raw: readonly string[]): string[] {
  const out: string[] = []
  for (const k of raw) {
    const key = k.replace(/\s+/g, ' ').trim().slice(0, SHOP_KEYWORD_MAX)
    if (key && !out.includes(key)) out.push(key)
    if (out.length >= SHOP_LINKS_PER_REQUEST) break
  }
  return out
}
