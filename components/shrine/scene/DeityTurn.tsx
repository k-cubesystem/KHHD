'use client'

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties, type JSX } from 'react'
import { deityStandBox } from '@/lib/domain/shrine/stage'
import type { DeityTurnFrames } from '@/lib/domain/shrine/deities'
import {
  BAKED_FRAME_KEYS,
  GHOST_LAG_MS,
  GHOST_LAYERS,
  SPIN_MS,
  SPIN_TOTAL_MS,
  layersForTier,
  turnShadowClass,
  turnSpinClass,
  turnTier,
  type BakedFrameKey,
  type DeityFrameKey,
  type DeityTurnTier,
  type TurnLayer,
} from '@/lib/domain/shrine/deity-turn'
import {
  HOP_HEIGHT,
  frameRect,
  parseSpinManifest,
  sparksAt,
  spinLandIndex,
  spinTimeline,
  type DeitySpinManifest,
  type SpinCue,
} from '@/lib/domain/shrine/deity-spin'
import { logger } from '@/lib/utils/logger'
// 겹 프레임을 숨기는 규칙(.deity-turn-frame)까지 여기 있다 — 방 밖(프리뷰)에서 세우면 겹 8장이 전부 드러난다
import '@/app/shrine-scene.css'

/**
 * 좌정 신위 — 제단 위 스탠드 + **탭 한 바퀴 회전(턴어라운드)** (PRD-shrine-gamefeel-v1 부록 C ③④ / 안2.3).
 *
 * ── 왜 별 컴포넌트인가
 * 종전에는 룸(ShrineRoomClient) 안 인라인 JSX 였다. 회전은 프레임 여러 겹 겹침 · 잔상 2겹 · 접지 위상 동조 ·
 * 회전 중 발광 · 프레임 실재 판정(프리로드)까지 딸린 자기완결 연출이라, 1800줄 룸에 더 얹으면
 * 세로 정합 계약(단상 상면)이 다른 관심사에 묻힌다. 룸은 **탭 배선과 spinning 토글**만 들고 있다.
 *
 * ── 회전 방식: rotateY 가 아니라 프레임 교체
 * rotateY 한 번으로는 180°에서 좌우 반전된 정면이 보여 "종이 뒤집기"가 된다(부록 C ④).
 * 그래서 45° 씩 아홉 국면을 **프레임 교체**로 돌린다. 국면 표·각도·프레임 키·%는 전부
 * lib/domain/shrine/deity-turn.ts 단일 출처이고, 이 파일은 그 표를 훑어 `<img>` 를 깔 뿐
 * 국면 수를 스스로 세지 않는다(4차 검수: 5국면 → 9국면 확대).
 *
 * ── 타이밍은 CSS 가 전부 돈다
 * 국면 전환을 setTimeout 체인으로 하면 여덟 번의 리렌더가 프레임에 실려 회전이 끊긴다. 겹을
 * 미리 쌓아 두고 **opacity 스텝 키프레임**으로 갈아 끼우면 전환이 컴포지터에서 끝나고, 잔상 2겹도
 * 같은 애니메이션을 `--deity-turn-lag` 만큼 늦춰 붙인 시간 이동 복제라 별도 타이머가 필요 없다.
 * JS 타이머는 회전 종료 통보(onSpinEnd) 하나뿐이다.
 *
 * ⚠️ 연출 CSS 는 전부 app/shrine-scene.css 에 있다 — styled-jsx 는 App Router 산출물에 실리지 않는다.
 *    키프레임 %는 도메인 표에서 파생되며, 둘의 일치는 lib/domain/shrine/__tests__/deity-turn.test.ts 가 지킨다.
 *
 * ── 영상 등급 (2026-09-23 — 위 사다리의 맨 윗단)
 * 시트(spin.webp·spin.json)가 있는 신위는 Veo 로 찍은 진짜 한 바퀴를 캔버스에 넘긴다(lib/domain/shrine/deity-spin.ts).
 * 여기서만은 JS 가 박자를 쥔다 — 칸 44장을 겹 `<img>` 로 쌓으면 44장이 한꺼번에 디코딩·합성되고,
 * 도약·찌그러짐·금가루가 칸마다 달라 CSS 키프레임으로 옮기면 표를 두 벌 들게 된다.
 * 재생 중 모드는 **회전이 시작된 순간** 정한다 — 시트가 종전 회전 도중에 도착해도 그 회전은 끝까지 CSS 로 돈다.
 * 몸이 다 돌면(착지) 곧장 onSpinEnd 를 알리고, 금가루 꼬리는 부모와 상관없이 스스로 마저 진다.
 */

