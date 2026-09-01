'use client'

/**
 * 이펙트 캔버스 — 파티클(불꽃/향연/꽃잎/반짝임 + 테마 앰비언트 눈·불씨·기포·낙엽)을 단일 canvas rAF 루프로 렌더.
 * 오브젝트 풀 고정(GC 방지), 활성 파티클이 있을 때만 루프 구동.
 * prefers-reduced-motion 시 파티클 수 대폭 감소.
 *
 * 사용: emit(kind, xPct, yPct) 를 ref로 노출 → 부모가 촛불 점화/향로 탭/테마 상시 이미터에서 호출.
 */

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import { WU_XING_COLORS } from '@/lib/domain/saju/saju'

export type EffectKind =
  | 'flame'
  | 'smoke'
  | 'petals'
  | 'sparkle'
  | 'ripple'
  | 'resonance'
  // 테마 앰비언트(L3) — 설빛 눈 / 달집·대장간 불씨 / 용궁 기포 / 당산 낙엽
  | 'snow'
  | 'ember'
  | 'bubble'
  | 'leaf'

export interface EffectsHandle {
  emit: (kind: EffectKind, xPct: number, yPct: number) => void
  /** 지속 불꽃 등록/해제 (촛불 lit 상태) */
  setFlame: (id: string, xPct: number, yPct: number, on: boolean) => void
  /** 좌정 主神 시그니처 aura 상시 방출 (§3.3). particle 키 → 모션 아키타입. */
  setAura: (particle: string | null, accent: string | null, xPct: number, yPct: number, on: boolean) => void
  /** 시그니처 aura 순간 버스트 (탭 반응 §3.2). */
  burstAura: (particle: string | null, accent: string | null, xPct: number, yPct: number) => void
}

/** 신위 파티클 키(17종) → 상시 aura 모션 아키타입. 미매핑은 'rise' 폴백. */
type AuraMotion = 'rise' | 'fall' | 'float' | 'glint'
const AURA_MOTION: Record<string, AuraMotion> = {
  ember: 'rise',
  dokkaebi_fire: 'rise',
  slash_light: 'glint',
  dragon_aura: 'rise',
  talisman_shield: 'glint',
  star_trail: 'glint',
  coin_glint: 'glint',
  scale_glint: 'glint',
  firefly: 'float',
  pearl_bubble: 'float',
  mist: 'float',
  seed_bloom: 'fall',
  leaf: 'fall',
  heal_drop: 'fall',
  paper_crane: 'fall',
  coin_rain: 'fall',
  gold_rain: 'fall',
}

interface Particle {
  active: boolean
  kind: EffectKind | 'aura'
  /** aura 파티클의 반짝임 여부 (glint 모션) */
  twinkle: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  drift: number
  /** 사인 위상(rad) — 생성 시 난수로 시드, 매 프레임 swayFreq 만큼만 전진(프레임당 난수 호출 0) */
  phase: number
  /** 사인 좌우 속도 진폭(px/frame). 0이면 사인 미적용 — 기존 6종은 전부 0 */
  sway: number
  /** 위상 전진 속도(rad/frame). 좌우 이동 진폭 ≈ sway/swayFreq px */
  swayFreq: number
}

const POOL_SIZE = 160

/**
 * 캔버스 CSS 크기 상한(px). 큰 방(안2.2)에서 대청이 뷰포트보다 넓어지며 캔버스도 같이 넓어진다 —
 * 폭 320% × 룸 520px = 1664px 라 기존 1400 클램프에 걸려 오른쪽이 잘리고 파티클 좌표가 어긋났다.
 * 2048 은 그 위로 한 단계 여유(≈폭 390%)를 둔 값이다.
 */
const CANVAS_MAX_CSS_PX = 2048
/**
 * 버퍼 픽셀 예산 — width×height×dpr² 가 이 값을 넘으면 dpr 를 1 로 내린다.
 * 과거 흰화면은 캔버스 폭이 2^25px 로 폭주해 버퍼가 33.5Mpx 를 넘긴 사고였고, 8Mpx 는 그 1/4 이다.
 * 실측: 1664×480×2² = 3.19Mpx(통과) / 2048×480×2² = 3.93Mpx(통과) / 2048×1000×2² = 8.19Mpx → dpr 1.
 */
