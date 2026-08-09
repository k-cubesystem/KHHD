'use client'

/**
 * 원경층(遠景) — 테마 앰비언트의 «표시» 담당 (ARCH-shrine-living-background-v1 §2·§3 · PRD §4 L3).
 *
 * 뮤럴 바로 위·모든 살림 아래에 원경광 / CSS 파티클 / 글로우를 얹는다. 밀도가 필요한 파티클
 * (눈·불씨·기포·낙엽)은 여기가 아니라 기존 EffectsCanvas(z11) 몫이고, 이 파일은 그 이미터 계획
 * (ambientEmitPlan)만 순수 함수로 내어 준다 — 캔버스는 룸이 이미 들고 있다.
 *
 * ⚠️ 상시 애니는 transform/opacity 만이다(filter·blur·blend 금지 — 합성 레이어 유지 규율).
 * ⚠️ 위치·지연·주기는 **인덱스 파생 결정론**이다. Math.random 을 쓰면 SSR 과 클라가 갈린다
 *    (기존 idle 위상차 컨벤션 승계).
 * ⚠️ 스펙은 호출자가 ambientForTier() 로 티어를 이미 반영해 넘긴다 — 여기서 다시 깎지 않는다.
 */

import { useEffect, useState, type CSSProperties } from 'react'
import type {
  AmbientBackdropSpec,
  AmbientGlow,
  AmbientParticleKind,
  AmbientRect,
  ThemeAmbient,
} from '@/lib/domain/shrine/theme-ambient'
import type { EffectKind } from './EffectsCanvas'

/** CSS 사용자 정의 속성은 CSSProperties 에 없다 — 교차 타입으로 좁혀 any 를 피한다(룸과 같은 규약). */
type AmbVars = CSSProperties & Record<`--amb-${string}`, string>

// ─── 색 (스펙 hue 는 전부 DESIGN.md 오방색 파생이다 — 여기서 새 색을 만들지 않는다) ──

/** 글로우도 원경광도 없는 스펙의 파티클 색. 하이라이트 골드. */
const FALLBACK_HUE = '#E8D5A0'

/** 6자리 hex 에만 알파를 붙인다(#RRGGBBAA). 형식이 다르면 원색 그대로 — 색을 잃느니 진한 편이 낫다. */
function withAlpha(hue: string, alphaHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hue) ? `${hue}${alphaHex}` : hue
}

/**
 * 파티클 색 — 스펙에 파티클 색 필드가 없다(원경광·글로우만 hue 를 든다).
 * 같은 방의 글로우 → 원경광 순으로 물려받아 «한 장소의 빛» 이 갈라지지 않게 한다.
 */
function particleHue(spec: ThemeAmbient): string {
  return spec.glows?.[0]?.hue ?? spec.backdrop?.[0]?.hue ?? FALLBACK_HUE
}

// ─── 원경광 ───────────────────────────────────────────────────

/**
 * 원경광 알파. 광선(rays)이 가장 옅은 이유는 «잘린 아랫단» 때문이다 — 평행 광선은 상자 아래에서
 * 스스로 사라지지 않는다(마스크는 금지 — GPU 마스크 실패로 흰화면이 났던 층이다).
 * 알파를 이 대역에 두면 경계가 뮤럴 위에서 읽히지 않는다.
 */
const BACKDROP_ALPHA: Readonly<Record<AmbientBackdropSpec['kind'], string>> = {
  rays: '1a',
  haze: '20',
  'glow-band': '24',
}
/** 원경광 맥동 주기(ms) — 종마다 다르게 두어 여러 층이 한 박자로 뛰지 않게 한다. */
const BACKDROP_MS: Readonly<Record<AmbientBackdropSpec['kind'], number>> = {
  rays: 11000,
  haze: 15000,
  'glow-band': 13000,
}

function backdropBackground(kind: AmbientBackdropSpec['kind'], hue: string): string {
  const c = withAlpha(hue, BACKDROP_ALPHA[kind])
  if (kind === 'rays') return `repeating-linear-gradient(101deg, transparent 0 5.5%, ${c} 8%, transparent 10.5% 16%)`
  if (kind === 'haze') return `linear-gradient(180deg, transparent 0%, ${c} 48%, transparent 100%)`
  return `radial-gradient(ellipse at 50% 45%, ${c} 0%, transparent 72%)`
}

