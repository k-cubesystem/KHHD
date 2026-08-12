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
 * ── 무대 기하 v4.1 「틀(壇)」 (2026-08-10) ────────────────────────────────
 * 마루선을 y60 → **y73** 으로 내리고(벽 밴드 75% · 바닥 27% · 겹침 2%p), 시범 3테마의 살림을
 * 단상+상판 2종에서 **닫집·감실이 하나로 붙은 「틀」 1종**(grand-altar)으로 갈아끼운다.
 * v4(밴드 72/30 · 틀 w50)에서 CEO 5차 지시("틀을 더 크게 웅장하게, 마루를 좀 줄여도 될 것 같아")로
 * 한 칸 더 간 것이 v4.1 이다 — 틀 **w50 → w60**, 상자 높이 55.6 → **70**(접지가 마루선에 앉는다).
 *
 * 벗어나면 안 되는 줄:
 *   · **신위 접지는 틀의 감실 바닥**이다. v4.1 까지는 그것이 stage.PODIUM_TOP_Y 45.3 과 같은 줄이라
 *     "불변"이라고 적었지만, v5 에서 틀이 통째로 9%p 내려가며 틀 테마만 54.3 으로 따라간다
 *     (13테마는 45.3 그대로 — stage.deityPodiumTopY 가 그 분기의 단일 출처다).
 *   · **저장된 배치는 절대 좌표다.** 앵커가 어디로 옮겨 가도 이미 놓인 신물은 어제 있던 자리에
 *     그대로 있다 — 앵커는 «다음에 놓을 자리»만 정한다. 그래서 아래 정렬 패스도 이동 0 이고,
 *     v5 의 9%p 동반 이동은 코드가 아니라 **마이그레이션**(20260810c)이 한 번에 메운다.
 *
 * ── 접지 수복 (2026-08-10 밤 · CEO 실기기 검수) ─────────────────────────────
 * "틀과 선반들이 공중에 떠 있어. 마루 라인에 맞춰서 내려와야 해."
 * v4.1 이 «상자»로 잰 접지(y73.5)는 맞았지만, 스프라이트 하단에 세로 리패드가 남긴 투명 여백이
 * 있어 **그려진 받침**은 banga 3.22%p · daljip 1.79%p 위에서 끝났다(seolbit 만 맞아 있었다).
 * 좌표로는 못 고친다 — 세 줄(감실 바닥 45.3 · 제물 밑변 60.98 · 접지 73)의 «픽셀 거리비»가 그림에
 * 박혀 있어 시드의 두 자유도(배율·위치)로는 둘까지만 맞는다. 그래서 스프라이트를 랜드마크 두 줄로
 * 끊어 **상판 아래 구간만 늘렸다**(`scripts/shrine-assets/stage-grand-altar-ground.mjs`, API 0회).
 * 감실 바닥·상판 앞턱이 제자리라 **신위·제단 앵커·이미 놓인 제물은 하나도 안 움직인다.**
 *   · 자산  `grand-altar.webp` → **`grand-altar-v2.webp`** (같은 이름 덮어쓰기는 캐시가 옛 그림을 준다)
 *   · 시드  y 38.5 → **37.22** (상자 y1.44~**73.00** — 하단이 곧 그려진 접지다)
 *   · 감실 윗턱  25.3/23.9/25.7 → **24.9/23.2/25.6** (틀이 통째로 내려앉은 몫)
 * 같은 회차에 사방탁자 두 벌(가족 선반장·의식각)도 밑동을 마루선 파생으로 바꿨다(family-shelf.ts).
 *
 * ── 무대 기하 v5 「마루 1/3 접지」 (2026-08-10 밤 · CEO 실기기 + 스크린샷 주석) ──────
 * "선반과 틀 같은 건 마루 3/1은 자리를 잡아야 해. 틀, 선반 위치는 이미지에 넣었어."
 * v4.1 은 살림의 발끝을 **마루선 그 자체**(y73)에 앉혔다 — 접지는 맞았지만 가구가 마루에 발끝만
 * 걸친 채 벽에 붙어 보인다(방바닥 위가 아니라 «벽에 기댄» 그림). 방 안에 서 있는 것처럼 읽히려면
 * 발이 마루 **안쪽**으로 들어와야 한다. 그 깊이를 마루 밴드의 **1/3** 로 못 박는다:
 *
 *     접지선  STAGE_GROUND_LINE_Y = 마루선 + 바닥밴드/3 = 73 + 9 = **82**
 *
 * 상수 82 를 굽지 않고 파생시키는 것이 요점이다 — 마루선이 다시 움직여도(또 줄여 달라는 지시가
 * 두 번 있었다) 틀·선반장·의식각이 공짜로 따라온다. 「살림은 마루선에 앉는다」 규약이
 * 「살림은 마루 1/3 지점에 선다」로 한 칸 옮겨 간 것이고, 그 이동분(9%p)이 v5 의 전부다:
 *   · 틀      시드 y 37.22 → **46.22** (상자 1.44~73 → **10.44~82** · 세로 71.56 불변)
 *   · 감실 바닥(신위 접지) 45.3 → **54.3** · 상판면 60.98 → **69.98** · 앵커 52.4/55 → **61.4/64**
 *   · 사방탁자 두 벌 밑동 73 → **82**(높이 42 불변) · 감실 윗턱 24.9/23.2/25.6 → **33.9/32.2/34.6**
 * 불변: 밴드(75/27) · 마루선(73) · 신수 배회(72) · 틀 상자 세로 · 앵커 x · 아이템 배율 · 신위 크기.
 * 닫집 꼭대기가 y1.44 → y10.44 로 내려와 벽 상부가 9%p 더 열린다(뮤럴 상부 장식이 살 자리).
 *
 * ── 마무리 정렬 (2026-08-10 · 합성판 실측) ──────────────────────────────────
 * 틀을 실제로 구워 합성판을 만들어 보니 한 줄 5점(x38~62 · y53.5)이 그림과 어긋났다: 틀 상판의
 * 세계 폭 안에 다섯을 한 줄로 세우면 아이템이 절반씩 겹치고 바깥 두 점은 상판 밖 허공이었다.
 * 그래서 원화(달집)처럼 **깊이 2열**로 놓고 제단층 배율을 함께 내린다 — 합성판(CEO 판정본)에
 * 구워진 값이 이 파일의 정본이다. v4.1 에서 틀이 w50 → w60 으로 넓어지며 값이 한 번 더 갱신됐다:
 *   · 뒷줄 3점 x 45.7/50/54.3 · y 52.4   · 앞줄 2점 x 47.85/52.15 · y 55
 *   · 제단층 아이템 배율 0.88 → **0.54** (틀을 쓰는 무대에서만 — 13테마 무영향)
 *   · 신위 머리 여백은 테마별(감실 윗턱) — 신위가 감실 «안»에 들어앉는 크기
 * 배율·머리 여백은 렌더 상수라 시드에 실리지 않는다(밴드와 같다 — 코드 배포가 정본).
 *
 * `buildThemeStage`(v3 기하)는 **동결**이다 — 이미 적용된 20260807 시드의 정본이라 바이트가
 * 바뀌면 안 된다. v4 는 `buildThemeStageV4` 라는 별도 산출로 나가고, 시범 3테마만 덮어쓴다
 * (나머지 13테마는 v3 그대로 — 혼재가 정상 상태다).
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
  /** `{code}` 토큰은 테마 코드로 치환된다(살림 공용 자산은 토큰이 없어 치환이 항등이다) */
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
  bands: { wall: number; floor: number }
  structures: GeometryStructure[]
  grandAltar: {
    themes: string[]
    /** 틀 무대의 제단층 아이템 배율 — 좁은 상판에 2열 5점이 실리는 크기(J 실측) */
    altarItemScale: number
    /** 테마별 신위 머리 여백 y — 그 테마 틀의 «감실 윗턱». 없는 테마는 stage.DEITY_HEAD_ROOM_Y */
    deityHeadRoomY: Record<string, number>
    structures: GeometryStructure[]
  }
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
 * 벽·바닥 뮤럴 밴드(방 높이 %) — **StageLayers 렌더의 단일 출처**.
 * 두 밴드는 일부러 겹친다(75 + 27 > 100): 겹치는 2%p 가 이음새 틈을 덮는다.
 */
