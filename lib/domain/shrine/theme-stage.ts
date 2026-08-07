/**
 * 표준 와이드 무대(Standard Wide Stage) — 전 테마 공통 기하의 **단일 출처**
 * (PLAN-theme-stage-common-v2 §2).
 *
 * 「살림과 장소」 원칙: 단상·제단 상판 같은 **살림**은 어느 장소로 이사해도 그대로 따라간다
 * (스프라이트·좌표·앵커 공용). 테마가 바꾸는 것은 **장소**뿐이다 — 벽·바닥 뮤럴 2장과 조명색.
 * 그래서 이 파일에는 테마별 분기가 없다. 좌표를 테마마다 다시 정하는 순간 선반장·의식각·
 * 앵커·테스트가 테마 수만큼 갈라진다.
 *
 * ⚠️ 기하 수치는 이 파일이 아니라 `theme-stage-geometry.json` 에 있다. 시드를 찍는
 *    `scripts/shrine-assets/build-theme-stage-seed.mjs` 는 TS 를 import 할 수 없어서
 *    **같은 JSON 을 읽는다** — 숫자가 두 벌이 되는 것을 파일 하나로 막는다.
 *    (도메인↔시드 일치는 `__tests__/theme-stage.test.ts` 가 마이그레이션 산출물과 대조한다.)
 *
 * ⚠️ 제단 앵커 x 45/50/55 · y 53.5 는 2026-07-31 정정 이후의 **라이브 실값**이다.
 *    안2.3 원본의 34/66 으로 되돌리면 와이드 룸에서 "상 밖 허공" 스냅이 재발한다.
 *
 * 전 함수 순수·결정론 — Date.now()/Math.random() 금지(시드가 매번 같은 바이트여야 한다).
 */

import { EL_COLOR } from './energy'
import type { StageLight, StageStructure } from './stage'
import { isElement, isLayer, type Element, type Layer } from './types'
import geometryJson from './theme-stage-geometry.json'

// ─── 기하 JSON 의 타입 (JSON 모듈은 리터럴 타입을 모른다) ────────
// 이 인터페이스가 JSON 의 «모양» 정본이고, 실제 값이 여기서 벗어나면 계약 테스트가 잡는다
// (앵커 layer 가 Layer 유니온인지까지 테스트가 런타임으로 확인한다).

interface GeometryAnchor {
  id: string
  layer: string
  x: number
  y: number
  label: string
}

interface GeometryStructure {
  /** 테마 코드를 붙여 `platform-banga` 처럼 완성한다 — 반가 라이브 시드와 같은 이름 규약 */
  code: string
  assetUrl: string
  x: number
  y: number
  w: number
  anchors: GeometryAnchor[]
}

interface Geometry {
  worldWidth: number
  zone: { code: string; label: string; x0: number; x1: number }
  mural: { dir: string; wall: string; floor: string }
  structures: GeometryStructure[]
  light: {
    intensity: number
    origin: { x: number; y: number }
    neutralColor: string
    elementColor: Record<string, string>
  }
  themeElements: Record<string, string | null>
}

const GEO = geometryJson as Geometry

// ─── 공개 상수 (렌더·테스트·문서 공용) ─────────────────────────

/** 두루마리 논리 폭 — 뷰포트 3.2배. `world.width > 100` 이 곧 worldActive 조건이다. */
export const THEME_STAGE_WIDTH = GEO.worldWidth

/** 유일 구역 — 세계 전체를 대청 하나가 덮는다(구역 이음새 0). */
export const THEME_STAGE_ZONE = Object.freeze({ ...GEO.zone })

/** 제단 앵커 좌표 — 라이브 정정값. 여기가 바뀌면 저장된 배치가 상 밖으로 튄다. */
export const ALTAR_ANCHOR_X: readonly number[] = Object.freeze(GEO.structures.flatMap((s) => s.anchors.map((a) => a.x)))
export const ALTAR_ANCHOR_Y = GEO.structures.flatMap((s) => s.anchors.map((a) => a.y))[0]

/**
 * 무속성 테마의 조명색 — 촛불 금색. 오행이 있는 테마는 EL_COLOR 를 그대로 쓴다
 * (기운 화면과 방의 빛이 같은 색세계를 쓰게 하는 것이 요점 — 색을 따로 정하지 않는다).
 */
export const NEUTRAL_LIGHT_COLOR = GEO.light.neutralColor

/** 테마 코드 16종 — 확산의 모집단. 순서가 곧 시드 마이그레이션의 문장 순서다. */
export const THEME_CODES: readonly string[] = Object.freeze(Object.keys(GEO.themeElements))

/**
 * 테마 → 오행. Map 이라 '__proto__' 같은 코드가 와도 프로토타입을 타지 않는다(world.ts 규약).
 * ⚠️ DB `shrine_theme_packs.element_affinity` 의 사본이다 — 조명색을 시드에 굽기 위한 것이고,
 *    어긋남은 계약 테스트가 생성 스펙(spec-data.mjs)과 대조해 잡는다.
 */
