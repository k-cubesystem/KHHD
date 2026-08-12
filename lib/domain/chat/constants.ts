/**
 * 채팅 도메인 상수 (클라이언트·서버 공용).
 * ⚠️ 'use server' 파일은 async 함수만 export 할 수 있어 상수는 여기에 둔다.
 */

/** 지난 대화 목록 1페이지 크기 */
export const PAST_SESSIONS_PAGE_SIZE = 20

/**
 * 하루에 주어지는 무료 질문 수 — 회원·비회원 «동일»하다.
 *
 * 🔴 멤버십과 1일 이용권은 고민상담의 «입장»만 연다(app/protected/ai-shaman/page.tsx 게이트).
 *    전송 경로(shaman-chat.ts sendShamanMessage)는 등급을 보지 않고 이 한도만 본다 —
 *    마스터(admin) role 만 예외다. 그러므로 어떤 화면에서도 «상담 무제한»이라 적으면 안 된다.
 *    소진 후에는 복채 1만냥으로 질문권 20회를 산다.
 */
export const DAILY_FREE_QUESTIONS = 10
