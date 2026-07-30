/**
 * 신위(神位) 탭 회전 — 국면(局面) 표의 **단일 출처** (안2.3 ④ / PRD-shrine-gamefeel-v1 부록 C).
 *
 * ── 왜 도메인 모듈인가
 * 회전 한 동작에 네 곳이 관여한다. 컴포넌트(components/shrine/scene/DeityTurn.tsx) ·
 * 연출 CSS(app/shrine-scene.css) · 에셋 생성 스크립트(scripts/shrine-assets/deity-turnaround.mjs) ·
 * 배포 게이트(scripts/check-animation-css.mjs). 넷이 각자 표를 들면 한 곳만 고쳤을 때
 * **조용히** 어긋난다 — 프레임과 몸통이 따로 놀거나, 굽지 않은 각을 CSS 가 기다린다.
 * 그래서 국면 수·각도·프레임 키·시각·%를 여기서만 만든다. 컴포넌트는 이 표를 직접 읽고,
 * CSS·스크립트·게이트는 **테스트가 이 표와 대조**한다(__tests__/deity-turn.test.ts).
 *
 * ── 왜 45° 인가 (5국면 → 9국면)
 * 종전 5국면(0·90·180·270·360)은 한 걸음이 90° 라, 프레임이 바뀔 때마다 자세가 훅 건너뛰어
 * "회전"이 아니라 "그림 교체"로 읽혔다. 45° 씩 여덟 걸음이면 건너뛰는 각이 절반이라 눈이
 * 중간 자세를 스스로 보충한다. 그런데 **굽는 장수는 늘지 않는다** — 180° 를 넘는 절반
 * (225·270·315)은 그 대칭각(135·90·45)을 좌우 반전해 그대로 쓴다.
 * 실제로 구울 프레임은 q45·side·q135·back 넷(정면은 DB sprite_url)이고, 그중 side·back 은 이미 있다.
 *
 * ── 등급(tier): 가진 프레임만큼만 돈다
 * 프레임 실재 판정은 **클라이언트 프리로드**가 한다(서버 fs 확인은 Vercel 람다에 public/ 이 없어
 * 배포에서 항상 false = 무증상 파손). 넷 다 있으면 9국면, side·back 만 있으면 종전 5국면,
 * 그마저 없으면 rotateY 폴백이다. 그래서 q45·q135 를 굽기 전에 코드를 올려도 시범 2신위는
 * 지금 그대로 5국면으로 돈다(회귀 없음).
 */

/** 한 걸음의 각도. 360 을 나누어떨어져야 대칭 재사용(180° 기준 반사)이 성립한다. */
export const TURN_STEP_DEG = 45
/** 정면→정면 걸음 수. 8걸음 = 아홉 국면(0°~360°). */
export const TURN_STEPS = 360 / TURN_STEP_DEG

/** 프레임 키. `base` 는 DB `sprite_url`(정면)이라 굽지 않는다. */
export type DeityFrameKey = 'base' | 'q45' | 'side' | 'q135' | 'back'

/** 0°~180° 각도별 프레임 키(인덱스 = deg / TURN_STEP_DEG). 나머지 반 바퀴는 이 표를 뒤집어 쓴다. */
const HALF_TURN_FRAMES: readonly DeityFrameKey[] = ['base', 'q45', 'side', 'q135', 'back']

/** 실제로 구워야 하는 프레임 키 — 경로 규약(deities.deityTurnFrames)과 생성 스크립트가 같은 목록을 본다. */
export const BAKED_FRAME_KEYS = ['q45', 'side', 'q135', 'back'] as const
export type BakedFrameKey = (typeof BAKED_FRAME_KEYS)[number]

// ── 타임라인 ────────────────────────────────────────────────────
/** 정면에서 떠나 정면으로 돌아오는 데 걸리는 시간 */
const TURN_MS = 1300
/** 착지 스쿼시 여운 — 한 바퀴를 마친 뒤 몸통이 1.04→1 로 가라앉는 시간 */
const LAND_MS = 180
/** 프레임·몸통 애니메이션 총 길이 (CSS `--deity-spin-ms`) */
export const SPIN_MS = TURN_MS + LAND_MS

