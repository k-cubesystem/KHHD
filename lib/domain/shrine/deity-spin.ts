/**
 * 신위 탭 회전 — **영상 등급**의 단일 출처 (2026-09-23 CEO 「터치 한 바퀴를 실제 애니메이션처럼」).
 *
 * ── 왜 새 등급인가
 * 종전 등급(deity-turn.ts: full·lite·none)은 굽은 자세 5장을 45° 마다 갈아 끼운다. 1.3초에 8장이면
 * 초당 6장이라 «회전»이 아니라 «그림 교체»로 읽혔고, 뒤 반 바퀴는 앞 반 바퀴의 **좌우 반전**이라
 * 두루마리가 반대 손으로 넘어갔다. 영상 모델(Veo)로 제자리 한 바퀴를 찍어 뽑은 프레임은
 * 진짜 뒷모습·옷자락 뒤따름까지 들고 있다. 이 모듈은 그 프레임 묶음(시트)의 규격과 재생 타임라인을 든다.
 *
 * ── 등급 사다리
 * 시트가 있으면 이 영상 등급, 없으면 종전 사다리(full → lite → none) 그대로다. 시트를 굽는 순간
 * 코드 수정 없이 스스로 올라선다(프리로드 판정 — 서버 fs 는 Vercel 람다에 public/ 이 없어 못 쓴다).
 *
 * ── 연출 결 (CEO 결정 «B 통통 + C 신령»)
 *  · 예비 동작 — 한 바퀴 직전 자세(정면에서 반대쪽으로 살짝 돈 모습)로 비틀며 웅크린다
 *  · 도약 — 도는 동안 포물선으로 뜨고, 떠오르는 순간 세로로 늘어난다
 *  · 착지 — 눌렸다 튕겨 가라앉으며 마지막 몇 도를 마저 돈다. 착지 칸은 뒤로 갈수록 정면 스프라이트가
 *    섞여 있어, 캔버스가 걷히고 `<img>` 가 다시 서는 순간 튀지 않는다
 *  · 가라앉힘 — 도는 동안 주변만 어두워지고 신위 둘레는 밝게 남는다.
 *    🔴 1차 시안의 «금빛 후광»은 안 보였다. 신위 뒤가 이미 금빛 창호라 같은 색을 더하면 묻힌다.
 *    대비는 빛을 더해서가 아니라 **주변을 낮춰서** 만든다.
 *  · 금가루 — 회전 중반부터 발치에서 피어올라 착지 뒤까지 사그라든다
 *
 * 칸의 선택(어느 영상 프레임을 몇 번째 칸에 둘지)은 굽는 쪽(scripts/shrine-assets/deity-spin.mjs)이
 * 이미 끝냈다 — 여기서는 칸을 일정한 속도로 넘기고 몸의 변형만 얹는다. 순수 함수만 둔다.
 * 캔버스·rAF 는 컴포넌트(components/shrine/scene/DeityTurn.tsx)가 든다.
 */

/**
 * 시트 규격 — `/shrine/deities/{code}/spin.json`. 굽는 스크립트가 쓰고 컴포넌트가 읽는다.
 * 칸은 재생 순서 그대로다: [0, anticEnd) 예비 · [anticEnd, spinEnd) 회전 · [spinEnd, count) 착지.
 * 정면 그대로인 순간(시작 전·착지 뒤)은 시트에 없다 — 원본 해상도의 정지 스프라이트(`<img>`)가 맡는다.
 */
export interface DeitySpinManifest {
  version: 1
  /** 시트 한 칸의 픽셀 크기 */
  frameW: number
  frameH: number
  /** 시트 가로 칸 수 — 칸 i 는 (i % cols, ⌊i / cols⌋) */
  cols: number
  count: number
  anticEnd: number
  spinEnd: number
  /** 칸을 넘기는 속도 */
  fps: number
  /**
   * 정면 스프라이트(base.webp) 캔버스가 한 칸 안에서 차지하는 상자(px).
   * 스탠드 상자가 곧 이 상자다(base.webp 는 여백 없이 잘려 있고 스탠드는 그 높이·폭 그대로) —
   * 그래서 배율은 `스탠드 높이 / baseH` 하나로 정해지고 발·가로 중심이 저절로 맞는다.
   */
  baseX: number
  baseY: number
  baseW: number
  baseH: number
}