/** CSS 사용자 정의 속성은 CSSProperties 에 없다 — 교차 타입으로 좁혀 any 를 피한다. */
type CssVars = CSSProperties & Record<`--${string}`, string>

/** 겹마다 붙는 접지 그림자. 회전 중 정면이 숨어도 발밑 어둠이 이어져야 몸이 떠 보이지 않는다. */
const FRAME_SHADOW: CSSProperties = { filter: 'drop-shadow(0 5px 9px rgba(0,0,0,0.5))' }

export interface DeityTurnProps {
  /** 정면 스프라이트(필수) — DB sprite_url 이 정본 */
  baseUrl: string
  /** 굽는 프레임 경로 묶음. null 이면 폴백 회전(rotateY). 경로 규약은 deityTurnFrames() */
  frames: DeityTurnFrames | null
  name: string
  /** 회전 재생 중 — 부모가 탭으로 토글하고 onSpinEnd 로 내린다 */
  spinning: boolean
  onSpinEnd: () => void
  /** 탭 — 꾸미기 중(interactive=false)에는 호출되지 않는다 */
  onTap: () => void
  /** 상호작용 가능(보기 모드). false 면 종전처럼 pointer-events 를 끊는다 */
  interactive: boolean
  /** 상시 글로우 맥동(연출 게이트 on · 꾸미기 아님) */
  idleGlow: boolean
  /**
   * 단상 상면 y(무대 %) — 발이 닿는 면. 생략하면 정본 상수(stage.PODIUM_TOP_Y) 그대로다.
   * 「고정 살림 조절」로 신위 무대를 옮기면 룸이 «정본 + 오프셋» 을 여기로 넘긴다 —
   * 접지·머리 여백·발밑 글로우가 **한 값에서** 함께 따라오는 계약은 그대로다.
   *
   * ⚠️ 무대 기하 v5 부터 정본 자체가 테마별이다 — 틀(壇)을 든 테마는 감실 바닥이 마루 1/3 만큼
   *    내려가 54.3 이다. 룸은 `stage.deityPodiumTopY(themeCode) + dy` 를 넘겨야 한다
   *    (상수 PODIUM_TOP_Y 를 그대로 넘기면 틀 테마에서 신위가 감실 안 9%p 허공에 뜬다).
   */
  podiumTopY?: number
  /**
   * 머리 여백 y(무대 %) — 머리가 서는 줄. 생략하면 정본 상수(stage.DEITY_HEAD_ROOM_Y).
   * 틀(壇)을 든 테마는 룸이 `stage.deityHeadRoomY(themeCode)` 로 감실 윗턱을 넘긴다 —
   * 신위가 감실 «안»에 들어앉는 크기가 된다. v5 에서는 발·머리가 같은 +9 라 **키가 불변**이고,
   * 둘 중 하나만 넘기면 그 순간 신위가 늘어나거나 줄어든다(두 값은 한 쌍이다).
   */
  headRoomY?: number
  /** 신위 무대 가로 이동량(무대 %). 0 이면 종전처럼 방 한가운데(left 50%)에 선다. */
  offsetXPct?: number
}

/**
 * 프레임 프리로드 겸 등급 판정.
 *
 * 서버 fs 확인을 쓰지 않는 이유: Vercel 함수 런타임에 `public/` 이 올라가지 않아 존재 확인이
 * 배포에서 항상 false 가 된다(로컬만 통과 = 최악의 무증상). 클라 프리로드는 첫 렌더가 서버와
 * 동일(정면 1장)하고 판정이 마운트 후에만 바뀌므로 **하이드레이션 안전**하며, 프레임을 굽는
 * 순간부터 코드 수정 없이 스스로 상위 등급으로 올라선다.
 *
 * 넷을 **동시에** 확인하고 성공한 키만 모은다 — 부분만 구워졌으면 turnTier 가 5국면으로 낮춘다.
 * 세션 캐시(모듈 Map)라 방을 다시 들어와도 요청이 반복되지 않는다. 실패는 던지지 않는다 —
 * 404 는 "아직 안 구운 각"이라는 정상 상태다.
 */
