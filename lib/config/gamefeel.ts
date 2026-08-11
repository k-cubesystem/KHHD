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
 * 앰비언트를 «제 공기»로 사는 테마 (PRD-shrine-living-background-v1 §5 · P2 확산 완료 2026-08-11).
 *
 * 시범 3테마(반가·달집·설빛)로 세 구현 계열(CSS 기준선·밤 원판 프로파일·캔버스 밀도)을 검증했고,
 * CEO GO 로 **16테마 전부**에 폈다. 여기 있는 테마는 자기 파티클을 들고 있으므로 전 테마 공통
 * 빛가루(MOTE_SPOTS)와 앰비언트 영상을 함께 내린다 — 한 자리에 두 연출을 겹치지 않는다.
 *
 * 원복 레버 3단: ①전체 = AMBIENT_V1=false ②일부 = 이 배열에서 코드를 뺀다(그 방만 현행 화면)
 * ③스펙 자체 = theme-ambient.THEME_AMBIENT 에서 항목 제거.
 * (배열이 곧 모집단은 아니다 — 스펙 없는 코드를 적어도 ambientForTheme 가 null 로 막는다.)
 */
export const AMBIENT_THEMES: readonly string[] = [
  'choga',
  'banga',
  'yonggung',
  'dokkaebi',
  'seolbit',
  'daljip',
  'hongsal',
  'byeolbat',
  'daejanggan',
  'yeondeung',
  'dangsan',
  'jangdok',
  'jonggak',
  'naru',
  'saemgut',
  'seonang',
]

/**
 * 「달과 절기」 P3 게이트 (ARCH-shrine-living-background-v1 §4 L2).
 *
 * false 로 두면 달빛 겹·절기 가산 겹·절기 현판이 전부 미렌더되고 만세력 엔진 지연 청크도
 * 아예 받지 않는다 — P2(테마의 숨결)까지의 화면으로 정확히 돌아간다.
 */
export const AMBIENT_OMENS_V1 = true

/**
 * 기도(기원 +1)가 성립한 순간을 신당 룸에 알리는 window 이벤트 이름.
 * 소원 폼(ShrineWishForm)과 룸(ShrineRoomClient)은 페이지에서 형제라 props 로 이을 수 없다 —
 * 이름을 여기 한 곳에 두어 양쪽이 같은 문자열을 쓰도록 강제한다.
 */
export const SHRINE_PRAYED_EVENT = 'shrine:prayed'