const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0
const isNonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

/**
 * 네트워크에서 받은 JSON → 규격. 하나라도 어긋나면 null — 호출측은 종전 등급으로 내려간다.
 * 시트가 반쯤 깨진 채 캔버스를 돌리느니 5장 넘기기가 낫다.
 */
export function parseSpinManifest(raw: unknown): DeitySpinManifest | null {
  if (typeof raw !== 'object' || raw === null) return null
  const m = raw as Record<string, unknown>
  if (m.version !== 1) return null
  const { frameW, frameH, cols, count, anticEnd, spinEnd, fps, baseX, baseY, baseW, baseH } = m
  if (
    !isPositiveInt(frameW) ||
    !isPositiveInt(frameH) ||
    !isPositiveInt(cols) ||
    !isPositiveInt(count) ||
    !isPositiveInt(anticEnd) ||
    !isPositiveInt(spinEnd) ||
    !isPositiveInt(fps)
  ) {
    return null
  }
  if (!isNonNegative(baseX) || !isNonNegative(baseY) || !isNonNegative(baseW) || !isNonNegative(baseH)) return null
  // 세 구간이 모두 비어 있지 않고, 정면 상자가 칸 안에 들어와야 한다
  if (!(anticEnd < spinEnd && spinEnd < count)) return null
  if (baseW === 0 || baseH === 0 || baseX + baseW > frameW || baseY + baseH > frameH) return null
  return { version: 1, frameW, frameH, cols, count, anticEnd, spinEnd, fps, baseX, baseY, baseW, baseH }
}

/** 칸 i 의 시트 안 위치(px). 범위를 벗어난 i 는 양끝 칸으로 붙든다. */
export function frameRect(m: DeitySpinManifest, i: number): { sx: number; sy: number } {
  const k = Math.min(Math.max(0, Math.floor(i)), m.count - 1)
  return { sx: (k % m.cols) * m.frameW, sy: Math.floor(k / m.cols) * m.frameH }
}

// ── 연출 수치 (2026-09-23 B·C 시안에서 CEO 가 고른 값) ─────────────

/** 예비 동작에서 웅크리는 깊이(세로 줄임 비율) */
export const ANTIC_CROUCH = 0.05
/** 도약 높이 — 스탠드 높이 대비 */
export const HOP_HEIGHT = 0.07
/** 떠오를 때 세로로 늘어나는 비율 */
export const HOP_STRETCH = 0.035
/**
 * 착지 찌그러짐 [세로, 가로] — 크게 눌렸다 → 반쯤 → 살짝 튕겨 오름 → 제자리 → 미세 반동.
 * 그다음 표시 프레임에서 정지 스프라이트(1:1)가 선다. 착지 칸 수보다 짧으면 남는 칸은 1:1 이다.
 */
export const LAND_SQUASH: readonly (readonly [number, number])[] = [
  [0.92, 1.06],
  [0.97, 1.03],
  [1.025, 0.985],
  [1.0, 1.0],
  [0.995, 1.004],
]
/** 가라앉힘 최대 불투명도(주변 어둠) */
export const DIM_MAX = 0.5

/** 한 표시 프레임의 지시 — 컴포넌트는 이것만 그린다 */
export interface SpinCue {
  /** 시트 칸. null 이면 몸은 다 돌았다 — 정지 스프라이트가 다시 서고 금가루만 남는다 */
  frame: number | null
  /** 위로 뜬 높이(스탠드 높이 대비) */
  lift: number
  /** 발 기준 세로·가로 배율 */
  scaleY: number
  scaleX: number
  /** 주변 가라앉힘 불투명도 0~DIM_MAX */
  dim: number
  /** 금가루 시계(표시 프레임). null 이면 금가루 없음 */
  sparkClock: number | null
}