const tierProbes = new Map<string, Promise<DeityTurnTier>>()

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.decoding = 'async'
    img.src = url
  })
}

function probeTier(frames: DeityTurnFrames): Promise<DeityTurnTier> {
  const cacheKey = frames.side
  const cached = tierProbes.get(cacheKey)
  if (cached) return cached
  const p = Promise.all(
    BAKED_FRAME_KEYS.map((key) => loadImage(frames[key]).then((ok): BakedFrameKey | null => (ok ? key : null)))
  ).then((keys) => turnTier(new Set(keys.filter((k): k is BakedFrameKey => k !== null))))
  tierProbes.set(cacheKey, p)
  return p
}

/** 영상 등급 자산 — 규격 · 디코딩까지 끝난 시트 · 타임라인 */
interface SpinAssets {
  manifest: DeitySpinManifest
  sheet: HTMLImageElement
  cues: readonly SpinCue[]
}

const spinProbes = new Map<string, Promise<SpinAssets | null>>()

/**
 * 영상 등급 판정 겸 프리로드. 시트를 **디코딩까지** 끝내 둔다 — 탭한 순간 첫 칸이 디코딩을 기다리면
 * 회전 첫 박자가 빈다. 규격 404 는 «아직 안 구운 신위»라는 정상 상태라 조용히 null(종전 등급)이고,
 * 규격은 있는데 깨졌거나 시트가 모자라면 굽기 사고라 경고를 남긴다.
 */
function probeSpin(frames: DeityTurnFrames): Promise<SpinAssets | null> {
  const cached = spinProbes.get(frames.spinSheet)
  if (cached) return cached
  const broken = (): null => {
    logger.warn('[DeityTurn] 회전 시트 불량 — 종전 회전으로 내려간다', frames.spinManifest)
    return null
  }
  const p = fetch(frames.spinManifest)
    .then(async (res): Promise<SpinAssets | null> => {
      if (!res.ok) return null
      const raw: unknown = await res.json()
      const manifest = parseSpinManifest(raw)
      if (!manifest) return broken()
      const sheet = new Image()
      sheet.decoding = 'async'
      sheet.src = frames.spinSheet
      const decoded = await sheet.decode().then(
        () => true,
        () => false
      )
      const rows = Math.ceil(manifest.count / manifest.cols)
      if (
        !decoded ||
        sheet.naturalWidth < manifest.cols * manifest.frameW ||
        sheet.naturalHeight < rows * manifest.frameH
      ) {
        return broken()
      }
      return { manifest, sheet, cues: spinTimeline(manifest) }
    })
    // 네트워크 끊김 — 다음 방문에 다시 잰다(실패를 캐시에 남기지 않는다)
    .catch(() => {
      spinProbes.delete(frames.spinSheet)
      return null
    })
  spinProbes.set(frames.spinSheet, p)
  return p
}

/** 한 번의 영상 회전이 쓰는 무대 치수(CSS px, 스탠드 왼쪽 위 기준) — 재생 시작 때 한 번 잰다 */
interface SpinStage {
  /** 스탠드 폭·높이 — 높이가 곧 정면 인물 키다 */
  w: number
  h: number
  /** 캔버스 상자 */
  left: number
  top: number
  width: number
  height: number
  /** 캔버스 안 발 중심 */
  footX: number
  footY: number
  /** CSS px → 캔버스 픽셀(DPR × 조상 배율) */
  ratio: number
}

/**
 * 캔버스는 스탠드보다 크다 — 도는 동안 소지품·동반물이 정면보다 넓게 벌어지고(시트 칸 폭),
 * 도약만큼 위로, 금가루만큼 옆으로 나간다. 전부 스탠드 높이 단위라 기기와 무관하게 같은 비율이다.
 */
