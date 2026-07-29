/**
 * 신당 게임필 안2 「두루마리 신당」 — world 좌표계 도메인 (ARCH-shrine-gamefeel-v1 §1·§3·§4).
 *
 * 방 1장(뷰포트 100%)을 가로 2.4화면 두루마리로 펼치고 마당—대청—후원을 카메라로 오간다.
 * 이 파일이 책임지는 것은 좌표계뿐이다: 구역 파싱·world 좌표 환산·카메라 클램프·구역 스냅.
 * 렌더(시차 레이어·transform)와 제스처 입력은 호출자(CameraRig) 책임.
 *
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now()/Math.random() 사용 금지.
 *
 * ⚠️ 좌표 무손실 원칙(ARCH §3): 기존 배치 x(0~100)는 **대청 구역 로컬 %** 로 재해석한다.
 *    worldX = zone.x0 + x × (zone.x1 - zone.x0) / 100 — zones 없는 테마는 항등(폭 100, 대청 하나).
 *    배치 스키마·좌표는 무변경이고 마이그레이션 UPDATE 도 0건이다.
 *
 * ⚠️ stage.ts / zones.ts / types.ts 는 기존 export 계약 유지 대상이라 수정하지 않는다.
 *    구역의 벽지·바닥·구조물 파싱은 stage.ts `parseStageSpec` 을 그대로 재사용하고(중복 구현 금지),
 *    stage.ts 가 export 하지 않는 내부 유틸(round/clamp/isRecord/pick)만 같은 규약으로 여기 다시 둔다.
 */

import { parseAnchorId, parseStageSpec, type StageSpec, type StageStructure } from './stage'

// ─── 계약 타입 ────────────────────────────────────────────────

/** 두루마리의 한 구역(마당·대청·후원). x0/x1 은 world 논리 폭 안의 좌우 경계(%). */
export interface WorldZone {
  code: string
  label: string
  x0: number
  x1: number
  wallpaperUrl: string | null
  flooringUrl: string | null
  structures: StageStructure[]
  /**
   * 벽지·바닥을 **늘리지 말고 가로로 반복**(repeat-x)하라는 렌더 신호 (안2.1 「큰 방 하나」).
   * 뷰포트보다 넓은 구역에서 한 장을 늘리면 벽 리듬이 폭 배수만큼 뭉개진다 — 타일 에셋은 이 값으로 구분한다.
   * 없으면(기존 구역·항등 폴백) 지금까지처럼 늘려 그린다 = 회귀 0.
   */
  tile?: boolean
}

/** 두루마리 전체. zones 는 x0 오름차순·비중첩이고 최소 1개(대청)가 보장된다. */
export interface WorldSpec {
  width: number
  zones: WorldZone[]
}

// ─── 튜닝 상수 (렌더·테스트 공용 단일 출처) ─────────────────────

/** 뷰포트 = world 100%p. 카메라 x 는 "뷰포트 좌단의 world %" 라 상한이 width - 100 이 된다. */
export const WORLD_VIEWPORT_PCT = 100

/** 두루마리 표준 논리 폭 — 2.4화면(PRD 안2). 테마 저작·시드의 기준값. */
export const WORLD_DEFAULT_WIDTH = 240

/** 시차 계수 — 원경(하늘·담장) 0.3 / 무대 1 / 전경 소품 1.15 (ARCH §1 렌더 스택). */
export const PARALLAX = { far: 0.3, stage: 1, near: 1.15 } as const

/**
 * 구역 스냅 허용 오차(%p) — 정렬점에서 이 안이면 사용자가 멈춘 자리를 그대로 존중한다(ARCH §4 ±12%).
 * 이 밖에 멈추면 구역 사이 무인지대에 카메라가 남으므로 최근접 정렬점으로 끌어온다.
 * **느리게 놓기 전용 규칙**이다 — 플릭에 적용하면 정렬점 근처의 강한 튕김이 먹통이 된다(zoneSnapTarget 참조).
 */
export const ZONE_SNAP_TOLERANCE_PCT = 12

