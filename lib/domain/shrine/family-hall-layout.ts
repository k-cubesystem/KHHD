/**
 * 가족 사랑방 — 좌석 기하 + 대사 (PRD-shrine-gamefeel-v1 §안3 / ARCH §2 FamilyHall).
 *
 * 중앙 공동 등불을 두고 방석이 **반원**으로 놓인다. 열린 쪽(아래)이 보는 사람 방향이라
 * 등불이 가리지 않고, 양끝 좌석이 앞(큰 스케일)·가운데 좌석이 뒤(작은 스케일)로 앉는다.
 *
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now()/Math.random() 사용 금지.
 * 좌표는 **부모 박스에 대한 %** 라 두루마리 후원 구역이든 단독 화면이든 그대로 쓴다.
 * (렌더·애니메이션은 components/shrine/scene/FamilyHall.tsx 책임)
 */

import { ELEMENT_AVATARS, findFamilyAvatar } from '@/lib/domain/family/avatars'
import { clampPct } from '@/lib/domain/shrine/zones'

/** 방석 최대 수. 그 이상은 앉히지 않고 "외 N명"으로 접는다 — 반원이 뭉개지기 시작하는 경계. */
export const HALL_MAX_SEATS = 8

/**
 * 좌석 상자의 최소 실측 폭(px). 후원 구역은 실기기에서 250px 안팎이라 % 만으로 크기를 정하면
 * 방석이 40px대로 줄어 "사람이 앉아 있다"로 읽히지 않고 터치 타깃도 44px 규율에 미달한다.
 * 렌더는 `max(폭%, 이 값)` 으로 하한을 걸어 좁은 박스에서도 오브가 손가락에 잡히게 한다.
 */
export const HALL_SEAT_MIN_PX = 60

/** 반원 기하 — 중심(cx,cy)과 반지름(rx,ry). 아래가 열린 위쪽 호(弧)를 쓴다. */
export const HALL_ARC = { cx: 50, cy: 63, rx: 33, ry: 20 } as const

/** 중앙 공동 등불 위치 — 반원의 열린 품 안(호 중심보다 앞). */
export const HALL_LANTERN = { x: 50, y: 72 } as const

/** 가장 뒤(호 꼭대기) 좌석이 줄어드는 비율. v2 무대 depthScale 과 같은 결의 약한 원근. */
const DEPTH_SCALE_DROP = 0.14

/** 좌석 기준 폭(%) — 인원이 늘수록 줄여 이웃과 겹치지 않게 한다. */
const SEAT_SIZE_MAX = 24
const SEAT_SIZE_MIN = 13
const SEAT_SIZE_STEP = 1.6

const DEG = Math.PI / 180

export interface HallSeat {
  /** 방석 중심 x — 부모 박스 폭 % */
  x: number
  /** 방석 중심 y — 부모 박스 높이 % */
  y: number
  /** 원근 스케일(뒤일수록 작다). seatSizePct 에 곱해 쓴다. */
  scale: number
  /** 겹침 순서 — 앞(아래) 좌석일수록 크다. 그대로 zIndex 로 쓸 수 있다. */
  z: number
}

export interface HallLayout {
  seats: HallSeat[]
  lantern: { x: number; y: number }
  /** 좌석 1개의 기준 폭(부모 박스 폭 %). 실제 폭 = seatSizePct × seat.scale */
  seatSizePct: number
  /** 방석이 모자라 앉히지 못한 인원 수 */
  overflow: number
}

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/** 인원 수 정규화 — 비유한·음수는 0석, 상한 초과는 잘라 앉힌다. */
function seatCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.min(HALL_MAX_SEATS, Math.floor(count))
}

/** 방석 크기 — 1~3명은 넉넉하게, 8명이면 최소 폭. 좌석마다 같은 값(원근은 scale 이 담당). */
export function hallSeatSizePct(count: number): number {
  const n = seatCount(count)
  if (n === 0) return SEAT_SIZE_MAX
  return round(clamp(SEAT_SIZE_MAX - (n - 1) * SEAT_SIZE_STEP, SEAT_SIZE_MIN, SEAT_SIZE_MAX), 2)
}

/**
 * i번째 좌석의 호 각도(도). 왼쪽 끝 180° → 오른쪽 끝 0°.
 *
 * 2명 이상이면 호 **양 끝까지** 균등 분할한다 — 끝 좌석이 앞(가장 큰 스케일)에 앉아
 * 반원의 실루엣이 살고 등불을 사이에 둔 구도가 된다.
 * 1명은 나눌 끝이 없으므로 꼭대기(90°) 한 자리 — 등불 뒤에 홀로 앉는다.
 */