export const STAGE_BANDS = Object.freeze({ wall: GEO.bands.wall, floor: GEO.bands.floor })

/**
 * 마루선(수평선) — 벽과 바닥이 만나는 y. 바닥재가 벽지 위에 그려지므로 **보이는 선은 바닥 밴드의
 * 천장**이다(= 100 − floor). 뮤럴 두 장의 수평선이 이 줄에 맞춰 구워진다(J 생성 파이프라인 계약).
 * v3 60 → v4 70 → v4.1 **73** — CEO "마루바닥 사이즈를 좀 줄여 달라"(2회).
 */
export const STAGE_FLOOR_LINE_Y = 100 - GEO.bands.floor

/**
 * 살림이 마루 안쪽으로 들어오는 깊이 — **바닥 밴드의 1/3** (무대 기하 v5, CEO 지시 "마루 3/1").
 * 상수로 굽지 않는 이유가 전부다: 마루선·밴드가 다음에 또 움직여도(이미 두 번 줄였다) 틀·선반장·
 * 의식각이 여기 한 줄로 따라온다. 이동 자체는 순수 평행이동이라 크기·비율은 하나도 안 변한다.
 */
export const STAGE_GROUND_DROP = Math.round((GEO.bands.floor / 3) * 100) / 100

/**
 * **접지선(接地線)** — 가구(틀·사방탁자)의 발이 닿는 줄. 마루선이 «벽과 바닥이 만나는 선»이라면
 * 이쪽은 «방바닥 위에 서 있는 자리»다. v4.1 은 둘을 같은 값으로 뒀고(발끝만 마루에 걸침),
 * v5 가 마루 깊이 1/3 만큼 떼어 놓는다 — 73 + 9 = **82**.
 *
 * ⚠️ 마루선(STAGE_FLOOR_LINE_Y)과 헷갈리면 안 된다. 뮤럴 두 장의 이음새·신수 배회는 여전히
 *    **마루선** 기준이고(그 셋은 v5 에서 한 픽셀도 안 움직인다), 살림만 이 줄로 내려온다.
 */
