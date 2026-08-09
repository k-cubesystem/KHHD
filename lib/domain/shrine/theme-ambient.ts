/**
 * 「살아있는 신당」 L1·L3 — 테마별 앰비언트 스펙 (ARCH-shrine-living-background-v1 §1 결정2 · §4).
 *
 * 테마는 «장소»이므로 공기도 장소마다 달라야 한다. 이 파일이 16테마의
 * «원경광 + 파티클 + 글로우 + 시간대 틴트 프로파일» 단일 출처다.
 * DB·시드가 아니라 코드 상수인 이유: 순수 연출이라 게임플레이에 무영향이고, 반려가 잦은
 * 영역이라 **배포만으로 되돌릴 수 있어야** 한다(앰비언트 영상 v1~v5 반려 전례 — 시드
 * 재적용 루프를 만들지 않는다). 기하가 아니므로 theme-stage-geometry.json 단일 출처와도
 * 충돌하지 않는다.
 *
 * 전 함수 순수·결정론 — Date.now()/Math.random() 금지. 시각은 호출자가 hourFrac 로 주입한다
 * (SSR·클라 동일 결과 = 하이드레이션 불일치 0, scene-clock 규약 승계).
 *
 * ⚠️ 뮤럴 불변 원칙: 여기서 정하는 것은 «검수 끝난 원화 위에 얹는 층» 뿐이다. 원화는 다시 굽지 않는다.
 * ⚠️ area·glow 좌표는 **무대 폭 기준 0~100(%)** 이다 — 두루마리 월드 좌표(0~worldWidth 320)가 아니다.
 */

import { phaseWeights } from './scene-clock'

// ─── 계약 타입 ────────────────────────────────────────────────

/**
 * 연출 등급. perf-gate 의 PerfTier 와 문자열이 같아 서로 그대로 대입할 수 있다
 * (렌더 측에서 perfTier() 결과를 변환 없이 넘긴다). 순환 import 를 만들지 않으려 여기 다시 둔다.
 */
export type AmbientTier = 'low' | 'mid' | 'high'

/**
 * 뮤럴에 이미 구워진 시각. 그 위상의 틴트는 0 이 된다 — 밤 원판에 밤 틴트를 또 씌우면
 * 방이 검게 죽는다(PRD §4 L1-3 모순 방지).
 * null = 시각이 없는 원판(심해 등). amp 는 틴트 전체 진폭 0~1.
 */
export type TintProfile = { base: 'day' | 'dusk' | 'night' | null; amp: number }

/** 위상 틴트 3층의 opacity. 낮은 층이 없다 — 낮 = 검수된 원화 그대로(원화 보호 계약). */
export type TintOpacities = { dawn: number; dusk: number; night: number }

export type AmbientParticleKind = 'mote' | 'firefly' | 'snow' | 'ember' | 'bubble' | 'leaf' | 'petal' | 'drip'

/** css = DOM 노드(소수 큰 실루엣) · canvas = 기존 EffectsCanvas 1장에 그리는 밀도 파티클. */
export type AmbientEngine = 'css' | 'canvas'

/** 무대 % 박스. x+w·y+h 는 100 을 넘지 않는다. */
export type AmbientRect = { x: number; y: number; w: number; h: number }

export type AmbientParticle = {
  kind: AmbientParticleKind
  engine: AmbientEngine
  /** [low, mid, high] — 티어별 동시 개수 */
  count: [number, number, number]
  area: AmbientRect
}

export type AmbientGlow = { x: number; y: number; r: number; hue: string; pulseMs: number }

export type AmbientBackdropSpec = { kind: 'rays' | 'haze' | 'glow-band'; hue: string; area: AmbientRect }

export type ThemeAmbient = {
  backdrop?: AmbientBackdropSpec[]
  particles?: AmbientParticle[]
  glows?: AmbientGlow[]
  tintProfile: TintProfile
}

// ─── 상한 (ARCH §6 성능 예산 · 스펙 표 규율) ────────────────────

/** 티어별 css 파티클 무대 합산 하드 상한 [low, mid, high]. ambientForTier 가 강제한다. */
export const CSS_PARTICLE_TIER_CAP: readonly [number, number, number] = [10, 30, 50]
/** 티어별 캔버스 파티클 상한 [low, mid, high]. high 는 EffectsCanvas 풀 상한(160)을 넘지 않는다. */
export const CANVAS_PARTICLE_TIER_CAP: readonly [number, number, number] = [30, 100, 160]
/** 스펙 표 규율 — css 는 한 종당 high 12 개, 한 무대 합산 20 개를 넘겨 적지 않는다(테스트가 강제). */
export const CSS_PARTICLE_KIND_MAX = 12
export const CSS_PARTICLE_STAGE_MAX = 20

