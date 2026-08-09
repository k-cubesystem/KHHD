/**
 * 신당 게임필 안1 「살아 숨쉬는 신당」 — SceneClock 도메인 (ARCH-shrine-gamefeel-v1 §2).
 *
 * KST 시각 → 테마 광원(StageLight)의 낮밤 보간. 방이 하루를 사는 유일한 시간 축이다.
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now()/Math.random() 사용 금지.
 * 시각은 호출자가 epochMs 로 주입한다(SSR·클라 동일 결과 = 하이드레이션 불일치 0).
 *
 * ⚠️ stage.ts 는 기존 export 계약을 유지해야 하므로 수정하지 않는다 — StageLight 타입만 빌려 쓰고,
 *    내부 유틸(round/clamp)은 stage.ts 가 export 하지 않아 이 파일에 같은 규약으로 다시 둔다.
 */

import type { StageLight } from './stage'

// ─── 계약 타입 ────────────────────────────────────────────────

export type DayPhaseName = 'dawn' | 'day' | 'dusk' | 'night'

/** 두 위상의 교차 상태. from===to 이면 t===0(순수 위상). */
export interface PhaseMix {
  from: DayPhaseName
  to: DayPhaseName
  /** from→to 진행도 0~1 */
  t: number
}

// ─── 튜닝 상수 (렌더·테스트 공용 단일 출처) ─────────────────────

/** KST 고정 오프셋 — Intl/TZ DB 없이 계산해야 서버·클라 결과가 같다(lib/utils.ts formatKstDateTime 와 동일 원리). */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * 경계 앞뒤 블렌드 반경(시간). 경계 ±1h 동안 두 위상이 선형 교차해 색이 튀지 않는다.
 * ⚠️ 경계 간 최소 간격(5→8 = 3h)보다 2배(=2h)가 작아야 창이 겹치지 않는다 — 밴드 조정 시 함께 검증.
 */
export const PHASE_BLEND_HOURS = 1

/** 위상 경계(KST 시). 새벽 05 · 낮 08 · 해질녘 17 · 밤 20 시작. */
const PHASE_BOUNDARIES: readonly { at: number; from: DayPhaseName; to: DayPhaseName }[] = Object.freeze([
  { at: 5, from: 'night', to: 'dawn' },
  { at: 8, from: 'dawn', to: 'day' },
  { at: 17, from: 'day', to: 'dusk' },
  { at: 20, from: 'dusk', to: 'night' },
] as const)

interface PhaseTone {
  /** 테마 원색을 끌어당길 색. null = 원색 유지. */
  tint: { r: number; g: number; b: number } | null
  /** tint 쪽으로 끄는 정도 0~1 */
  mix: number
  /** base.intensity 에 곱하는 배수 */
  intensityMul: number
}

/**
 * 위상별 색·밝기 톤. 기준 광원은 촛불금(rgba(255,214,160,·)).
 * 배수·혼합비는 그 촛불금을 기준으로 눈으로 맞춘 값이라, 테마 원색이 달라도 상대 관계는 유지된다.
 */
const PHASE_TONES: Readonly<Record<DayPhaseName, PhaseTone>> = Object.freeze({
  // 새벽 청람(靑藍) — 찬 공기. 따뜻한 원색을 60%까지 끌어와야 실제로 푸르게 읽힌다.
  dawn: { tint: { r: 120, g: 156, b: 224 }, mix: 0.6, intensityMul: 0.85 },
  // 낮 — 볕이 들어 광원이 존재감을 잃는 시간. 채도를 절반으로 죽이고 밝기도 뺀다.
  day: { tint: { r: 236, g: 238, b: 242 }, mix: 0.5, intensityMul: 0.75 },
  // 해질녘 주홍(朱紅)
  dusk: { tint: { r: 255, g: 122, b: 66 }, mix: 0.5, intensityMul: 0.95 },
  // 밤 — 테마가 정한 원색이 가장 잘 사는 시간. 색은 손대지 않고 밝기만 올린다.
  night: { tint: null, mix: 0, intensityMul: 1.08 },
})

// ─── 내부 유틸 ────────────────────────────────────────────────

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 유한수 클램프. NaN/Infinity 는 min 으로 떨어뜨려 결정론을 유지한다(stage.ts 와 동일 규약). */
function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 0~24 로 정규화. 24 이상·음수도 하루를 감아 돌린다(비유한은 0시). */
function normalizeHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0
  return ((hour % 24) + 24) % 24
}

// ─── 시각 ─────────────────────────────────────────────────────

/**
 * epochMs → KST 하루 안의 시각 0~24(분 포함, 24 미포함).
 * Intl 미사용 — 런타임 TZ DB 유무와 무관하게 서버·클라가 같은 값을 낸다.
 */
