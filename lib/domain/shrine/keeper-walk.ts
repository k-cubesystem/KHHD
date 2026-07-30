/**
 * 신당 게임필 안2.2 「거니는 신당지기」 — 보행 기하 (PRD-shrine-gamefeel-v1 부록 B).
 *
 * 보행은 CSS keyframes 로만 돈다(rAF 상주 금지 · ARCH §5). CSS 키프레임의 **정지 지점 %는 정적**이라
 * 배회 구간이 바뀌어도 걸음 속도가 일정하려면 구간 길이비가 항상 같아야 한다. 그 제약을 만족하는
 * 구성이 **구간 중점에서 출발하는 왕복**이다:
 *
 *   중점 → 오른끝 → 왼끝 → 중점   (거리비 ½ : 1 : ½)  →  키프레임 0% · 25% · 75% · 100%
 *
 * 거리비가 정확히 1:2:1 이라 고정 %만으로 등속이 되고(구간 좌표는 CSS 변수로 주입), 한 바퀴는
 * 구간을 두 번 훑는 길이(2×legMs)가 된다. 그리고 **입장 도착점을 이 중점에 맞추면** 입장 걷기가
 * 끝나는 프레임과 배회 첫 프레임의 좌표·속도가 모두 이어져 순간이동·정지 프레임이 0 이 된다.
 *
 * 전 함수 순수·결정론 — DOM/Date.now()/Math.random() 접근 금지(SSR 과 클라 결과가 같아야 한다).
 */

/** 배회 구간(구역 로컬 %). from>to 여도 정규화하므로 호출 측이 순서를 신경 쓰지 않는다. */
export interface KeeperRange {
  from: number
  to: number
}

/** 입장 걷기 구간 — 문간(from)에서 제단 옆까지 ms 동안 1회. */
export interface KeeperEntranceSpec {
  from: number
  to: number
  ms: number
}

export interface KeeperWalkPlan {
  /** 배회 구간 왼끝·오른끝 (구역 로컬 %) */
  lo: number
  hi: number
  /** 정지 위치 = 구간 중점. 입장 도착점 · 모션최소화 정위치 · 공물 판정 기준점이 모두 이 x 다. */
  rest: number
  /** 배회 여부. false = rest 에 정위치(레거시 단일 무대 회귀 경로) */
  wanders: boolean
  /** 한 바퀴(중점→오른끝→왼끝→중점) 길이 ms. 배회하지 않으면 0. */
  cycleMs: number
}

/** 방 안(구역 로컬 %) 좌표 범위 */
const X_MIN = 0
const X_MAX = 100
/** 이보다 좁은 구간은 '배회 없음'으로 본다 — 몇 px 왕복은 떨림으로만 보인다. */
const MIN_SPAN_PCT = 0.5
/**
 * 배회 구간을 한 번 훑는 시간.
 *
 * 부록 B 초안 24s → **30s**(부록 C ② 3차 검수: "지나가 버린다"). 입장 걷기를 3600ms 로 늦춘 만큼
 * 배회도 같은 비율로 늦춰야 도착하는 걸음과 거니는 걸음의 속도가 이어진다 —
 * 승계 프레임에서 걸음 빠르기가 튀면 "순간이동 0" 계약이 지켜져도 어색하게 읽힌다.
 */
export const KEEPER_WANDER_LEG_MS = 30_000
/** 방어 상한 — 잘못된 값이 와도 걸음이 사실상 멈추거나 조작 불가 구간이 길어지지 않게 한다. */
const MAX_LEG_MS = 600_000
const MAX_ENTRANCE_MS = 10_000

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 유한수 클램프. NaN/Infinity 는 min 으로 떨어뜨려 결정론을 유지한다(world.ts 와 같은 규약). */
function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/**
 * 배회 계획. legMs 는 구간을 한 번 훑는 시간이라 한 바퀴는 그 두 배다 —
 * 「구간 1회 legMs infinite alternate」와 같은 걸음 속도를 중점 출발 왕복으로 옮긴 값이다.
 */
export function planKeeperWalk(range: KeeperRange, legMs: number = KEEPER_WANDER_LEG_MS): KeeperWalkPlan {
  const a = clamp(range?.from, X_MIN, X_MAX)
  const b = clamp(range?.to, X_MIN, X_MAX)
  const lo = round(Math.min(a, b), 4)
  const hi = round(Math.max(a, b), 4)
  const leg = clamp(legMs, 0, MAX_LEG_MS)
  const wanders = hi - lo >= MIN_SPAN_PCT && leg > 0
  return {
    lo,
    hi,
    rest: round((lo + hi) / 2, 4),
    wanders,
    cycleMs: wanders ? Math.round(leg * 2) : 0,
  }
}

/** 배회 정지 위치만 필요한 호출부(공물 판정·파티클 폴백)용 단축. */
export function keeperRestX(range: KeeperRange): number {
  return planKeeperWalk(range).rest
}

/**
 * 입장 걷기 계획.
 *
 * ⚠️ 도착점은 **배회 시작점(중점)으로 스냅**한다. entrance.to 는 "제단 옆" 이라는 의도를 담은 값이고,
 *    실제 도착이 중점과 다르면 배회가 이어받는 프레임에 그 차이만큼 순간이동이 생긴다(정지 프레임 0 계약).
 *    호출 측이 to 에 중점을 넣으면 이 스냅은 항등이다.
 *
 * 이동 거리가 없거나 시간이 0 이면 null — 걷기 애니메이션 자체를 걸지 않는다.
 */
export function planKeeperEntrance(
  entrance: KeeperEntranceSpec | null,
  plan: KeeperWalkPlan
): KeeperEntranceSpec | null {
  if (!entrance) return null
  const ms = Math.round(clamp(entrance.ms, 0, MAX_ENTRANCE_MS))
  if (ms <= 0) return null
  const from = round(clamp(entrance.from, X_MIN, X_MAX), 4)
  const to = plan.rest
  if (Math.abs(to - from) < MIN_SPAN_PCT) return null
  return { from, to, ms }
}
