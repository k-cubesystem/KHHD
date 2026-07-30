import {
  ENTRANCE_PACE_RATIO,
  KEEPER_WANDER_LEG_MS,
  entranceMsFor,
  keeperRestX,
  planKeeperEntrance,
  planKeeperWalk,
  type KeeperRange,
} from '../keeper-walk'

/** 배선(ShrineRoomClient)이 쓰는 실제 값 — 여기가 깨지면 방에서 신당지기가 튄다 */
const WANDER: KeeperRange = { from: 31, to: 59 }
/** 배선 문간 x (ShrineRoomClient.KEEPER_ENTRANCE_FROM) */
const DOOR_X = 8
/** planKeeperEntrance 자체는 ms 를 통과시키기만 한다 — 그 통과 계약을 보는 고정 입력 */
const ENTRANCE = { from: DOOR_X, to: 45, ms: 3600 }

/** %p/ms — 두 걸음의 속도를 같은 자로 잰다 */
function pace(distancePct: number, ms: number): number {
  return distancePct / ms
}

describe('planKeeperWalk — 배회 구간', () => {
  it('구간을 정규화하고 중점을 정지 위치로 삼는다', () => {
    const p = planKeeperWalk(WANDER)
    expect(p).toMatchObject({ lo: 31, hi: 59, rest: 45, wanders: true })
  })

  it('from>to 로 뒤집어 줘도 같은 계획이 나온다 (호출측 순서 무관)', () => {
    expect(planKeeperWalk({ from: 59, to: 31 })).toEqual(planKeeperWalk(WANDER))
  })

  it('한 바퀴는 구간을 두 번 훑는 길이 — 「구간 1회 30s」와 같은 걸음 속도', () => {
    expect(planKeeperWalk(WANDER).cycleMs).toBe(KEEPER_WANDER_LEG_MS * 2)
    expect(planKeeperWalk(WANDER, 1000).cycleMs).toBe(2000)
  })

  it('배회 한 구간은 30s — 입장 걷기 감속(부록 C ②)에 맞춘 걸음 속도', () => {
    expect(KEEPER_WANDER_LEG_MS).toBe(30_000)
  })

  it('방 밖 좌표는 0~100 으로 클램프된다', () => {
    expect(planKeeperWalk({ from: -40, to: 320 })).toMatchObject({ lo: 0, hi: 100, rest: 50 })
  })

  it('비유한 입력은 하한으로 떨어져 정지한다 (결정론 — NaN 이 화면에 새지 않는다)', () => {
    expect(planKeeperWalk({ from: Number.NaN, to: Number.POSITIVE_INFINITY })).toMatchObject({
      lo: 0,
      hi: 0,
      rest: 0,
      wanders: false,
      cycleMs: 0,
    })
  })

  it('from===to (단일 무대 레거시)는 배회하지 않고 그 자리에 선다 — 회귀 0 경로', () => {
    const p = planKeeperWalk({ from: 12, to: 12 })
    expect(p).toEqual({ lo: 12, hi: 12, rest: 12, wanders: false, cycleMs: 0 })
  })

  it('떨림으로만 보이는 폭(<0.5%p)과 legMs 0 은 배회로 치지 않는다', () => {
    expect(planKeeperWalk({ from: 40, to: 40.4 }).wanders).toBe(false)
    expect(planKeeperWalk(WANDER, 0).wanders).toBe(false)
  })

  it('keeperRestX 는 planKeeperWalk 의 rest 와 같은 값이다 (공물 판정·파티클 폴백 단일 출처)', () => {
    expect(keeperRestX(WANDER)).toBe(planKeeperWalk(WANDER).rest)
    expect(keeperRestX({ from: 12, to: 12 })).toBe(12)
  })
})

