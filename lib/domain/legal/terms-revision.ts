/**
 * 현행 이용약관 시행일의 단일 출처.
 *
 * 2026-09-22 CEO 결정: 실사용자가 없어 개정 공지·경과 조항 없이 단일 현행본으로 게시한다.
 * 가입·구매 동의는 약관 버전을 저장하지 않으므로(클라이언트 체크 박스만) 날짜를 바꿔도 깨질 기록이 없다.
 */

/** 현행 약관 시행일(KST). */
export const TERMS_EFFECTIVE_DATE = '2026-09-22'

/** '2026-09-22' → '2026년 9월 22일'. */
export function formatTermsDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}
