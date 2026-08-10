/**
 * 신당 꾸미기 v2 「조립식 무대(舞臺)」 — 무대 물리 도메인 (PLAN-shrine-miniroom-v2 §3-A/C/D, §4).
 *
 * 원근 스케일 · 깊이 정렬 · 접지 그림자 · 조명 오버레이 · 앵커 스냅 · 테마 stage 파싱.
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now()/Math.random() 사용 금지.
 * 클라이언트·서버 공용. 좌표계는 기존과 동일한 무대 % 좌표(x,y: 0~100)를 그대로 쓴다.
 *
 * ⚠️ zones.ts / types.ts 는 기존 export 계약을 유지해야 하므로 수정하지 않는다.
 *    v2 에서 필요한 타입·상수는 전부 이 파일에 신설한다.
 */

import { ZONES, ZONE_LABEL, clampPct, KEEPER_POS } from './zones'
import { isLayer, type CatalogItem, type Layer, type Placement, type SceneData, type ThemePack } from './types'
// 타입만 참조한다(런타임 import 0) — fixture-offsets 도 이 파일의 타입만 보므로 순환이 생기지 않는다
import type { FixtureOffsets } from './fixture-offsets'

// ─── 계약 타입 ────────────────────────────────────────────────

/** 테마 광원. origin 은 무대 % 좌표. */
export interface StageLight {
  color: string
  intensity: number
  origin: { x: number; y: number }
}

/** 구조물이 노출하는 스냅 지점(제단 상판·선반 등). */
export interface StageAnchor {
  id: string
  layer: Layer
  x: number
  y: number
  label: string
}

/** 조립식 무대의 구조물(제단·선반·창). w 는 무대 폭 대비 % */
export interface StageStructure {
  code: string
  assetUrl: string
  x: number
  y: number
  w: number
  anchors: StageAnchor[]
}

/** 테마 stage jsonb 의 파싱 결과. null 이면 레거시(room.webp) 렌더. */
export interface StageSpec {
  wallpaperUrl: string | null
  flooringUrl: string | null
  structures: StageStructure[]
  light: StageLight | null
}

/** 접지 그림자 규격. width/height 는 아이템 폰트크기 기준 em 배수. */
export interface GroundShadow {
  width: number
  height: number
  opacity: number
}

/** 카탈로그 품목 종류 — 무대 조립 대상(벽지/바닥재/구조물) vs 자유 배치 소품. */
export type CatalogKind = 'wallpaper' | 'flooring' | 'structure' | 'prop'

// ─── 튜닝 상수 (렌더·테스트 공용 단일 출처) ─────────────────────

/** floor 원근 스케일 하한/상한 — 존 뒤(위)=0.72, 앞(아래)=1.28 */
const FLOOR_SCALE_MIN = 0.72
const FLOOR_SCALE_MAX = 1.28
/** altar 는 제단 상판이라 깊이 변화가 거의 없다 — 소품보다 살짝 작게 고정 */
const ALTAR_SCALE = 0.88

/** 레이어별 기본 z (아이템 밴드 10~29 안의 상대값) */
const Z_HANGING = 10
const Z_WALL = 11
const Z_ALTAR = 14
const Z_FLOOR_MIN = 16
/** 단상 위 floor 소품 — 제단(Z_ALTAR=14)보다 뒤. 부록 P-2 깊이 분기. */
const Z_FLOOR_BEHIND_ALTAR = 12
const Z_FLOOR_MAX = 28
const Z_FLOOR_STEPS = Z_FLOOR_MAX - Z_FLOOR_MIN // 12

/** 접지 그림자: floor 는 y 에 비례, altar 는 고정 */
const SHADOW_W_MIN = 2.0
const SHADOW_W_MAX = 3.0
const SHADOW_O_MIN = 0.22
const SHADOW_O_MAX = 0.42
const ALTAR_SHADOW_W = 2.2
const ALTAR_SHADOW_O = 0.3
/** 타원 그림자의 납작한 정도 (height = width × 이 값) */
const SHADOW_ASPECT = 0.3

/** 촛불 점화가 방 밝기에 기여하는 상한과 포화 개수 */
export const LIT_BOOST_MAX = 0.3
export const LIT_BOOST_SATURATION = 3