function seatAngleDeg(index: number, count: number): number {
  if (count <= 1) return 90
  return 180 - (index * 180) / (count - 1)
}

/**
 * 반원 좌석 배치. count 는 사랑방에 앉힐 인원(본인 포함).
 * 0명이면 좌석 없이 등불만 — 호출부가 빈 상태 카피를 얹는다.
 */
export function hallLayout(count: number): HallLayout {
  const n = seatCount(count)
  const seatSizePct = hallSeatSizePct(n)
  const seats: HallSeat[] = []

  for (let i = 0; i < n; i += 1) {
    const theta = seatAngleDeg(i, n) * DEG
    // depth 1 = 호 꼭대기(가장 뒤), 0 = 양 끝(가장 앞)
    const depth = Math.sin(theta)
    seats.push({
      x: round(HALL_ARC.cx + HALL_ARC.rx * Math.cos(theta), 2),
      y: round(HALL_ARC.cy - HALL_ARC.ry * depth, 2),
      scale: round(1 - DEPTH_SCALE_DROP * depth, 3),
      z: Math.round((1 - depth) * 100),
    })
  }

  const requested = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
  return {
    seats,
    lantern: { ...HALL_LANTERN },
    seatSizePct,
    overflow: Math.max(0, requested - n),
  }
}

// ─── 사용자 재배치 좌석 (꾸미기 모드 드래그) ────────────────────────────────

/**
 * 좌석을 끌어 놓을 수 있는 범위 — 부모 박스 %. ZONES(아이템 배치)와 같은 역할이고
 * 클램프도 같은 함수(zones.clampPct)를 쓴다. 클라·서버가 이 하나만 보게 해서
 * "클라에서만 가둔 좌표"가 DB 에 남는 길을 없앤다.
 *
 * 자동 배치 반원(x 17~83 · y 43~63)을 완전히 품는다 — 저장 이력이 없는 좌석은 자동 좌표를
 * 그대로 쓰는데, 범위가 그보다 좁으면 첫 드래그도 없이 기존 화면이 흔들린다.
 * 상하 여유는 좌석 상자 기하에서 왔다: 오브 꼭대기는 방석 중심에서 상자 폭의 0.74배 위,
 * 이름표는 0.2배 아래. 좁은 후원 박스(폭 250px 안팎)에서 그 값이 대략 ±8%p 다.
 */
export const HALL_SEAT_ZONE = {
  x: [14, 86] as [number, number],
  y: [30, 86] as [number, number],
} as const

/** 본인 좌석의 저장 키. 본인은 family_members 행이 아니라 id 가 없다. */
export const HALL_SELF_SEAT_KEY = 'self'

/** 저장 키 최대 길이 — uuid(36)에 여유를 둔 값. 넘으면 버린다(무한 길이 키 방어). */
const SEAT_KEY_MAX_LEN = 64

/** 프로토타입 오염 경로가 되는 키는 저장하지 않는다. */
const UNSAFE_SEAT_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype'])

/** 좌석 하나의 저장 좌표(부모 박스 %). */
export interface HallSeatPos {
  x: number
  y: number
}

/** 좌석 키 → 저장 좌표. 키가 없는 좌석은 자동 배치를 쓴다(부분 저장이 정상 상태다). */
export type HallSeatMap = Record<string, HallSeatPos>

/** 빈 배치(=전부 자동). 초기화가 저장하는 값이기도 하다. */
export const EMPTY_HALL_SEATS: HallSeatMap = {}

/** 좌석 저장 키 — 본인은 'self', 가족은 family_members.id. 클라·서버 공용 계약. */
export function hallSeatKey(memberId: string | null | undefined): string {
  return typeof memberId === 'string' && memberId.length > 0 ? memberId : HALL_SELF_SEAT_KEY
}

/**
 * y → 원근 깊이(0=가장 앞·1=가장 뒤). 자동 배치의 depth=sin(theta) 와 **같은 축**이라
 * 자동 좌석 y 를 넣으면 자동 좌석과 같은 스케일·겹침 순서가 나온다(끌어 놓은 좌석만 재계산해도 화면이 섞이지 않는다).
 */
export function hallSeatDepth(y: number): number {
  if (!Number.isFinite(y)) return 0
  return clamp((HALL_ARC.cy - y) / HALL_ARC.ry, 0, 1)
}

