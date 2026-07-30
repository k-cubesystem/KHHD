import { KEEPER_WANDER_LEG_MS, keeperRestX, planKeeperEntrance, planKeeperWalk, type KeeperRange } from '../keeper-walk'

/** 배선(ShrineRoomClient)이 쓰는 실제 값 — 여기가 깨지면 방에서 신당지기가 튄다 */
const WANDER: KeeperRange = { from: 31, to: 59 }
/** 입장 걷기 3600ms (부록 C ② 감속: 1800→3600). 카메라 팬 1100ms 의 3.3배 */
const ENTRANCE = { from: 8, to: 45, ms: 3600 }

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
