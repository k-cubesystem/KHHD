/**
 * 쿠팡 파트너스 오픈API — 순수 로직(서명 메시지·시간 포맷·subId 정제).
 * 네트워크 호출은 lib/services/coupang-partners.ts 가 진다.
 *
 * 인증: CEA HmacSHA256 — Authorization: CEA algorithm=HmacSHA256, access-key=…,
 * signed-date=yyMMdd'T'HHmmss'Z'(UTC·연도 2자리), signature=hex(HMAC(signed-date+method+path+query)).
 * (developers.coupangcorp.com 「Creating HMAC Signature」 스펙)
 */

export const COUPANG_API_HOST = 'https://api-gateway.coupang.com'
export const COUPANG_DEEPLINK_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink'

/** 방문 목적지 — 골드박스(오늘의 특가). 특정 상품에 묶이지 않는 일반 방문 랜딩. */
export const COUPANG_VISIT_TARGET = 'https://www.coupang.com/np/goldbox'

/** signed-date: yyMMdd'T'HHmmss'Z' (UTC, 연도 2자리 — 쿠팡 스펙 그대로) */
export function coupangSignedDate(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    p(now.getUTCFullYear() % 100) +
    p(now.getUTCMonth() + 1) +
    p(now.getUTCDate()) +
    'T' +
    p(now.getUTCHours()) +
    p(now.getUTCMinutes()) +
    p(now.getUTCSeconds()) +
    'Z'
  )
}

/** 서명 대상 메시지 = signed-date + method + path + query('?' 제외 문자열, 없으면 빈 값) */
export function coupangSignMessage(signedDate: string, method: string, path: string, query = ''): string {
  return signedDate + method + path + query
}

/** Authorization 헤더 값 조립 */
export function coupangAuthorization(accessKey: string, signedDate: string, signatureHex: string): string {
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signatureHex}`
}

/** subId 정제 — 영숫자만, 40자 상한(파트너스 subId 제약 보수 적용) */
export function sanitizeSubId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)
}
