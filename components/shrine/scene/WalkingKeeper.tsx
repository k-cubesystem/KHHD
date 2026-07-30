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
    </div>
  )
}
