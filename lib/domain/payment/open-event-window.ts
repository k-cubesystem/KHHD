/**
 * 오픈 이벤트(일일 복채) 진행 구간 — 서버·클라이언트 공용 순수 판정.
 *
 * 🔴 되살리려면 아래 OPEN_EVENT_END_KST «한 줄»만 미래 시각으로 바꾼다.
 *    수령 액션(app/actions/payment/open-event.ts)도, 상점 카드(components/events/open-event-claim.tsx)도
 *    전부 이 상수만 본다 — 다른 곳을 함께 고칠 자리는 없다.
 *
 * 🔴 종료는 «앞으로 안 준다»는 뜻일 뿐이다. 이미 지급된 wallet_transactions(OPEN_EVENT_DAILY) 기록과
 *    그 복채는 회계·분쟁 대비로 그대로 둔다 — 회수·삭제 금지.
 *
 * 서버 액션 파일('use server')은 async 함수 외의 export 가 불가능하므로 상수·동기 판정은 여기에 둔다.
 */

/**
 * 오픈 이벤트 종료 시각(KST). 이 시각«부터» 수령이 닫힌다.
 * 2026-08-12 폐기(CEO 지시) — 마지막 실수령은 2026-07-25 였다.
 */
export const OPEN_EVENT_END_KST = '2026-08-12T00:00:00+09:00'

/** 이벤트가 아직 열려 있는가 — 열림/닫힘 판정은 여기 한 곳뿐이다. */
export function isOpenEventActive(now: Date = new Date()): boolean {
  return now.getTime() < new Date(OPEN_EVENT_END_KST).getTime()
}