export const STAGE_GROUND_LINE_Y = Math.round((STAGE_FLOOR_LINE_Y + STAGE_GROUND_DROP) * 100) / 100

/**
 * 벽 살림의 접지 깊이 분모 — **틀 접지 깊이의 1/3**(무대 기하 v6, CEO 지시 2026-08-12
 * "틀 자리는 맞고, 선반과 간판은 좀 더 뒤로 가야 해").
 *
 * v5 는 살림 전부를 한 줄(접지선 82)에 세웠다. 그런데 방 안의 물건은 두 종류다 —
 * **틀**은 방 한가운데 나와 선 제단이고, **사방탁자(가족 선반장·의식각)**는 벽에 붙여 두는
 * 벽 살림이다. 둘을 같은 줄에 세우면 벽 가구가 제단과 나란히 «앞»에 나와 서서, 배경(뮤럴의
 * 벽면)과 따로 노는 스티커로 읽힌다. 그래서 벽 살림만 마루 안쪽 깊이를 1/3 로 줄인다.
 *
 * ⚠️ 리터럴 76 을 굽지 않는 이유는 v5 와 같다 — 마루선·밴드가 또 움직여도 벽 살림이 공짜로
 *    따라온다. 그리고 이 분모는 합성 QA(scripts/shrine-assets/stage-theme-harmony.mjs)가
 *    **정규식으로 읽는다** — 이름을 바꾸면 QA 판이 조용히 다른 방을 그린다.
 */
const WALL_GROUND_DIVISOR = 3

/** 벽 살림이 마루 안으로 들어오는 깊이 — 바닥 밴드의 1/9 (= 틀 깊이 9 의 1/3). */
export const STAGE_WALL_GROUND_DROP = Math.round((STAGE_GROUND_DROP / WALL_GROUND_DIVISOR) * 100) / 100

/**
 * **벽 접지선** — 사방탁자(가족 선반장·의식각)의 발이 닿는 줄. 73 + 3 = **76**.
 * 틀 접지선(82)보다 6%p 뒤다. 이 6%p 가 「선반과 간판은 좀 더 뒤로」의 좌표 몫이고,
 * 나머지 몫(크기·그림자)은 family-shelf.ts / RitualHall.tsx 가 든다.
 */
export const STAGE_WALL_GROUND_LINE_Y = Math.round((STAGE_FLOOR_LINE_Y + STAGE_WALL_GROUND_DROP) * 100) / 100

/**
 * 「틀(壇)」 테마 — grand-altar 1구조물을 쓰는 목록. **2026-08-10 확산으로 16테마 전량**이 됐다
 * (시범 3 → 16. 혼재 상태 종료).
 *
 * ⚠️ 목록이 THEME_CODES 와 같아졌다고 이 분기를 지우면 안 된다. 20260807 시드(v3 단상+상판)가
 *    여전히 원복 레버이고, 되돌린 신당은 `hasGrandAltar` 가 false 인 세계에서 그려져야 한다 —
 *    지우는 순간 v3 로 되돌린 방의 살림이 세로 기준(71.56%)으로 부풀고 신위 발이 9%p 어긋난다.
 */
