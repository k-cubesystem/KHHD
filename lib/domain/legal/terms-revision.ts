/**
 * 현행 이용약관 시행일의 단일 출처.
 *
 * 단일 현행본 — 개정 안내·경과 조항 없이 이 날짜 하나로 게시한다(2026-09-22).
 * 가입·구매 동의는 약관 버전을 저장하지 않으므로(클라이언트 체크 박스만) 날짜를 바꿔도 깨질 기록이 없다.
 * 🔴 다음 개정 때는 날짜만 바꾸지 말 것 — 제3조 제3항 절차를 따른다(적용일 7일 전 공지, 회원에게 불리하면 30일 전,
 *    현행 약관 병기, 초기 화면 공지). 그때는 membership-intro.test.ts 의 «단일 현행본» 가드도 함께 걷는다.
 */

/** 현행 약관 시행일(KST). */
export const TERMS_EFFECTIVE_DATE = '2026-09-22'

/** '2026-09-22' → '2026년 9월 22일'. */
export function formatTermsDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}