const CANVAS_BUDGET_PX = 8_000_000
const COLORS: Record<EffectKind, string[]> = {
  flame: ['#ffd27a', '#ff9d3c', '#f4e4ba'],
  smoke: ['#c8bfa8', '#8c8478'],
  petals: ['#f4b8d0', '#f4e4ba', '#e8a0c0'],
  sparkle: ['#f4e4ba', '#c9a84c', '#ffffff'],
  // 소원 빌기 — 물결처럼 은은히 퍼지는 청백
  ripple: ['#a8c5da', '#dbeafe', '#ffffff'],
  // 오행 공명 — 오방색이 섞여 방사되는 공명
  resonance: ['#f4e4ba', '#c9a84c', WU_XING_COLORS['木'], WU_XING_COLORS['火'], WU_XING_COLORS['水']],
  // 설빛 눈 — 흰색~얼음빛 냉광
  snow: ['#ffffff', '#e8f0f8', '#d6e6f2'],
  // 달집 불씨·대장간 불똥 — 주홍~호박
  ember: ['#e8743c', '#c9a84c', '#ffb066'],
  // 용궁 기포 — 청백 (테두리만 그린다)
  bubble: ['#bfe3ec', '#dff2f7', '#8fc9d8'],
  // 당산 낙엽 — 녹갈
  leaf: ['#6a7c4f', '#8a6d3f', '#9a8a4a'],
}