/** 앵커 스냅 기본 반경 (무대 % 거리) — scale 미지정 호출(레거시 단일 무대)용 */
export const DEFAULT_SNAP_RADIUS_PCT = 6
/**
 * 픽셀 거리계 스냅 반경(px) — 앵커 링 지름과 같다 (부록 P-2 / 진단 D-3).
 * 종전 % 거리계는 와이드 룸에서 가로 1% ≈ 세로 1% 가 아니어서(방 1664×620) 포획 영역이
 * **가로 100px × 세로 37px 타원**으로 왜곡됐다 — 「제단 왼편」 자석이 상판 밖 허공까지
 * 끌어당기던 원인. 축 가중치(px/%)를 받아 화면 픽셀로 재면 포획이 링 크기의 원이 된다.
 */
export const SNAP_RADIUS_PX = 34

/** 앵커 id · 구조물 code 최대 길이 (DB text 컬럼 방어 상한과 동일) */
export const MAX_ANCHOR_ID_LEN = 62

const DEFAULT_LIGHT_COLOR = 'rgba(255,214,160,0.55)'
const DEFAULT_LIGHT_INTENSITY = 0.5
const DEFAULT_LIGHT_ORIGIN = { x: 50, y: 18 }

// ─── 내부 유틸 ────────────────────────────────────────────────

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 유한수 클램프. NaN/Infinity 는 min 으로 떨어뜨려 결정론을 유지한다. */
function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/**
 * floor 원근 램프의 기준 밴드 — **존과 분리해 동결**한다(부록 P-2, 마루 개활지 실측 64~90).
 * 배치 자유도 v2 가 floor 존을 [44,96]으로 넓혔지만, 이 밴드가 존을 따라가면 기존 배치
 * 전부의 크기·그림자·z 가 한꺼번에 변한다(라이브 floor 배치는 전부 64~90 안 — 이동 0 계약).
 * 밴드 밖은 경계 클램프: 단상 위(y<64)는 "멀다=작다"의 최소값, 앞전(y>90)은 최대값 유지.
 */
const FLOOR_DEPTH_REF: readonly [number, number] = [64, 90]