export const GRAND_ALTAR_THEMES: readonly string[] = Object.freeze([...GEO.grandAltar.themes])

/**
 * 틀 앵커 5점 — v3 의 3점(45/50/55 · y53.5) 한 줄을 **2열**로 대체한다.
 * 배열 순서가 곧 뒤→앞이다: 뒷줄 3점(y52.4) 다음에 앞줄 2점(y55).
 *
 * x 는 «정한» 값이 아니라 **그 라운드 스프라이트의 상판 실측 폭에서 파생한** 값이다(v4.1: 세 테마
 * 최솟값 상판 70% → 세계 x 43.4~56.6). 세 테마가 앵커 한 벌을 나눠 쓰므로 **최솟값**이 기준이고,
 * 간격(4.3%)은 가장 좁은 폰에서도 아이템(390폰 4.10%)이 안 겹치도록 잡는다.
 */
export const GRAND_ALTAR_ANCHOR_X: readonly number[] = Object.freeze(
  GEO.grandAltar.structures.flatMap((s) => s.anchors.map((a) => a.x))
)
export const GRAND_ALTAR_ANCHOR_Y: readonly number[] = Object.freeze(
  GEO.grandAltar.structures.flatMap((s) => s.anchors.map((a) => a.y))
)

/**
 * 틀 무대의 제단층 아이템 배율 — 기본(ALTAR_SCALE 0.88)을 대신한다.
 *
 * ── 근거가 바뀌었다 (2026-08-10 밤 · 자석 폐지 + 아이템 +25%) ────────────────────
 * v4.1 의 0.54 는 «상판 한 줄에 셋이 안 겹치게» 에서 나온 값이었다(스냅 앵커 뒷줄 3점).
 * 그 라운드에 둘이 함께 바뀌었다:
 *   · **자석(스냅) 폐지** — 아이템이 앵커에 «탁» 붙지 않는다. 5점이 한 줄에 서는 그림 자체가
 *     사라졌으므로 «셋이 안 겹치는 한계 배율»은 더 이상 배율을 정하는 근거가 아니다.
 *   · **기본 아이템 +25%** — CEO "아이템 크기가 너무 작아 잘 안 보여"로 SIZE_PX.md 29 → 36.25.
 *     같은 배율을 그대로 두면 제단 제물만 25% 커져 좁은 상판을 넘고, 옛 근거식(29px 기준)은
 *     읽는 사람을 속인다.
 *
 * 그래서 기준을 **«형태가 읽히는 크기»**로 바꾼다 — 아이템 상자는 CSS px 절대값이라 기기와
 * 무관하게 같은 픽셀로 그려진다:
 *     겉보기 폭 = ASSET_EM(3.2) × SIZE_PX.md(36.25) × 배율 = 116px × 0.6 ≈ **70px**
 * 상판 실폭(가장 좁은 폰 360 → 0.70 × 60% × 352 ≈ 148px)에 둘이 나란히 서고도 남는다.
 * 소비는 stage.depthScale 한 곳뿐이다(렌더에 숫자를 흩뿌리지 않는다).
 *
 * ⚠️ 룸이 SIZE_PX.md 를 또 바꾸면 **이 값을 다시 정해야 한다**: 배율' = 70 / (3.2 × 새 md).
 */
export const GRAND_ALTAR_ITEM_SCALE = GEO.grandAltar.altarItemScale

/**
 * 테마별 신위 머리 여백 y — 그 테마 틀의 **감실 윗턱**이다. 발(stage.deityPodiumTopY)과 함께
 * 머리도 내려 신위가 감실 «안»에 들어앉게 한다. 틀이 없는 테마는 null(= 종전 여백 그대로).
 * v5 에서 셋 다 +9 됐고 발도 같은 +9 라 **신위 키(20.4%p)는 변하지 않는다** — 순수 평행이동이다.
 * Map 이라 '__proto__' 같은 코드가 와도 프로토타입을 타지 않는다(world.ts 규약).
 */
const GRAND_ALTAR_HEAD_ROOM: ReadonlyMap<string, number> = new Map(Object.entries(GEO.grandAltar.deityHeadRoomY))

export function grandAltarHeadRoomY(code: string): number | null {
  return GRAND_ALTAR_HEAD_ROOM.get(code) ?? null
}

export function hasGrandAltar(code: string): boolean {
  return GRAND_ALTAR_THEMES.includes(code)
}

/** 틀 구조물 code 의 접두사 — 렌더가 «이 한 장만» 세로 기준으로 그리는 판정에 쓴다. */
export const GRAND_ALTAR_CODE_PREFIX = 'grand-altar'