describe('planKeeperEntrance — 입장 걷기 구간', () => {
  it('배선 값(문간 8 → 제단 옆 45 · 3600ms)이 그대로 통과한다', () => {
    expect(planKeeperEntrance(ENTRANCE, planKeeperWalk(WANDER))).toEqual({ from: 8, to: 45, ms: 3600 })
  })

  it('도착점은 배회 중점으로 스냅된다 — 어긋나면 승계 프레임에 순간이동이 생긴다', () => {
    const p = planKeeperWalk({ from: 30, to: 90 })
    expect(planKeeperEntrance(ENTRANCE, p)?.to).toBe(60)
  })

  it('입장 없음·시간 0 은 걷기 자체를 걸지 않는다', () => {
    const p = planKeeperWalk(WANDER)
    expect(planKeeperEntrance(null, p)).toBeNull()
    expect(planKeeperEntrance({ ...ENTRANCE, ms: 0 }, p)).toBeNull()
    expect(planKeeperEntrance({ ...ENTRANCE, ms: -500 }, p)).toBeNull()
  })

  it('시작점이 도착점과 같으면(정지 상태) null — 제자리 걷기 애니메이션을 만들지 않는다', () => {
    expect(planKeeperEntrance({ from: 12, to: 12, ms: 1800 }, planKeeperWalk({ from: 12, to: 12 }))).toBeNull()
  })

  it('시작점은 방 안으로, 시간은 상한(10s) 안으로 클램프된다', () => {
    const p = planKeeperWalk(WANDER)
    expect(planKeeperEntrance({ from: -30, to: 45, ms: 1800 }, p)?.from).toBe(0)
    expect(planKeeperEntrance({ from: 8, to: 45, ms: 900_000 }, p)?.ms).toBe(10_000)
  })
})

describe('entranceMsFor — 입장 걸음을 배회 속도에서 파생 (안2.4 / CEO 4차 "입장속도 아직 빠름")', () => {
  it('★ 회귀: 입장 걸음이 배회 걸음의 정확히 ENTRANCE_PACE_RATIO 배다', () => {
    // 안2.3 의 실제 결함: 입장 10.3%p/s vs 배회 0.93%p/s = 11배. 상수 두 개가 따로 조정된 결과였다.
    const plan = planKeeperWalk(WANDER)
    const ms = entranceMsFor(DOOR_X, plan)
    expect(ms).not.toBeNull()

    const wanderPace = pace(plan.hi - plan.lo, plan.cycleMs / 2)
    const entrancePace = pace(Math.abs(plan.rest - DOOR_X), ms as number)
    expect(entrancePace / wanderPace).toBeCloseTo(ENTRANCE_PACE_RATIO, 2)
  })

  it('종전 하드코딩(3600ms)보다 확실히 느리다 — 4차 검수 지시의 방향', () => {
    expect(entranceMsFor(DOOR_X, planKeeperWalk(WANDER)) as number).toBeGreaterThan(3600)
  })

  it('배선 구성에서 방어 상한(10s) 안에 들어온다 — 클램프로 잘리면 비율 계약이 깨진다', () => {
    expect(entranceMsFor(DOOR_X, planKeeperWalk(WANDER)) as number).toBeLessThanOrEqual(10_000)
  })

  it('배회 구간이 넓어지면(=배회가 빨라지면) 입장도 같이 빨라진다 — 한쪽만 어긋날 수 없다', () => {
    const narrow = entranceMsFor(DOOR_X, planKeeperWalk({ from: 40, to: 50 })) as number
    const wide = entranceMsFor(DOOR_X, planKeeperWalk({ from: 20, to: 70 })) as number
    expect(wide).toBeLessThan(narrow)
  })

  it('배회하지 않는 방·제자리 입장은 null — 기준 속도가 없으면 걷기를 걸지 않는다', () => {
    expect(entranceMsFor(DOOR_X, planKeeperWalk({ from: 45, to: 45 }))).toBeNull()
    expect(entranceMsFor(45, planKeeperWalk(WANDER))).toBeNull()
  })

  it('비유한 입력에도 결정론을 유지한다 (SSR·클라 동일)', () => {
    expect(entranceMsFor(Number.NaN, planKeeperWalk(WANDER))).toBe(entranceMsFor(0, planKeeperWalk(WANDER)))
  })
})