/** 기준 밴드 안에서의 정규화 위치 0(뒤)~1(앞). 범위 밖 y 는 클램프. */
function floorT(y: number): number {
  const [y0, y1] = FLOOR_DEPTH_REF
  return (clamp(y, y0, y1) - y0) / (y1 - y0)
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

// ─── §3-C 무대 물리 ───────────────────────────────────────────

/**
 * 원근 스케일 — floor 는 y(64~90)를 0.72~1.28 로 선형 매핑(뒤는 작게, 앞은 크게),
 * altar 는 0.88 고정, wall/hanging 은 1.0. 범위 밖 y 는 존 경계로 클램프.
 */
export function depthScale(layer: Layer, y: number): number {
  if (layer === 'altar') return ALTAR_SCALE
  if (layer !== 'floor') return 1
  return round(FLOOR_SCALE_MIN + floorT(y) * (FLOOR_SCALE_MAX - FLOOR_SCALE_MIN), 4)
}

/**
 * 깊이 정렬(painter's algorithm) — 아이템 밴드 안의 상대 z(10~29).
 * hanging 10 · wall 11 · altar 14 · floor 16~28(앞일수록 크다 = 뒤 아이템을 가린다).
 */
export function depthZ(layer: Layer, y: number): number {
  switch (layer) {
    case 'hanging':
      return Z_HANGING
    case 'wall':
      return Z_WALL
    case 'altar':
      return Z_ALTAR
    case 'floor':
      // 단상 위(y < 제단 존 하한 48 = 상판 뒤)는 제단(14)보다 뒤(12)에 그린다 — 부록 P-2.
      // 안 그러면 신위 곁에 세운 소품이 공물상을 덮는 깊이 역전이 생긴다. y≥48 은 기존 램프 그대로.
      if (y < ZONES.altar.y[0]) return Z_FLOOR_BEHIND_ALTAR
      return clamp(Z_FLOOR_MIN + Math.round(floorT(y) * Z_FLOOR_STEPS), Z_FLOOR_MIN, Z_FLOOR_MAX)
  }
}

/**
 * 접지 그림자 — 바닥에 닿는 레이어(floor/altar)만 부여한다.
 * floor 는 앞쪽(y 큼)일수록 크고 진하게, altar 는 상판 고정값. wall/hanging 은 null.
 */
export function groundShadow(layer: Layer, y: number): GroundShadow | null {
  if (layer === 'altar') {
    return {
      width: ALTAR_SHADOW_W,
      height: round(ALTAR_SHADOW_W * SHADOW_ASPECT, 3),
      opacity: ALTAR_SHADOW_O,
    }
  }
  if (layer !== 'floor') return null
  const t = floorT(y)
  const width = round(SHADOW_W_MIN + t * (SHADOW_W_MAX - SHADOW_W_MIN), 3)
  return {
    width,
    height: round(width * SHADOW_ASPECT, 3),
    opacity: round(SHADOW_O_MIN + t * (SHADOW_O_MAX - SHADOW_O_MIN), 3),
  }
}

/**
 * 촛불 점화 수 → 방 밝기 기여 0~0.3 (3개에서 포화).
 * 점화할수록 방이 밝아지는 연출 인센티브(§3-C-4). 소수·음수·비유한 입력 방어.
 */
export function litBoost(litCount: number): number {
  const n = Number.isFinite(litCount) ? Math.max(0, Math.floor(litCount)) : 0
  return round((Math.min(n, LIT_BOOST_SATURATION) / LIT_BOOST_SATURATION) * LIT_BOOST_MAX, 4)
}

/**
 * 조명 오버레이 — 광원 원점에서 퍼지는 radial-gradient + 강도(=intensity + litBoost).
 * mixBlendMode 는 렌더 쪽 책임이라 반환하지 않는다.
 * color 는 DB jsonb 유래일 수 있어 CSS 주입 방어를 거친다(허용 형식 밖이면 기본 촛불색).
 */
export function lightingOverlayStyle(
  light: StageLight,
  litBoostValue: number
): { backgroundImage: string; opacity: number } {
  const color = safeColor(light?.color)
  const x = round(clamp(numOr(light?.origin?.x, DEFAULT_LIGHT_ORIGIN.x), 0, 100), 2)
  const y = round(clamp(numOr(light?.origin?.y, DEFAULT_LIGHT_ORIGIN.y), 0, 100), 2)
  const intensity = clamp(numOr(light?.intensity, DEFAULT_LIGHT_INTENSITY), 0, 1)
  const boost = clamp(numOr(litBoostValue, 0), 0, 1)
  return {
    backgroundImage: `radial-gradient(120% 90% at ${x}% ${y}%, ${color} 0%, transparent 72%)`,
    opacity: round(clamp(intensity + boost, 0, 1), 3),
  }
}

// ─── §3-D 앵커 ────────────────────────────────────────────────

/**
 * 반경(기본 6%) 안에서 가장 가까운 같은 layer 앵커. 없으면 null.
 * 거리는 x·y 유클리드(% 좌표), 동률이면 배열에서 먼저 나온 앵커(결정론).
 */
export interface SnapScale {
  /** 가로 1(%) 가 화면에서 몇 px 인가 */
  sx: number
  /** 세로 1(%) 가 화면에서 몇 px 인가 */
  sy: number
}

export function nearestAnchor(
  anchors: readonly StageAnchor[],
  layer: Layer,
  x: number,
  y: number,
  radiusPct: number = DEFAULT_SNAP_RADIUS_PCT,
  /**
   * 축 가중치(px/%). 주면 거리를 **화면 픽셀**로 재고 반경도 SNAP_RADIUS_PX(px)가 된다 —
   * 와이드 룸에서 % 거리계가 만들던 3.2배 가로 왜곡(진단 D-3)의 교정. 안 주면 종전과 동일(% 거리계,
   * 레거시 단일 무대 호출부 무수정 호환).
   */
  scale?: SnapScale
): StageAnchor | null {
  if (!Array.isArray(anchors) || anchors.length === 0) return null
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const usePx =
    scale !== undefined && Number.isFinite(scale.sx) && Number.isFinite(scale.sy) && scale.sx > 0 && scale.sy > 0
  const r = usePx ? SNAP_RADIUS_PX : Number.isFinite(radiusPct) && radiusPct >= 0 ? radiusPct : DEFAULT_SNAP_RADIUS_PCT
  const maxD2 = r * r
  const wx = usePx ? scale.sx : 1
  const wy = usePx ? scale.sy : 1

  let best: StageAnchor | null = null
  let bestD2 = Number.POSITIVE_INFINITY
  for (const a of anchors) {
    if (!a || a.layer !== layer) continue
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) continue
    const dx = (a.x - x) * wx
    const dy = (a.y - y) * wy
    const d2 = dx * dx + dy * dy
    // 엄격한 < — 동률일 때 먼저 나온 앵커를 유지한다
    if (d2 < bestD2) {
      bestD2 = d2
      best = a
    }
  }
  return best !== null && bestD2 <= maxD2 ? best : null
}

