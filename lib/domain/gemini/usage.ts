/**
 * Gemini 응답의 사용량 메타 읽기 (순수 함수 — 서버 의존 없음).
 *
 * 🔴 **생각(thinking) 토큰은 출력 단가로 과금된다.** 공식 문서:
 *    "Response pricing is the sum of output tokens and thinking tokens"
 *    (https://ai.google.dev/gemini-api/docs/pricing · 확인일 2026-09-23).
 *
 * 그런데 `usageMetadata.candidatesTokenCount` 에는 생각이 **들어 있지 않다**. 그 값만 출력으로 세면
 * 원가가 통째로 과소계상된다 — 2026-09-23 실측으로 유료 테마 풀이 한 건이 생각 2,851 + 본문 1,781
 * (생각이 본문의 1.6배), 대화 요약은 생각 386 + 본문 10 이었다.
 *
 * SDK 0.24.1 의 `UsageMetadata` 타입에는 `thoughtsTokenCount` 가 없지만 응답에는 온다.
 * 그래서 타입이 아니라 값으로 읽는다(`unknown` + 타입 가드).
 */
export function thoughtTokensOf(usage: unknown): number {
  if (!usage || typeof usage !== 'object') return 0
  const value = (usage as { thoughtsTokenCount?: unknown }).thoughtsTokenCount
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}