const THEME_ELEMENT: ReadonlyMap<string, Element | null> = new Map(
  Object.entries(GEO.themeElements).map(([code, el]) => [code, isElement(el) ? el : null])
)

/** 테마 코드 규격 — 경로와 SQL 리터럴에 그대로 들어가므로 모양을 좁혀 둔다. */
const THEME_CODE_RE = /^[a-z][a-z0-9-]{0,30}$/

// ─── 조회 ────────────────────────────────────────────────────

export function themeElement(code: string): Element | null {
  return THEME_ELEMENT.get(code) ?? null
}

/** 오행 → 조명색. 무속성(null)은 금색. */
export function themeLightColor(element: Element | null): string {
  return element === null ? NEUTRAL_LIGHT_COLOR : EL_COLOR[element]
}

/** 테마별로 새로 그리는 것은 이 두 장뿐이다(장소). */
export function themeWallMuralUrl(code: string): string {
  return `${GEO.mural.dir}/${assertThemeCode(code)}/${GEO.mural.wall}`
}
export function themeFloorMuralUrl(code: string): string {
  return `${GEO.mural.dir}/${assertThemeCode(code)}/${GEO.mural.floor}`
}

function assertThemeCode(code: string): string {
  if (!THEME_CODE_RE.test(code)) throw new Error(`테마 코드 규격 위반: ${JSON.stringify(code)}`)
  return code
}

// ─── 시드 조립 ────────────────────────────────────────────────

/** 구역 하나 — 최상위와 같은 무대를 들고 세계 전체를 덮는다. */
export interface ThemeStageZoneSeed {
  code: string
  label: string
  x0: number
  x1: number
  wallpaperUrl: string
  flooringUrl: string
  structures: StageStructure[]
}

/**
 * 테마 `stage` jsonb 한 벌. 반가 라이브와 **같은 스키마**라 parseStageSpec·parseWorld 가
 * 그대로 파싱한다(키 이름·중첩 위치가 계약이다).
 *
 * 최상위와 구역이 무대를 두 벌 드는 것은 낭비가 아니라 **원복 레버**다 —
 * `stage - 'zones' - 'width'` 한 줄이면 단일 무대(폭 100)로 되돌아간다(반가 §3(a)와 같은 경로).
 * 구역 structures 는 최상위를 승계하지 않고 **대체**하므로(world-render `zoneStage`) 구역 쪽에도
 * 반드시 실려 있어야 한다 — 상판만 넣으면 단상이 예외도 로그도 없이 사라진다.
 */
export interface ThemeStageSeed {
  wallpaperUrl: string
  flooringUrl: string
  structures: StageStructure[]
  light: StageLight
  width: number
  zones: ThemeStageZoneSeed[]
}

function buildStructures(code: string): StageStructure[] {
  return GEO.structures.map((s) => ({
    code: `${s.code}-${code}`,
    assetUrl: s.assetUrl,
    x: s.x,
    y: s.y,
    w: s.w,
    anchors: s.anchors.map((a) => ({ id: a.id, layer: toLayer(a.layer), x: a.x, y: a.y, label: a.label })),
  }))
}

/** 기하 JSON 의 layer 문자열 → Layer. 어긋나면 조용히 넘어가지 않고 즉시 깨뜨린다(시드 오염 방지). */
function toLayer(v: string): Layer {
  if (!isLayer(v)) throw new Error(`기하 JSON 앵커 layer 위반: ${JSON.stringify(v)}`)
  return v
}

/**
 * 테마 코드 → 표준 와이드 무대 stage jsonb.
 *
 * **키 순서가 계약이다** — 시드 빌더(build-theme-stage-seed.mjs)가 같은 순서로 찍고,
 * 계약 테스트가 두 산출물을 바이트로 대조한다. 순서를 바꾸려면 양쪽을 같이 바꿔야 한다.
 */
export function buildThemeStage(code: string): ThemeStageSeed {
  const wallpaperUrl = themeWallMuralUrl(code)
  const flooringUrl = themeFloorMuralUrl(code)
  const structures = buildStructures(code)
  return {
    wallpaperUrl,
    flooringUrl,
    structures,
    light: {
      color: themeLightColor(themeElement(code)),
      intensity: GEO.light.intensity,
      origin: { x: GEO.light.origin.x, y: GEO.light.origin.y },
    },
    width: GEO.worldWidth,
    zones: [
      {
        code: GEO.zone.code,
        label: GEO.zone.label,
        x0: GEO.zone.x0,
        x1: GEO.zone.x1,
        wallpaperUrl,
        flooringUrl,
        structures: buildStructures(code),
      },
    ],
  }
}