/** 끌어 놓은 좌석의 원근 스케일 — 앞(아래)으로 갈수록 커진다. */
export function hallSeatScale(y: number): number {
  return round(1 - DEPTH_SCALE_DROP * hallSeatDepth(y), 3)
}

/** 끌어 놓은 좌석의 겹침 순서 — 앞(아래) 좌석이 위에 그려진다. */
export function hallSeatZ(y: number): number {
  return Math.round((1 - hallSeatDepth(y)) * 100)
}

/**
 * 저장 좌표 파싱 + 클램프. **DB jsonb 와 서버 액션 인자 양쪽의 유일한 관문**이다.
 * 형태가 어긋난 항목은 통째로 버리고 남은 것만 살린다 — 한 좌석이 깨져도 방 전체가 자동 배치로 되돌아가지 않게.
 * 좌표는 소수 2자리로 접는다(jsonb 크기 + 서버·클라 값 동일성).
 */
export function parseHallSeats(raw: unknown): HallSeatMap {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: HallSeatMap = {}
  let kept = 0
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // 렌더되는 좌석 수만큼만 받는다 — 그 이상은 화면에 나오지 않아 저장할 이유가 없다(페이로드 상한).
    if (kept >= HALL_MAX_SEATS) break
    if (key.length === 0 || key.length > SEAT_KEY_MAX_LEN || UNSAFE_SEAT_KEYS.has(key)) continue
    if (typeof value !== 'object' || value === null) continue
    const { x, y } = value as { x?: unknown; y?: unknown }
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
    out[key] = { x: round(clampPct(x, HALL_SEAT_ZONE.x), 2), y: round(clampPct(y, HALL_SEAT_ZONE.y), 2) }
    kept += 1
  }
  return out
}

/**
 * 자동 배치 위에 저장 좌표를 덮어쓴다. keys[i] 는 seats[i] 에 앉는 식구의 저장 키다.
 *
 * 저장 이력이 없는 좌석은 **자동 좌표를 손대지 않는다**(값을 다시 계산하지도 않는다) —
 * 마이그레이션 없이 기존 사용자 화면이 그대로여야 하므로, 반올림 차이조차 만들지 않는 것이 계약이다.
 * 덮어쓸 좌석이 하나도 없으면 **같은 참조**를 돌려 헛 리렌더를 내지 않는다.
 */
export function applyHallSeats(
  layout: HallLayout,
  keys: readonly string[],
  saved: HallSeatMap | null | undefined
): HallLayout {
  if (!saved) return layout
  let changed = false
  const seats = layout.seats.map((seat, i) => {
    const pos = Object.prototype.hasOwnProperty.call(saved, keys[i]) ? saved[keys[i]] : undefined
    if (!pos) return seat
    const x = round(clampPct(pos.x, HALL_SEAT_ZONE.x), 2)
    const y = round(clampPct(pos.y, HALL_SEAT_ZONE.y), 2)
    changed = true
    return { x, y, scale: hallSeatScale(y), z: hallSeatZ(y) }
  })
  return changed ? { ...layout, seats } : layout
}

// ─── 좌석 오브 (아바타 해석 + 폴백) ──────────────────────────────────────────

/**
 * 미해석 좌석의 오브 색 후보 — 오행 정령 5색. 이름에서 결정론으로 골라 식구끼리 서로 구분되게 한다.
 * (같은 색 하나로 통일하면 아바타를 안 고른 가족이 전부 똑같이 보여 "누가 누구인지"가 사라진다.)
 */
const FALLBACK_COLORS: readonly string[] = ELEMENT_AVATARS.map((a) => a.color)

/** 정령 카탈로그가 비는 사고에 대비한 최후 색 — DESIGN.md 골드. */
const FALLBACK_COLOR = '#C9A84C'

/** 이름이 통째로 비었을 때 오브에 새길 글자. 빈 문자열이면 오브가 사라진 것처럼 보인다. */
const FALLBACK_INITIAL = '·'

export interface HallAvatar {
  /** 오브를 채울 초상 경로. null 이면 `initial` 을 새긴 오브를 그린다 — 둘 중 하나는 **항상** 있다. */
  src: string | null
  /** 오브 배경·테두리 색조 */
  color: string
  /** 초상이 없을 때 오브에 새기는 한 글자 */
  initial: string
  /** 카탈로그에서 해석된 아바타인가. false = 폴백(본인 좌석·미설정·빈 문자열·미매칭 id) */
  resolved: boolean
}

/** 이름 → 결정론 시드(코드포인트 합). 폴백 색 선택 전용이라 충돌해도 무해하다. */
function nameSeed(name: string): number {
  let sum = 0
  for (const ch of name) sum = (sum + (ch.codePointAt(0) ?? 0)) % 100_000
  return sum
}