// ─── 오방색 팔레트 (DESIGN.md 파생 — 임의 원색 금지) ─────────────

/**
 * 전부 DESIGN.md 오방색 토큰이거나 그 1:1 혼색이다. 새 색을 쓰려면 여기에 파생식과 함께 추가한다.
 * (파생값은 채널 평균 후 반올림 — 계산 근거를 남겨야 나중에 톤 반려를 수치로 처방할 수 있다.)
 */
const HUE = {
  /** 黃 primary */
  gold: '#C9A84C',
  /** 하이라이트 골드 */
  goldLight: '#E8D5A0',
  /** 土 (EL_COLOR.earth) */
  earth: '#D4A017',
  /** 朱 도장 레드 */
  seal: '#9E2B2B',
  /** 朱 라이트 */
  sealLight: '#C84040',
  /** 靑 */
  blue: '#2D5F8A',
  /** 木 (EL_COLOR.wood) */
  wood: '#4A7C59',
  /** 碧 = 靑#2D5F8A + 木#4A7C59 채널 평균 — 도깨비불·수면광 */
  teal: '#3C6E72',
  /** 달빛 냉광 = 靑을 白#E8E4DC 쪽으로 65% */
  moon: '#A7B6BF',
  /** 안개·은하 = 白을 靑 쪽으로 25% */
  mist: '#B9C3C8',
  /** 불티 = 朱#9E2B2B + 黃#C9A84C 채널 평균 */
  ember: '#B46A3C',
} as const

// ─── 16테마 스펙 (PRD §4 L3 표의 수치화) ────────────────────────

/**
 * 테마 코드 모집단은 theme-stage-geometry.json 의 themeElements 다
 * (완전성은 __tests__/theme-ambient.test.ts 가 diff 0 으로 강제 — 테마 추가 시 여기부터 막힌다).
 * 스펙 없는 테마 = 앰비언트 미렌더(현행 화면 그대로)라, 누락은 조용한 회귀가 된다.
 */
