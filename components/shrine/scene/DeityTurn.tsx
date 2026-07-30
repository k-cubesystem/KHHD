'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type JSX } from 'react'
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

  // 회전 종료 통보 — 유일한 JS 타이머. 잔상이 늦게 끝나는 프레임 모드만 총 길이를 쓴다.
  useEffect(() => {
    if (!spinning) return
    const t = window.setTimeout(onSpinEnd, framed ? SPIN_TOTAL_MS : SPIN_MS)
    return () => window.clearTimeout(t)
  }, [spinning, framed, onSpinEnd])

  /**
   * 세로 정합의 단일 출처 — 발이 **단상 상면**에 닿고 머리 여백은 보존된다(stage.PODIUM_TOP_Y).
   * 룸에는 bottom/height 하드코딩이 남아 있지 않아, 시드가 상면 y 를 주면 도메인 상수 한 줄로 끝난다.
   */
  const stand = useMemo(() => deityStandBox(), [])

  const layers = useMemo(() => layersForTier(tier), [tier])
  const spinClass = spinning ? ` ${turnSpinClass(tier)}` : ''
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
      className={`deity-stand absolute left-1/2 z-[3] -translate-x-1/2${interactive ? '' : ' pointer-events-none'}`}
      style={{ bottom: stand.bottom, height: stand.height, ...vars }}
    >
      {/* 발밑 접지 글로우 — 스탠드 박스 기준이라 접지 y 가 바뀌면 자동으로 따라온다(같은 계약).
          회전 중에는 국면 표와 위상을 동조시켜 좁아졌다 넓어진다(등급마다 곡선이 다르다). */}
      <span
        aria-hidden
        className={`absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none${
          idleGlow ? ' shrine-glow-breathe' : ''
        }${spinning ? ` ${turnShadowClass(tier)}` : ''}`}
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
        {spinning &&
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
        <span className="deity-turn-body relative block h-full">
          <FrameStack urls={urls} layers={layers} ghost={false} />
          <span aria-hidden className="deity-turn-sweep" style={sweepStyle} />
        </span>
      </button>
    </div>
  )
}
