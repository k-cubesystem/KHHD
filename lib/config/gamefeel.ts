/**
 * 신당 게임필 v1 「살아 숨쉬는 신당」 — 연출 게이트
 *
 * ARCH-shrine-gamefeel-v1 §8 원복 원칙: 안1은 코드만이라 플래그 오프로 즉시 원복한다.
 * false 로 두면 입장·기도 시네마틱, 주스(셰이크·햅틱), idle 전역 키프레임이 전부 꺼지고
 * 기도 훅(onDim→onIgnite→onPeak→onEnd)만 즉시 순서대로 호출되어 배선 동작은 그대로 남는다.
 */
export const GAMEFEEL_V1 = true

/**
 * 기도(기원 +1)가 성립한 순간을 신당 룸에 알리는 window 이벤트 이름.
 * 소원 폼(ShrineWishForm)과 룸(ShrineRoomClient)은 페이지에서 형제라 props 로 이을 수 없다 —
 * 이름을 여기 한 곳에 두어 양쪽이 같은 문자열을 쓰도록 강제한다.
 */
export const SHRINE_PRAYED_EVENT = 'shrine:prayed'
