'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as RKeyboardEvent,
  type ReactNode,
} from 'react'
import { GAMEFEEL_V1 } from '@/lib/config/gamefeel'

/**
 * 신당 게임필 v1 — 입장·기도 시네마틱 연출 라이브러리 (PRD 안1 / ARCH §1·2·5)
 *
 * 자기완결 모듈이다. 룸(ShrineRoomClient)을 import 하지 않고, 룸에 얹을 재료
 * (카메라 style · 클래스 · 오버레이 · 재생 함수)만 돌려준다. 배선은 호출 측 책임.
 *
 * 성능 원칙(ARCH §5): 카메라·idle 은 transform/opacity 만 애니메이션한다.
 * 타이밍은 setTimeout 체인 + CSS transition 이며 rAF 상주 루프는 두지 않는다
 * (전이 시작 프레임을 잡는 1회성 rAF 2번만 사용).
 */

// ── 타임라인 (ms) ────────────────────────────────────────────
/**
 * 입장 연출 길이 — 첫 진입 / 재방문 축약 / **두루마리 입장 팬**.
 *
 * `first`·`revisit` 은 암전·빛줄기(=화면을 덮는 연출)라 재방문에는 짧게 접는다.
 * `pan` 은 카메라가 마당에서 대청으로 걸어 들어오는 이동 그 자체다 — 화면을 가리지 않고
 * transform 하나만 움직이므로 첫 진입·재방문·저사양을 가리지 않고 **항상 같은 길이**로 재생한다.
 * (revisit 길이 500ms 를 팬에 그대로 쓰면 암전이 걷히기 전에 이동이 끝나 "들어오는 장면"이 사라진다 —
 *  실기기 검수 지적 "대문에서 걸어 들어오는 입장이 안 보인다"의 직접 원인.)
 */
export const ENTRANCE_MS = { first: 1200, revisit: 500, pan: 1100 } as const
/** 입장 구간 비율 — 암전 해제 / 빛줄기 상승 / 빛줄기 감쇠 시작점 */
const ENTRANCE_RATIO = { dimOut: 0.62, bloomUp: 0.42, bloomFadeAt: 0.45 } as const
/** 기도 의식 마디 (t0 암전 → 점화 → 절정 → 해제 → 종료) */
const PRAYER_AT = { dim: 0, ignite: 900, peak: 1800, release: 2600, end: 3000 } as const
/** 기도 의식 각 마디의 전이 길이 */
const PRAYER_MS = { camIn: 700, dimIn: 520, bloomIgnite: 380, bloomPeak: 340, release: 400 } as const
/** 스킵 시 잔상 정리 — 콜백은 즉시, 화면만 아주 짧게 접는다 */
const SKIP_FADE_MS = 140
/** 미세 화면 흔들림 1회 길이 (.shrine-cam-shake 와 동일해야 한다) */
const SHAKE_MS = 300

// ── 카메라 · 오버레이 값 ──────────────────────────────────────
/** 입장 카메라 시작점 — 살짝 밀려 있다가 제자리로 (푸시인) */
const ENTRANCE_CAM = { scale: 1.05, ty: 6 } as const
/** 기도 카메라 — 제단 쪽(50% 55%)으로 푸시인 */
const PRAYER_CAM = { scale: 1.08, oy: 55 } as const
const DIM_ENTRANCE = 0.85
const DIM_PRAYER = 0.55
const BLOOM_ENTRANCE = 0.5
const BLOOM_IGNITE = 0.45
const BLOOM_PEAK = 1
/** 광원(빛줄기) — DESIGN.md 골드 #C9A84C. 그라디언트는 토큰 예외(inline 허용) */
const BLOOM_BG =
  'radial-gradient(58% 46% at 50% 46%, rgba(201,168,76,0.5) 0%, rgba(201,168,76,0.17) 40%, rgba(201,168,76,0) 72%)'
/** 룸 내부 전면 레이어 라운딩 — 부모 클립에 의존하지 않는다(흰화면 사고 교훈) */
const ROOM_RADIUS = '17px'
/** 룸 최상 UI(z-30) 위 대역 */
const OVERLAY_Z = 40
const CAM_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

