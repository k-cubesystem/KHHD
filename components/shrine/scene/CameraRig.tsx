'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type PointerEvent as RPointerEvent,
} from 'react'
import {
  clampCamX,
  freeGlideTarget,
  zoneAlignCamX,
  PARALLAX,
  WORLD_VIEWPORT_PCT,
  ZONE_FLICK_MIN_PCT_PER_S,
  type WorldSpec,
  type WorldZone,
} from '@/lib/domain/shrine/world'

/**
 * 신당 게임필 2차 「두루마리 신당」 — 카메라 · 제스처 (PRD 안2 / ARCH §1·4·5)
 *
 * 자기완결 모듈이다. 룸(ShrineRoomClient)을 import 하지 않고, 룸에 얹을 재료
 * (카메라 style · CSS 변수 · 포인터 핸들러 · 명령 API)만 돌려준다. 배선은 호출 측 책임.
 *
 * 좌표계는 lib/domain/shrine/world.ts 단일 출처를 따른다 — 뷰포트 폭 = 100,
 * world 는 그 배수(단일 100 / 두루마리 240), camX = "뷰포트 좌단의 world %"(0 ~ width-100).
 * 관성 목적지(자유 팬)·구역 정렬점·플릭 기준은 전부 도메인 순수 함수가 정하고 여기서는 재현하지 않는다.
 *
 * 성능(ARCH §5): transform/opacity 만 움직인다. rAF 는 관성 감속 중에만 한시 가동하고
 * 도달·중단 즉시 멈춘다(상주 루프 금지). 이동 중 레이아웃 조회도 없다 — 뷰포트 폭은
 * 제스처 시작 시 1회만 잰다.
 */

// ── 좌표 ──────────────────────────────────────────────────
/** 이 이하 거리는 이동으로 치지 않는다 (world %) */
const CAM_EPSILON = 0.02
/** camX 유효 소수 자리. 그대로 두면 CSS 변수 문자열이 매 프레임 달라져 쓸모없는 리렌더가 난다 */
const CAM_DECIMALS = 3

// ── 제스처 판정 (ARCH §4) ─────────────────────────────────
/** pointerdown 후 이 거리(px)를 넘은 순간 **1회만** 방향을 정한다 */
const DECIDE_PX = 8
/** 가로 우세 판정 — |dx| > |dy| × 이 배수여야 팬으로 캡처(아니면 브라우저 세로 스크롤에 양보) */
const HORIZONTAL_RATIO = 1.2
/** 팬으로 끝난 제스처가 아이템 탭으로 새지 않게 뒤따르는 click 1회를 삼키는 유효 시간 */
const CLICK_GUARD_MS = 350

// ── 관성 · 감속 곡선 ──────────────────────────────────────
/** 손끝 속도 표본 창(ms) — 손을 떼기 직전 이 구간의 평균 속도를 관성으로 넘긴다 */
const VELOCITY_WINDOW_MS = 80
/** 마지막 표본이 이보다 오래됐으면 손이 멈춘 뒤 뗀 것 — 관성 0 */
const VELOCITY_STALE_MS = 60
/** 감속 곡선 — ease-out cubic. 손을 뗀 순간이 가장 빠르고 목표에서 잦아든다 */
const glideEase = (t: number): number => 1 - (1 - t) ** 3
/** ease-out cubic 의 t=0 기울기. 감속 첫 프레임 속도를 손끝 속도에 맞추는 데 쓴다 */
const GLIDE_SLOPE = 3
const GLIDE_MS_MIN = 180
const GLIDE_MS_MAX = 620
/** 관성이 거의 없는 느린 손놓기의 기본 길이 = BASE + 거리(world %) × PER_PCT */
const GLIDE_BASE_MS = 200
const GLIDE_MS_PER_PCT = 4

// ── 미니맵 ────────────────────────────────────────────────
/** 44px 터치 타깃 안에 놓이는 점의 지름(px) */
const MINIMAP_DOT_PX = 7

