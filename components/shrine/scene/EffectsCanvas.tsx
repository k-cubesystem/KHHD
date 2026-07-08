'use client'

/**
 * 이펙트 캔버스 — 파티클(불꽃/향연/꽃잎/반짝임)을 단일 canvas rAF 루프로 렌더.
 * 오브젝트 풀 고정(GC 방지), 활성 파티클이 있을 때만 루프 구동.
 * prefers-reduced-motion 시 파티클 수 대폭 감소.
 *
 * 사용: emit(kind, xPct, yPct) 를 ref로 노출 → 부모가 촛불 점화/향로 탭 등에서 호출.
 */

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

export type EffectKind = 'flame' | 'smoke' | 'petals' | 'sparkle'

export interface EffectsHandle {
  emit: (kind: EffectKind, xPct: number, yPct: number) => void
  /** 지속 불꽃 등록/해제 (촛불 lit 상태) */
  setFlame: (id: string, xPct: number, yPct: number, on: boolean) => void
}

interface Particle {
  active: boolean
  kind: EffectKind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  drift: number
}

const POOL_SIZE = 160
const COLORS = {
  flame: ['#ffd27a', '#ff9d3c', '#f4e4ba'],
  smoke: ['#c8bfa8', '#8c8478'],
  petals: ['#f4b8d0', '#f4e4ba', '#e8a0c0'],
  sparkle: ['#f4e4ba', '#c9a84c', '#ffffff'],
}

export const EffectsCanvas = forwardRef<EffectsHandle, { className?: string }>(function EffectsCanvas(
  { className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poolRef = useRef<Particle[]>([])
  const rafRef = useRef<number | null>(null)
  const flamesRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const reducedRef = useRef(false)
  const flameTickRef = useRef(0)

  useEffect(() => {
    reducedRef.current =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    poolRef.current = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      kind: 'flame' as EffectKind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: '#fff',
      drift: 0,
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
    const count = reducedRef.current ? 1 : kind === 'flame' ? 2 : kind === 'sparkle' ? 8 : 4
    const palette = COLORS[kind]
    for (let n = 0; n < count; n++) {
      const p = pool.find((q) => !q.active)
      if (!p) break
      p.active = true
      p.kind = kind
      p.x = x + (Math.random() - 0.5) * 6
      p.y = y
      p.color = palette[(Math.random() * palette.length) | 0]
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
      p.life = p.maxLife
    }
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr)
        canvas.height = Math.round(rect.height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      // 지속 불꽃 방출 (촛불)
      if (!reducedRef.current) {
        flameTickRef.current = (flameTickRef.current + 1) % 3
        if (flameTickRef.current === 0) {
          flamesRef.current.forEach(({ x, y }) => spawn('flame', x, y))
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
        p.vx += p.drift
        p.x += p.vx
        p.y += p.vy
        const t = p.life / p.maxLife
        ctx.globalAlpha = p.kind === 'smoke' ? t * 0.4 : t
        ctx.fillStyle = p.color
        ctx.beginPath()
        const size = p.kind === 'smoke' ? p.size * (2 - t) : p.size
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (alive > 0 || flamesRef.current.size > 0) {
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
  }))

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11 }}
      aria-hidden
    />
  )
})
