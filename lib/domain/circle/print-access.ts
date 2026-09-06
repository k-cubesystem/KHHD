/** 「우리 팀 기운 한 장」 인쇄 — BUSINESS(와 마스터)만. 티어 문자열은 ActiveMembership.tier. */
export const TEAM_SHEET_TIERS: readonly string[] = ['BUSINESS', 'MASTER']

export function canPrintTeamSheet(tier: string | null | undefined): boolean {
  if (!tier) return false
  return TEAM_SHEET_TIERS.includes(tier.toUpperCase())
}
