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
  payment: process.env.EDGE_PAYMENT === 'true',
  'ai-analysis': process.env.EDGE_AI_ANALYSIS === 'true',
  'ai-image': process.env.EDGE_AI_IMAGE === 'true',
  'ai-chat': process.env.EDGE_AI_CHAT === 'true',
  fortune: process.env.EDGE_FORTUNE === 'true',
  'webhook-toss': process.env.EDGE_WEBHOOK_TOSS === 'true',
  'cron-fortune': process.env.EDGE_CRON_FORTUNE === 'true',
} as const

export type EdgeFunctionName = keyof typeof EDGE_ENABLED

export function isEdgeEnabled(fn: EdgeFunctionName): boolean {
  return EDGE_ENABLED[fn] ?? false
}
