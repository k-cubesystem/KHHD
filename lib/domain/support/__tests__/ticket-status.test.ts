/**
 * 문의 상태 회귀선 (2026-08-19).
 *
 * 🔴 「미해결」은 상태가 아니라 **묶음**이다(답변 전 + 답변했지만 안 끝난 것).
 *    이 규칙이 화면마다 다시 짜이면 어드민 탭과 집계 숫자가 어긋난다 —
 *    이 프로젝트는 라벨·조건을 화면에 박았다가 두 번 갈라진 전례가 있다.
 */
import {
  TICKET_FILTERS,
  TICKET_FILTER_LABEL,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  describeTicketCategory,
  describeTicketStatus,
  isTicketFilter,
  statusesForFilter,
} from '@/lib/domain/support/ticket-status'

describe('🔴 미해결은 두 상태를 합친 묶음이다', () => {
  it('미해결 = 새 문의 + 답변함 (해결은 빠진다)', () => {
    expect([...statusesForFilter('unresolved')].sort()).toEqual(['ANSWERED', 'OPEN'])
    expect(statusesForFilter('unresolved')).not.toContain('RESOLVED')
  })

  it('전체는 모든 상태를 포함한다', () => {
    expect([...statusesForFilter('all')].sort()).toEqual([...TICKET_STATUSES].sort())
  })

  it('단일 상태 필터는 그 상태만 고른다', () => {
    expect(statusesForFilter('OPEN')).toEqual(['OPEN'])
    expect(statusesForFilter('RESOLVED')).toEqual(['RESOLVED'])
  })

  it('모든 필터가 최소 한 상태를 고른다 (빈 목록이 나오는 필터 금지)', () => {
    for (const f of TICKET_FILTERS) {
      expect(`${f}: ${statusesForFilter(f).length > 0}`).toBe(`${f}: true`)
    }
  })
})

describe('🔴 손이 필요한 것과 끝난 것을 가른다', () => {
  it('새 문의·답변함은 운영자 손이 필요하고, 해결은 아니다', () => {
    expect(TICKET_STATUS_META.OPEN.needsAction).toBe(true)
    expect(TICKET_STATUS_META.ANSWERED.needsAction).toBe(true)
    expect(TICKET_STATUS_META.RESOLVED.needsAction).toBe(false)
  })

  it('모든 상태·필터에 우리말 라벨이 있다 (영문 코드 노출 금지)', () => {
    for (const s of TICKET_STATUSES) {
      expect(`${s}: ${TICKET_STATUS_META[s].label !== s}`).toBe(`${s}: true`)
    }
    for (const f of TICKET_FILTERS) {
      expect(`${f}: ${TICKET_FILTER_LABEL[f] !== f}`).toBe(`${f}: true`)
    }
  })
})

describe('모르는 값이 와도 화면이 깨지지 않는다', () => {
  it('모르는 상태는 새 문의로 본다', () => {
    expect(describeTicketStatus('WHATEVER').label).toBe(TICKET_STATUS_META.OPEN.label)
  })

  it('모르는 갈래는 기타로 본다', () => {
    expect(describeTicketCategory('WHATEVER')).toBe('기타')
  })

  it('필터 판별이 임의 문자열을 막는다 (질의 조작 차단)', () => {
    expect(isTicketFilter('unresolved')).toBe(true)
    expect(isTicketFilter("'; drop table--")).toBe(false)
  })
})