/**
 * 틀 상자의 **세로**(방 높이 %) — 접지가 접지선에 앉도록 시드 y 에서 파생한다.
 *   상자 하단 = y + h/2 = 접지선  ⟹  h = 2·(접지선 − y)
 *
 * v5 에서 기준이 마루선(73) → **접지선(82)** 으로 바뀌었고 시드 y 도 같은 9%p 를 따라 내려가
 * (37.22 → 46.22) **세로는 71.56 그대로**다 — 순수 평행이동이라 틀 크기는 한 픽셀도 안 변한다.
 *
 * ── 왜 세로가 정본인가 (2026-08-10 접지 수복) ────────────────────────────────
 * 구조물은 원래 **폭**(구역 폭 %)으로만 크기가 정해지고 세로는 스프라이트 종횡비를 따랐다.
 * 그 규칙에서는 겉보기 세로가 «방의 종횡비»에 딸려 온다 — 기준 방(520×620)에서 71.6% 인 틀이
 * 390 폰(382×608)에서는 **53.6%** 밖에 안 돼 접지가 마루선보다 **9%p(≈54px) 위**에 뜬다.
 * 스프라이트를 아무리 잘 구워도 실기기에서는 뜬 채로 보였다는 뜻이고, CEO 실기기 검수의
 * "틀과 선반들이 공중에 떠 있어"에서 틀 쪽 지분의 대부분이 이것이다(스프라이트 여백은 3.2%p).
 *
 * 틀의 계약은 전부 **방 y**(감실 바닥 45.3 · 제물 밑변 60.98 · 접지 73)라, 크기의 기준도 방 세로여야
 * 그 셋이 전 기기에서 함께 산다. 그래서 틀만 «세로 고정 · 가로는 종횡비» 로 뒤집는다:
 *   · 기준 방에서는 폭이 정확히 w(60%)라 **지금까지의 화면과 한 픽셀도 다르지 않다**.
 *   · 좁고 긴 폰에서는 폭이 그만큼 넓어진다(390 폰 ≈80%) — 「더 크고 웅장하게」와도 같은 방향이다.
 *   · 짧은 창(72vh 가 620 보다 작을 때)에서는 반대로 줄어 방 밖으로 넘치지 않는다(구 규칙은 넘쳤다).
 * 시드의 `w` 는 그대로 둔다 — **기준 방에서의 등가 폭**이자, 틀 없는 13테마의 살림이 쓰는 값이다.
 */
export const GRAND_ALTAR_BOX_H = Math.round((STAGE_GROUND_LINE_Y - GEO.grandAltar.structures[0].y) * 2 * 100) / 100

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

function buildStructures(code: string, defs: readonly GeometryStructure[] = GEO.structures): StageStructure[] {
  return defs.map((s) => ({
    code: `${s.code}-${code}`,
    assetUrl: s.assetUrl.replaceAll('{code}', code),
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
  return buildSeed(code, GEO.structures)
}

/**
 * 무대 기하 v4 — 시범 테마의 stage jsonb. 살림이 「틀」 1구조물로 바뀐 것 말고는 v3 와 같다
 * (뮤럴 경로·광원·폭·구역 전부 동일 — 밴드 이동은 렌더 상수라 시드에 실리지 않는다).
 *
 * ⚠️ 시범 밖 테마에 부르면 v3 와 같은 값이 나온다 — 「틀이 아직 없는 테마」를 뜻하지, 확산이 아니다.
 */
export function buildThemeStageV4(code: string): ThemeStageSeed {
  return buildSeed(code, hasGrandAltar(code) ? GEO.grandAltar.structures : GEO.structures)
}

/**
 * v4 마이그레이션이 실제로 쓰는 값 — 구역 structures **배열 하나**다.
 * 최상위 structures 는 건드리지 않는다: 그 자리가 `stage - 'zones'` 원복 레버의 착지점이라,
 * 덮어쓰면 틀 자산이 404 일 때 되돌아갈 곳이 없어진다.
 */
export function grandAltarStructures(code: string): StageStructure[] {
  return buildStructures(assertThemeCode(code), GEO.grandAltar.structures)
}

function buildSeed(code: string, defs: readonly GeometryStructure[]): ThemeStageSeed {
  const wallpaperUrl = themeWallMuralUrl(code)
  const flooringUrl = themeFloorMuralUrl(code)
  const structures = buildStructures(code, defs)
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
        structures: buildStructures(code, defs),
      },
    ],
  }
}