/** 이름의 첫 글자. 서로게이트 페어(이모지)도 쪼개지지 않게 코드포인트 단위로 자른다. */
function initialOf(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  return Array.from(trimmed)[0] ?? FALLBACK_INITIAL
}

/**
 * 좌석 오브의 그림 재료. **어떤 avatar_id 가 와도 시각 실체를 돌려준다.**
 *
 * 사랑방이 "이름만 나오는" 실기기 증상의 뿌리가 여기였다 — 좌석의 avatar_id 는
 * 본인 좌석이 항상 NULL(get_family_hall_presence 가 NULL 로 고정 발급)이고,
 * 가족 좌석도 미설정(NULL)·빈 문자열이 다수라 카탈로그 조회가 대부분 빈손으로 끝난다.
 * 그래서 미해석은 실패가 아니라 **정상 경로**로 취급하고 이니셜 오브로 떨어뜨린다.
 *
 * 결정론이다(하이드레이션 규율) — 같은 (avatarId, name)이면 서버·클라가 같은 오브를 그린다.
 */
export function hallAvatar(avatarId: string | null | undefined, name: string): HallAvatar {
  const safeName = typeof name === 'string' ? name : ''
  const initial = initialOf(safeName)
  const found = findFamilyAvatar(avatarId)
  if (found) return { src: found.src, color: found.color, initial, resolved: true }
  const palette = FALLBACK_COLORS.length > 0 ? FALLBACK_COLORS : [FALLBACK_COLOR]
  return { src: null, color: palette[nameSeed(safeName) % palette.length], initial, resolved: false }
}

// ─── 대사 (결정론 · keeper-lines 문체) ────────────────────────────────────────

function pick<T>(arr: readonly T[], seed: number): T {
  const i = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0
  return arr[i % arr.length]
}

/** 오늘 다녀간 자리 — 치하. */
const SEATED_LINES = [
  '님, 오늘 다녀가셨소. 등불이 곱게 타는구려.',
  '님의 정성이 이 자리에 남았소.',
  '님, 오늘 몫의 기도는 끝났소 — 편히 쉬시게.',
] as const

/** 아직 오지 않은 자리 — 애틋함. 재촉·죄책감 금지(PRD 검수 포인트 ②). */
const EMPTY_LINES = [
  '님 자리는 비워 두었소. 언제든 오시면 되오.',
  '님은 아직이오. 등불은 내가 켜 두겠소.',
  '님을 기다리는 방석이오. 오늘도 아직 늦지 않았소.',
] as const

/**
 * 아바타 탭 말풍선 1줄. 이름 + 오늘 기도 여부로 갈리고, seed 로 골라 **결정론**을 지킨다
 * (하이드레이션 규율 — 같은 입력이면 서버·클라 같은 문장).
 * 이름은 그대로 이어붙이고 렌더는 텍스트로만 한다 — keeper-lines 처럼 HTML 을 넣지 않는다.
 */
export function hallSeatLine(name: string, prayedToday: boolean, seed: number): string {
  const who = name.trim() || '이 자리의 식구'
  return who + pick(prayedToday ? SEATED_LINES : EMPTY_LINES, seed)
}

/** 전원 기도 달성(만개) 한 줄. */
export const HALL_ALL_PRAYED_LINE = '온 식구가 다녀갔소 — 사랑방에 불이 만개했구려.'

/** 아직 아무도 앉지 않은 사랑방(가족 미등록·조회 실패) 한 줄. */
export const HALL_EMPTY_LINE = '아직 이 방엔 아무도 앉지 않았소. 식구를 들이면 자리가 생기오.'

/**
 * 마지막 기도로부터 지난 날수(KST 일 단위). 미기록·미래 시각·파싱 실패는 null.
 * 말풍선 보조 문구 전용이라 **탭한 뒤에만** 쓴다 — SSR 시점에 now 를 읽으면 하이드레이션이 어긋난다.
 */
export function hallDaysSince(lastWishAt: string | null | undefined, nowMs: number): number | null {
  if (!lastWishAt) return null
  const t = Date.parse(lastWishAt)
  if (!Number.isFinite(t) || !Number.isFinite(nowMs)) return null
  const KST = 9 * 60 * 60 * 1000
  const day = 24 * 60 * 60 * 1000
  const from = Math.floor((t + KST) / day)
  const to = Math.floor((nowMs + KST) / day)
  const diff = to - from
  return diff < 0 ? null : diff
}