/** CSS 사용자 정의 속성은 CSSProperties 에 없다 — 교차 타입으로 좁혀 any 를 피한다. */
type CssVars = CSSProperties & Record<`--${string}`, string>

/** 참조 고정 — 카메라가 없는 신당에 매 렌더 새 객체를 얹지 않는다(useCinematics 와 같은 규약) */
const NO_STYLE: CSSProperties = Object.freeze({})
const REST_LAYER_VAR: CSSProperties = Object.freeze({ '--shrine-cam-x': '0' } as CssVars)

export interface CameraApi {
  /** 뷰포트 좌단의 world %(0 ~ width-100) */
  camX: number
  /** 카메라가 움직이는 중 — 손으로 끄는 중이거나 관성/명령 이동 중 */
  panning: boolean
  /** 구역 이동·시네마틱용 명령. ms 를 주지 않으면 거리에 맞춘 감속 길이를 쓴다 */
  panTo: (camX: number, ms?: number) => void
  /** 룸 컨테이너에 스프레드할 포인터 핸들러(보기·편집 공용). touchAction 정책은 배선 측 유지 */
  bindPan: {
    onPointerDown: (e: RPointerEvent) => void
    onPointerMove: (e: RPointerEvent) => void
    onPointerUp: (e: RPointerEvent) => void
    onPointerCancel: (e: RPointerEvent) => void
  }
  /** world 컨테이너(폭 width%)에 줄 transform + will-change */
  worldStyle: CSSProperties
  /** 룸 루트에 줄 `--shrine-cam-x` — 시차층이 calc(var(--shrine-cam-x) * -0.3%) 식으로 소비한다 */
  layerVar: CSSProperties
}

/** 진행 중인 한 제스처의 상태 */
interface Drag {
  pointerId: number
  /** 룸 뷰포트 폭(px) — 제스처 시작 시 1회 측정(이동 중 레이아웃 조회 금지) */
  viewportPx: number
  startClientX: number
  startClientY: number
  startCam: number
  /** 8px 각도 판정을 마쳤는가 */
  decided: boolean
  /** 가로 팬으로 캡처했는가 (decided && !captured = 세로 제스처 → 브라우저에 넘김) */
  captured: boolean
}

interface Sample {
  t: number
  cam: number
}

/** 모션 최소화 설정이면 감속 없이 즉시 점프한다 */
function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pushSample(list: Sample[], s: Sample): void {
  list.push(s)
  // 창 밖 표본은 버리되 항상 2개는 남긴다(속도 산출에 최소 두 점이 필요하다)
  while (list.length > 2 && s.t - list[0].t > VELOCITY_WINDOW_MS) list.shift()
}

/** 최근 창(80ms)의 평균 속도(world %/s). 손이 멈춘 채로 뗐으면 0 */
function velocityOf(list: Sample[]): number {
  if (list.length < 2) return 0
  const first = list[0]
  const last = list[list.length - 1]
  if (performance.now() - last.t > VELOCITY_STALE_MS) return 0
  const dt = last.t - first.t
  if (dt <= 0) return 0
  return ((last.cam - first.cam) / dt) * 1000
}

/**
 * 감속 길이 — 플릭이면 손끝 속도를 이어받아(곡선 첫 프레임이 손끝과 같은 빠르기) 짧게 끝내고,
 * 아니면 거리에 비례한다. 던질수록 빨리 붙는다. 플릭 기준은 도메인과 같은 상수를 쓴다.
 */
function glideMs(distance: number, velocity: number): number {
  const d = Math.abs(distance)
  const byDistance = GLIDE_BASE_MS + d * GLIDE_MS_PER_PCT
  const v = Math.abs(velocity)
  const ms = v >= ZONE_FLICK_MIN_PCT_PER_S ? Math.min(byDistance, (GLIDE_SLOPE * d * 1000) / v) : byDistance
  return Math.min(GLIDE_MS_MAX, Math.max(GLIDE_MS_MIN, ms))
}