/**
 * 플릭(관성) 판정 속도(%p/s). 이 미만은 "천천히 놓기"로 보고 방향을 무시한 최근접 스냅,
 * 이상은 방향대로 한 구역 페이징. 100%p ≈ 뷰포트 1장이므로 30%p/s 는 화면 하나를 3.3초에
 * 지나는 느린 속도 — 의도적 튕김만 걸린다.
 */
export const ZONE_FLICK_MIN_PCT_PER_S = 30

/**
 * 자유 팬의 감쇠 시간상수 τ(초) — **관성 튜닝의 단일 출처**(안2.1 확정: 스냅·페이징 폐지).
 *
 * 손을 뗀 뒤 속도가 지수적으로 잦아든다고 보면 총 이동거리는 v×τ 다(∫v·e^(−t/τ)dt).
 * 0.35s 는 뷰포트 1장(100%p)을 1초에 지나는 손놀림이 35%p(≈화면 1/3)를 더 미끄러지는 세기 —
 * 살짝 밀면 살짝, 세게 튕기면 한 화면 넘게 흐르고, **아무 데서나 멈춘다**.
 *
 * 이 값을 키우면 미끄러짐이 길어지지만 감속 길이 상한(CameraRig GLIDE_MS_MAX)에 먼저 걸려
 * 손끝보다 빠른 첫 프레임이 나온다 — 곡선 상수와 함께 보고 조정할 것.
 */
export const FREE_GLIDE_TAU_S = 0.35

/** 방어 상한 — jsonb 가 비정상 값을 들고 와도 카메라 이동 범위가 폭주하지 않게 한다. */
const MAX_WORLD_WIDTH = 1000
const MAX_ZONES = 8
/** 폭 0(제로 디바이드성 퇴화 구역) 방지 최소 폭 */
const MIN_ZONE_SPAN = 1
/** 라벨 최대 길이 (stage.ts 와 동일 규약) */
const MAX_LABEL_LEN = 40

const DAECHEONG_CODE = 'daecheong'

/** 표준 구역 코드의 한국어 라벨. Map 이라 '__proto__' 같은 코드가 와도 프로토타입을 타지 않는다. */
const ZONE_LABEL_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['madang', '마당'],
  [DAECHEONG_CODE, '대청'],
  ['huwon', '후원'],
])

// ─── 내부 유틸 (stage.ts 와 동일 규약) ────────────────────────

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 유한수 클램프. NaN/Infinity 는 min 으로 떨어뜨려 결정론을 유지한다. */
function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 여러 키 별칭 중 처음 존재하는 값 (jsonb 가 camelCase/snake_case 섞여 들어와도 관대하게) */
function pick(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (r[k] !== undefined) return r[k]
  return undefined
}

/** 유한한 수만 통과. 문자열 숫자("70")는 받지 않는다 — 테마 스키마가 흔들리는 걸 조기에 드러내기 위함. */
function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** 손으로 만든 WorldSpec(테스트·렌더 임시값)이 들어와도 계산이 깨지지 않도록 방어. */
function specWidth(world: WorldSpec): number {
  return clamp(world?.width, WORLD_VIEWPORT_PCT, MAX_WORLD_WIDTH)
}

function zoneList(world: WorldSpec): WorldZone[] {
  return Array.isArray(world?.zones) ? world.zones : []
}

// ─── 항등(단일 무대) 폴백 ─────────────────────────────────────

function labelFor(code: string, raw: unknown): string {
  if (typeof raw === 'string') {
    const s = raw.trim().slice(0, MAX_LABEL_LEN)
    if (s.length > 0) return s
  }
  return (ZONE_LABEL_BY_CODE.get(code) ?? code).slice(0, MAX_LABEL_LEN)
}

/**
 * 기존 단일 무대를 대청 구역(0~100)으로 승격한 구역.
 * structures 는 복사해서 넘긴다 — 원본 StageSpec 배열을 world 소비처와 공유하면 변형 사고가 난다.
 */
function identityZone(stage: StageSpec | null): WorldZone {
  return {
    code: DAECHEONG_CODE,
    label: labelFor(DAECHEONG_CODE, undefined),
    x0: 0,
    x1: WORLD_VIEWPORT_PCT,
    wallpaperUrl: stage?.wallpaperUrl ?? null,
    flooringUrl: stage?.flooringUrl ?? null,
    structures: Array.isArray(stage?.structures) ? [...stage.structures] : [],
  }
}