function measureSpinStage(stand: HTMLElement, m: DeitySpinManifest): SpinStage {
  const w = stand.offsetWidth
  const h = stand.offsetHeight
  const s = h / m.baseH
  const pad = 0.03 * h
  const cellLeft = (m.baseX + m.baseW / 2) * s
  const cellRight = (m.frameW - m.baseX - m.baseW / 2) * s
  const halfW = Math.max(cellLeft * 1.06, cellRight * 1.06, 0.56 * h) + pad
  const up = Math.max((m.baseY + m.baseH) * s * 1.035 + HOP_HEIGHT * h, 0.98 * h) + pad
  const down = Math.max((m.frameH - m.baseY - m.baseH) * s, 0.04 * h) + pad
  // 조상 배율(카메라 줌)까지 곱해야 확대된 화면에서 캔버스가 뭉개지지 않는다. DPR 은 2 에서 끊는다 —
  // 움직이는 동안이라 3배 해상도는 보이지 않고 채우기 비용만 는다.
  const zoom = h > 0 ? stand.getBoundingClientRect().height / h : 1
  const ratio = Math.min(3, Math.min(2, window.devicePixelRatio || 1) * zoom)
  return { w, h, left: w / 2 - halfW, top: h - up, width: halfW * 2, height: up + down, footX: halfW, footY: up, ratio }
}

function sizeCanvas(canvas: HTMLCanvasElement, st: SpinStage): CanvasRenderingContext2D | null {
  canvas.style.left = `${st.left}px`
  canvas.style.top = `${st.top}px`
  canvas.style.width = `${st.width}px`
  canvas.style.height = `${st.height}px`
  canvas.width = Math.max(1, Math.round(st.width * st.ratio))
  canvas.height = Math.max(1, Math.round(st.height * st.ratio))
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.imageSmoothingQuality = 'high'
  return ctx
}

/** 몸 — 발 중심을 축으로 뜨고 늘고 눌린다. 정면 상자가 스탠드 상자에 겹치도록 그린다(배율 = 스탠드 높이 / baseH). */
function drawFigure(ctx: CanvasRenderingContext2D, st: SpinStage, a: SpinAssets, cue: SpinCue): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (cue.frame === null) return
  const m = a.manifest
  const s = st.h / m.baseH
  const { sx, sy } = frameRect(m, cue.frame)
  ctx.setTransform(st.ratio, 0, 0, st.ratio, 0, 0)
  ctx.translate(st.footX, st.footY - cue.lift * st.h)
  ctx.scale(cue.scaleX * s, cue.scaleY * s)
  ctx.drawImage(a.sheet, sx, sy, m.frameW, m.frameH, -(m.baseX + m.baseW / 2), -(m.baseY + m.baseH), m.frameW, m.frameH)
}

/** 금가루 — 발치에서 피어올라 사그라든다(피는 자리·때는 도메인 표). 몸과 다른 캔버스라 그림자가 묻지 않는다. */
function drawSparks(ctx: CanvasRenderingContext2D, st: SpinStage, cue: SpinCue): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  if (cue.sparkClock === null) return
  ctx.setTransform(st.ratio, 0, 0, st.ratio, 0, 0)
  for (const p of sparksAt(cue.sparkClock)) {
    const x = st.footX + p.x * st.h
    const y = st.footY - p.y * st.h
    const r = p.r * st.h * 2.4
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,251,232,${p.a})`)
    g.addColorStop(0.35, `rgba(255,217,120,${0.85 * p.a})`)
    g.addColorStop(1, 'rgba(255,176,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * 가라앉힘 — 신위 둘레(몸통 중심에서 키의 0.58배)는 밝게 두고 1.05배 밖을 어둡게. 판은 키의 8배라
 * 화면을 넘게 덮는다. 불투명도(0~0.5)만 칸마다 바꾼다 — 합성기만 일한다.
 */
function placeDim(dim: HTMLElement, st: SpinStage): void {
  const size = 8 * st.h
  // 판을 칠하기 전에 투명부터 — 첫 rAF 전 한 번의 페인트에 화면이 통째로 어두워지지 않게
  dim.style.opacity = '0'
  dim.style.left = `${st.w / 2 - size / 2}px`
  dim.style.top = `${0.45 * st.h - size / 2}px`
  dim.style.width = `${size}px`
  dim.style.height = `${size}px`
  dim.style.background = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) ${0.58 * st.h}px, #000 ${1.05 * st.h}px)`
}

/**
 * 겹쳐 둔 프레임들. index 0(정면)만 흐름 안에 남아 스탠드 폭을 정하고(스프라이트 비율),
 * 나머지는 그 위에 덮인다. 반전 겹은 `.deity-turn-mirror` 한 장으로 좌우를 뒤집어 **같은 파일**을 재사용한다.
 * 접근성 이름은 감싸는 버튼(aria-label)이 들고 있으므로 프레임은 전부 장식으로 둔다.
 */