function backdropStyle(b: AmbientBackdropSpec, index: number): CSSProperties {
  return {
    left: `${b.area.x}%`,
    top: `${b.area.y}%`,
    width: `${b.area.w}%`,
    height: `${b.area.h}%`,
    background: backdropBackground(b.kind, b.hue),
    animationDuration: `${BACKDROP_MS[b.kind]}ms`,
    animationDelay: `-${index * 2300}ms`,
  }
}

// ─── 글로우 ───────────────────────────────────────────────────

function glowStyle(g: AmbientGlow, index: number): CSSProperties {
  const c = g.hue
  return {
    left: `${round2(g.x - g.r)}%`,
    top: `${round2(g.y - g.r)}%`,
    width: `${round2(g.r * 2)}%`,
    height: `${round2(g.r * 2)}%`,
    background: `radial-gradient(circle, ${withAlpha(c, '2e')} 0%, ${withAlpha(c, '14')} 44%, transparent 72%)`,
    animationDuration: `${g.pulseMs}ms`,
    animationDelay: `-${index * 900}ms`,
  }
}

// ─── CSS 파티클 ───────────────────────────────────────────────

interface KindStyle {
  cls: string
  /** [최소, 진폭] px */
  size: readonly [number, number]
  /** [최소, 진폭] s */
  dur: readonly [number, number]
  /** [최소, 진폭] px — 키프레임이 읽는 가로 흐름(--amb-dx) */
  dx: readonly [number, number]
  /** 상시 opacity 상한. 모션 최소화에서는 이 값으로 «정지한 완성된 그림» 이 된다 */
  o: number
}

