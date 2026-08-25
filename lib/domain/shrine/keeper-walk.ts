/**
 * 신당 게임필 안2.2 「거니는 신당지기」 — 보행 기하 (PRD-shrine-gamefeel-v1 부록 B).
 *
 * 보행은 CSS keyframes 로만 돈다(rAF 상주 금지 · ARCH §5). CSS 키프레임의 **정지 지점 %는 정적**이라
 * 배회 구간이 바뀌어도 걸음 속도가 일정하려면 구간 길이비가 항상 같아야 한다. 그 제약을 만족하는
 * 구성이 **구간 중점에서 출발하는 왕복**이다:
 *
 *   [참배] → 오른끝 → 제단 → [참배] → 왼끝 → 제단   (걷는 거리비 ½ : ½ : ½ : ½)
 *
 * ── 「제단 참배」 (2026-08-25 · CEO A안) ──────────────────────────────────────
 * 종전은 «중점 → 오른끝 → 왼끝 → 중점» 왕복이라 신수가 제단 앞을 **지나쳐 갔다**. 왜 거기 있는지가
 * 그림에 없었다. 이제 한쪽 끝을 돌 때마다 **제단(중점)으로 돌아와 멈춰 절하고** 반대편으로 간다 —
 * 신수가 신을 지키는 존재라는 세계관이 걸음 자체로 읽힌다.
 *
 * 네 걷기 구간이 전부 «반 구간»이라 거리비가 1:1:1:1 이고, 멈춤(참배)은 양쪽에 같은 몫으로 들어가
 * **고정 %만으로 등속**이 유지된다(구간 좌표는 CSS 변수로 주입).
 *
 * 🔴 한 바퀴 길이가 늘어난 것은 «걸음이 느려져서»가 아니라 **멈춤이 들어가서**다. 걷는 속도를
 *    종전과 한 픽셀도 다르지 않게 두려고 `walkMs`(걷는 시간 총합 = 2×legMs)를 **불변량으로 두고**
 *    cycleMs 를 그 위에서 파생시킨다(cycleMs = walkMs ÷ 걷기 비중). 입장 걷기 속도도 walkMs 에서
 *    파생하므로(entranceMsFor) 참배를 넣거나 빼도 입장이 흔들리지 않는다.
 *
 * 그리고 **입장 도착점을 이 중점에 맞추면** 입장 걷기가 끝나는 프레임과 배회 첫 프레임의 좌표가
 * 이어져 순간이동·정지 프레임이 0 이 된다(참배가 0% 에서 시작하므로 도착 즉시 첫 절을 올린다).
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
  /** 한 바퀴(참배→오른끝→제단→참배→왼끝→제단) 길이 ms. 배회하지 않으면 0. */
  cycleMs: number
  /**
   * 한 바퀴 중 **실제로 걷는** 시간 총합 ms(= 2×legMs). 참배 멈춤은 빠져 있다.
   *
   * 🔴 걸음 «속도»의 단일 출처다. 참배 비중을 조정해도 이 값이 그대로면 걷는 속도가 안 변한다 —
   *    입장 걷기(entranceMsFor)가 이 값에서 파생하는 이유이기도 하다.
   */
  walkMs: number
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

/**
 * 한 바퀴에서 **걷는 시간의 비중** — 나머지가 제단 앞 참배(멈춤)다.
 *
 * 🔴 CSS 키프레임(`shrineKeeperWander`)의 정지 %와 **짝이다**. 여기만 바꾸면 걸음이 키프레임과
 *    어긋나 신수가 제단을 지나쳐 절하거나 허공에서 절한다. 둘의 정합은 테스트가 CSS 를 읽어 잡는다.
 *    현재 키프레임: 참배 0~15% · 65~50% 두 번(합 30%) + 걷기 네 구간(각 17.5%, 합 70%).
 */
export const KEEPER_WALK_DUTY = 0.7
/** 방어 상한 — 잘못된 값이 와도 걸음이 사실상 멈추거나 조작 불가 구간이 길어지지 않게 한다. */
const MAX_LEG_MS = 600_000
const MAX_ENTRANCE_MS = 10_000

/**
 * 입장 걸음이 배회 걸음의 몇 배 속도인가 (안2.4 / CEO 4차 "입장속도 아직 빠름").
 *
 * ⚠️ 4차 검수의 진짜 원인은 "3600ms 가 짧다"가 아니라 **두 속도가 따로 놀았다**는 것이다.
 * 안2.3 까지 입장 37%p/3600ms = 10.3%p/s, 배회 28%p/30000ms = 0.93%p/s 로 입장이 배회보다
 * **11배** 빨랐다. 주석은 "같은 비율로 늦췄다"고 적혀 있었지만 두 상수가 각자 조정돼 온 결과다.
 * 도착 직후 같은 인물이 11배 느려지니 입장은 아무리 늘려도 "지나가 버리는" 걸음으로 읽힌다.
 *
 * 그래서 입장 ms 를 상수로 두지 않고 **배회 속도에서 파생**시킨다 — 한쪽만 고쳐 다시 어긋날 수 없다.
 * 4배로 잡은 근거: 3배는 상한 10s 를 넘고(37%p ÷ (0.933×3) ≈ 13.2s), 4배면 ≈9.9s 로 상한 안에
 * 들어오면서 승계 불연속이 11배 → 4배로 줄어든다. "목적을 가지고 걸어 들어오는" 결은 유지된다.
 */
export const ENTRANCE_PACE_RATIO = 4

/**
 * 배회 속도에서 파생한 입장 걷기 길이(ms).
 *
 * 배회 속도 = 구간 폭 ÷ legMs. 입장은 그 `ratio` 배로 걷는다 → ms = 거리 ÷ (배회속도 × ratio).
 * 배회하지 않는 방(구간이 좁은 레거시 단일 무대)은 기준 속도가 없으므로 null — 호출측은
 * 걷기 애니메이션을 걸지 않는다(종전 정위치 렌더와 같다).
 */
export function entranceMsFor(fromX: number, plan: KeeperWalkPlan, ratio: number = ENTRANCE_PACE_RATIO): number | null {
  if (!plan.wanders || plan.walkMs <= 0) return null
  const from = clamp(fromX, X_MIN, X_MAX)
  const distance = Math.abs(plan.rest - from)
  if (distance < MIN_SPAN_PCT) return null
  const r = clamp(ratio, 1, 100)
  // 한 바퀴에서 걷는 거리는 «구간 2번»이고 그 시간이 walkMs 다 — 참배 멈춤은 속도에 안 들어간다.
  const wanderPctPerMs = ((plan.hi - plan.lo) * 2) / plan.walkMs
  if (wanderPctPerMs <= 0) return null
  return Math.round(clamp(distance / (wanderPctPerMs * r), 0, MAX_ENTRANCE_MS))
}

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
  const walkMs = wanders ? Math.round(leg * 2) : 0
  return {
    lo,
    hi,
    rest: round((lo + hi) / 2, 4),
    wanders,
    // 걷는 시간은 그대로 두고 참배 몫만큼 한 바퀴가 길어진다 — 걸음 속도 불변(위 주석).
    cycleMs: wanders ? Math.round(walkMs / KEEPER_WALK_DUTY) : 0,
    walkMs,
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