/**
 * 레거시(무대 미보유) 테마용 기본 앵커 — **동결 리터럴** (부록 P-2).
 *
 * ⚠️ 존 파생을 전부 끊었다(종전에는 ZONES 중점·스팬에서 계산). 배치 자유도 v2 가 존을 크게
 * 넓혔는데(벽 x[8,92]→[4,96] 등) 파생을 두면 레거시 테마의 "의미 있는 자리"가 존 확장을 따라
 * 이유 없이 이동한다. 아래 숫자는 전부 v1 파생값 그대로다 — 좌표 이동 0 이 계약이고
 * stage.test 가 리터럴로 대조한다. (ALTAR_ANCHOR_Y=48 동결과 같은 원리를 전 앵커로 확장)
 */
export const DEFAULT_ANCHORS: readonly StageAnchor[] = Object.freeze([
  { id: 'altar-left', layer: 'altar' as Layer, x: 37, y: 48, label: '제단 왼편' },
  { id: 'altar-center', layer: 'altar' as Layer, x: 50, y: 48, label: '제단 가운데' },
  { id: 'altar-right', layer: 'altar' as Layer, x: 63, y: 48, label: '제단 오른편' },
  { id: 'wall-left', layer: 'wall' as Layer, x: 36, y: 32.5, label: '벽 왼편' },
  { id: 'wall-right', layer: 'wall' as Layer, x: 64, y: 32.5, label: '벽 오른편' },
  // 신당지기(KEEPER_POS.x=12) 반대편 — 신위 곁 자리. id 는 저장 배치의 anchor_id 라 불변.
  { id: 'deity-side', layer: 'floor' as Layer, x: 88, y: 66, label: '신위 곁' },
])

// ─── 신위 접지 계약 (안2.3 ③ 제단·단상 정립 / PRD 부록 C) ──────
/**
 * **단상(壇上) 상면 y** — 신위의 발이 닿는 면. 무대 % 좌표(위→아래).
 *
 * ⚠️ 이 값이 계약의 전부다. 단상 시드 좌표가 바뀌면 **여기 한 줄만** 갈아끼우면 신위 스탠드·
 *    발밑 글로우·머리 여백이 한꺼번에 따라온다(deityStandBox 파생 — 룸에는 세로 하드코딩이 없다).
 *
 * 45.3 의 출처 = **시드 [계약 3]** (`supabase/migrations/20260730_shrine_banga_altar_platform.sql`,
 * 정합 테스트 `__tests__/banga-wide-seed.test.ts` 가 이 값과 시드의 일치를 강제한다).
 * 단상 스프라이트(`platform.webp` 640×299)와 시드 좌표(x50 y51 w44)에서 상면 앞턱(스프라이트 20.27%
 * 지점, 행 휘도 하강으로 검출)을 찾아 방 % 로 환산한 **상면 밴드**의 기기 교집합 가운데다:
 *   · 방 520×620(데스크톱·태블릿): 상면 y 42.38 ~ 45.87
 *   · 방 380×620(세로 긴 폰):      상면 y 44.70 ~ 47.25
 *   · 교집합 44.70 ~ 45.87 → 가운데 **45.3**
 * 스프라이트의 겉보기 세로는 **방 가로:세로 비**에 딸려 오므로 한 상수로 모든 기기의 접지선을 정확히
 * 맞출 수는 없다. 교집합 안이면 어느 기기에서도 발이 상면 **안**에 놓이고, 오차는 "상면 뒤쪽으로 조금
 * 들어감"이지 "떠 있음"이 아니다(그래서 가운데를 쓴다 — 에셋↔배선 반올림 차이를 양쪽으로 흡수한다).
 * 상판(altar-top) 상단이 y49.4 라 4.1%p 여유가 남아 신위(z-3)가 공물상을 덮지도 않는다.
 *
 * 종전에는 이 자리가 `bottom:50%`(=y50) 하드코딩이었다. 상면보다 4%p 넘게 아래 = 제단 몸통 안쪽에
 * 발이 박혀 서 있을 면이 없었고(CEO "어색하다"의 기하적 원인), 방 높이를 72vh 로 늘리면 제단
 * 스프라이트의 겉보기 세로가 줄어 그 어긋남이 더 벌어진다 — 하드코딩을 남겨 둘 수 없는 이유다.
 */
