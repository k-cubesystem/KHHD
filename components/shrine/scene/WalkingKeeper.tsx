'use client'

import { useCallback, useMemo, useRef, type CSSProperties, type JSX } from 'react'
import {
  planKeeperEntrance,
  planKeeperWalk,
  type KeeperEntranceSpec,
  type KeeperRange,
} from '@/lib/domain/shrine/keeper-walk'

/**
 * 거니는 신당지기 (PRD-shrine-gamefeel-v1 부록 B / 안2.2).
 *
 * 좌정 主神 초상 오브가 바닥 위를 좌우로 거닌다. 연출 주체를 카메라에서 **캐릭터로 옮긴** 조각이라
 * 입장(문간→제단 옆 1회 걷기)도 이 컴포넌트가 들고 있다.
 *
 * 성능 원칙(ARCH §5): 전부 CSS keyframes + transform/opacity 다. rAF 상주 루프도, 프레임마다 도는
 * setTimeout 체인도 없다 — 입장→배회 승계조차 **애니메이션 목록 우선순위**로 처리한다
 * (뒤에 선언된 배회가 지연 시간 뒤에 입장을 정확히 이어받는다 = 타이머·클래스 교체 0).
 *
 * 자기완결 컴포넌트다. 부모가 주는 것은 좌표 계약(range·y·entrance)뿐이고, 걸음 기하는
 * lib/domain/shrine/keeper-walk 가 순수 계산한다.
 */

/** CSS 사용자 정의 속성은 CSSProperties 에 없다 — 교차 타입으로 좁혀 any 를 피한다. */
type CssVars = CSSProperties & Record<`--${string}`, string>

/** 지금 서 있는 자리 (구역 로컬 %) — 파티클·사운드를 캐릭터에서 터뜨리기 위한 좌표. */
export interface KeeperSpot {
  x: number
  y: number
}

export interface WalkingKeeperProps {
  /** 좌정 主神 초상. null 이면 🔮 폴백 */
  portraitUrl: string | null
  deityName: string | null
  /** 배회 구간 (구역 로컬 %) — 방 폭에 맞춰 호출측이 준다. from===to 면 정위치(배회 없음) */
  range: KeeperRange
  /** y (구역 로컬 %) — 바닥 위 */
  y: number
  /** 입장 걷기: 문간 → 제단 옆 1회. null 이면 배회부터 시작 */
  entrance: KeeperEntranceSpec | null
  /** 탭 반응 리셋 키(기존 bounce 상태) */
  bounceKey: number
  /** 탭. 인자는 탭 순간 실측한 자리 — 측정 불가(미마운트·0폭)면 null 이라 호출측이 폴백을 쓴다 */
  onTap: (spot: KeeperSpot | null) => void
  /** 탭 직후 정지(2.5s) · 편집 중 정지 */
  paused: boolean
}

/** 신당지기 층 — 아이템 대역(10~29) 안, 기존 고정 신당지기와 같은 z */
const KEEPER_Z = 12

/**
 * 지금 서 있는 자리를 실측한다. CSS 애니메이션이 옮겨 놓은 위치는 JS 상태에 없으므로,
 * 파티클을 캐릭터에서 터뜨리려면 탭 순간 한 번 재는 수밖에 없다(1회성이라 rAF 상주 금지 규율과 무관).
 *
 * 기준 박스 = 트랙의 offsetParent(대청 박스). EffectsCanvas 가 같은 박스를 100% 덮으므로
 * 여기서 낸 % 가 캔버스 좌표계와 그대로 일치한다. 두 rect 모두 뷰포트 기준이라 팬·시네마틱
 * 카메라 변형은 차분에서 상쇄된다.
 */
function measureSpot(track: HTMLElement | null, hit: HTMLElement | null): KeeperSpot | null {
  const box = track?.offsetParent
  if (!hit || !(box instanceof HTMLElement)) return null
  const b = box.getBoundingClientRect()
  if (b.width <= 0 || b.height <= 0) return null
  const r = hit.getBoundingClientRect()
  return {
    x: ((r.left + r.width / 2 - b.left) / b.width) * 100,
    y: ((r.top + r.height / 2 - b.top) / b.height) * 100,
  }
}

