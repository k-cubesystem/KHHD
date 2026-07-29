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
