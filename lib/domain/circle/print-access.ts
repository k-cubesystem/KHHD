import type { CircleKind } from './circle'

/** 「우리 팀 기운 한 장」 인쇄 — BUSINESS(와 마스터)만. 티어 문자열은 ActiveMembership.tier. */
export const TEAM_SHEET_TIERS: readonly string[] = ['BUSINESS', 'MASTER']

export function canPrintTeamSheet(tier: string | null | undefined): boolean {
  if (!tier) return false
  return TEAM_SHEET_TIERS.includes(tier.toUpperCase())
}

export type TeamSheetDoor = 'print' | 'upsell' | 'hidden'

/**
 * 지도 아래 「기운 한 장」 문 — 인쇄 링크 · 업셀 한 줄 · 숨김.
 * 🔴 가족 지도에는 없다(CEO 2026-09-14 「우리 가족 기운 한 장 인쇄 기능은 없애 줘」). 자리마다 놓는 표는 팀 그룹의 BUSINESS 기능으로만 남는다.
 */
export function teamSheetDoor(kind: CircleKind, tier: string | null | undefined): TeamSheetDoor {
  if (kind === 'family') return 'hidden'
  return canPrintTeamSheet(tier) ? 'print' : 'upsell'
}