/** 재생 타임라인 — 표시 프레임 하나당 지시 하나. 칸은 일정한 속도(fps)로 넘긴다. */
export function spinTimeline(m: DeitySpinManifest): readonly SpinCue[] {
  const cues: SpinCue[] = []
  const anticN = m.anticEnd
  const spinN = m.spinEnd - m.anticEnd
  const landN = m.count - m.spinEnd

  for (let i = 0; i < anticN; i += 1) {
    // 첫 칸부터 이미 비튼 자세라 웅크림도 0 이 아닌 데서 시작한다 — 봉우리는 가장 깊이 비튼 가운데 칸
    const u = Math.sin((Math.PI * (i + 0.5)) / anticN)
    cues.push({
      frame: i,
      lift: 0,
      scaleY: 1 - ANTIC_CROUCH * u,
      scaleX: 1 + ANTIC_CROUCH * 0.6 * u,
      dim: 0,
      sparkClock: null,
    })
  }

  for (let k = 0; k < spinN; k += 1) {
    const t = spinN > 1 ? k / (spinN - 1) : 1
    // 떠오르는 앞쪽에서만 늘어나고, 정점부터는 제 비율로 돌아와 착지를 준비한다
    const stretch = Math.sin(Math.PI * Math.min(1, t * 2.2))
    cues.push({
      frame: m.anticEnd + k,
      lift: HOP_HEIGHT * Math.sin(Math.PI * t),
      scaleY: 1 + HOP_STRETCH * stretch,
      scaleX: 1 - HOP_STRETCH * 0.57 * stretch,
      dim: DIM_MAX * Math.sin(Math.PI * t),
      sparkClock: k,
    })
  }

  for (let j = 0; j < landN; j += 1) {
    const [sy, sx] = LAND_SQUASH[j] ?? [1, 1]
    cues.push({ frame: m.spinEnd + j, lift: 0, scaleY: sy, scaleX: sx, dim: 0, sparkClock: spinN + j })
  }

  // 꼬리 — 가장 늦게 핀 한 알이 다 질 때까지 금가루만 남는다
  for (let c = spinN + landN; c <= SPARK_END; c += 1) {
    cues.push({ frame: null, lift: 0, scaleY: 1, scaleX: 1, dim: 0, sparkClock: c })
  }
  return cues
}

/** 몸이 다 돈 첫 지시의 번호 — 회전 종료 통보(onSpinEnd) 시점. 금가루는 그 뒤로도 사그라든다. */
export function spinLandIndex(m: DeitySpinManifest): number {
  return m.count
}

// ── 금가루 ───────────────────────────────────────────────────────

/** 금가루 한 알 — 발 중심 기준 좌표(스탠드 높이 단위) */
export interface Spark {
  /** 발 중심에서 가로 위치 */
  x: number
  /** 발에서 위로 출발 높이 */
  y: number
  /** 한 프레임에 오르는 높이 */
  vy: number
  /** 한 프레임에 옆으로 흐르는 양 */
  vx: number
  /** 피기 시작하는 시계 */
  start: number
  /** 피어 있는 프레임 수 */
  life: number
  /** 반지름 */
  r: number
}

/**
 * 결정적 의사난수(Park–Miller) — 탭할 때마다 같은 금가루가 핀다. 무작위면 테스트도,
 * 「이번엔 예뻤는데 다음엔 한쪽에 몰렸다」는 검수 보고도 재현이 안 된다.
 */
function parkMiller(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

export const SPARKS: readonly Spark[] = (() => {
  const rnd = parkMiller(7)
  return Array.from({ length: 16 }, () => ({
    x: (rnd() - 0.5) * 0.9,
    y: rnd() * 0.35,
    vy: 0.008 + rnd() * 0.011,
    vx: (rnd() - 0.5) * 0.003,
    start: 4 + Math.floor(rnd() * 24),
    life: 16 + Math.floor(rnd() * 14),
    r: 0.008 + rnd() * 0.009,
  }))
})()

/** 마지막 금가루가 보이는 시계 — 한 알은 [start, start + life) 동안 핀다 */
const SPARK_END = Math.max(...SPARKS.map((p) => p.start + p.life)) - 1

/** 시계 c 에서 보이는 금가루 — { x, y(발에서 위로), r, a(불투명도) }. 피었다 사그라든다(sin 봉우리). */
export function sparksAt(clock: number): readonly { x: number; y: number; r: number; a: number }[] {
  const out: { x: number; y: number; r: number; a: number }[] = []
  for (const p of SPARKS) {
    const age = clock - p.start
    if (age < 0 || age >= p.life) continue
    out.push({ x: p.x + p.vx * age, y: p.y + p.vy * age, r: p.r, a: Math.sin((Math.PI * age) / p.life) })
  }
  return out
}