/** 옷자락 트레일 잔상 — 겹 수와 겹당 지연(ms). 같은 애니메이션을 늦춘 시간 이동 복제라 타이머가 없다. */
export const GHOST_LAYERS = 2
export const GHOST_LAG_MS = 45
/** 회전 1회의 총 점유 시간 = 탭 잠금 길이(재생 중 재탭 무시). 마지막 잔상이 끝나는 시점이다. */
export const SPIN_TOTAL_MS = SPIN_MS + GHOST_LAG_MS * GHOST_LAYERS

/**
 * 각도가 smoothstep(3u²−2u³)을 따르게 만드는 **시각** — 즉 smoothstep 의 역함수.
 *
 * 등간격 각도를 등간격 시각에 놓으면(선형) 모터가 도는 것처럼 보인다. 사람이 제자리에서 도는
 * 동작은 관성이 있어 처음엔 천천히 떠나고 반 바퀴(뒷면)에서 가장 빠르며 정면으로 감속해 멎는다.
 * 닫힌 해가 있어 수치해법이 필요 없다: u = 1/2 − sin(asin(1−2x)/3).
 * (검산: 이 식이 주는 첫 국면 287ms 는 5국면 시절 손으로 맞췄던 280ms 와 3ms 차다.)
 */
function smoothstepInverse(x: number): number {
  return 0.5 - Math.sin(Math.asin(1 - 2 * x) / 3)
}

/** CSS 키프레임 %와 같은 정밀도. 그 이상은 산출물에 적을 수 없다. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 각도 → 프레임 키. 180° 를 넘으면 대칭각을 좌우 반전해 쓴다(굽는 장수가 절반인 근거). */
function frameForDeg(deg: number): { frame: DeityFrameKey; mirrored: boolean } {
  const mirrored = deg > 180 && deg < 360
  const half = deg > 180 ? 360 - deg : deg
  return { frame: HALF_TURN_FRAMES[half / TURN_STEP_DEG], mirrored }
}

export interface TurnPhase {
  /** 걸음 번호 0~TURN_STEPS (마지막 = 정면 복귀) */
  step: number
  /** 누적 회전각(도) */
  deg: number
  frame: DeityFrameKey
  /** 좌우 반전 재사용 여부 */
  mirrored: boolean
  /** 국면 진입 시각(ms) */
  atMs: number
  /** SPIN_MS 대비 % — CSS 키프레임 %의 정본 */
  atPct: number
}

/** 9국면 표(0°·45°…360°). CSS 의 모든 % 는 여기서 나온다. */
export const TURN_PHASES: readonly TurnPhase[] = Array.from({ length: TURN_STEPS + 1 }, (_, step) => {
  const deg = step * TURN_STEP_DEG
  const atMs = Math.round(TURN_MS * smoothstepInverse(step / TURN_STEPS))
  return { step, deg, ...frameForDeg(deg), atMs, atPct: round2((atMs / SPIN_MS) * 100) }
})

/** 한 바퀴를 마치고 정면에 착지하는 %. 이 뒤 100% 까지가 스쿼시 여운이다. */
export const LAND_PCT = TURN_PHASES[TURN_STEPS].atPct

/**
 * 겹쳐 둘 프레임 한 겹(= DOM `<img>` 하나).
 * index 는 클래스(`.deity-turn-step-{index}`)와 키프레임(`deityTurnStep{index}`) 접미사를 겸한다 —
 * 겹 수가 바뀌면 CSS 도 같은 이름으로 따라와야 하고, 그 대조를 테스트가 한다.
 */
export interface TurnLayer {
  index: number
  frame: DeityFrameKey
  mirrored: boolean
  deg: number
  /** 이 겹이 드러나는 % */
  fromPct: number
  /** 다음 겹에 자리를 넘기는 % (직전까지 보인다) */
  toPct: number
}