export const PODIUM_TOP_Y = 45.3
/**
 * 신위 머리 위 여백 상한 y — 걸이(hanging) 존 상단과 같은 줄(8)보다 4%p 아래.
 * 종전 스탠드(bottom 50% · height 38%)의 상단이 정확히 이 값이라, 접지만 올리고 머리 여백은 보존한다.
 */
export const DEITY_HEAD_ROOM_Y = 12

/** 신위 스탠드 박스 — CSS `bottom`/`height` 문자열과 접지 y(파티클·판정 공용). */
export interface DeityStandBox {
  /** 방 하단 기준 % (= 100 - 접지 y) */
  bottom: string
  /** 방 높이 대비 % (= 접지 y - 머리 여백 y) */
  height: string
  /** 접지 y (무대 % 좌표) — 그림자·아우라가 같은 기준을 쓰도록 노출한다 */
  groundY: number
}

/**
 * 단상 상면 기준 신위 스탠드 기하. 발은 상면에 닿고 머리는 headRoomY 에 선다 —
 * 즉 상면이 올라가면 신위가 그만큼 커지고(위계가 살고), 내려가면 작아진다.
 *
 * 방어: 상면이 머리 여백보다 위로 올라오면(잘못된 시드) 최소 높이 1%p 를 보장해 스탠드가 사라지지 않게 한다.
 */
export function deityStandBox(podiumTopY: number = PODIUM_TOP_Y, headRoomY: number = DEITY_HEAD_ROOM_Y): DeityStandBox {
  const ground = round(clamp(podiumTopY, 1, 100), 4)
  const head = round(clamp(headRoomY, 0, ground - 1), 4)
  return {
    bottom: `${round(100 - ground, 4)}%`,
    height: `${round(ground - head, 4)}%`,
    groundY: ground,
  }
}