/** 두루마리를 못 쓸 때의 안전값 = 현행 단일 화면. 폴백 자체가 회귀 0 경로다. */
function identityWorld(stage: StageSpec | null): WorldSpec {
  return { width: WORLD_VIEWPORT_PCT, zones: [identityZone(stage)] }
}

// ─── 파싱 (테마 stage jsonb → WorldSpec) ──────────────────────

function parseZone(v: unknown): WorldZone | null {
  if (!isRecord(v)) return null
  const code = parseAnchorId(pick(v, 'code', 'id', 'key'))
  if (!code) return null

  const x0 = finiteOrNull(pick(v, 'x0'))
  const x1 = finiteOrNull(pick(v, 'x1'))
  if (x0 === null || x1 === null) return null
  if (x0 < 0 || x1 > MAX_WORLD_WIDTH || x1 - x0 < MIN_ZONE_SPAN) return null

  // 벽지·바닥·구조물은 stage.ts 방어 파싱을 그대로 통과시킨다(URL 검증·앵커 규약 동일).
  // 구역에 아무 에셋이 없어도(하늘만 있는 마당 등) 구역 자체는 유효하다 → null 은 빈 세트로 해석.
  const assets = parseStageSpec(v)

  return {
    code,
    label: labelFor(code, pick(v, 'label', 'name')),
    x0: round(x0, 4),
    x1: round(x1, 4),
    wallpaperUrl: assets?.wallpaperUrl ?? null,
    flooringUrl: assets?.flooringUrl ?? null,
    structures: assets?.structures ?? [],
    // 참(true)일 때만 키를 싣는다 — 기존 구역의 모양(키 집합)을 바꾸지 않아 소비처 회귀가 0 이다
    ...(pick(v, 'tile') === true ? { tile: true } : null),
  }
}

/**
 * 논리 폭 결정. 명시값이 없으면 구역의 우측 끝에서 유도한다 —
 * 240 을 기본으로 박으면 구역이 200 까지만 있는 테마에서 카메라가 빈 공간으로 팬 할 수 있다.
 * 명시값이 구역 끝보다 좁으면 "구역이 세계 밖" 이라는 뜻이라 폭이 아니라 zones 정의가 틀린 것 → null(폴백).
 */
function resolveWidth(rawWidth: unknown, extent: number): number | null {
  const derived = Math.max(WORLD_VIEWPORT_PCT, extent)
  if (rawWidth === undefined || rawWidth === null) return round(derived, 4)
  const w = finiteOrNull(rawWidth)
  if (w === null) return null
  const rounded = round(w, 4)
  if (rounded < derived || rounded > MAX_WORLD_WIDTH) return null
  return rounded
}

/**
 * 테마 `stage` jsonb → 두루마리 세계.
 *
 * - zones 정의가 없으면 항등 폴백: 폭 100 · 대청 한 구역이 기존 무대(벽지/바닥/구조물)를 그대로 승계.
 * - zones 정의가 있으면 검증 후 채택. 하나라도 어긋나면 **부분 채택 없이** 항등 폴백으로 되돌린다 —
 *   깨진 항목만 버리면 세계에 구멍(벽지 없는 허공)이 남아 단일 무대보다 나쁜 화면이 되기 때문이다.
 *
 * 검증 항목: 수치 유한성 · 범위(x0≥0, x1≤상한, 최소 폭) · 정렬(x0 오름차순) · 겹침 · code 중복 · 폭 정합.
 * 정렬을 자동 교정하지 않는 이유: zones 는 우리가 시드로 넣는 데이터라, 조용히 고치면 저작 실수가 묻힌다.
 */