function FrameStack({
  urls,
  layers,
  ghost,
}: {
  urls: Readonly<Record<DeityFrameKey, string>>
  layers: readonly TurnLayer[]
  ghost: boolean
}): JSX.Element {
  return (
    <>
      {layers.map((layer) => {
        // 잔상은 통째로 absolute 라 정면 겹도 오버레이여야 한다(폭은 본체가 이미 정했다)
        const inFlow = layer.index === 0 && !ghost
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={layer.index}
            src={urls[layer.frame]}
            alt=""
            aria-hidden
            draggable={false}
            className={
              `deity-turn-step-${layer.index} ` +
              (inFlow
                ? 'relative h-full w-auto object-contain'
                : 'deity-turn-frame absolute inset-0 h-full w-full object-contain') +
              (layer.mirrored ? ' deity-turn-mirror' : '')
            }
            style={FRAME_SHADOW}
          />
        )
      })}
    </>
  )
}

export function DeityTurn({
  baseUrl,
  frames,
  name,
  spinning,
  onSpinEnd,
  onTap,
  interactive,
  idleGlow,
  podiumTopY,
  headRoomY,
  offsetXPct = 0,
}: DeityTurnProps): JSX.Element {
  /**
   * 프리로드가 끝난 프레임 묶음의 식별자와 그 등급. **식별자(측면 URL)를 함께 담는다** —
   * 신위·테마가 바뀌면 아래 tier 판정이 저절로 'none' 으로 떨어져, 새 신위의 프레임을 확인하기 전에
   * 옛 판정으로 404 프레임을 그리지 않는다. 초기 null 이라 첫 렌더는 서버와 같다(정면 1장) = 하이드레이션 안전.
   */
  const [probed, setProbed] = useState<{ key: string; tier: DeityTurnTier } | null>(null)

  useEffect(() => {
    if (!frames) return
    let alive = true
    const key = frames.side
    void probeTier(frames).then((tier) => {
      if (alive && tier !== 'none') setProbed({ key, tier })
    })
    return () => {
      alive = false
    }
  }, [frames])

  /** 이번 신위에 실제로 적용되는 등급. 확인 전·미보유 신위는 'none'(rotateY 폴백)이다. */
  const tier: DeityTurnTier = frames && probed?.key === frames.side ? probed.tier : 'none'
  const framed = tier !== 'none'

  /**
   * 영상 등급 자산. 식별자(시트 URL)를 함께 담는 까닭은 위 probed 와 같다.
   * 시트는 수백 KB 라 방의 첫 그림(벽화·제단)과 대역폭을 다투지 않게 **한가할 때** 받는다.
   */
  const [spinProbed, setSpinProbed] = useState<{ key: string; assets: SpinAssets } | null>(null)

  useEffect(() => {
    if (!frames) return
    let alive = true
    const key = frames.spinSheet
    const start = (): void => {
      void probeSpin(frames).then((assets) => {
        if (alive && assets) setSpinProbed({ key, assets })
      })
    }
    // requestIdleCallback 이 없는 사파리는 시간으로 미룬다
    const idle =
      typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(start, { timeout: 4000 }) : null
    const timer = idle === null ? window.setTimeout(start, 1500) : null
    return () => {
      alive = false
      if (idle !== null) window.cancelIdleCallback(idle)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [frames])

  const spinAssets = frames && spinProbed?.key === frames.spinSheet ? spinProbed.assets : null

  /**
   * 회전 모드는 **spinning 이 서는 순간** 정한다 — 렌더 중 이전 값과 비교한다(이펙트로 미루면 첫 프레임에
   * 종전 CSS 회전이 걸렸다 풀린다). 영상 재생은 run 이 쥐고, 착지 뒤 금가루 꼬리까지 spinning 과
   * 상관없이 돈다. key 는 꼬리 도중 다시 탭했을 때 처음부터 다시 걸기 위한 것이다.
   */
  const [prevSpinning, setPrevSpinning] = useState(spinning)
  const [run, setRun] = useState<{ key: number; assets: SpinAssets } | null>(null)
  if (spinning !== prevSpinning) {
    setPrevSpinning(spinning)
    if (spinning && spinAssets) setRun({ key: (run?.key ?? 0) + 1, assets: spinAssets })
  }
  /** 종전(CSS) 회전 — 영상 재생이 걸리지 않은 회전만. 클래스·잔상·타이머가 전부 이 값을 본다. */
  const cssSpinning = spinning && run === null

  // 종전 회전의 종료 통보 — 유일한 JS 타이머. 잔상이 늦게 끝나는 프레임 모드만 총 길이를 쓴다.
  useEffect(() => {
    if (!cssSpinning) return
    const t = window.setTimeout(onSpinEnd, framed ? SPIN_TOTAL_MS : SPIN_MS)
    return () => window.clearTimeout(t)
  }, [cssSpinning, framed, onSpinEnd])

  const standRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLSpanElement>(null)
  const dimRef = useRef<HTMLSpanElement>(null)
  const figureRef = useRef<HTMLCanvasElement>(null)
  const sparkRef = useRef<HTMLCanvasElement>(null)
  const notifySpinEnd = useEffectEvent(() => onSpinEnd())

  /**
   * 영상 회전 재생 — rAF 한 줄기. 칸 번호는 경과 시간에서 뽑는다(느린 기기는 칸을 건너뛰지 길이가 늘지 않는다).
   * 정지 스프라이트 숨김·가라앉힘은 React 상태가 아니라 **같은 rAF 안의 DOM 쓰기**다 — 한 렌더라도
   * 어긋나면 정면 스프라이트와 캔버스 첫 칸이 겹쳐 보이거나 둘 다 비는 프레임이 생긴다.
   */
  useEffect(() => {
    if (!run) return
    const standEl = standRef.current
    const body = bodyRef.current
    const dim = dimRef.current
    const figure = figureRef.current
    const spark = sparkRef.current
    if (!standEl || !body || !dim || !figure || !spark) return
    const { assets } = run
    const st = measureSpinStage(standEl, assets.manifest)
    const figureCtx = sizeCanvas(figure, st)
    const sparkCtx = sizeCanvas(spark, st)
    placeDim(dim, st)
    const land = spinLandIndex(assets.manifest)
    let landed = false
    const settle = (): void => {
      if (landed) return
      landed = true
      notifySpinEnd()
    }
    const t0 = performance.now()
    let last = -1
    let raf = 0
    const tick = (now: number): void => {
      const i = Math.floor(((now - t0) * assets.manifest.fps) / 1000)
      const cue = assets.cues[i]
      // 끝 — 탭이 백그라운드였다 돌아와 칸을 통째로 건너뛰어도 착지 통보는 빠뜨리지 않는다
      if (!cue || !figureCtx || !sparkCtx) {
        body.style.opacity = ''
        settle()
        setRun(null)
        return
      }
      if (i !== last) {
        last = i
        drawFigure(figureCtx, st, assets, cue)
        drawSparks(sparkCtx, st, cue)
        body.style.opacity = cue.frame === null ? '' : '0'
        dim.style.opacity = String(cue.dim)
        if (i >= land) settle()
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(raf)
      body.style.opacity = ''
    }
  }, [run])

  /**
   * 세로 정합의 단일 출처 — 발이 **단상 상면**에 닿고 머리는 머리 여백 줄에 선다
   * (stage.PODIUM_TOP_Y · stage.deityHeadRoomY). 룸에는 bottom/height 하드코딩이 남아 있지 않아,
   * 상면 y 와 머리 여백만 주면 크기·접지·발밑 글로우가 한꺼번에 따라온다.
   */
  const stand = useMemo(() => deityStandBox(podiumTopY, headRoomY), [podiumTopY, headRoomY])

  const layers = useMemo(() => layersForTier(tier), [tier])
  const spinClass = cssSpinning ? ` ${turnSpinClass(tier)}` : ''
  const vars = useMemo<CssVars>(() => ({ '--deity-spin-ms': `${SPIN_MS}ms` }), [])

  /**
   * 겹이 참조할 URL 표. 등급이 보장하지 않는 키는 정면으로 접어 둔다 — 그 겹은 애초에 깔리지 않으므로
   * 화면에 나오지 않고, 타입에서 non-null 단언(!)을 없앤다.
   */
  const urls = useMemo<Record<DeityFrameKey, string>>(
    () => ({
      base: baseUrl,
      q45: frames?.q45 ?? baseUrl,
      side: frames?.side ?? baseUrl,
      q135: frames?.q135 ?? baseUrl,
      back: frames?.back ?? baseUrl,
    }),
    [baseUrl, frames]
  )

  /** 폴백(rotateY)의 하이라이트 스윕은 스프라이트 실루엣으로 마스크한다 — 안 하면 사각형 섬광이 된다 */
  const sweepStyle = useMemo<CSSProperties>(
    () => ({ maskImage: `url("${baseUrl}")`, WebkitMaskImage: `url("${baseUrl}")` }),
    [baseUrl]
  )

  const handleClick = useCallback(() => {
    if (!interactive) return
    onTap()
  }, [interactive, onTap])

  return (
    <div
      ref={standRef}
      className={`deity-stand absolute left-1/2 z-[3] -translate-x-1/2${interactive ? '' : ' pointer-events-none'}`}
      // 가로 이동은 0 일 때 **키 자체를 얹지 않는다** — DOM 이 한 글자도 바뀌지 않아야 회귀 진단이 산다
      style={{
        bottom: stand.bottom,
        height: stand.height,
        ...vars,
        ...(offsetXPct !== 0 ? { left: `calc(50% + ${offsetXPct}%)` } : null),
      }}
    >
      {/* 영상 회전의 가라앉힘 — 스탠드 안 맨 아래 겹이라 방은 덮고 신위(캔버스)는 덮지 않는다. 치수는 재생 때 잰다. */}
      {run && <span ref={dimRef} aria-hidden className="pointer-events-none absolute" />}
      {/* 발밑 접지 글로우 — 스탠드 박스 기준이라 접지 y 가 바뀌면 자동으로 따라온다(같은 계약).
          회전 중에는 국면 표와 위상을 동조시켜 좁아졌다 넓어진다(등급마다 곡선이 다르다). */}
      <span
        aria-hidden
        className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none${
          idleGlow ? ' shrine-glow-breathe' : ''
        }${cssSpinning ? ` ${turnShadowClass(tier)}` : ''}`}
        style={{
          bottom: '-6%',
          width: '86%',
          height: '20%',
          background: 'var(--th-glow, rgba(201,168,76,0.28))',
          filter: 'blur(9px)',
        }}
      />
      {/* 회전 중 발광(4차 검수)은 이 버튼에 걸린 filter: drop-shadow 다 — 마스크가 필요 없다.
          drop-shadow 는 **그 순간 보이는 겹의 알파**를 따라 번지므로 국면마다 실루엣이 저절로 맞고,
          배경이 없는 서브트리라 사각형 섬광이 될 여지가 구조적으로 없다(스윕 마스크의 한계를 대체). */}
      <button
        type="button"
        onClick={handleClick}
        disabled={!interactive}
        aria-label={`신위 ${name}`}
        className={`deity-turn relative block h-full${spinClass}`}
      >
        {/* 옷자락 트레일 — 같은 애니메이션을 겹당 45ms 늦춘 시간 이동 복제(잔상). 프레임 모드에서만.
            폴백(rotateY)은 90° 근처 모션블러가 같은 역할을 하고, 3D 회전 복제는 겹칠수록 탁해진다.
            ⚠️ 본체보다 **먼저** 그린다 — 잔상은 지나온 자리라 뒤에 남아야 한다(뒤 DOM = 위에 덮임). */}
        {cssSpinning &&
          framed &&
          Array.from({ length: GHOST_LAYERS }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="deity-turn-body deity-turn-ghost"
              style={{ '--deity-turn-lag': `${(i + 1) * GHOST_LAG_MS}ms` } as CssVars}
            >
              <FrameStack urls={urls} layers={layers} ghost />
            </span>
          ))}
        <span ref={bodyRef} className="deity-turn-body relative block h-full">
          <FrameStack urls={urls} layers={layers} ghost={false} />
          <span aria-hidden className="deity-turn-sweep" style={sweepStyle} />
        </span>
      </button>
      {/* 영상 회전 — 몸(정지 스프라이트와 같은 그림자) 위에 금가루. 탭은 아래 버튼이 받는다. */}
      {run && (
        <>
          <canvas ref={figureRef} aria-hidden className="pointer-events-none absolute" style={FRAME_SHADOW} />
          <canvas ref={sparkRef} aria-hidden className="pointer-events-none absolute" />
        </>
      )}
    </div>
  )
}