/** 재생 중이 아닐 때 룸에 얹을 것이 없다 — 참조가 고정돼야 소비자 리렌더를 유발하지 않는다 */
const NO_STYLE: CSSProperties = Object.freeze({})

interface Stage {
  /** 카메라 */
  scale: number
  ty: number
  ox: number
  oy: number
  camMs: number
  /** 암전 레이어 */
  dim: number
  dimMs: number
  /** 광원 레이어 */
  bloom: number
  bloomMs: number
  /** 스킵 안내 노출 (0.5s 축약 입장에는 띄우지 않는다) */
  hint: boolean
}

const NEUTRAL: Stage = {
  scale: 1,
  ty: 0,
  ox: 50,
  oy: 50,
  camMs: 0,
  dim: 0,
  dimMs: 0,
  bloom: 0,
  bloomMs: 0,
  hint: false,
}

/** 기도 의식 각 국면 훅 — 배선 측이 촛불 점화·신위 응답·기원 카운트업을 얹는다 */
export interface PrayerHooks {
  onDim?: () => void
  onIgnite?: () => void
  onPeak?: () => void
  onEnd?: () => void
}

export interface CinematicsApi {
  /** 재생 중 — 룸 입력 차단 판단용 */
  active: boolean
  /** 룸 컨테이너 style 에 merge 할 카메라 transform */
  roomStyle: CSSProperties
  /** 룸 컨테이너 className 에 이어붙일 연출 클래스 */
  roomClassName: string
  /** 룸 안 최상단에 렌더할 오버레이(암전·빛줄기·스킵 탭 영역) */
  overlay: ReactNode
  playEntrance: (revisit: boolean) => void
  playPrayer: (hooks: PrayerHooks) => void
  /** 미세 화면 흔들림 (±2px, 0.3s) */
  shake: () => void
  /** 햅틱 — 미지원 기기에서는 조용히 무시 */
  vibrate: (ms: number) => void
}

