/**
 * 신당 게임필 v1 「살아 숨쉬는 신당」 — 연출 게이트
 *
 * ARCH-shrine-gamefeel-v1 §8 원복 원칙: 안1은 코드만이라 플래그 오프로 즉시 원복한다.
 * false 로 두면 입장·기도 시네마틱, 주스(셰이크·햅틱), idle 전역 키프레임이 전부 꺼지고
 * 기도 훅(onDim→onIgnite→onPeak→onEnd)만 즉시 순서대로 호출되어 배선 동작은 그대로 남는다.
 */
export const GAMEFEEL_V1 = true

/**
 * 신당 게임필 2차 「두루마리 신당」 — 가로 카메라 게이트 (ARCH-shrine-gamefeel-v1 §8).
 *
 * false 로 두면 카메라·시차·미니맵·구역 렌더가 전부 사라지고 **기존 단일 무대 렌더로** 돌아간다.
 * true 라도 두루마리가 열리는 조건은 `world.width > 100`(= 테마 stage jsonb 에 zones 가 있을 때)뿐이라,
 * zones 없는 테마·레거시 테마는 이 값과 무관하게 지금까지의 화면 그대로다.
 */
export const SCROLL_SHRINE_V1 = true

/**
 * 기도(기원 +1)가 성립한 순간을 신당 룸에 알리는 window 이벤트 이름.
 * 소원 폼(ShrineWishForm)과 룸(ShrineRoomClient)은 페이지에서 형제라 props 로 이을 수 없다 —
 * 이름을 여기 한 곳에 두어 양쪽이 같은 문자열을 쓰도록 강제한다.
 */
export const SHRINE_PRAYED_EVENT = 'shrine:prayed'
