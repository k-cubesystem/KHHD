/**
 * 신당 게임필 2차 「두루마리 신당」 — 렌더 기하 (ARCH-shrine-gamefeel-v1 §1 렌더 스택).
 *
 * world.ts 가 좌표계(파싱·카메라·스냅)를 정하고, 여기서는 그 좌표를 **CSS 값**으로 옮긴다.
 * 룸 컴포넌트를 배선만 남기기 위한 계산 계층이라 전 함수 순수·결정론이다
 * (Date.now()/Math.random()/DOM 접근 금지 — SSR 과 클라 결과가 반드시 같아야 한다).
 *
 * ⚠️ world.ts / stage.ts 는 1파 산출물이라 수정하지 않는다. 여기서는 import 만 한다.
 */

import type { StageSpec } from './stage'
import { WORLD_VIEWPORT_PCT, zoneAlignCamX, type WorldSpec, type WorldZone } from './world'

/** 구역 컨테이너의 CSS 박스 — world 컨테이너(폭 world.width%) 안의 좌·폭 백분율. */
export interface ZoneBox {
  left: string
  width: string
}

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/** 손으로 만든 WorldSpec 이나 비정상 jsonb 가 들어와도 0 나눗셈이 나지 않게 한다. */
function safeWidth(world: WorldSpec): number {
  const w = world?.width
  return Number.isFinite(w) && w >= WORLD_VIEWPORT_PCT ? w : WORLD_VIEWPORT_PCT
}

/**
 * 구역 컨테이너 박스. world 좌표(0~width)를 부모(world 컨테이너) 기준 %로 환산한다.
 * 단일 무대(폭 100)에서는 대청 하나가 left 0% · width 100% 라 기존 방과 픽셀 크기가 같다 —
 * 이 항등성이 「배치 % 좌표 무수정」의 근거다.
 */
export function zoneBox(world: WorldSpec, zone: WorldZone): ZoneBox {
  const width = safeWidth(world)
  const x0 = clamp(zone?.x0, 0, width)
  const x1 = clamp(zone?.x1, x0, width)
  return {
    left: `${round((x0 / width) * 100, 4)}%`,
    width: `${round(((x1 - x0) / width) * 100, 4)}%`,
  }
}

/**
 * 구역 안에서 **겉보기 크기를 지키는** 폭 환산 계수 — 안2.1 「큰 방 하나」의 단일 출처.
 *
 * 구조물 `w` 나 % 폭 장식은 전부 **구역 컨테이너 폭 대비 %** 라, 구역이 뷰포트보다 넓어지면
 * 그만큼 같이 커진다(대청 0~240 에서 제단 w 62 → 62%×2.4화면 = 1.49화면). 100/span 을 곱하면
 * 화면에서 차지하는 크기가 단일 무대 시절과 같아진다(62 → 25.83).
 *
 * 뷰포트 이하 구역(기존 마당 70·대청 100 등)은 **1** 이다 — 좁은 구역의 구조물을 키우면
 * 그건 보정이 아니라 새로운 회귀다. 즉 지금 라이브(3구역)에는 아무 영향이 없다.
 */
export function zoneWidthScale(zone: WorldZone): number {
  const x0 = Number.isFinite(zone?.x0) ? zone.x0 : 0
  const x1 = Number.isFinite(zone?.x1) ? zone.x1 : 0
  const span = x1 - x0
  return span > WORLD_VIEWPORT_PCT ? round(WORLD_VIEWPORT_PCT / span, 6) : 1
}

/**
 * 구역 → 무대 사양. 구역이 제 에셋을 안 들고 있으면 테마 단일 무대(base)를 물려받는다.
 *
 * 이 폴백이 「zones 만 추가하는 무해한 세대교체」를 가능하게 한다 — 기존 반가 stage 에
 * wallpaper/flooring/structures 를 그대로 둔 채 zones 만 얹어도 대청은 지금 화면 그대로다.
 * structures 는 빈 배열도 "정의 안 함"으로 본다(구조물 없는 마당을 표현할 길은 base 가 null 인 경우뿐).
 */
export function zoneStage(zone: WorldZone, base: StageSpec | null): StageSpec {
  const structures = zone?.structures ?? []
  return {
    wallpaperUrl: zone?.wallpaperUrl ?? base?.wallpaperUrl ?? null,
    flooringUrl: zone?.flooringUrl ?? base?.flooringUrl ?? null,
    structures: structures.length > 0 ? structures : (base?.structures ?? []),
    // 광원은 방 전체가 같은 빛을 받아야 하므로 구역이 아니라 테마 단위로 남긴다(§3-C4 조명 오버레이)
    light: base?.light ?? null,
  }
}

/**
 * 지금 카메라가 서 있는 구역 code — 정렬점이 가장 가까운 구역. 동률이면 먼저 나온 구역(결정론).
 * 미니맵의 현재 표시와 같은 규칙이며 GA4 `shrine_pan` 라벨로 나간다.
 */
export function zoneCodeAt(world: WorldSpec, camX: number): string {
  const zones = Array.isArray(world?.zones) ? world.zones : []
  if (zones.length === 0) return ''
  const x = Number.isFinite(camX) ? camX : 0
  let code = zones[0].code
  let best = Number.POSITIVE_INFINITY
  for (const z of zones) {
    const d = Math.abs(zoneAlignCamX(world, z) - x)
    if (d < best) {
      best = d
      code = z.code
    }
  }
  return code
}

/**
 * 시차층의 `translateX` 계수(%). 층은 world 와 같은 폭(width%)이라 translate 의 % 가
 * 뷰포트-%의 (width/100)배가 된다 — 그 배율을 미리 나눠 둔 값이다.
 *
 * 쓰임: `transform: translate3d(calc(var(--shrine-cam-x) * var(--shrine-par-far)), 0, 0)`.
 * 매 프레임 JS 가 만지는 값은 `--shrine-cam-x` 하나뿐이고, 이 계수는 테마(=폭)당 1회만 계산된다.
 */
export function parallaxShiftPct(world: WorldSpec, factor: number): string {
  const width = safeWidth(world)
  const f = Number.isFinite(factor) ? factor : 0
  return `${round((-f * 100) / width, 5)}%`
}

/**
 * 문틀 그림자를 드리울 쪽 — **안쪽 경계에만** 드리운다.
 *
 * ⚠️ 6차 검수 "신당 오른쪽 세로선"의 정체가 이것이었다. 문틀 그림자는 3구역 시절
 * (마당–대청–후원) **구역과 구역 사이 문간**을 표시하려고 만든 것이다. 안2.1 에서 구역이
 * 0~320 단일 구역으로 합쳐지자 두 그림자가 **방 바깥 끝**으로 밀려났고, 거기엔 문간이 없으므로
 * 설명되지 않는 검은 세로 띠(alpha 0.5, 폭 3.2%)만 남았다. 게다가 전경층은 시차 1.15배라
 * 방보다 빨리 흘러 **움직이는 세로 경계**로 읽힌다.
 *
 * 그래서 경계가 world 안쪽일 때만 참이다. 단일 구역 방에서는 양쪽 다 거짓 —
 * 벽이 끝나는 자리는 문간이 아니라 그냥 방의 끝이다.
 */
export function jambSides(world: WorldSpec, zone: WorldZone): { left: boolean; right: boolean } {
  const width = safeWidth(world)
  const x0 = clamp(zone?.x0, 0, width)
  const x1 = clamp(zone?.x1, x0, width)
  return { left: x0 > 0, right: x1 < width }
}