export function useCameraRig(world: WorldSpec, opts: { enabled: boolean; editing: boolean }): CameraApi {
  const { enabled, editing } = opts
  /** 카메라가 살아 있는 조건 — 꺼졌거나 단일 무대(폭 100)면 팬할 좌표계가 없다 */
  const active = enabled && world.width > WORLD_VIEWPORT_PCT

  const [camState, setCamState] = useState(0)
  const [panning, setPanning] = useState(false)
  /**
   * 실제로 내보내는 카메라 위치. 꺼짐·폭 축소(테마 전환)를 **렌더에서 파생**시켜
   * 상태 동기화용 effect 없이도 좌표가 항상 유효 범위 안에 있게 한다.
   */
  const camX = active ? clampCamX(camState, world.width) : 0

  const camRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const samplesRef = useRef<Sample[]>([])
  const roomRef = useRef<Element | null>(null)
  const guardTimer = useRef<number | null>(null)
  const guardFn = useRef<((e: Event) => void) | null>(null)

  // 최신값 참조 — 포인터 핸들러가 재생성되지 않아야 bindPan 참조가 고정된다
  const worldRef = useRef(world)
  const activeRef = useRef(active)
  const editingRef = useRef(editing)
  useEffect(() => {
    worldRef.current = world
    activeRef.current = active
    editingRef.current = editing
    camRef.current = camX
  })

  /** camX 단일 창구 — 소수 정리 + 같은 값이면 리렌더를 내지 않는다 */
  const setCam = useCallback((next: number) => {
    const v = Number(next.toFixed(CAM_DECIMALS))
    if (v === camRef.current) return
    camRef.current = v
    setCamState(v)
  }, [])

  const stopGlide = useCallback(() => {
    if (rafRef.current === null) return
    window.cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  // ── 팬 직후의 click 1회 삼키기 ────────────────────────────
  // 보기 모드에서는 아이템(Sprite)이 pointerdown 을 잡지 않아 팬이 아이템 위에서 시작될 수 있다.
  // 팬으로 끝났는데 click 이 그대로 올라가면 신물이 탭된 것처럼 반응한다 — 캡처 단계에서 끊는다.
  const disarmClickGuard = useCallback(() => {
    if (guardTimer.current !== null) {
      window.clearTimeout(guardTimer.current)
      guardTimer.current = null
    }
    const el = roomRef.current
    const fn = guardFn.current
    guardFn.current = null
    if (el && fn) el.removeEventListener('click', fn, true)
  }, [])

  const armClickGuard = useCallback(
    (el: Element) => {
      disarmClickGuard()
      roomRef.current = el
      const fn = (ev: Event) => {
        ev.stopPropagation()
        disarmClickGuard()
      }
      guardFn.current = fn
      el.addEventListener('click', fn, true)
      guardTimer.current = window.setTimeout(disarmClickGuard, CLICK_GUARD_MS)
    },
    [disarmClickGuard]
  )

  // ── 감속 이동 (관성 스냅 · panTo 공용 곡선) ────────────────
  const glideTo = useCallback(
    (target: number, ms: number) => {
      stopGlide()
      const from = camRef.current
      if (Math.abs(target - from) < CAM_EPSILON || ms <= 0 || reducedMotion()) {
        setCam(target)
        setPanning(false)
        return
      }
      const start = performance.now()
      setPanning(true)
      const step = (now: number) => {
        // 이동 중 카메라가 꺼지면(테마 전환·저사양 폴백) 다음 프레임에 스스로 멈춘다
        const t = activeRef.current ? Math.min(1, (now - start) / ms) : 1
        setCam(from + (target - from) * glideEase(t))
        if (t < 1) {
          rafRef.current = window.requestAnimationFrame(step)
          return
        }
        rafRef.current = null
        setPanning(false)
      }
      rafRef.current = window.requestAnimationFrame(step)
    },
    [setCam, stopGlide]
  )

  const panTo = useCallback(
    (target: number, ms?: number) => {
      if (!activeRef.current) return
      const to = clampCamX(target, worldRef.current.width)
      // 이전 이동은 glideTo 안에서 취소된다 — 연속 호출은 마지막 목표만 남는다
      glideTo(to, ms ?? glideMs(to - camRef.current, 0))
    },
    [glideTo]
  )

  // ── 포인터 3자 조정 (ARCH §4) ─────────────────────────────
  const onPointerDown = useCallback(
    (e: RPointerEvent) => {
      if (!activeRef.current) return
      // 마우스 보조 버튼·이미 캡처된 팬 중의 두 번째 손가락은 받지 않는다
      if (e.button !== 0 || dragRef.current?.captured) return
      stopGlide()
      setPanning(false)
      disarmClickGuard()
      const el = e.currentTarget
      const width = el.getBoundingClientRect().width
      if (width <= 0) return
      roomRef.current = el
      dragRef.current = {
        pointerId: e.pointerId,
        viewportPx: width,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCam: camRef.current,
        decided: false,
        captured: false,
      }
      samplesRef.current = [{ t: performance.now(), cam: camRef.current }]
    },
    [stopGlide, disarmClickGuard]
  )

  const onPointerMove = useCallback(
    (e: RPointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      if (!activeRef.current) {
        dragRef.current = null
        setPanning(false)
        return
      }

      if (!drag.decided) {
        const dx = e.clientX - drag.startClientX
        const dy = e.clientY - drag.startClientY
        if (Math.hypot(dx, dy) < DECIDE_PX) return
        drag.decided = true
        // 편집 중엔 세로 스크롤 자체가 없다(touchAction:none) — 각도를 따지지 않고 팬으로 받는다.
        // 보기 중엔 가로 우세일 때만 가져오고, 세로면 이 제스처를 통째로 브라우저에 넘긴다.
        if (!editingRef.current && Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_RATIO) {
          dragRef.current = null
          return
        }
        drag.captured = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // 이미 놓친 포인터 — 캡처가 없어도 이 요소 위에서는 팬이 이어진다
        }
        setPanning(true)
      }
      if (!drag.captured) return

      const moved = ((drag.startClientX - e.clientX) / drag.viewportPx) * WORLD_VIEWPORT_PCT
      setCam(clampCamX(drag.startCam + moved, worldRef.current.width))
      pushSample(samplesRef.current, { t: performance.now(), cam: camRef.current })
    },
    [setCam]
  )

  const endPan = useCallback(
    (e: RPointerEvent, guardClick: boolean) => {
      const drag = dragRef.current
      if (!activeRef.current) {
        dragRef.current = null
        setPanning(false)
        return
      }
      // 두 번째 손가락이 먼저 떨어져도 진행 중인 팬을 죽이면 안 된다 — 같은 포인터일 때만 닫는다
      if (!drag || drag.pointerId !== e.pointerId) return
      dragRef.current = null
      // 탭(8px 미만)·세로 제스처는 팬으로 소비하지 않는다 — 아이템·신당지기 클릭이 그대로 산다
      if (!drag.captured) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // 이미 해제된 포인터 — 정리만 남았다
      }
      if (guardClick) armClickGuard(e.currentTarget)
      const samples = samplesRef.current
      samplesRef.current = []
      const v = velocityOf(samples)
      // 자유 팬(안2.1) — 손끝 속도만큼 미끄러지고 그 자리에 선다. 구역 스냅·페이징은 없다.
      // 목적지 계산은 도메인 순수 함수(freeGlideTarget)가 하고 반환값은 이미 클램프돼 있다.
      // 손이 멈춘 채 뗐으면 velocityOf 가 0 이라 목적지가 제자리 → glideTo 가 CAM_EPSILON 으로 걸러 즉시 끝난다.
      const target = freeGlideTarget(camRef.current, worldRef.current.width, v)
      glideTo(target, glideMs(target - camRef.current, v))
    },
    [armClickGuard, glideTo]
  )

  const onPointerUp = useCallback((e: RPointerEvent) => endPan(e, true), [endPan])
  // 취소에는 뒤따르는 click 이 없다 — 가드를 걸면 무관한 다음 탭을 삼킬 수 있다
  const onPointerCancel = useCallback((e: RPointerEvent) => endPan(e, false), [endPan])

  useEffect(
    () => () => {
      stopGlide()
      disarmClickGuard()
    },
    [stopGlide, disarmClickGuard]
  )

  // ── 룸에 얹을 산출물 ──────────────────────────────────────
  const bindPan = useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel]
  )

  const worldStyle = useMemo<CSSProperties>(() => {
    // 단일 무대는 얹을 것이 없다 — 참조 고정 빈 객체라 기존 렌더와 완전히 같다
    if (world.width <= WORLD_VIEWPORT_PCT) return NO_STYLE
    return {
      width: `${world.width}%`,
      // 무대층은 등속(1.0x)이고, 원경·전경은 --shrine-cam-x 를 각자 PARALLAX 계수로 소비한다.
      // translate 의 % 는 요소 자기 폭 기준이라 뷰포트 camX% 를 world 폭으로 환산한다.
      transform: `translate3d(${(((-camX * PARALLAX.stage) / world.width) * WORLD_VIEWPORT_PCT).toFixed(4)}%, 0, 0)`,
      // ARCH §5: will-change 는 실제로 움직이는 층에만
      willChange: active ? 'transform' : undefined,
    }
  }, [world.width, camX, active])

  const layerVar = useMemo<CSSProperties>(() => {
    if (camX === 0) return REST_LAYER_VAR
    const vars: CssVars = { '--shrine-cam-x': String(camX) }
    return vars
  }, [camX])

  return useMemo<CameraApi>(
    () => ({ camX, panning, panTo, bindPan, worldStyle, layerVar }),
    [camX, panning, panTo, bindPan, worldStyle, layerVar]
  )
}

