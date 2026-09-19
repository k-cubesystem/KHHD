/**
 * 이용약관 개정 — 공지일·시행일·개정 사유의 단일 출처.
 *
 * 약관 제3조 제3항: 개정 약관은 «적용일자 및 개정 사유를 명시하여 현행 약관과 함께 서비스 초기 화면에 그 적용일자
 * 7일 전부터 공지»한다(이용자에게 불리한 변경은 30일 전).
 *
 * 2026-09-19 개정(복채 → 이용권)은 기존 보유분을 전액 보전하므로 불리한 변경이 아니다 → 7일 공지.
 * 제품 전환은 공지일에 함께 나갔다(CEO 결정 B안): 시행일 전까지는 종전 약관을 보존 게시하고,
 * 새로 구매하는 회원에게는 구매 때 표시·동의한 조건을 적용한다(부칙 제3항).
 *
 * 🔴 다음 개정 때는 이 파일의 날짜·사유만 바꾸고, 종전 약관을 `app/terms/<시행일>/page.tsx` 로 보존한다.
 */

/** 공지를 시작한 날(KST). */
export const TERMS_NOTICE_DATE = '2026-09-19'
/** 개정 약관 시행일(KST) — 공지일 + 7일. */
export const TERMS_EFFECTIVE_DATE = '2026-09-26'
/** 종전 약관 시행일 — 보존 게시 경로(`/terms/<이 값>`)의 이름이기도 하다. */
export const PREVIOUS_TERMS_DATE = '2026-03-03'

/** 공지 띠를 내리는 날 — 시행 뒤 7일까지는 «바뀌었다»는 사실을 알린다. */
const NOTICE_GRACE_DAYS = 7

export const TERMS_REVISION_REASONS: readonly string[] = [
  '서비스 이용 단위를 이용권(풀이 1회 = 1장)으로 바꿉니다. 종전에 보유하시던 분은 이용권으로 전환해 전액 보전합니다.',
  '개별 이용권의 유효기간(결제일로부터 90일)과 양도·재판매 금지를 명시합니다.',
  '멤버십으로 제공되는 이용권은 해당 결제 주기 안에서만 쓸 수 있고 이월되지 않음을 명시합니다.',
  '환불 기준(미사용 이용권 환불 산식, 멤버십 즉시 해지 환불 산식)과 첫 구독 첫 달 요금 할인 조건을 명시합니다.',
]

/** '2026-09-26' → '2026년 9월 26일'. */
export function formatTermsDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

/** KST 자정 기준 그 날짜의 시작 시각(ms). */
function kstDayStartMs(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00+09:00`)
}

/** 초기 화면에 개정 공지를 띄울 기간인가 — 공지일부터 시행일 + 7일까지. */
export function isTermsNoticeActive(nowMs: number = Date.now()): boolean {
  const from = kstDayStartMs(TERMS_NOTICE_DATE)
  const until = kstDayStartMs(TERMS_EFFECTIVE_DATE) + (NOTICE_GRACE_DAYS + 1) * 86_400_000
  return nowMs >= from && nowMs < until
}

/** 개정 약관이 시행됐는가. */
export function isTermsInEffect(nowMs: number = Date.now()): boolean {
  return nowMs >= kstDayStartMs(TERMS_EFFECTIVE_DATE)
}

/** 공지 띠 한 줄. */
export function termsNoticeLine(nowMs: number = Date.now()): string {
  return isTermsInEffect(nowMs)
    ? `이용약관이 ${formatTermsDate(TERMS_EFFECTIVE_DATE)}부터 개정 시행되었습니다.`
    : `이용약관이 ${formatTermsDate(TERMS_EFFECTIVE_DATE)}부터 개정됩니다.`
}
