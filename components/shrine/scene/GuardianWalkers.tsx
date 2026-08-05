'use client'

import { useMemo, type CSSProperties, type JSX } from 'react'
import {
  planKeeperEntrance,
  planKeeperWalk,
  type KeeperEntranceSpec,
  type KeeperRange,
} from '@/lib/domain/shrine/keeper-walk'
import { findGuardian, guardianSpriteUrl } from '@/lib/domain/shrine/guardians'
import { motionVariance } from '@/lib/domain/shrine/motion-variance'

/**
 * 거니는 신수(神獸) — 종전 WalkingKeeper(主神 초상 오브)를 대체한다.
 *
 * 신은 제단에 **좌정**해 있다(DeityTurn). 같은 신이 바닥을 뛰어다니는 것은 세계가 어긋난다 —
 * 거니는 일은 착좌한 신수의 몫이다. 신수가 없으면 아무도 거닐지 않는다(방은 고요하고,
 * 그 고요가 "신수를 모셔 볼까"의 자리다 — 가짜 배회로 메우지 않는다).
 *
 * 걸음의 기하·CSS 계약은 WalkingKeeper 의 것을 **그대로 쓴다**(keeper-walk 도메인 +
 * shrine-keeper-* 클래스·변수). 두 차례 검수를 거친 걸음을 다시 발명하지 않는다.
 *  · 둘째 신수는 배회 구간을 반으로 갈라 나눠 걷는다 — 같은 트랙이면 겹쳐 밟는다.
 *  · 위상은 --shrine-keeper-enter-ms 에 **음수 지연**을 넣어 흩는다(입장 없는 신수는 이미
 *    걷던 중간에서 시작한다). 박자는 cycleMs 에 슬러그 해시 배율.
 *
 * ⚠️ 대사가 없다. 말은 신(하단 신당지기 말풍선)의 것이고, 신수는 지키는 존재다 —
 *    탭하면 부모가 소리·잔반응만 낸다.
 */

type CssVars = CSSProperties & Record<`--${string}`, string>

const GUARDIAN_Z = 12
/** 표시 크기(px) — 종전 오브(38px)와 같은 급. 정령(부유형)은 한 치 작다. */
const BODY_PX = { beast: 46, chasa: 44, dokkaebi: 44, spirit: 38 } as const

export interface GuardianWalkersProps {
  /** 착좌 슬러그 (0~2 — 검증은 parseGuardianSlugs 가 이미 했다) */
  slugs: readonly string[]
  /** 배회 구간 (구역 로컬 %) — WalkingKeeper 와 같은 계약 */
  range: KeeperRange
  /** top (구역 %) — 바닥 위 */
  y: number
  /** 입장 걷기(문간 → 자리). 첫째 신수만 걷는다 — 문은 하나고, 줄지어 들어오면 행렬이 된다 */
  entrance: KeeperEntranceSpec | null
  /** 편집 중 정지 */
  paused: boolean
  /** 탭 — 슬러그를 알린다(소리·진동은 부모 소관) */
  onTap: (slug: string) => void
}

/** 배회 구간을 신수 수만큼 가른다. 홀로면 전 구간을 쓴다. */
function splitRange(range: KeeperRange, count: number, index: number): KeeperRange {
  if (count <= 1) return range
  const mid = (range.from + range.to) / 2
  return index === 0 ? { from: range.from, to: mid } : { from: mid, to: range.to }
}

function Walker({
  slug,
  range,
  y,
  entrance,
  paused,
  onTap,
}: {
  slug: string
  range: KeeperRange
  y: number
  entrance: KeeperEntranceSpec | null
  paused: boolean
  onTap: (slug: string) => void
}): JSX.Element | null {
  const g = findGuardian(slug)
  const v = useMemo(() => motionVariance(`guardian-${slug}`), [slug])
  const plan = useMemo(() => planKeeperWalk(range), [range])
  const enter = useMemo(() => planKeeperEntrance(entrance, plan), [entrance, plan])

  const vars = useMemo<CssVars>(() => {
    const cycle = Math.round(plan.cycleMs * v.durScale)
    return {
      '--shrine-keeper-lo': `${plan.lo}%`,
      '--shrine-keeper-hi': `${plan.hi}%`,
      '--shrine-keeper-rest': `${plan.rest}%`,
      '--shrine-keeper-cycle': `${cycle}ms`,
      // 입장이 없으면 **음수 지연** — 이미 걷던 중간에서 시작한다(WalkingKeeper 의 0ms 자리).
      // shorthand 안의 var() 가 비면 animation 선언 전체가 무효가 된다 — 반드시 채운다.
      '--shrine-keeper-enter-from': `${enter?.from ?? plan.rest}%`,
      '--shrine-keeper-enter-ms': enter ? `${enter.ms}ms` : `${Math.round(v.delaySec * 1000)}ms`,
    }
  }, [plan, enter, v])

  const playState = useMemo<CSSProperties>(() => ({ animationPlayState: paused ? 'paused' : 'running' }), [paused])

  if (!g) return null
  const px = BODY_PX[g.category]

  const trackClass = [
    'shrine-keeper-track',
    enter ? 'shrine-keeper-arrive' : '',
    plan.wanders ? 'shrine-keeper-wander' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`absolute inset-x-0 h-0 ${trackClass}`}
      style={{ top: `${y}%`, zIndex: GUARDIAN_Z, ...vars, ...playState }}
    >
      <button
        type="button"
        onClick={() => onTap(g.slug)}
        className="block w-[44px] -ml-[3px] text-center"
        aria-label={`신수 ${g.name}`}
      >
        <span className={`block${plan.wanders ? ' shrine-keeper-face' : ''}`} style={playState}>
          <span className={`block${plan.wanders || enter ? ' shrine-keeper-bob' : ''}`} style={playState}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={guardianSpriteUrl(g.slug)}
              alt=""
              draggable={false}
              decoding="async"
              className="mx-auto"
              style={{
                width: px,
                height: px,
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.5))',
              }}
            />
          </span>
          {/* 접지 타원 — 정령(부유형)은 몸 대신 그림자를 옅게 해 떠 있음을 말한다 */}
          <span
            aria-hidden
            className={`mx-auto mt-0.5 w-[26px] h-[6px] rounded-full blur-[2px]${
              plan.wanders || enter ? ' shrine-keeper-tread' : ''
            }`}
            style={{ background: g.category === 'spirit' ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.4)', ...playState }}
          />
        </span>
      </button>
    </div>
  )
}

export function GuardianWalkers({
  slugs,
  range,
  y,
  entrance,
  paused,
  onTap,
}: GuardianWalkersProps): JSX.Element | null {
  const valid = useMemo(() => slugs.filter((s) => findGuardian(s) !== undefined).slice(0, 2), [slugs])
  if (valid.length === 0) return null
  return (
    <>
      {valid.map((slug, i) => (
        <Walker
          key={slug}
          slug={slug}
          range={splitRange(range, valid.length, i)}
          y={y}
          entrance={i === 0 ? entrance : null}
          paused={paused}
          onTap={onTap}
        />
      ))}
    </>
  )
}