/** css 엔진 5종. 여기 없는 종(snow·bubble·drip)은 캔버스가 그리므로 DOM 노드를 만들지 않는다. */
const PARTICLE_STYLE: Readonly<Partial<Record<AmbientParticleKind, KindStyle>>> = {
  mote: { cls: 'shrine-amb-mote', size: [3, 2], dur: [9, 6], dx: [6, 10], o: 0.5 },
  firefly: { cls: 'shrine-amb-firefly', size: [5, 2], dur: [7, 5], dx: [12, 12], o: 0.8 },
  ember: { cls: 'shrine-amb-ember', size: [3, 1.5], dur: [5, 3], dx: [3, 6], o: 0.85 },
  leaf: { cls: 'shrine-amb-leaf', size: [7, 3], dur: [11, 6], dx: [16, 16], o: 0.7 },
  petal: { cls: 'shrine-amb-petal', size: [6, 3], dur: [10, 6], dx: [14, 14], o: 0.65 },
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/** 소수부. 무리수 배수의 소수부는 저불일치(低不一致) 수열이라 «고르게 흩어진» 자리를 난수 없이 만든다. */
function frac(v: number): number {
  return v - Math.floor(v)
}

function particleStyle(i: number, area: AmbientRect, hue: string, k: KindStyle): AmbVars {
  const fx = frac(i * 0.6180339887)
  const fy = frac(i * 0.7548776662)
  const fd = frac(i * 0.4142135624)
  return {
    left: `${round2(area.x + area.w * fx)}%`,
    top: `${round2(area.y + area.h * fy)}%`,
    width: `${round2(k.size[0] + k.size[1] * fd)}px`,
    height: `${round2(k.size[0] + k.size[1] * fd)}px`,
    background: `radial-gradient(circle, ${hue} 0%, ${withAlpha(hue, '00')} 70%)`,
    animationDuration: `${round2(k.dur[0] + k.dur[1] * fy)}s`,
    // 음수 지연 — 마운트 순간 이미 «중간부터» 돌고 있다. 전원이 한 박자로 태어나는 물결을 없앤다.
    animationDelay: `-${round2(i * 1.7 + fx * 3)}s`,
    '--amb-dx': `${round2(k.dx[0] + k.dx[1] * fd)}px`,
    '--amb-o': `${k.o}`,
  }
}

// ─── 캔버스 이미터 계획 (룸이 소비) ──────────────────────────

/** 캔버스 종별 emit 1회 개수와 체류(ms) — EffectsCanvas 물리에서 실측된 값이다. */
interface CanvasKind {
  kind: EffectKind
  emit: number
  dwellMs: number
  /** 발원 높이 — 낙하종은 상단, 상승종은 중심·하단에서 난다 */
  origin: 'top' | 'center' | 'bottom'
}

const CANVAS_KIND: Readonly<Partial<Record<AmbientParticleKind, CanvasKind>>> = {
  snow: { kind: 'snow', emit: 3, dwellMs: 9300, origin: 'top' },
  ember: { kind: 'ember', emit: 3, dwellMs: 1500, origin: 'center' },
  bubble: { kind: 'bubble', emit: 2, dwellMs: 5700, origin: 'bottom' },
  leaf: { kind: 'leaf', emit: 2, dwellMs: 10600, origin: 'top' },
}

/**
 * 이미터 간격 하한(ms). 이보다 촘촘히 쏘면 «보이는 개수» 대신 풀(160)만 잠식한다 —
 * 불씨처럼 수명이 짧은 종은 목표 개수에 못 미친 채로 둔다(체감 우선).
 */
export const AMBIENT_EMIT_MIN_MS = 600

export interface AmbientEmit {
  kind: EffectKind
  /** 무대 % */
  x: number
  y: number
  intervalMs: number
}

function emitY(area: AmbientRect, origin: CanvasKind['origin']): number {
  if (origin === 'top') return round2(area.y)
  if (origin === 'bottom') return round2(area.y + area.h)
  return round2(area.y + area.h / 2)
}

/**
 * 티어 반영된 스펙 → 캔버스 상시 이미터 계획.
 *
 * 정상상태 개수 = emit개수 × 체류 ÷ 간격 이므로, 목표 개수를 상한으로 두면
 * 간격 = emit개수 × 체류 ÷ 목표 가 된다(하한 클램프).
 */
export function ambientEmitPlan(spec: ThemeAmbient): AmbientEmit[] {
  const out: AmbientEmit[] = []
  for (const p of spec.particles ?? []) {
    if (p.engine !== 'canvas') continue
    const c = CANVAS_KIND[p.kind]
    const target = p.count[0]
    if (!c || target <= 0) continue
    out.push({
      kind: c.kind,
      x: round2(p.area.x + p.area.w / 2),
      y: emitY(p.area, c.origin),
      intervalMs: Math.max(AMBIENT_EMIT_MIN_MS, Math.round((c.emit * c.dwellMs) / target)),
    })
  }
  return out
}

// ─── 컴포넌트 ─────────────────────────────────────────────────

interface Props {
  /** ambientForTier() 로 티어가 이미 반영된 스펙 */
  spec: ThemeAmbient
  /** 방 모서리 라운딩 클래스 — **선행 공백 포함** 문자열 */
  roundClassName?: string
}

export function AmbientBackdrop({ spec, roundClassName = '' }: Props) {
  /**
   * 백그라운드 탭에서는 애니를 멈춘다(ARCH §6). 캔버스는 rAF 가 스스로 서지만 CSS 는 계속 돌아
   * 보이지 않는 화면에 합성 비용만 치른다.
   */
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const sync = () => setPaused(document.visibilityState !== 'visible')
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const hue = particleHue(spec)

  return (
    // overflow-hidden — 파티클이 방 밖으로 새지 않게 자른다. 이 층엔 canvas·대형 이미지가 없어
    // 둥근 클립으로 인한 GPU 마스크 실패(흰화면 전례) 조건에 해당하지 않는다.
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden pointer-events-none${paused ? ' shrine-amb-paused' : ''}${roundClassName}`}
    >
      {(spec.backdrop ?? []).map((b, i) => (
        <div key={`back-${b.kind}-${i}`} className="absolute shrine-amb-back" style={backdropStyle(b, i)} />
      ))}
      {(spec.glows ?? []).map((g, i) => (
        <div key={`glow-${i}`} className="absolute shrine-amb-glow" style={glowStyle(g, i)} />
      ))}
      {(spec.particles ?? []).flatMap((p) => {
        const k = p.engine === 'css' ? PARTICLE_STYLE[p.kind] : undefined
        if (!k) return []
        return Array.from({ length: p.count[0] }, (_, i) => (
          <span key={`${p.kind}-${i}`} className={`absolute ${k.cls}`} style={particleStyle(i, p.area, hue, k)} />
        ))
      })}
    </div>
  )
}