/** 1회 emit 당 방출 개수(기존 값 그대로). reduced-motion 이면 종 무관 1개. */
const EMIT_COUNT: Record<EffectKind, number> = {
  flame: 2,
  smoke: 4,
  petals: 4,
  sparkle: 8,
  ripple: 6,
  resonance: 10,
  snow: 3,
  ember: 3,
  bubble: 2,
  leaf: 2,
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** 전폭 낙하종(snow·leaf) 가로 배치 — 어떤 x 로 불러도 폭 안으로 되말아 균등 분포(캔버스 밖 낭비 0) */
const wrapX = (v: number, w: number) => (w > 0 ? ((v % w) + w) % w : 0)
/** 영역종(bubble) 가로 배치 — 가장자리에서 반대편으로 순간이동하지 않도록 되말지 않고 자른다 */
const clampX = (v: number, w: number) => (v < 0 ? 0 : v > w ? w : v)

export const EffectsCanvas = forwardRef<EffectsHandle, { className?: string }>(function EffectsCanvas(
  { className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poolRef = useRef<Particle[]>([])
  const rafRef = useRef<number | null>(null)
  const flamesRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const auraRef = useRef<{ motion: AuraMotion; accent: string; x: number; y: number } | null>(null)
  const reducedRef = useRef(false)
  const flameTickRef = useRef(0)
  const auraTickRef = useRef(0)

  useEffect(() => {
    reducedRef.current =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    poolRef.current = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      kind: 'flame' as EffectKind | 'aura',
      twinkle: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: '#fff',
      drift: 0,
      phase: 0,
      sway: 0,
      swayFreq: 0,
    }))
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const spawn = (kind: EffectKind, px: number, py: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (px / 100) * rect.width
    const y = (py / 100) * rect.height
    const pool = poolRef.current
    const count = reducedRef.current ? 1 : EMIT_COUNT[kind]
    const palette = COLORS[kind]
    const w = rect.width
    for (let n = 0; n < count; n++) {
      const p = pool.find((q) => !q.active)
      if (!p) break
      p.active = true
      p.kind = kind
      p.x = x + (Math.random() - 0.5) * 6
      p.y = y
      p.color = palette[(Math.random() * palette.length) | 0]
      // 사인 물리 기본값 — 앰비언트 종만 아래에서 덮어쓴다(풀 재사용 시 이전 값 잔류 방지)
      p.phase = 0
      p.sway = 0
      p.swayFreq = 0
      if (kind === 'flame') {
        p.vx = (Math.random() - 0.5) * 0.2
        p.vy = -0.6 - Math.random() * 0.5
        p.maxLife = 34
        p.size = 2 + Math.random() * 2
        p.drift = 0
      } else if (kind === 'smoke') {
        p.vx = (Math.random() - 0.5) * 0.2
        p.vy = -0.4 - Math.random() * 0.3
        p.maxLife = 70
        p.size = 3 + Math.random() * 3
        p.drift = (Math.random() - 0.5) * 0.02
      } else if (kind === 'petals') {
        p.vx = (Math.random() - 0.5) * 0.4
        p.vy = 0.3 + Math.random() * 0.3
        p.maxLife = 90
        p.size = 3 + Math.random() * 2
        p.drift = (Math.random() - 0.5) * 0.05
      } else if (kind === 'ripple') {
        // 소원 빌기 — 방사상으로 느리게 퍼지는 물결
        const ang = Math.random() * Math.PI * 2
        const spd = 0.3 + Math.random() * 0.35
        p.vx = Math.cos(ang) * spd
        p.vy = Math.sin(ang) * spd
        p.maxLife = 60
        p.size = 2 + Math.random() * 2.5
        p.drift = 0
      } else if (kind === 'resonance') {
        // 오행 공명 — 방사상 강한 버스트
        const ang = Math.random() * Math.PI * 2
        const spd = 0.7 + Math.random() * 1.0
        p.vx = Math.cos(ang) * spd
        p.vy = Math.sin(ang) * spd
        p.maxLife = 44
        p.size = 1.8 + Math.random() * 2
        p.drift = 0
      } else if (kind === 'snow') {
        // 설빛 눈 — 상부 전폭에서 느리게 낙하, 얕은 사인 표류(좌우 진폭 ≈5px). 바닥 근접 시 페이드
        p.x = wrapX(x + (Math.random() - 0.5) * w, w)
        p.y = y - Math.random() * 12
        p.vx = (Math.random() - 0.5) * 0.06
        p.vy = 0.7 + Math.random() * 0.35
        // 가장 느린 눈도 수명 내에 바닥(≈490px)까지 닿는 값 — 짧으면 공중에서 증발한다
        p.maxLife = 700
        p.size = 1 + Math.random() * 1.5
        p.drift = 0
        p.phase = Math.random() * Math.PI * 2
        p.sway = 0.18 + Math.random() * 0.18
        p.swayFreq = 0.04 + Math.random() * 0.03
      } else if (kind === 'ember') {
        // 불씨 — 지정점에서 상승, 미세 흔들림(≈3px) + 같은 위상을 배속해 만드는 알파 플리커
        p.x = x + (Math.random() - 0.5) * 8
        p.vx = (Math.random() - 0.5) * 0.1
        p.vy = -0.45 - Math.random() * 0.4
        p.maxLife = 90
        p.size = 1 + Math.random()
        p.drift = 0
        p.phase = Math.random() * Math.PI * 2
        p.sway = 0.25 + Math.random() * 0.2
        p.swayFreq = 0.1 + Math.random() * 0.06
      } else if (kind === 'bubble') {
        // 용궁 기포 — 지정 영역 하부에서 상승, 사인 워블(≈4px). 상단에 닿으면 터지듯 급소멸
        p.x = clampX(x + (Math.random() - 0.5) * w * 0.22, w)
        p.y = y + Math.random() * 10
        p.vx = (Math.random() - 0.5) * 0.08
        p.vy = -0.5 - Math.random() * 0.45
        p.maxLife = 340
        p.size = 1.5 + Math.random() * 2
        p.drift = 0
        p.phase = Math.random() * Math.PI * 2
        p.sway = 0.3 + Math.random() * 0.25
        p.swayFreq = 0.07 + Math.random() * 0.05
      } else if (kind === 'leaf') {
        // 당산 낙엽 — 상부 전폭에서 낙하, 눈보다 크고 느린 스웨이(진폭 ≈25px·주기 ≈3초)
        p.x = wrapX(x + (Math.random() - 0.5) * w, w)
        p.y = y - Math.random() * 16
        p.vx = (Math.random() - 0.5) * 0.1
        p.vy = 0.62 + Math.random() * 0.3
        // 눈보다 느리게 지므로 수명도 길어야 바닥(≈495px)까지 닿는다
        p.maxLife = 800
        p.size = 2 + Math.random() * 1.5
        p.drift = 0
        p.phase = Math.random() * Math.PI * 2
        p.sway = 0.9 + Math.random() * 0.5
        p.swayFreq = 0.032 + Math.random() * 0.016
      } else {
        // sparkle
        const ang = Math.random() * Math.PI * 2
        const spd = 0.6 + Math.random() * 0.8
        p.vx = Math.cos(ang) * spd
        p.vy = Math.sin(ang) * spd
        p.maxLife = 26
        p.size = 1.5 + Math.random() * 1.5
        p.drift = 0
      }
      p.twinkle = false
      p.life = p.maxLife
    }
    ensureLoop()
  }

  /** 좌정 主神 aura 파티클 1개 방출 — 모션 아키타입별 물리, 신위 accent 색. */
  const spawnAura = (motion: AuraMotion, accent: string, px: number, py: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const p = poolRef.current.find((q) => !q.active)
    if (!p) return
    const w = rect.width
    const x = (px / 100) * w + (Math.random() - 0.5) * w * 0.28
    const y = (py / 100) * rect.height
    p.active = true
    p.kind = 'aura'
    p.color = accent
    p.twinkle = motion === 'glint'
    // aura 는 사인 물리를 쓰지 않는다 — 앰비언트 종이 쓰던 풀 슬롯을 재사용할 때의 잔류값 제거
    p.phase = 0
    p.sway = 0
    p.swayFreq = 0
    if (motion === 'rise') {
      p.x = x
      p.y = y + 8
      p.vx = (Math.random() - 0.5) * 0.15
      p.vy = -0.35 - Math.random() * 0.3
      p.maxLife = 90
      p.size = 1.6 + Math.random() * 1.6
      p.drift = (Math.random() - 0.5) * 0.015
    } else if (motion === 'fall') {
      p.x = x
      p.y = y - rect.height * 0.28
      p.vx = (Math.random() - 0.5) * 0.25
      p.vy = 0.28 + Math.random() * 0.28
      p.maxLife = 130
      p.size = 2 + Math.random() * 1.8
      p.drift = (Math.random() - 0.5) * 0.04
    } else if (motion === 'float') {
      p.x = x
      p.y = y - Math.random() * rect.height * 0.2
      p.vx = (Math.random() - 0.5) * 0.3
      p.vy = (Math.random() - 0.5) * 0.18
      p.maxLife = 150
      p.size = 1.8 + Math.random() * 1.8
      p.drift = (Math.random() - 0.5) * 0.02
    } else {
      // glint — 제자리 반짝임
      p.x = x
      p.y = y - Math.random() * rect.height * 0.24
      p.vx = 0
      p.vy = -0.05
      p.maxLife = 52
      p.size = 1.4 + Math.random() * 1.6
      p.drift = 0
    }
    p.life = p.maxLife
    ensureLoop()
  }

  const ensureLoop = () => {
    if (rafRef.current != null) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const step = () => {
      const rect = canvas.getBoundingClientRect()
      // 방어적 클램프: 캔버스 버퍼가 비정상적으로 커지는 피드백 폭주 차단
      // (과거 방 크기 측정 이상으로 canvas.width가 2^25까지 폭주 → 빈 흰 캔버스가 방을 덮던 버그).
      // ⚠️ spawn/spawnAura 는 rect.width 기반으로 % → px 를 환산하므로, 여기서 w 를 자르는 순간
      //    그 폭을 넘는 좌표는 캔버스 밖으로 나간다. 상한은 반드시 실제 방 폭보다 커야 한다.
      const w = Math.max(1, Math.min(Math.round(rect.width), CANVAS_MAX_CSS_PX))
      const h = Math.max(1, Math.min(Math.round(rect.height), CANVAS_MAX_CSS_PX))
      // 픽셀 예산 초과 시 선명도(dpr)를 먼저 포기한다 — 폭을 더 자르면 파티클 좌표계가 깨진다
      const want = Math.min(window.devicePixelRatio || 1, 2)
      const dpr = w * h * want * want > CANVAS_BUDGET_PX ? 1 : want
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      // 기포 테두리 굵기(유일한 stroke 사용처) — 캔버스 리사이즈로 컨텍스트가 초기화되므로 프레임마다 지정
      ctx.lineWidth = 1

      // 지속 불꽃 방출 (촛불)
      if (!reducedRef.current) {
        flameTickRef.current = (flameTickRef.current + 1) % 3
        if (flameTickRef.current === 0) {
          flamesRef.current.forEach(({ x, y }) => spawn('flame', x, y))
        }
        // 좌정 主神 시그니처 aura 방출 (저빈도 — 은은한 상시 연출)
        const aura = auraRef.current
        if (aura) {
          auraTickRef.current = (auraTickRef.current + 1) % 14
          if (auraTickRef.current === 0) spawnAura(aura.motion, aura.accent, aura.x, aura.y)
        }
      }

      let alive = 0
      for (const p of poolRef.current) {
        if (!p.active) continue
        alive++
        p.life--
        if (p.life <= 0) {
          p.active = false
          continue
        }
        // 사인 스웨이 — 위상만 전진시켜 좌우 속도를 흔든다(프레임당 난수 0, 미사용 종은 sway 0 이라 무비용)
        let s = 0
        if (p.sway !== 0) {
          p.phase += p.swayFreq
          s = Math.sin(p.phase)
        }
        p.vx += p.drift
        p.x += p.vx + s * p.sway
        p.y += p.vy
        // 화면 밖으로 나간 앰비언트 파티클 즉시 회수 — 보이지 않는 개체가 풀을 잠그지 않게
        if ((p.y > h && (p.kind === 'snow' || p.kind === 'leaf')) || (p.y < -4 && p.kind === 'bubble')) {
          p.active = false
          continue
        }
        const t = p.life / p.maxLife
        // aura glint는 삼각파로 반짝, 그 외는 수명 비례 페이드
        const twk = p.twinkle ? Math.sin((1 - t) * Math.PI) : t
        let alpha = t
        if (p.kind === 'smoke') alpha = t * 0.4
        else if (p.kind === 'aura') alpha = twk * 0.7
        // 눈은 바닥에 닿을수록 옅어지고, 기포는 상단에 닿을수록 급히 사라진다(터짐)
        else if (p.kind === 'snow') alpha = 0.9 * Math.min(1, t * 5) * clamp01((h - p.y) / (h * 0.14))
        else if (p.kind === 'bubble') alpha = 0.6 * Math.min(1, t * 7) * clamp01(p.y / (h * 0.18))
        // 불씨는 수명 페이드 위에 위상 기반 결정적 플리커를 얹는다
        else if (p.kind === 'ember') alpha = t * (0.72 + 0.28 * Math.sin(p.phase * 2.3))
        ctx.globalAlpha = alpha
        if (p.kind === 'bubble') {
          ctx.strokeStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.stroke()
        } else if (p.kind === 'leaf') {
          // 납작 타원 — 스웨이 위상이 종횡비와 기울기를 함께 흔들어 잎이 뒤집히듯 보인다
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.ellipse(p.x, p.y, p.size, p.size * (0.34 + 0.44 * Math.abs(s)), s * 0.6, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = p.color
          ctx.beginPath()
          const size = p.kind === 'smoke' ? p.size * (2 - t) : p.size
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      if (alive > 0 || flamesRef.current.size > 0 || auraRef.current) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  useImperativeHandle(ref, () => ({
    emit: (kind, x, y) => spawn(kind, x, y),
    setFlame: (id, x, y, on) => {
      if (on) flamesRef.current.set(id, { x, y })
      else flamesRef.current.delete(id)
      if (on) ensureLoop()
    },
    setAura: (particle, accent, x, y, on) => {
      if (on && particle && accent && !reducedRef.current) {
        auraRef.current = { motion: AURA_MOTION[particle] ?? 'rise', accent, x, y }
        ensureLoop()
      } else {
        auraRef.current = null
      }
    },
    burstAura: (particle, accent, x, y) => {
      if (!particle || !accent) return
      const motion = AURA_MOTION[particle] ?? 'rise'
      const n = reducedRef.current ? 3 : 12
      for (let i = 0; i < n; i++) spawnAura(motion, accent, x, y)
    },
  }))

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // width/height 100% 명시 — 캔버스 CSS 표시 크기를 방에 고정(속성값 기반 레이아웃 폭주 방지).
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11 }}
      aria-hidden
    />
  )
})