/** 연출 허용 여부 — 게이트 오프 또는 모션 최소화 설정이면 화면 연출을 전부 생략한다 */
function motionAllowed(): boolean {
  if (!GAMEFEEL_V1) return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCinematics(): CinematicsApi {
  const [stage, setStage] = useState<Stage>(NEUTRAL)
  const [active, setActive] = useState(false)
  const [shaking, setShaking] = useState(false)

  const activeRef = useRef(false)
  const timers = useRef<number[]>([])
  const frames = useRef<number[]>([])
  const shakeTimer = useRef<number | null>(null)
  const shakingRef = useRef(false)
  const hooksRef = useRef<PrayerHooks>({})
  const fired = useRef({ dim: false, ignite: false, peak: false })

  const clearTimeline = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    frames.current.forEach((f) => window.cancelAnimationFrame(f))
    frames.current = []
  }, [])

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  /**
   * 시작값이 실제로 한 번 그려진 다음 프레임에 목표값을 건다.
   * 같은 프레임에서 시작·목표를 연달아 세팅하면 브라우저가 보간하지 않고 곧장 튄다.
   */
  const kick = useCallback((fn: () => void) => {
    frames.current.push(window.requestAnimationFrame(() => frames.current.push(window.requestAnimationFrame(fn))))
  }, [])

  /** 연출 종료 — fadeMs>0 이면 화면만 짧게 접고, 상태는 즉시 비재생으로 바꾼다 */
  const finish = useCallback(
    (fadeMs: number) => {
      clearTimeline()
      activeRef.current = false
      setActive(false)
      if (fadeMs <= 0) {
        setStage(NEUTRAL)
        return
      }
      setStage((s) => ({
        ...s,
        scale: 1,
        ty: 0,
        camMs: 0,
        dim: 0,
        dimMs: fadeMs,
        bloom: 0,
        bloomMs: fadeMs,
        hint: false,
      }))
      timers.current.push(window.setTimeout(() => setStage(NEUTRAL), fadeMs))
    },
    [clearTimeline]
  )

  /**
   * 스킵 — 아직 발화하지 않은 훅을 순서대로 마저 호출하고 onEnd 로 닫는다.
   * (연출만 건너뛸 뿐 배선 상태가 중간에 멈추면 안 된다 — reduced-motion 경로와 같은 계약)
   */
  const skip = useCallback(() => {
    if (!activeRef.current) return
    clearTimeline()
    const h = hooksRef.current
    hooksRef.current = {}
    if (!fired.current.dim) {
      fired.current.dim = true
      h.onDim?.()
    }
    if (!fired.current.ignite) {
      fired.current.ignite = true
      h.onIgnite?.()
    }
    if (!fired.current.peak) {
      fired.current.peak = true
      h.onPeak?.()
    }
    finish(SKIP_FADE_MS)
    h.onEnd?.()
  }, [clearTimeline, finish])

  // ── 입장 시네마틱 — 암전에서 광원이 켜지며 카메라가 제자리로 밀려든다 ──
  const playEntrance = useCallback(
    (revisit: boolean) => {
      if (!motionAllowed() || activeRef.current) return
      const d = revisit ? ENTRANCE_MS.revisit : ENTRANCE_MS.first
      const bloomFadeAt = Math.round(d * ENTRANCE_RATIO.bloomFadeAt)
      hooksRef.current = {}
      fired.current = { dim: true, ignite: true, peak: true } // 입장엔 훅이 없다
      activeRef.current = true
      setActive(true)
      setStage({
        ...NEUTRAL,
        scale: ENTRANCE_CAM.scale,
        ty: ENTRANCE_CAM.ty,
        dim: DIM_ENTRANCE,
        hint: !revisit,
      })
      kick(() =>
        setStage((s) => ({
          ...s,
          scale: 1,
          ty: 0,
          camMs: d,
          dim: 0,
          dimMs: Math.round(d * ENTRANCE_RATIO.dimOut),
          bloom: BLOOM_ENTRANCE,
          bloomMs: Math.round(d * ENTRANCE_RATIO.bloomUp),
        }))
      )
      at(bloomFadeAt, () => setStage((s) => ({ ...s, bloom: 0, bloomMs: d - bloomFadeAt })))
      at(d, () => finish(0))
    },
    [at, kick, finish]
  )

  // ── 기도 의식 — 암전 → 제단 푸시인 → 점화 → 절정 → 해제 ──
  const playPrayer = useCallback(
    (hooks: PrayerHooks) => {
      if (!motionAllowed()) {
        hooks.onDim?.()
        hooks.onIgnite?.()
        hooks.onPeak?.()
        hooks.onEnd?.()
        return
      }
      if (activeRef.current) return
      hooksRef.current = hooks
      fired.current = { dim: true, ignite: false, peak: false }
      activeRef.current = true
      setActive(true)
      // transform-origin 은 전이되지 않고 즉시 바뀐다 — scale 이 1 인 t0 에 미리 옮겨 둬야 튀지 않는다
      setStage({ ...NEUTRAL, oy: PRAYER_CAM.oy, hint: true })
      hooks.onDim?.()
      kick(() =>
        setStage((s) => ({
          ...s,
          scale: PRAYER_CAM.scale,
          camMs: PRAYER_MS.camIn,
          dim: DIM_PRAYER,
          dimMs: PRAYER_MS.dimIn,
        }))
      )
      at(PRAYER_AT.ignite, () => {
        fired.current.ignite = true
        hooksRef.current.onIgnite?.()
        setStage((s) => ({ ...s, bloom: BLOOM_IGNITE, bloomMs: PRAYER_MS.bloomIgnite }))
      })
      at(PRAYER_AT.peak, () => {
        fired.current.peak = true
        hooksRef.current.onPeak?.()
        setStage((s) => ({ ...s, bloom: BLOOM_PEAK, bloomMs: PRAYER_MS.bloomPeak }))
      })
      // 해제: origin 은 그대로 두고 scale 만 되돌린다(원점을 먼저 옮기면 확대 상태에서 튄다)
      at(PRAYER_AT.release, () =>
        setStage((s) => ({
          ...s,
          scale: 1,
          camMs: PRAYER_MS.release,
          dim: 0,
          dimMs: PRAYER_MS.release,
          bloom: 0,
          bloomMs: PRAYER_MS.release,
          hint: false,
        }))
      )
      at(PRAYER_AT.end, () => {
        const h = hooksRef.current
        hooksRef.current = {}
        finish(0)
        h.onEnd?.()
      })
    },
    [at, kick, finish]
  )

  // ── 주스 ────────────────────────────────────────────────
  const shake = useCallback(() => {
    if (!motionAllowed()) return
    if (shakeTimer.current !== null) {
      window.clearTimeout(shakeTimer.current)
      shakeTimer.current = null
    }
    const start = () => {
      shakingRef.current = true
      setShaking(true)
      shakeTimer.current = window.setTimeout(() => {
        shakingRef.current = false
        shakeTimer.current = null
        setShaking(false)
      }, SHAKE_MS)
    }
    if (shakingRef.current) {
      // 클래스를 한 프레임 걷어내야 연속 호출에도 애니메이션이 다시 시작된다
      shakingRef.current = false
      setShaking(false)
      frames.current.push(window.requestAnimationFrame(start))
      return
    }
    start()
  }, [])

  const vibrate = useCallback((ms: number) => {
    if (!GAMEFEEL_V1) return
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    try {
      navigator.vibrate(ms)
    } catch {
      // 사용자 제스처 밖 호출을 막는 브라우저가 있다 — 햅틱 실패는 연출에 영향이 없다
    }
  }, [])

  useEffect(
    () => () => {
      clearTimeline()
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current)
    },
    [clearTimeline]
  )

  // ── 룸에 얹을 산출물 ─────────────────────────────────────
  const camOn = active || stage.scale !== 1 || stage.ty !== 0
  const roomStyle = useMemo<CSSProperties>(() => {
    if (!camOn) return NO_STYLE
    return {
      transform: `scale(${stage.scale}) translate3d(0, ${stage.ty}px, 0)`,
      transformOrigin: `${stage.ox}% ${stage.oy}%`,
      transition: `transform ${stage.camMs}ms ${CAM_EASE}`,
      willChange: 'transform',
    }
  }, [camOn, stage.scale, stage.ty, stage.ox, stage.oy, stage.camMs])

  const roomClassName = shaking ? 'shrine-cam-shake' : ''

  const onSkipKey = useCallback(
    (e: RKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return
      e.preventDefault()
      skip()
    },
    [skip]
  )

  const showOverlay = active || stage.dim > 0 || stage.bloom > 0
  const overlay = useMemo<ReactNode>(() => {
    if (!showOverlay) return null
    return (
      <div
        className="shrine-cine-overlay"
        role={active ? 'button' : 'presentation'}
        // 강신 의식(GangshinOverlay)이 같은 페이지에 동시에 뜰 수 있다 —
        // 접근성 이름이 겹치지 않게 '신당'을 붙여 구분한다
        aria-label={active ? '신당 연출 건너뛰기' : undefined}
        tabIndex={active ? 0 : -1}
        onPointerDown={active ? skip : undefined}
        onKeyDown={active ? onSkipKey : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: OVERLAY_Z,
          borderRadius: ROOM_RADIUS,
          overflow: 'hidden',
          pointerEvents: active ? 'auto' : 'none',
          cursor: active ? 'pointer' : 'default',
          outline: 'none',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            opacity: stage.dim,
            transition: `opacity ${stage.dimMs}ms ease`,
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: BLOOM_BG,
            opacity: stage.bloom,
            transition: `opacity ${stage.bloomMs}ms ease`,
          }}
        />
        {active && stage.hint && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '7%',
              textAlign: 'center',
              fontSize: '9px',
              letterSpacing: '0.22em',
              color: 'rgba(232,213,160,0.55)',
            }}
          >
            탭하여 건너뛰기
          </span>
        )}
      </div>
    )
  }, [showOverlay, active, skip, onSkipKey, stage.dim, stage.dimMs, stage.bloom, stage.bloomMs, stage.hint])

  return useMemo<CinematicsApi>(
    () => ({ active, roomStyle, roomClassName, overlay, playEntrance, playPrayer, shake, vibrate }),
    [active, roomStyle, roomClassName, overlay, playEntrance, playPrayer, shake, vibrate]
  )
}
