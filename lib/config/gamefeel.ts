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
 * 「살아있는 신당」 배경 생동 v1 — 앰비언트 게이트 (ARCH-shrine-living-background-v1 §8 원복 레버).
 *
 * false 로 두면 시간대 틴트·원경광·앰비언트 파티클이 전부 미렌더되어 **현행 화면 그대로** 돌아간다.
 * 배치·앵커·존·기존 idle 은 이 값과 무관하다(신설 층은 전부 비배치·pointer-events:none).
 */
export const AMBIENT_V1 = true

/**
 * 앰비언트 시범 테마 (PRD-shrine-living-background-v1 §5 검수 규율 · §8 결정 4).
 *
 * 앰비언트 영상 v1~v5 전량 반려 전례 때문에 **시범 검수 GO 전까지는 이 3테마만** 렌더한다.
 * 세 구현 계열(CSS 기준선·밤 원판 프로파일·캔버스 밀도)을 한 번에 검증하는 조합이고,
 * 확산은 이 배열에 테마 코드를 더하는 것으로 끝난다(스펙 16종은 이미 theme-ambient.ts 에 있다).
 */
export const AMBIENT_PILOT_THEMES: readonly string[] = ['banga', 'daljip', 'seolbit']

/**
 * 기도(기원 +1)가 성립한 순간을 신당 룸에 알리는 window 이벤트 이름.
 * 소원 폼(ShrineWishForm)과 룸(ShrineRoomClient)은 페이지에서 형제라 props 로 이을 수 없다 —
 * 이름을 여기 한 곳에 두어 양쪽이 같은 문자열을 쓰도록 강제한다.
 */
export const SHRINE_PRAYED_EVENT = 'shrine:prayed'
