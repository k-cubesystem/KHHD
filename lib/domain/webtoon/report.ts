/**
 * 댓글 신고 — 공개 표에서 사람을 지키는 장치 (CEO 2026-08-01).
 *
 * ⚠️ 신고는 **가리는 일**이지 지우는 일이 아니다. 3건이 쌓이면 자동으로 가려지되(hidden_at)
 *    행은 남아 운영자가 되돌릴 수 있다 — 지워 버리면 오신고를 회복할 방법이 없다.
 * ⚠️ 신고자는 **본인 신고만** 본다. 남이 무엇을 신고했는지 보이면 신고가 공격 수단이 된다.
 * ⚠️ 한 사람이 같은 댓글을 여러 번 신고해 수를 부풀리지 못한다(스키마 유니크).
 */

export type ReportReason = 'abuse' | 'spam' | 'privacy' | 'sexual' | 'other'

export const REPORT_REASONS: readonly ReportReason[] = Object.freeze([
  'abuse',
  'spam',
  'privacy',
  'sexual',
  'other',
] as const)

export interface ReportReasonInfo {
  readonly label: string
  /** 무엇을 뜻하는지 한 줄 — 고르는 사람이 헷갈리지 않게 */
  readonly gloss: string
}

export const REPORT_REASON_INFO: Readonly<Record<ReportReason, ReportReasonInfo>> = Object.freeze({
  abuse: Object.freeze({ label: '욕설·비방', gloss: '사람을 깎아내리거나 모욕하는 말' }),
  spam: Object.freeze({ label: '광고·도배', gloss: '홍보이거나 같은 말을 반복하는 글' }),
  privacy: Object.freeze({ label: '개인정보 노출', gloss: '이름·연락처·주소 등이 적혀 있음' }),
  sexual: Object.freeze({ label: '선정성', gloss: '성적으로 불쾌한 내용' }),
  other: Object.freeze({ label: '그 밖에', gloss: '위에 없는 이유 — 한 줄 적어 주세요' }),
})

export function isReportReason(v: unknown): v is ReportReason {
  return typeof v === 'string' && (REPORT_REASONS as readonly string[]).includes(v)
}

/** 신고 메모 길이 — 스키마 CHECK 와 같은 값. */
export const REPORT_NOTE_MAX = 200

/** 자동 가림 임계 — 스키마 트리거와 **같은 값**이어야 한다(둘이 갈리면 화면 설명이 거짓이 된다). */
export const REPORT_HIDE_THRESHOLD = 3

export const REPORT_NOTICE = '신고는 익명으로 접수되며, 여러 건이 쌓이면 자동으로 가려집니다.'

export const REPORT_DONE_LINE = '신고해 주셔서 고맙습니다 — 살펴보겠습니다.'