export function parseWorld(stage: StageSpec | null, raw: unknown): WorldSpec {
  if (!isRecord(raw)) return identityWorld(stage)

  const zonesRaw = pick(raw, 'zones')
  if (!Array.isArray(zonesRaw) || zonesRaw.length === 0 || zonesRaw.length > MAX_ZONES) return identityWorld(stage)

  const zones: WorldZone[] = []
  const seen = new Set<string>()
  let prevX1 = 0
  for (const item of zonesRaw) {
    const zone = parseZone(item)
    if (!zone) return identityWorld(stage)
    // code 중복은 daecheongZone 의 선택을 모호하게 만든다 → 세계 자체를 반려
    if (seen.has(zone.code)) return identityWorld(stage)
    // 앞 구역 오른쪽 끝보다 왼쪽에서 시작 = 겹침이거나 역순
    if (zone.x0 < prevX1) return identityWorld(stage)
    seen.add(zone.code)
    zones.push(zone)
    prevX1 = zone.x1
  }

  const width = resolveWidth(pick(raw, 'width'), prevX1)
  if (width === null) return identityWorld(stage)
  return { width, zones }
}

// ─── 좌표 환산 ────────────────────────────────────────────────

/** 기존 배치가 사는 구역. code 'daecheong' 우선, 없으면 첫 구역(항상 최소 1개). */
export function daecheongZone(world: WorldSpec): WorldZone {
  const zones = zoneList(world)
  return zones.find((z) => z?.code === DAECHEONG_CODE) ?? zones[0] ?? identityZone(null)
}

/**
 * 구역 로컬 x(0~100) → world x. 기존 배치 좌표를 손대지 않고 해석만 바꾸는 지점이다.
 * 로컬 좌표와 결과 모두 클램프하며, 비유한 입력은 구역 왼쪽 끝으로 떨어진다(결정론).
 */
export function toWorldX(world: WorldSpec, zone: WorldZone, localX: number): number {
  const width = specWidth(world)
  const x0 = clamp(zone?.x0, 0, width)
  const x1 = clamp(zone?.x1, 0, width)
  const span = Math.max(0, x1 - x0)
  const local = clamp(localX, 0, 100)
  return round(clamp(x0 + (local * span) / 100, 0, width), 4)
}

// ─── 카메라 ───────────────────────────────────────────────────

/**
 * 카메라 x(뷰포트 좌단의 world %) 클램프 — 0 ~ width-100.
 * 폭이 뷰포트 이하(단일 무대)면 상한이 0 이라 카메라가 고정된다.
 */
export function clampCamX(camX: number, worldWidth: number): number {
  const max = Math.max(0, clamp(worldWidth, WORLD_VIEWPORT_PCT, MAX_WORLD_WIDTH) - WORLD_VIEWPORT_PCT)
  return round(clamp(camX, 0, max), 4)
}

/**
 * **자유 팬**의 관성 목적지(camX) — 안2.1 「큰 방 하나」의 카메라 규칙.
 *
 * 손을 뗀 지점에서 속도만큼 미끄러지고 **그 자리에 그대로 선다**. 구역 정렬점·페이징·허용 오차가
 * 일절 개입하지 않는다(CEO: "원하는 곳에서 멈추는 스타일"). 이음새 없는 큰 방에서는 끌어당길
 * 기준점 자체가 없고, 있어도 자석 스냅은 "슬라이드 넘기기"로 읽혀 반려된 문법이다.
 *
 * 목적지 = camX + 속도 × τ. 느린 손놓기(속도 0)는 이동이 없어 **정확히 제자리**다 —
 * 몇 %p 때문에 사용자를 끌어당기지 않는다는 점만 zoneSnapTarget 의 허용 오차 규칙과 통한다.
 *
 * 속도 부호는 camX 기준(손가락을 왼쪽으로 밀면 camX 증가). 반환값은 항상 클램프돼 있어
 * 세계 밖으로 던져도 양끝에서 멎는다.
 */
export function freeGlideTarget(camX: number, worldWidth: number, velocityPctPerS: number): number {
  const from = clampCamX(camX, worldWidth)
  const v = Number.isFinite(velocityPctPerS) ? velocityPctPerS : 0
  return clampCamX(from + v * FREE_GLIDE_TAU_S, worldWidth)
}

/**
 * 구역의 카메라 정렬점 — 구역 중심이 뷰포트 중심에 오는 camX. 양끝 구역은 경계 클램프 때문에
 * 중심이 화면 중앙까지 오지 않는다(마당은 0, 후원은 width-100 에서 멈춘다) — 의도된 동작이다.
 * CameraRig 의 panTo(zone)·미니맵 점 위치도 이 값을 쓴다.
 */