function layersFromPhases(phases: readonly TurnPhase[]): readonly TurnLayer[] {
  // 마지막 국면(정면 복귀)은 새 겹이 아니라 index 0 이 다시 드러나는 것이다 → 겹은 하나 적다
  return phases.slice(0, -1).map((p, i) => ({
    index: i,
    frame: p.frame,
    mirrored: p.mirrored,
    deg: p.deg,
    fromPct: p.atPct,
    toPct: phases[i + 1].atPct,
  }))
}

/** 9국면 겹 8장 — q45·side·q135·back 을 굽고 그중 셋을 반전 재사용한다. */
export const TURN_LAYERS: readonly TurnLayer[] = layersFromPhases(TURN_PHASES)

/**
 * 5국면 표 — side·back 만 구워진 신위용(안2.3 A파에서 쓰던 값 그대로).
 * 9국면 에셋이 아직 없는 신위가 rotateY 폴백으로 **떨어지지 않게** 남겨 둔 중간 등급이다.
 */
const LITE_PHASE_MS: readonly number[] = [0, 280, 620, 960, TURN_MS]

export const LITE_PHASES: readonly TurnPhase[] = LITE_PHASE_MS.map((atMs, step) => {
  const deg = step * 90
  return { step, deg, ...frameForDeg(deg), atMs, atPct: round2((atMs / SPIN_MS) * 100) }
})

export const LITE_LAYERS: readonly TurnLayer[] = layersFromPhases(LITE_PHASES)

/** 폴백(rotateY) — 겹칠 프레임이 없다. 정면 한 장이 곧 전부다. */
const BASE_ONLY_LAYERS: readonly TurnLayer[] = [
  { index: 0, frame: 'base', mirrored: false, deg: 0, fromPct: 0, toPct: 100 },
]

// ── 등급 판정 ───────────────────────────────────────────────────

/** full=9국면 프레임 교체 · lite=5국면 프레임 교체 · none=rotateY 폴백 */
export type DeityTurnTier = 'full' | 'lite' | 'none'

/** 등급별 필요 프레임. 정면(base)은 DB 가 보장하므로 여기 없다. */
const TIER_REQUIRES: Readonly<Record<'full' | 'lite', readonly BakedFrameKey[]>> = {
  full: ['q45', 'side', 'q135', 'back'],
  lite: ['side', 'back'],
}

/**
 * 프리로드에 성공한 프레임 집합 → 등급. 부분만 구워져도 **가진 만큼** 돌고, 모자라면 폴백이다.
 * 순수 함수라 프리로드 방식(Image·fetch)과 무관하게 검증된다.
 */
export function turnTier(loaded: ReadonlySet<string>): DeityTurnTier {
  if (TIER_REQUIRES.full.every((k) => loaded.has(k))) return 'full'
  if (TIER_REQUIRES.lite.every((k) => loaded.has(k))) return 'lite'
  return 'none'
}

/** 등급 → 겹 목록. 컴포넌트는 이 목록만 훑어 `<img>` 를 깐다(국면 수를 스스로 세지 않는다). */
export function layersForTier(tier: DeityTurnTier): readonly TurnLayer[] {
  if (tier === 'full') return TURN_LAYERS
  if (tier === 'lite') return LITE_LAYERS
  return BASE_ONLY_LAYERS
}

/** 등급 → 회전 클래스. `.deity-turn-flip` 만 rotateY 이고 나머지는 프레임 교체다. */
export function turnSpinClass(tier: DeityTurnTier): string {
  if (tier === 'full') return 'deity-turn-spin'
  if (tier === 'lite') return 'deity-turn-spin-lite'
  return 'deity-turn-flip'
}

/**
 * 등급 → 접지 그림자 클래스. 그림자는 몸통 폭과 위상이 맞아야 하므로 국면 표를 따라간다.
 * 폴백(rotateY)은 90°·270° 가 5국면 표와 같은 자리라 lite 곡선을 그대로 쓴다.
 */
export function turnShadowClass(tier: DeityTurnTier): string {
  return tier === 'full' ? 'deity-turn-shadow' : 'deity-turn-shadow-lite'
}