// ─── §4 방어 파싱 (Supabase jsonb → 타입 안전) ────────────────

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const FUNC_COLOR_RE = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/deg]+\)$/i
const NAME_COLOR_RE = /^[a-z]{3,20}$/i
/** 루트 상대경로 · https · data:image 만 허용 (javascript:, url() 탈출 문자 차단) */
const ASSET_URL_RE = /^(?:\/[^\s"'()\\<>;]*|https:\/\/[^\s"'()\\<>;]+|data:image\/[a-z+.-]+;base64,[A-Za-z0-9+/=]+)$/i
const MAX_URL_LEN = 2048
const MAX_LABEL_LEN = 40

/** CSS 값으로 그대로 합성되는 색 — 허용 형식 밖이면 기본 촛불색으로 대체(주입 차단). */
function safeColor(v: unknown): string {
  if (typeof v !== 'string') return DEFAULT_LIGHT_COLOR
  const s = v.trim()
  if (s.length === 0 || s.length > 64) return DEFAULT_LIGHT_COLOR
  if (HEX_COLOR_RE.test(s) || FUNC_COLOR_RE.test(s) || NAME_COLOR_RE.test(s)) return s
  return DEFAULT_LIGHT_COLOR
}

/**
 * 이미지 URL 방어 — 루트 상대경로·https·data:image 만 통과, 그 외는 null(해당 레이어 미렌더).
 * (카탈로그 `asset_url` 컬럼 파싱에도 사용)
 */
export function parseAssetUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length === 0 || s.length > MAX_URL_LEN) return null
  return ASSET_URL_RE.test(s) ? s : null
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 여러 키 별칭 중 처음 존재하는 값 (jsonb 가 camelCase/snake_case 섞여 들어와도 관대하게) */
function pick(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (r[k] !== undefined) return r[k]
  return undefined
}

/**
 * 앵커 id(구조물 code 겸용) 방어 — 빈 문자열·62자 초과·비문자열은 null.
 * (배치 저장 시 `anchor_id` 검증에도 사용)
 */
export function parseAnchorId(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length > 0 && s.length <= MAX_ANCHOR_ID_LEN ? s : null
}

function safeLabel(v: unknown, layer: Layer): string {
  if (typeof v !== 'string') return ZONE_LABEL[layer]
  const s = v.trim().slice(0, MAX_LABEL_LEN)
  return s.length > 0 ? s : ZONE_LABEL[layer]
}

function parseAnchor(v: unknown): StageAnchor | null {
  if (!isRecord(v)) return null
  const id = parseAnchorId(pick(v, 'id', 'anchor_id', 'anchorId'))
  if (!id) return null
  const layerRaw = pick(v, 'layer')
  if (!isLayer(layerRaw)) return null
  return {
    id,
    layer: layerRaw,
    x: round(clamp(numOr(pick(v, 'x'), 50), 0, 100), 2),
    y: round(clamp(numOr(pick(v, 'y'), 50), 0, 100), 2),
    label: safeLabel(pick(v, 'label', 'name'), layerRaw),
  }
}

/**
 * 앵커 배열 방어 파싱 — `[{...}]` 또는 `{ anchors: [{...}] }` 둘 다 허용.
 * 깨진 항목은 조용히 버리고, 형태가 완전히 어긋나면 빈 배열(크래시 금지).
 * (카탈로그 `anchor_spec` 컬럼 파싱에 사용)
 */
export function parseAnchorSpec(v: unknown): StageAnchor[] {
  const raw = Array.isArray(v) ? v : isRecord(v) && Array.isArray(v.anchors) ? v.anchors : null
  if (!raw) return []
  const out: StageAnchor[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const a = parseAnchor(item)
    if (!a || seen.has(a.id)) continue // id 중복은 첫 항목만 채택 (스냅 결과 결정론)
    seen.add(a.id)
    out.push(a)
  }
  return out
}

function parseStructure(v: unknown): StageStructure | null {
  if (!isRecord(v)) return null
  const code = parseAnchorId(pick(v, 'code', 'id', 'key'))
  if (!code) return null
  const assetUrl = parseAssetUrl(pick(v, 'assetUrl', 'asset_url', 'asset', 'url'))
  if (!assetUrl) return null // 그림 없는 구조물은 렌더 불가 → 버린다
  return {
    code,
    assetUrl,
    x: round(clamp(numOr(pick(v, 'x'), 50), 0, 100), 2),
    y: round(clamp(numOr(pick(v, 'y'), 50), 0, 100), 2),
    w: round(clamp(numOr(pick(v, 'w', 'width'), 40), 1, 200), 2),
    anchors: parseAnchorSpec(pick(v, 'anchors', 'anchor_spec', 'anchorSpec')),
  }
}

function parseLight(v: unknown): StageLight | null {
  if (!isRecord(v)) return null
  const rawColor = pick(v, 'color')
  if (typeof rawColor !== 'string' || rawColor.trim().length === 0) return null // 색 없는 광원은 무의미
  const origin = pick(v, 'origin')
  const o = isRecord(origin) ? origin : {}
  return {
    color: safeColor(rawColor),
    intensity: round(clamp(numOr(pick(v, 'intensity'), DEFAULT_LIGHT_INTENSITY), 0, 1), 3),
    origin: {
      x: round(clamp(numOr(pick(o, 'x'), DEFAULT_LIGHT_ORIGIN.x), 0, 100), 2),
      y: round(clamp(numOr(pick(o, 'y'), DEFAULT_LIGHT_ORIGIN.y), 0, 100), 2),
    },
  }
}

/**
 * 테마 `stage` jsonb 방어 파싱 — 형태가 어긋나면 null(크래시 금지).
 * 부분 유효는 관대하게 통과시키되, 렌더할 것이 하나도 없으면 null 을 돌려
 * 레거시(room.webp) 렌더로 되돌린다 — 빈 `{}` 가 방을 백지로 만드는 사고 방지.
 *
 * 참고: 로드맵의 `preset[]`(기본 배치로 시작)은 이번 계약(StageSpec 4필드) 밖이라 무시한다.
 */
export function parseStageSpec(v: unknown): StageSpec | null {
  if (!isRecord(v)) return null

  const structuresRaw = pick(v, 'structures')
  const structures: StageStructure[] = []
  if (Array.isArray(structuresRaw)) {
    for (const s of structuresRaw) {
      const parsed = parseStructure(s)
      if (parsed) structures.push(parsed)
    }
  }

  const spec: StageSpec = {
    wallpaperUrl: parseAssetUrl(pick(v, 'wallpaper', 'wallpaperUrl', 'wallpaper_url')),
    flooringUrl: parseAssetUrl(pick(v, 'flooring', 'flooringUrl', 'flooring_url')),
    structures,
    light: parseLight(pick(v, 'light')),
  }

  const hasAnything =
    spec.wallpaperUrl !== null || spec.flooringUrl !== null || spec.structures.length > 0 || spec.light !== null
  return hasAnything ? spec : null
}

// ─── 씬 데이터 확장 타입 (types.ts 무수정 원칙 → 여기서 확장) ──

const CATALOG_KINDS: readonly CatalogKind[] = ['wallpaper', 'flooring', 'structure', 'prop']

export function isCatalogKind(v: unknown): v is CatalogKind {
  return typeof v === 'string' && (CATALOG_KINDS as readonly string[]).includes(v)
}

/** v2 카탈로그 — 기존 CatalogItem 에 무대 필드를 더한 형태(하위호환: CatalogItem 자리에 그대로 대입 가능) */
export interface StageCatalogItem extends CatalogItem {
  kind: CatalogKind
  /** 「설빛온기」 스프라이트 webp. 없으면 emoji 폴백. */
  assetUrl: string | null
  /** 구조물이 노출하는 스냅 지점 (구조물이 아니거나 미정의면 null) */
  anchorSpec: StageAnchor[] | null
}

/** v2 배치 — 스냅된 앵커 식별자 추가 */
export interface StagePlacement extends Placement {
  anchorId: string | null
  /** 세간(가족 자리)에 지정된 가족. 자리가 아닌 배치는 항상 null 이다. */
  familyMemberId: string | null
}

/** 시렁 이름표용 — 지정된 가족의 표시 정보(소유자 화면에만 내려간다). */
export interface ShelfFamilyTag {
  name: string
  avatarId: string | null
}

/** v2 테마 — 조립식 무대 스펙 추가 (null 이면 레거시 room.webp 렌더) */
export interface StageThemePack extends ThemePack {
  stage: StageSpec | null
  /**
   * `stage` jsonb 원본. StageSpec 은 단일 무대 4필드만 담아서 두루마리 `zones` 가 여기서 걸러진다 —
   * 구역 파싱(`parseWorld(stage, stageRaw)`)은 원본이 있어야 성립한다.
   * 서버에서 온 미지의 값이므로 반드시 파서를 거쳐 쓴다(unknown 유지 — 캐스팅 금지).
   */
  stageRaw?: unknown
}

/** v2 씬 데이터 — SceneData 를 필드 단위로 좁힌 것이라 기존 소비처와 호환된다 */
export interface StageSceneData extends SceneData {
  catalog: StageCatalogItem[]
  placements: StagePlacement[]
  themes: StageThemePack[]
  /**
   * 시렁에 지정된 가족의 이름표 (memberId → 표시 정보).
   *
   * ⚠️ **소유자 화면에만** 채워진다. 방문자 뷰는 빈 객체다 — 남의 신당에서 그 집 가족의
   *    이름이 읽히면 안 된다(RLS 도 막지만, 조회 자체를 하지 않는 것이 규율이다).
   */
  familyTags: Record<string, ShelfFamilyTag>
  /**
   * 고정 살림(신위 무대·가족 선반장·의식각) 자리 미세 조정. 빈 객체 = 정본 좌표 그대로.
   *
   * ⚠️ **방문자 뷰에도 내려간다** — 주인이 맞춰 둔 자리로 보여야 같은 신당이다.
   *    담기는 값은 좌표 두 개뿐이라 남의 정보가 새지 않는다(familyTags 와 다른 이유).
   */
  fixtureOffsets: FixtureOffsets
}