export function WalkingKeeper({
  portraitUrl,
  deityName,
  range,
  y,
  entrance,
  bounceKey,
  onTap,
  paused,
}: WalkingKeeperProps): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  const hitRef = useRef<HTMLButtonElement>(null)

  const plan = useMemo(() => planKeeperWalk(range), [range])
  const enter = useMemo(() => planKeeperEntrance(entrance, plan), [entrance, plan])
  /** 걷는 중(배회 또는 입장) = 바운스·그림자 동조를 켤 조건. 정위치면 오브가 가만히 있어야 한다(레거시 회귀 0) */
  const striding = plan.wanders || enter !== null

  const vars = useMemo<CssVars>(
    () => ({
      '--shrine-keeper-lo': `${plan.lo}%`,
      '--shrine-keeper-hi': `${plan.hi}%`,
      '--shrine-keeper-rest': `${plan.rest}%`,
      '--shrine-keeper-cycle': `${plan.cycleMs}ms`,
      // 입장이 없어도 값을 채운다 — shorthand 안의 var() 가 비면 animation 선언 전체가 무효가 된다
      '--shrine-keeper-enter-from': `${enter?.from ?? plan.rest}%`,
      '--shrine-keeper-enter-ms': `${enter?.ms ?? 0}ms`,
    }),
    [plan, enter]
  )

  /** 정지는 재생 상태만 바꾼다 — 제자리에서 얼어붙고 재개하면 이어 걷는다 */
  const playState = useMemo<CSSProperties>(() => ({ animationPlayState: paused ? 'paused' : 'running' }), [paused])

  const trackClass = [
    'shrine-keeper-track',
    enter ? 'shrine-keeper-arrive' : '',
    plan.wanders ? 'shrine-keeper-wander' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleTap = useCallback(() => {
    onTap(measureSpot(trackRef.current, hitRef.current))
  }, [onTap])

  return (
    <div
      ref={trackRef}
      className={`absolute inset-x-0 h-0 ${trackClass}`}
      style={{ top: `${y}%`, zIndex: KEEPER_Z, ...vars, ...playState }}
    >
      {/* 히트박스 44px — 오브(38px)보다 넓히면서 좌우 3px 를 음수 마진으로 되돌려 기존 정위치와 픽셀이 같다 */}
      <button
        ref={hitRef}
        type="button"
        onClick={handleTap}
        className="block w-[44px] -ml-[3px] text-center"
        aria-label={deityName ? `신당지기 ${deityName}` : '신당지기'}
      >
        <span className={`block${plan.wanders ? ' shrine-keeper-face' : ''}`} style={playState}>
          <span className={`block${striding ? ' shrine-keeper-bob' : ''}`} style={playState}>
            <span
              key={bounceKey}
              className="mx-auto w-[38px] h-[38px] rounded-full grid place-items-center text-[19px] overflow-hidden shrine-keeper-pop"
              style={{
                background: 'radial-gradient(circle at 35% 30%, var(--th-glow), rgba(0,0,0,0.45))',
                border: '1px solid var(--th-accent)',
                boxShadow: '0 0 16px var(--th-glow)',
              }}
            >
              {portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portraitUrl} alt="" className="w-full h-full object-cover object-top" draggable={false} />
              ) : (
                '🔮'
              )}
            </span>
          </span>
          {/* 접지 타원 — 바운스와 같은 주기·반대 위상(몸이 뜨면 작고 옅어진다) */}
          <span
            aria-hidden
            className={`mx-auto mt-0.5 w-[26px] h-[6px] rounded-full bg-black/40 blur-[2px]${striding ? ' shrine-keeper-tread' : ''}`}
            style={playState}
          />
        </span>
      </button>

      <style jsx global>{`
        /* 배회 — 중점에서 출발해 오른끝·왼끝을 돌아 중점으로. 거리비 1:2:1 이라 고정 %로 등속이 된다.
           양끝과 중점에서 ease-in-out 이 속도를 0 으로 접으므로 "걷다가 잠깐 서는" 결이 생긴다 */
        @keyframes shrineKeeperWander {
          0% {
            transform: translateX(var(--shrine-keeper-rest));
          }
          25% {
            transform: translateX(var(--shrine-keeper-hi));
          }
          75% {
            transform: translateX(var(--shrine-keeper-lo));
          }
          100% {
            transform: translateX(var(--shrine-keeper-rest));
          }
        }
        /* 입장 걷기 — 문간에서 배회 시작점까지 1회. 카메라 팬과 같은 감속 곡선을 쓴다 */
        @keyframes shrineKeeperArrive {
          from {
            transform: translateX(var(--shrine-keeper-enter-from));
          }
          to {
            transform: translateX(var(--shrine-keeper-rest));
          }
        }
        /* 진행 방향 — 배회와 같은 구간(25%·75%)에서 딱 뒤집는다(보간 없이 steps) */
        @keyframes shrineKeeperFace {
          0% {
            transform: scaleX(1);
          }
          25% {
            transform: scaleX(-1);
          }
          75% {
            transform: scaleX(1);
          }
          100% {
            transform: scaleX(1);
          }
        }
        /* 2보 주기 — 한 사이클에 두 번 떠오른다(뒷걸음이 살짝 얕다) */
        @keyframes shrineKeeperBob {
          0%,
          50%,
          100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-3.5px);
          }
          75% {
            transform: translateY(-2.2px);
          }
        }
        @keyframes shrineKeeperTread {
          0%,
          50%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          25% {
            transform: scale(0.8);
            opacity: 0.55;
          }
          75% {
            transform: scale(0.88);
            opacity: 0.7;
          }
        }
        /* 탭 반응 — 눌렸다 튀어오른다(기존 shrineBounce 계승) */
        @keyframes shrineKeeperPop {
          0%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px) scale(1.06);
          }
        }

        .shrine-keeper-track {
          transform: translateX(var(--shrine-keeper-rest));
        }
        .shrine-keeper-arrive {
          animation: shrineKeeperArrive var(--shrine-keeper-enter-ms) cubic-bezier(0.22, 0.61, 0.36, 1) both;
          will-change: transform;
        }
        .shrine-keeper-wander {
          animation: shrineKeeperWander var(--shrine-keeper-cycle) ease-in-out var(--shrine-keeper-enter-ms, 0ms)
            infinite;
          will-change: transform;
        }
        /* 입장 + 배회 — 목록 뒤쪽이 이기고, 지연 중인 배회는 아무 값도 얹지 않는다(fill 없음).
           그래서 입장이 forwards 로 물고 있던 도착 자리를 배회가 정확히 그 프레임에 이어받는다 */
        .shrine-keeper-arrive.shrine-keeper-wander {
          animation:
            shrineKeeperArrive var(--shrine-keeper-enter-ms) cubic-bezier(0.22, 0.61, 0.36, 1) both,
            shrineKeeperWander var(--shrine-keeper-cycle) ease-in-out var(--shrine-keeper-enter-ms, 0ms) infinite;
        }
        .shrine-keeper-face {
          animation: shrineKeeperFace var(--shrine-keeper-cycle) steps(1, end) var(--shrine-keeper-enter-ms, 0ms)
            infinite;
        }
        .shrine-keeper-bob {
          animation: shrineKeeperBob 0.62s ease-in-out infinite;
        }
        .shrine-keeper-tread {
          animation: shrineKeeperTread 0.62s ease-in-out infinite;
        }
        .shrine-keeper-pop {
          animation: shrineKeeperPop 0.55s ease;
        }

        /* 모션 최소화 — 배회·입장 걷기·바운스를 전부 끄고 정지 위치(=배회 중점, 제단 옆)에 세운다.
           클래스 계약은 그대로라 배선·측정(measureSpot)은 동일하게 동작한다 */
        @media (prefers-reduced-motion: reduce) {
          .shrine-keeper-arrive,
          .shrine-keeper-wander,
          .shrine-keeper-arrive.shrine-keeper-wander,
          .shrine-keeper-face,
          .shrine-keeper-bob,
          .shrine-keeper-tread {
            animation: none;
            will-change: auto;
          }
          .shrine-keeper-pop {
            animation-duration: 0.01ms;
          }
        }
      `}</style>
    </div>
  )
}
