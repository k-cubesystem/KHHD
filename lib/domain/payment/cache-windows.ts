/**
 * 「같은 풀이를 다시 요청해도 이용권을 쓰지 않는 기간」 — 서버 액션의 캐시 판정과 /pass-policy 안내가 같은 값을 본다.
 *
 * 🔴 'use server' 파일은 async 함수만 내보낼 수 있어 이 숫자를 액션 옆에 둘 수 없다.
 * 🔴 여기 없는 풀이의 기간은 이미 제 도메인에 정본이 있다 — 다시 정의하지 않는다.
 *    인기테마운세 `THEME_CACHE_DAYS`(lib/domain/theme-fortune/themes.ts) ·
 *    기운 처방전·그룹 AI 풀이·함께 보기 `NARRATIVE_CACHE_DAYS`(lib/domain/circle/narrative.ts).
 *    관상·손금·풍수·재물운 심층·종합사주풀이는 캐시가 없다(실행할 때마다 새 풀이).
 */

/** 사주 풀이 — 같은 사람의 풀이를 이 시간 안에 다시 요청하면 저장본을 돌려준다(app/actions/ai/cheonjiin.ts). */
export const SAJU_CACHE_HOURS = 24

/** 궁합 — 같은 두 사람·같은 관계의 풀이를 이 기간 안에 다시 요청하면 저장본을 돌려준다(app/actions/ai/compatibility.ts). */
export const COMPATIBILITY_CACHE_DAYS = 7
