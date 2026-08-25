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
 * ⚠️ 대사가 없다. 말은 신의 것이고, 신수는 지키는 존재다 — 탭하면 부모가 소리·잔반응만 낸다.
 *
 * 🔴 **제단 참배**(2026-08-25 · CEO A안) — 한쪽 끝을 돌 때마다 제단으로 돌아와 멈춰 절한다.
 *    걸음 경로·정지 %는 CSS(shrineKeeperWander)가, 그 %와 짝인 걷기 비중은 도메인
 *    (KEEPER_WALK_DUTY)이 든다. 절 동작은 `shrine-keeper-bow` 겹 하나 — 새 타이머 0.
 */

type CssVars = CSSProperties & Record<`--${string}`, string>

const GUARDIAN_Z = 12
/**
 * 표시 크기(px). 정령(부유형)은 한 치 작다.
 *
 * 2026-08-25 **1.35배** (46/44/38 -> 62/59/51). 두 가지가 겹쳐 작아 보였다:
 *   1. 신수가 벽 밑동(y72)에서 **제단 앞바닥(y82)** 으로 내려왔다 - 원근에서 앞으로 나온 것이라
 *      같은 px 면 오히려 **더 작아 보인다**. 앞으로 나온 만큼 커져야 거리가 맞는다.
 *   2. 종전 값은 «主神 초상 오브(38px)와 같은 급»으로 잡힌 값이다. 그 오브는 신위 자리에 떠 있던
 *      작은 원이었고, 지금 신수는 방바닥을 밟는 몸이라 기준이 애초에 달랐다.
 * 상한 근거: 62px 는 신위 그린 키(당산 25.5%p, 폰에서 약 118px)의 절반 남짓이라
 * «신을 지키는 짐승»의 위계가 뒤집히지 않는다.
 */
const BODY_PX = { beast: 62, chasa: 59, dokkaebi: 59, spirit: 51 } as const

/** 탭 타깃·접지 그림자는 몸 폭을 따라간다 - 몸만 키우면 손에 안 걸리고 그림자가 뜬다. */
const TRACK_W_PX = 60
const TREAD_W_PX = 35

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
        className="block text-center"
        style={{ width: TRACK_W_PX, marginLeft: -4 }}
        aria-label={`신수 ${g.name}`}
      >
        <span className={`block${plan.wanders ? ' shrine-keeper-face' : ''}`} style={playState}>
          {/* 절(拜) — 제단 앞 참배 구간에서만 상체를 숙인다(배회할 때만 걸린다).
              보행 바운스(bob)와 **다른 겹**이라 두 transform 이 합성된다 — 한 겹에 몰면
              주기가 달라(0.62s vs 한 바퀴) 서로를 덮어쓴다. */}
          <span className={`block${plan.wanders ? ' shrine-keeper-bow' : ''}`} style={playState}>
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
          </span>
          {/* 접지 타원 — 정령(부유형)은 몸 대신 그림자를 옅게 해 떠 있음을 말한다.
              절할 때 그림자는 그대로 둔다 — 발은 바닥에 붙어 있고 상체만 숙이기 때문이다. */}
          <span
            aria-hidden
            className={`mx-auto mt-0.5 h-[7px] rounded-full blur-[2px]${
              plan.wanders || enter ? ' shrine-keeper-tread' : ''
            }`}
            style={{
              width: TREAD_W_PX,
              background: g.category === 'spirit' ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.4)',
              ...playState,
            }}
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