export const THEME_AMBIENT: Readonly<Record<string, ThemeAmbient>> = {
  // 반가(木) — 문살로 든 낮빛과 그 빛기둥 속 먼지. 이 테마가 전 테마의 기준선이다.
  banga: {
    backdrop: [{ kind: 'rays', hue: HUE.goldLight, area: { x: 6, y: 0, w: 44, h: 54 } }],
    particles: [{ kind: 'mote', engine: 'css', count: [2, 5, 9], area: { x: 4, y: 6, w: 64, h: 52 } }],
    glows: [{ x: 50, y: 46, r: 16, hue: HUE.gold, pulseMs: 5200 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 초가 — 호롱 온광과 아궁이 김. 김은 스프라이트 종 대신 상승 mote 로 낸다(스프라이트 엔진은 이번 계약 밖).
  choga: {
    backdrop: [{ kind: 'glow-band', hue: HUE.gold, area: { x: 0, y: 16, w: 100, h: 44 } }],
    particles: [{ kind: 'mote', engine: 'css', count: [2, 4, 7], area: { x: 6, y: 34, w: 38, h: 44 } }],
    glows: [{ x: 24, y: 36, r: 13, hue: HUE.gold, pulseMs: 4800 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 용궁(水) — 수면에서 내려꽂히는 청록 광기둥과 상승 기포. 심해라 시각이 없다(tint base null).
  yonggung: {
    backdrop: [{ kind: 'rays', hue: HUE.teal, area: { x: 0, y: 0, w: 100, h: 62 } }],
    particles: [{ kind: 'bubble', engine: 'canvas', count: [6, 14, 24], area: { x: 0, y: 16, w: 100, h: 84 } }],
    glows: [{ x: 50, y: 22, r: 36, hue: HUE.teal, pulseMs: 7600 }],
    tintProfile: { base: null, amp: 0.3 },
  },
  // 도깨비(火) — 단청 야광 위를 청록 도깨비불 두 점이 서로 다른 주기로 맥동한다(위상 분산).
  dokkaebi: {
    backdrop: [{ kind: 'haze', hue: HUE.seal, area: { x: 0, y: 0, w: 100, h: 62 } }],
    particles: [{ kind: 'firefly', engine: 'css', count: [1, 2, 3], area: { x: 8, y: 18, w: 84, h: 52 } }],
    glows: [
      { x: 26, y: 38, r: 9, hue: HUE.teal, pulseMs: 2600 },
      { x: 72, y: 30, r: 8, hue: HUE.teal, pulseMs: 3400 },
    ],
    tintProfile: { base: 'night', amp: 0.4 },
  },
  // 설빛(金) — 달빛 냉광 아래 함박눈. 밀도가 필요해 캔버스로 그린다.
  seolbit: {
    backdrop: [{ kind: 'glow-band', hue: HUE.moon, area: { x: 0, y: 0, w: 100, h: 46 } }],
    particles: [{ kind: 'snow', engine: 'canvas', count: [10, 24, 40], area: { x: 0, y: 0, w: 100, h: 55 } }],
    glows: [{ x: 50, y: 14, r: 30, hue: HUE.moon, pulseMs: 7000 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 달집(土) — 보름달 달무리 + 달집 불씨(밀도, 캔버스) + 반딧불 소수. 원판이 밤이다.
  daljip: {
    backdrop: [{ kind: 'glow-band', hue: HUE.moon, area: { x: 54, y: 0, w: 36, h: 28 } }],
    particles: [
      { kind: 'ember', engine: 'canvas', count: [8, 18, 30], area: { x: 32, y: 26, w: 36, h: 56 } },
      { kind: 'firefly', engine: 'css', count: [1, 2, 3], area: { x: 4, y: 34, w: 92, h: 40 } },
    ],
    glows: [{ x: 50, y: 58, r: 22, hue: HUE.ember, pulseMs: 3000 }],
    tintProfile: { base: 'night', amp: 0.4 },
  },
  // 홍살(火) — 원판이 이미 노을이라 석양 틴트를 얹지 않는다. 홍엽이 진다.
  hongsal: {
    backdrop: [{ kind: 'glow-band', hue: HUE.sealLight, area: { x: 0, y: 0, w: 100, h: 52 } }],
    particles: [{ kind: 'petal', engine: 'css', count: [2, 5, 10], area: { x: 0, y: 0, w: 100, h: 72 } }],
    glows: [{ x: 50, y: 30, r: 26, hue: HUE.seal, pulseMs: 6400 }],
    tintProfile: { base: 'dusk', amp: 0.5 },
  },
  // 별밭 — 은하수 글로우와 별 반짝임(유성은 L4 밤 이벤트 소관이라 여기 없다).
  byeolbat: {
    backdrop: [{ kind: 'haze', hue: HUE.mist, area: { x: 0, y: 0, w: 100, h: 50 } }],
    particles: [{ kind: 'mote', engine: 'css', count: [3, 6, 10], area: { x: 0, y: 0, w: 100, h: 48 } }],
    glows: [{ x: 50, y: 16, r: 34, hue: HUE.mist, pulseMs: 8200 }],
    tintProfile: { base: 'night', amp: 0.4 },
  },
  // 당산(木) — 나무 사이로 갈라진 광선, 잎이 진다. 오색천 결(結)빛이 낮게 맥동.
  dangsan: {
    backdrop: [{ kind: 'rays', hue: HUE.goldLight, area: { x: 8, y: 0, w: 72, h: 58 } }],
    particles: [{ kind: 'leaf', engine: 'canvas', count: [4, 10, 18], area: { x: 0, y: 0, w: 100, h: 100 } }],
    glows: [{ x: 50, y: 42, r: 18, hue: HUE.gold, pulseMs: 5600 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 연등(火) — 등불 «무리»가 본체라 글로우 3점의 주기를 어긋나게 둔다(동시 맥동은 기계처럼 보인다).
  yeondeung: {
    backdrop: [{ kind: 'glow-band', hue: HUE.gold, area: { x: 0, y: 2, w: 100, h: 34 } }],
    particles: [{ kind: 'ember', engine: 'css', count: [2, 4, 8], area: { x: 8, y: 14, w: 84, h: 58 } }],
    glows: [
      { x: 24, y: 16, r: 10, hue: HUE.gold, pulseMs: 3200 },
      { x: 50, y: 12, r: 11, hue: HUE.goldLight, pulseMs: 4100 },
      { x: 76, y: 18, r: 10, hue: HUE.sealLight, pulseMs: 4900 },
    ],
    tintProfile: { base: 'night', amp: 0.4 },
  },
  // 서낭(土) — 저층 안개 띠와 돌탑 이끼빛. 오색천 살랑은 스프라이트 종이 없어 leaf 로 대체한다.
  seonang: {
    backdrop: [{ kind: 'haze', hue: HUE.mist, area: { x: 0, y: 44, w: 100, h: 26 } }],
    particles: [{ kind: 'leaf', engine: 'css', count: [2, 4, 7], area: { x: 14, y: 14, w: 70, h: 46 } }],
    glows: [{ x: 30, y: 52, r: 14, hue: HUE.wood, pulseMs: 6800 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 장독(土) — 아침 햇살 사선. 장독 김은 아침에만 피워야 자연스럽다(시간 게이트는 렌더 측 책임).
  jangdok: {
    backdrop: [{ kind: 'rays', hue: HUE.goldLight, area: { x: 38, y: 0, w: 54, h: 50 } }],
    particles: [{ kind: 'mote', engine: 'css', count: [2, 4, 7], area: { x: 18, y: 38, w: 62, h: 36 } }],
    glows: [{ x: 50, y: 58, r: 16, hue: HUE.earth, pulseMs: 7200 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 대장간(金) — 화덕 적광과 간헐적으로 튀는 불똥. 맥동이 가장 빠른 테마다.
  daejanggan: {
    backdrop: [{ kind: 'glow-band', hue: HUE.seal, area: { x: 6, y: 18, w: 48, h: 46 } }],
    particles: [{ kind: 'ember', engine: 'css', count: [2, 4, 8], area: { x: 10, y: 24, w: 44, h: 42 } }],
    glows: [{ x: 28, y: 44, r: 14, hue: HUE.ember, pulseMs: 2400 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 종각(金) — 새벽빛과 먼지 모트. 범종 여운이라 맥동이 가장 느리다.
  jonggak: {
    backdrop: [{ kind: 'rays', hue: HUE.moon, area: { x: 0, y: 0, w: 58, h: 56 } }],
    particles: [{ kind: 'mote', engine: 'css', count: [2, 5, 9], area: { x: 0, y: 6, w: 100, h: 52 } }],
    glows: [{ x: 50, y: 40, r: 20, hue: HUE.gold, pulseMs: 9000 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 샘굿(水) — 물안개 띠와 낙수. 수면 반사광은 바닥 쪽에 둔다.
  saemgut: {
    backdrop: [{ kind: 'haze', hue: HUE.mist, area: { x: 0, y: 32, w: 100, h: 36 } }],
    particles: [{ kind: 'drip', engine: 'canvas', count: [4, 9, 16], area: { x: 12, y: 0, w: 76, h: 74 } }],
    glows: [{ x: 50, y: 66, r: 20, hue: HUE.blue, pulseMs: 6000 }],
    tintProfile: { base: 'day', amp: 1 },
  },
  // 나루(水) — 물빛 반사와 저층 안개 두 겹, 등롱 하나. 파티클은 강 위 부유물 소수.
  naru: {
    backdrop: [
      { kind: 'glow-band', hue: HUE.blue, area: { x: 0, y: 50, w: 100, h: 36 } },
      { kind: 'haze', hue: HUE.mist, area: { x: 0, y: 42, w: 100, h: 24 } },
    ],
    particles: [{ kind: 'mote', engine: 'css', count: [2, 4, 7], area: { x: 0, y: 10, w: 100, h: 52 } }],
    glows: [{ x: 74, y: 30, r: 12, hue: HUE.gold, pulseMs: 5000 }],
    tintProfile: { base: 'day', amp: 1 },
  },
}

// ─── 내부 유틸 (scene-clock·stage 와 같은 규약을 이 파일에도 둔다) ──

function round(v: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 비유한은 min 으로 떨어뜨려 결정론을 유지한다(stage.ts·scene-clock 과 동일 규약). */
function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

/** 티어 → count 튜플 인덱스. 알 수 없는 값은 가장 가벼운 쪽(low)으로 떨어뜨린다. */
function tierIndex(tier: AmbientTier): 0 | 1 | 2 {
  if (tier === 'high') return 2
  if (tier === 'mid') return 1
  return 0
}

/** 개수는 음수·소수·비유한이 들어와도 0 이상 정수로만 나간다. */
function toCount(v: number): number {
  return Math.floor(clamp(v, 0, CANVAS_PARTICLE_TIER_CAP[2]))
}

// ─── 시간대 틴트 ──────────────────────────────────────────────

/**
 * 그 시각의 틴트 3층 opacity. 위상 판정은 scene-clock 하나만 쓴다(경계를 두 번 구현하면 갈라진다).
 *
 * 계약: ①낮 순수 위상이면 셋 다 0(= 검수된 원화 그대로) ②profile.base 위상은 0
 * (밤 원판에 밤 틴트, 노을 원판에 노을 틴트를 겹치지 않는다) ③전 성분에 amp 를 곱한다
 * ④경계 블렌드 구간에서 연속(급점프 없음 — phaseWeights 가 선형이라 자동으로 따라온다).
 */
export function tintOpacities(hourFrac: number, profile: TintProfile): TintOpacities {
  const w = phaseWeights(hourFrac)
  const amp = clamp(profile.amp, 0, 1)
  const base = profile.base
  const at = (phase: 'dawn' | 'dusk' | 'night'): number => (base === phase ? 0 : round(clamp(w[phase] * amp, 0, 1), 4))
  // 'day' 성분에는 대응 레이어가 없다 — 낮 = 틴트 0 이 원화 보호 계약이다.
  return { dawn: at('dawn'), dusk: at('dusk'), night: at('night') }
}

// ─── 티어 적용 ────────────────────────────────────────────────

/**
 * 한 파티클 종의 그 티어 동시 개수. 무대 합산 예산은 반영하지 않는다(그건 ambientForTier 몫).
 * low 의 css 만 한 번 더 절반(내림)으로 줄인다 — 저사양에서 실제로 비싼 것은 DOM 노드 수라,
 * 캔버스 밀도 파티클은 [0] 값을 그대로 쓴다.
 */
export function resolveParticleCount(particle: AmbientParticle, tier: AmbientTier): number {
  const idx = tierIndex(tier)
  const raw = toCount(particle.count[idx])
  if (particle.engine === 'canvas') return Math.min(raw, CANVAS_PARTICLE_TIER_CAP[idx])
  const capped = Math.min(raw, CSS_PARTICLE_KIND_MAX, CSS_PARTICLE_TIER_CAP[idx])
  return tier === 'low' ? Math.floor(capped / 2) : capped
}

/**
 * 스펙 → 그 티어에서 실제로 렌더할 스펙. 입력은 건드리지 않고 새 객체를 반환한다(중첩 area·glow 포함).
 * 파티클 count 는 [n,n,n] 로 평탄화돼 어느 인덱스를 읽어도 같은 값이 나온다(티어가 이미 반영됨).
 * 무대 합산 상한(ARCH §6)은 스펙에 적힌 순서대로 예산을 소진하며 강제한다 — 결정론 유지.
 */
export function ambientForTier(spec: ThemeAmbient, tier: AmbientTier): ThemeAmbient {
  const idx = tierIndex(tier)
  const budget: Record<AmbientEngine, number> = {
    css: CSS_PARTICLE_TIER_CAP[idx],
    canvas: CANVAS_PARTICLE_TIER_CAP[idx],
  }

  const out: ThemeAmbient = { tintProfile: { ...spec.tintProfile } }
  if (spec.backdrop) out.backdrop = spec.backdrop.map((b) => ({ ...b, area: { ...b.area } }))
  if (spec.glows) out.glows = spec.glows.map((g) => ({ ...g }))
  if (spec.particles) {
    out.particles = spec.particles.map((p) => {
      const n = Math.min(resolveParticleCount(p, tier), budget[p.engine])
      budget[p.engine] -= n
      return { kind: p.kind, engine: p.engine, count: [n, n, n], area: { ...p.area } }
    })
  }
  return out
}

/**
 * 테마 코드 → 스펙. 스펙이 없는 테마(레거시·미확산)는 null 이고, 그 방은 앰비언트 없이
 * 지금까지의 화면 그대로 그려야 한다 — 인덱스 접근이 undefined 를 감추지 않도록 이 헬퍼를 쓴다.
 */
export function ambientForTheme(themeCode: string): ThemeAmbient | null {
  return Object.prototype.hasOwnProperty.call(THEME_AMBIENT, themeCode) ? THEME_AMBIENT[themeCode] : null
}
