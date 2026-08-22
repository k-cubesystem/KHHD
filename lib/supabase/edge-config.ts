/**
 * Edge Functions 전환 설정
 *
 * true로 설정하면 서버 액션이 Edge Function을 호출
 * false면 기존 로직 유지 (fallback)
 *
 * 단계적으로 true로 전환:
 * 1. notification, business → 먼저 전환
 * 2. user, admin → 그 다음
 * 3. payment → 결제는 마지막
 * 4. ai-* → AI 함수들
 */
export const EDGE_ENABLED = {
  notification: process.env.EDGE_NOTIFICATION === 'true',
  business: process.env.EDGE_BUSINESS === 'true',
  user: process.env.EDGE_USER === 'true',
  admin: process.env.EDGE_ADMIN === 'true',
  // ('payment' 는 2026-08-21 영구 차단 — 엣지 사본은 배포된 적이 없고(라이브 함수 0개 확인),
  //  파라미터 계약이 서버와 어긋나(customAmount vs amount) 켜지는 순간 전 기능이 1만냥 오차감되며,
  //  addTalismans 자가발행 코드까지 실려 있었다. 함수 디렉토리도 함께 삭제.)
  payment: false,
  'ai-analysis': process.env.EDGE_AI_ANALYSIS === 'true',
  'ai-image': process.env.EDGE_AI_IMAGE === 'true',
  'ai-chat': process.env.EDGE_AI_CHAT === 'true',
  fortune: process.env.EDGE_FORTUNE === 'true',
  // ('webhook-toss' 는 2026-08-12 삭제 — 토스 웹훅 정본은 app/api/webhooks/toss/route.ts 하나뿐이다.
  //  엣지 사본은 배포된 적이 없고 인증(HMAC)·상태 기록이 실제 토스와 어긋나 있었다.)
  'cron-fortune': process.env.EDGE_CRON_FORTUNE === 'true',
} as const

export type EdgeFunctionName = keyof typeof EDGE_ENABLED

export function isEdgeEnabled(fn: EdgeFunctionName): boolean {
  return EDGE_ENABLED[fn] ?? false
}