export function zoneAlignCamX(world: WorldSpec, zone: WorldZone): number {
  const width = specWidth(world)
  const x0 = clamp(zone?.x0, 0, width)
  const x1 = clamp(zone?.x1, x0, width)
  const center = (x0 + x1) / 2
  return clampCamX(center - WORLD_VIEWPORT_PCT / 2, width)
}

/**
 * 카메라가 실제로 멈출 수 있는 정렬점 목록 — 오름차순·중복 제거.
 *
 * 양끝 구역은 경계 클램프 때문에 정렬점이 겹칠 수 있다(왼쪽에 붙은 좁은 구역 둘이 모두 0).
 * 겹친 채로 두면 "한 칸 페이징"이 같은 자리로 떨어져 플릭이 먹통으로 보이므로 값 기준으로 접는다.
 * 정렬은 방어용이다 — parseWorld 는 x0 오름차순만 통과시키지만 손으로 만든 WorldSpec 도 들어온다.
 */
function alignPoints(world: WorldSpec): number[] {
  const points = zoneList(world).map((z) => zoneAlignCamX(world, z))
  return Array.from(new Set(points)).sort((a, b) => a - b)
}

/** 목록에서 기준값에 가장 가까운 값의 인덱스. 동률이면 먼저 나온 쪽(결정론) — 목록은 오름차순이다. */
function nearestIndex(targets: readonly number[], from: number): number {
  let best = 0
  let bestD = Math.abs(targets[0] - from)
  for (let i = 1; i < targets.length; i += 1) {
    const d = Math.abs(targets[i] - from)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/**
 * 팬 종료 스냅 목적지(camX).
 *
 * ⚠️ 안2.1 부터 **팬 릴리즈 경로에서는 쓰지 않는다** — 그 자리는 freeGlideTarget(자유 팬)이 대신한다.
 *    구역 자석 스냅이 필요한 두루마리 문법(앞마당 씬 재론 등)이 다시 서면 그때 이 함수가 살아난다.
 *    지금도 zoneAlignCamX 는 입장·테마 전환 팬 목표와 미니맵이 쓰므로 이 계열 전체가 유효하다.
 *
 * - **플릭**(|속도| ≥ 30%p/s): 허용 오차를 따지지 않고 진행 방향으로 **한 구역** 페이징한다
 *   (최근접 정렬점 기준 인접 1칸). 모바일 캐러셀 관례이자, 정렬점 코앞에서 세게 튕겼는데
 *   오차 안이라고 제자리에 붙잡히면 화면이 죽은 것으로 읽히기 때문이다.
 *   끝 구역에서 바깥으로 튕기면 인덱스가 클램프되어 그 구역 정렬점에 붙는다 — 이동은 없어도 정렬은 맞춘다.
 * - **느리게 놓기**(|속도| < 30%p/s): 방향을 무시한 최근접 정렬점. 단 ±12%p 안이면 멈춘 자리를 유지한다 —
 *   이미 그 구역을 보고 있는 사용자를 몇 %p 때문에 끌어당기면 조작을 빼앗긴 느낌이 든다.
 *
 * 속도 부호는 **camX 기준**이다(CameraRig: 손가락을 왼쪽으로 밀면 camX 가 커진다).
 * 즉 양수 = 카메라가 오른쪽으로 = 다음(오른쪽) 구역, 음수 = 이전(왼쪽) 구역.
 *
 * 반환값은 항상 클램프된 camX 라 그대로 카메라에 넣어도 안전하다.
 */
export function zoneSnapTarget(camX: number, world: WorldSpec, velocityPctPerS: number): number {
  const width = specWidth(world)
  const current = clampCamX(camX, width)
  const points = alignPoints(world)
  if (points.length === 0) return current

  const v = Number.isFinite(velocityPctPerS) ? velocityPctPerS : 0
  const nearest = nearestIndex(points, current)

  if (Math.abs(v) >= ZONE_FLICK_MIN_PCT_PER_S) {
    return points[clamp(nearest + (v > 0 ? 1 : -1), 0, points.length - 1)]
  }

  const target = points[nearest]
  return Math.abs(current - target) <= ZONE_SNAP_TOLERANCE_PCT ? current : target
}