export function kstHour(epochMs: number): number {
  if (!Number.isFinite(epochMs)) return 0
  const withinDayMs = (((epochMs + KST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS
  return round(withinDayMs / HOUR_MS, 4)
}

/**
 * 시각 → 위상 교차 상태. 경계 ±PHASE_BLEND_HOURS 안에서만 두 위상이 섞이고,
 * 그 밖은 순수 위상(from===to, t=0)이라 경계에서 값이 점프하지 않는다.
 */
export function phaseMix(hour: number): PhaseMix {
  const h = normalizeHour(hour)
  for (const b of PHASE_BOUNDARIES) {
    const start = b.at - PHASE_BLEND_HOURS
    const end = b.at + PHASE_BLEND_HOURS
    if (h >= start && h <= end) {
      return { from: b.from, to: b.to, t: round((h - start) / (end - start), 6) }
    }
  }
  const pure = bandAt(h)
  return { from: pure, to: pure, t: 0 }
}

/**
 * 시각 → 위상별 가중치(합 1). 위상마다 «레이어 1장» 을 겹치는 소비자(TimeTint 등)를 위한 형태다.
 * 판정은 phaseMix 하나뿐이다 — 위상 경계를 두 번 구현하면 조명과 틴트가 서로 다른 시각을 산다.
 */
export function phaseWeights(hour: number): Readonly<Record<DayPhaseName, number>> {
  const { from, to, t } = phaseMix(hour)
  const w: Record<DayPhaseName, number> = { dawn: 0, day: 0, dusk: 0, night: 0 }
  if (from === to) {
    w[from] = 1
    return w
  }
  w[from] = round(1 - t, 6)
  w[to] = round(t, 6)
  return w
}

/** 블렌드 창 밖에서의 소속 위상. PHASE_BOUNDARIES 와 같은 경계를 쓴다. */
function bandAt(hour: number): DayPhaseName {
  if (hour < PHASE_BOUNDARIES[0].at) return 'night'
  if (hour < PHASE_BOUNDARIES[1].at) return 'dawn'
  if (hour < PHASE_BOUNDARIES[2].at) return 'day'
  if (hour < PHASE_BOUNDARIES[3].at) return 'dusk'
  return 'night'
}

// ─── 색 파싱·합성 ─────────────────────────────────────────────

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/** 쉼표·공백 두 표기 모두 수용(`rgb(255 214 160 / .55)` 포함). % 표기는 미지원 → 원색 유지 경로로 떨어진다. */
const RGBA_RE = /^rgba?\(\s*(\d*\.?\d+)\s*[,\s]\s*(\d*\.?\d+)\s*[,\s]\s*(\d*\.?\d+)\s*(?:[,/]\s*(\d*\.?\d+)\s*)?\)$/i
/** stage.ts safeColor 가 hex 도 통과시키므로 hex 테마에서도 낮밤이 돌아야 한다. */
const HEX_RE = /^#([0-9a-f]{3,8})$/i

function parseHex(body: string): Rgba | null {
  const wide = body.length === 6 || body.length === 8
  const short = body.length === 3 || body.length === 4
  if (!wide && !short) return null
  const step = wide ? 2 : 1
  const at = (i: number): number => {
    const chunk = body.slice(i * step, i * step + step)
    return parseInt(short ? chunk + chunk : chunk, 16)
  }
  const hasAlpha = body.length === 4 || body.length === 8
  return { r: at(0), g: at(1), b: at(2), a: hasAlpha ? round(at(3) / 255, 4) : 1 }
}

function parseRgba(v: unknown): Rgba | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  const fn = RGBA_RE.exec(s)
  if (fn) {
    const r = Number(fn[1])
    const g = Number(fn[2])
    const b = Number(fn[3])
    const a = fn[4] === undefined ? 1 : Number(fn[4])
    if (![r, g, b, a].every((n) => Number.isFinite(n))) return null
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a: clamp(a, 0, 1) }
  }
  const hex = HEX_RE.exec(s)
  return hex ? parseHex(hex[1]) : null
}

/** 출력은 반드시 stage.ts safeColor(FUNC_COLOR_RE, 64자)의 허용 형식 안이어야 한다 — 아니면 조명이 기본색으로 되돌아간다. */
function formatRgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${round(a, 4)})`
}

function toneChannel(base: number, tint: number | null, mix: number): number {
  return tint === null ? base : lerp(base, tint, mix)
}

// ─── 광원 보간 ────────────────────────────────────────────────

/**
 * 테마 광원 → 그 시각의 광원. rgb 채널만 위상 색으로 끌고 **alpha 와 origin 은 그대로 둔다**
 * (alpha·origin 은 테마가 정한 그레이딩 규격 — 시간이 건드릴 값이 아니다).
 * 색 파싱 실패(hsl·색이름·깨진 문자열)면 base 를 그대로 돌려 낮밤만 포기한다 — 조명 자체를 잃지 않기 위함.
 */
export function sceneLight(base: StageLight, hour: number): StageLight {
  const rgba = parseRgba(base?.color)
  if (!rgba) return base

  const { from, to, t } = phaseMix(hour)
  const a = PHASE_TONES[from]
  const b = PHASE_TONES[to]

  const rFrom = toneChannel(rgba.r, a.tint?.r ?? null, a.mix)
  const gFrom = toneChannel(rgba.g, a.tint?.g ?? null, a.mix)
  const bFrom = toneChannel(rgba.b, a.tint?.b ?? null, a.mix)
  const rTo = toneChannel(rgba.r, b.tint?.r ?? null, b.mix)
  const gTo = toneChannel(rgba.g, b.tint?.g ?? null, b.mix)
  const bTo = toneChannel(rgba.b, b.tint?.b ?? null, b.mix)

  const intensityMul = lerp(a.intensityMul, b.intensityMul, t)
  return {
    color: formatRgba(lerp(rFrom, rTo, t), lerp(gFrom, gTo, t), lerp(bFrom, bTo, t), rgba.a),
    intensity: round(clamp(clamp(base.intensity, 0, 1) * intensityMul, 0, 1), 3),
    origin: base.origin,
  }
}