/**
 * 구역 미니맵 — 구역 수만큼 점을 찍고, 탭하면 그 구역 정렬점(zoneAlignCamX)으로 카메라를 부른다.
 * 위치·여백은 배선 측(HUD)이 정한다. 전이는 opacity/transform 만 쓴다(ARCH §5).
 */
export function CameraMinimap({
  world,
  camX,
  onSelect,
}: {
  world: WorldSpec
  camX: number
  onSelect: (camX: number) => void
}): JSX.Element {
  const zones: WorldZone[] = world.zones
  // 구역이 하나면 이동할 곳이 없다 — 점 하나짜리 미니맵은 노이즈다
  if (zones.length < 2) return <></>

  // 현재 구역 = 정렬점이 지금 카메라와 가장 가까운 구역(양끝 클램프까지 도메인 계산을 그대로 쓴다)
  let current = 0
  let best = Number.POSITIVE_INFINITY
  zones.forEach((z, i) => {
    const d = Math.abs(zoneAlignCamX(world, z) - camX)
    if (d < best) {
      best = d
      current = i
    }
  })

  return (
    <div role="group" aria-label="신당 구역" className="flex items-center justify-center">
      {zones.map((z, i) => {
        const on = i === current
        return (
          <button
            key={z.code}
            type="button"
            onClick={() => onSelect(zoneAlignCamX(world, z))}
            aria-label={z.label}
            aria-current={on ? 'true' : undefined}
            // 44px 터치 타깃 — 보이는 점은 작아도 누를 곳은 넉넉하게
            className="grid h-11 w-11 place-items-center"
          >
            <span
              aria-hidden
              className={`block rounded-full bg-gold-500 transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
                on ? 'scale-125 opacity-100 shadow-gold-glow' : 'opacity-30'
              }`}
              style={{ width: MINIMAP_DOT_PX, height: MINIMAP_DOT_PX }}
            />
          </button>
        )
      })}
    </div>
  )
}
