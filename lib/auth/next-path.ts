/**
 * 로그인·회원가입 뒤 돌아갈 경로(`?next=`) 검증 — 단일 기준.
 *
 * 하는 일은 하나다: **오픈 리다이렉트 차단**. 같은 출처의 절대경로만 통과시키고,
 * 프로토콜 상대 URL(`//evil.com`)·백슬래시 섞인 경로·절대 URL 은 전부 기각한다.
 * 통과하지 못하면 null 을 돌려주고, 호출부는 원래 기본 경로로 간다.
 */

/** 백슬래시·제어문자가 섞이면 브라우저마다 다르게 읽는다 — 통째로 기각. */
function hasUnsafeChars(path: string): boolean {
  if (path.includes('\\')) return true
  for (let i = 0; i < path.length; i += 1) {
    const code = path.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null

  const path = value.trim()
  if (path.length === 0 || path.length > 512) return null
  if (!path.startsWith('/')) return null
  if (path.startsWith('//')) return null
  if (hasUnsafeChars(path)) return null

  return path
}
