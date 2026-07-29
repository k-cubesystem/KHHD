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

/** 방석 최대 수. 그 이상은 앉히지 않고 "외 N명"으로 접는다 — 반원이 뭉개지기 시작하는 경계. */
export const HALL_MAX_SEATS = 8

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
