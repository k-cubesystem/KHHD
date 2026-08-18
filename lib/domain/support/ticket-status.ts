/**
 * 문의 상태 **단일 출처** — 어드민 CS 화면과 고객 화면이 같은 말을 쓰게 한다.
 *
 * 🔴 이 프로젝트는 라벨을 화면에 박았다가 두 번 갈라졌다(기록 카테고리·감사 로그).
 *    상태 이름·필터·색은 여기서만 만든다.
 *
 * ## 상태가 셋인 이유
 * 「미해결」은 상태가 아니라 **묶음**이다 — 답변 전(OPEN)과 답변했지만 안 끝난 것(ANSWERED)을
 * 합친 것. 운영자가 «아직 내 손이 필요한 것»을 한눈에 보려면 이 묶음이 필요하다.
 */

export const TICKET_STATUSES = ['OPEN', 'ANSWERED', 'RESOLVED'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_CATEGORIES = ['PAYMENT', 'ANALYSIS', 'ACCOUNT', 'BUG', 'ETC'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  PAYMENT: '결제·환불',
  ANALYSIS: '풀이 내용',
  ACCOUNT: '계정',
  BUG: '오류 신고',
  ETC: '기타',
}

interface StatusMeta {
  readonly label: string
  readonly cls: string
  /** 운영자 손이 아직 필요한가. */
  readonly needsAction: boolean
}

export const TICKET_STATUS_META: Record<TicketStatus, StatusMeta> = {
  OPEN: { label: '새 문의', cls: 'border-seal/30 bg-seal/[0.08] text-seal', needsAction: true },
  ANSWERED: { label: '답변함', cls: 'border-gold-500/25 bg-gold-500/[0.07] text-gold-500', needsAction: true },
  RESOLVED: { label: '해결', cls: 'border-white/10 bg-white/[0.04] text-ink-primary/50', needsAction: false },
}

/** 어드민 CS 화면의 탭. 「미해결」은 두 상태를 합친 묶음이다. */
export const TICKET_FILTERS = ['all', 'OPEN', 'ANSWERED', 'unresolved', 'RESOLVED'] as const
export type TicketFilter = (typeof TICKET_FILTERS)[number]

export const TICKET_FILTER_LABEL: Record<TicketFilter, string> = {
  all: '전체',
  OPEN: '새 문의',
  ANSWERED: '답변함',
  unresolved: '미해결',
  RESOLVED: '해결',
}

/** 필터가 포함하는 상태들. 화면은 이 결과로만 질의한다(조건을 화면에서 다시 짜지 않는다). */
export function statusesForFilter(filter: TicketFilter): readonly TicketStatus[] {
  switch (filter) {
    case 'all':
      return TICKET_STATUSES
    case 'unresolved':
      return ['OPEN', 'ANSWERED']
    default:
      return [filter]
  }
}

export function isTicketFilter(value: string): value is TicketFilter {
  return (TICKET_FILTERS as readonly string[]).includes(value)
}

export function describeTicketStatus(status: string): StatusMeta {
  return TICKET_STATUS_META[status as TicketStatus] ?? TICKET_STATUS_META.OPEN
}

export function describeTicketCategory(category: string): string {
  return TICKET_CATEGORY_LABEL[category as TicketCategory] ?? TICKET_CATEGORY_LABEL.ETC
}
