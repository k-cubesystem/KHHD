export const PRODUCTION_SITE_URL = 'https://k-haehwadang.com'

/** origin 문자열 정규화 — 모든 공백·개행 제거 + 후행 슬래시 제거, 빈 값이면 fallback. */
export function normalizeSiteUrl(raw: string | null | undefined, fallback: string = PRODUCTION_SITE_URL): string {
  const cleaned = (raw ?? '').replace(/\s+/g, '').replace(/\/+$/, '')
  return cleaned.length > 0 ? cleaned : fallback
}

/**
 * 사이트 기준 origin 단일 출처.
 * Vercel 환경변수 값 끝에 개행이 붙어 sitemap/robots URL이 통째로 깨진 사고(2026-08-15)의 방어선 —
 * `process.env.NEXT_PUBLIC_SITE_URL`을 직접 읽지 말고 반드시 이 함수를 거친다.
 */
export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
}
