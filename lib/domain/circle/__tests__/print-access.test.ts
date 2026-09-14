import { canPrintTeamSheet, teamSheetDoor } from '@/lib/domain/circle/print-access'

describe('기운 한 장 인쇄 — 누가, 어느 지도에서', () => {
  it('BUSINESS·마스터만 인쇄할 수 있다(대소문자 무관)', () => {
    expect(canPrintTeamSheet('BUSINESS')).toBe(true)
    expect(canPrintTeamSheet('master')).toBe(true)
    expect(canPrintTeamSheet('FAMILY')).toBe(false)
    expect(canPrintTeamSheet(null)).toBe(false)
  })

  it('🔴 가족 지도에는 인쇄 문도 업셀도 없다 — CEO 2026-09-14 「우리 가족 기운 한 장 인쇄 기능은 없애 줘」', () => {
    for (const tier of ['BUSINESS', 'MASTER', 'FAMILY', 'SINGLE', null]) {
      expect(teamSheetDoor('family', tier)).toBe('hidden')
    }
  })

  it('팀 그룹 지도는 그대로 — BUSINESS 는 인쇄 링크, 그 밖의 멤버십은 업셀 한 줄', () => {
    for (const kind of ['work', 'friends', 'custom'] as const) {
      expect(teamSheetDoor(kind, 'BUSINESS')).toBe('print')
      expect(teamSheetDoor(kind, 'FAMILY')).toBe('upsell')
      expect(teamSheetDoor(kind, undefined)).toBe('upsell')
    }
  })
})
