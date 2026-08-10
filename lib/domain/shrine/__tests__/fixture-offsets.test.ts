import {
  EMPTY_FIXTURE_OFFSETS,
  FIXTURE_DX_RANGE,
  FIXTURE_DY_RANGE,
  FIXTURE_KEYS,
  ZERO_FIXTURE_OFFSET,
  applyStageFixtureOffsets,
  clampFixtureOffset,
  companionShiftPlacements,
  fixtureDelta,
  isZeroFixtureOffset,
  parseFixtureOffsets,
  type FixtureOffsets,
} from '../fixture-offsets'
import { SNAP_RADIUS_PX, type StageAnchor, type StageSpec } from '../stage'

/**
 * 고정 살림 조절 — 순수 도메인 계약.
 *
 * 이 기능의 제1계약은 **「{} 이면 어제와 같다」** 다(마이그레이션 없이 라이브 신당 전부가 그대로여야 한다).
 * 그래서 항등 경로는 값이 같은지가 아니라 **참조가 같은지**까지 본다 — 새 객체를 만들면 memo 소비처가
 * 줄줄이 재계산되고, 그 차이는 눈으로 안 보이는 회귀가 된다.
 */

/** 표준 와이드 무대(theme-stage-geometry.json 정본)를 본뜬 최소 스펙 — 단상 + 상판(앵커 45/50/55·y53.5) */
function stageFixture(): StageSpec {
  return {
    wallpaperUrl: '/shrine/stage/x/wall.webp',
    flooringUrl: '/shrine/stage/x/floor.webp',
    structures: [
      { code: 'platform', assetUrl: '/shrine/stage/x/platform.webp', x: 50, y: 51, w: 44, anchors: [] },
      {
        code: 'altar-top',
        assetUrl: '/shrine/stage/x/altar-top.webp',
        x: 50,
        y: 58,
        w: 58,
        anchors: [
          { id: 'altar-left', layer: 'altar', x: 45, y: 53.5, label: '제단 왼편' },
          { id: 'altar-center', layer: 'altar', x: 50, y: 53.5, label: '제단 가운데' },
          { id: 'altar-right', layer: 'altar', x: 55, y: 53.5, label: '제단 오른편' },
        ],
      },
    ],
    light: { color: '#c9a84c', intensity: 0.5, origin: { x: 50, y: 18 } },
  }
}

describe('parseFixtureOffsets — DB jsonb·액션 인자의 단일 관문', () => {
  it('빈 값·형태 오류는 전부 빈 맵 (크래시 금지)', () => {
    for (const bad of [null, undefined, 0, 'x', [], [{ dx: 1 }], true, NaN]) {
      expect(parseFixtureOffsets(bad)).toEqual({})
    }
  })

  it('아는 키 3종만 살린다 — 모르는 키는 통째로 버린다', () => {
    const out = parseFixtureOffsets({
      deityStage: { dx: 1, dy: 2 },
      hallSeats: { dx: 5, dy: 5 },
      __proto__: { dx: 9, dy: 9 },
    })
    expect(Object.keys(out)).toEqual(['deityStage'])
    // 프로토타입 오염 경로 — 입력 키를 훑지 않으므로 구조적으로 닿지 않는다
    expect(Object.prototype.hasOwnProperty.call({}, 'dx')).toBe(false)
  })

  it('범위를 벗어난 값은 클램프한다 (서버가 클라 클램프를 신뢰하지 않는다)', () => {
    const out = parseFixtureOffsets({ familyShelf: { dx: 999, dy: -999 }, ritualHall: { dx: -50, dy: 50 } })
    expect(out.familyShelf).toEqual({ dx: FIXTURE_DX_RANGE[1], dy: FIXTURE_DY_RANGE[0] })
    expect(out.ritualHall).toEqual({ dx: FIXTURE_DX_RANGE[0], dy: FIXTURE_DY_RANGE[1] })
  })

  it('비유한·비수치는 0 으로 — 깨진 값이 살림을 벽 밖으로 날리지 않는다', () => {
    expect(parseFixtureOffsets({ deityStage: { dx: Number.NaN, dy: 3 } })).toEqual({ deityStage: { dx: 0, dy: 3 } })
    expect(parseFixtureOffsets({ deityStage: { dx: Number.POSITIVE_INFINITY, dy: '4' } })).toEqual({})
  })

  it('영(0,0)은 담지 않는다 — 「초기화」·「제자리로 되돌림」·「안 건드림」이 같은 값이어야 한다', () => {
    expect(parseFixtureOffsets({ deityStage: { dx: 0, dy: 0 }, ritualHall: { dx: 0, dy: 1 } })).toEqual({
      ritualHall: { dx: 0, dy: 1 },
    })
  })

  it('소수 2자리로 접는다 (jsonb 크기 + 서버·클라 값 동일 = 하이드레이션)', () => {
    expect(parseFixtureOffsets({ deityStage: { dx: 1.23456, dy: -2.98765 } })).toEqual({
      deityStage: { dx: 1.23, dy: -2.99 },
    })
  })

  it('왕복(parse ∘ parse)이 안정하다 — 저장→로드→저장이 값을 흔들지 않는다', () => {
    const once = parseFixtureOffsets({ deityStage: { dx: 3.333, dy: -4.666 }, familyShelf: { dx: 99, dy: 0 } })
    expect(parseFixtureOffsets(once)).toEqual(once)
  })

  it('입력을 변형하지 않는다', () => {
    const raw = { deityStage: { dx: 99, dy: 99 } }
    parseFixtureOffsets(raw)
    expect(raw).toEqual({ deityStage: { dx: 99, dy: 99 } })
  })
})

describe('clampFixtureOffset · 상수', () => {
  it('범위·반올림이 parse 와 같은 규칙이다 (드래그 중 화면과 저장값이 갈라지지 않게)', () => {
    expect(clampFixtureOffset({ dx: 100, dy: -100 })).toEqual({ dx: 12, dy: -14 })
    expect(clampFixtureOffset({ dx: -0.004, dy: 5.555 })).toEqual({ dx: -0, dy: 5.56 })
  })

  it('키 목록·영 상수는 동결돼 있다', () => {
    expect([...FIXTURE_KEYS]).toEqual(['deityStage', 'familyShelf', 'ritualHall'])
    expect(Object.isFrozen(FIXTURE_KEYS)).toBe(true)
    expect(Object.isFrozen(ZERO_FIXTURE_OFFSET)).toBe(true)
    expect(EMPTY_FIXTURE_OFFSETS).toEqual({})
  })

  it('fixtureDelta 는 없을 때 **같은 참조**를 돌려준다 (memo·effect deps 오염 방지)', () => {
    expect(fixtureDelta({}, 'deityStage')).toBe(ZERO_FIXTURE_OFFSET)
    expect(fixtureDelta(null, 'ritualHall')).toBe(ZERO_FIXTURE_OFFSET)
    expect(isZeroFixtureOffset(fixtureDelta(undefined, 'familyShelf'))).toBe(true)
  })
})

describe('applyStageFixtureOffsets — 구조물과 앵커가 한 소스에서 움직인다', () => {
  it('이동량이 없으면 **같은 참조** (조정 안 한 신당 = 어제와 완전히 같다)', () => {
    const s = stageFixture()
    expect(applyStageFixtureOffsets(s, {})).toBe(s)
    expect(applyStageFixtureOffsets(s, { deityStage: { dx: 0, dy: 0 } })).toBe(s)
    // 다른 살림만 조정한 경우도 무대는 그대로다
    expect(applyStageFixtureOffsets(s, { familyShelf: { dx: 5, dy: 5 } })).toBe(s)
  })

  it('null 무대(레거시 테마)는 그대로 null — 옮길 몸이 없다', () => {
    expect(applyStageFixtureOffsets(null, { deityStage: { dx: 3, dy: 3 } })).toBeNull()
  })

  it('구조물이 없으면 같은 참조 (빈 무대에 좌표만 밀지 않는다)', () => {
    const empty: StageSpec = { ...stageFixture(), structures: [] }
    expect(applyStageFixtureOffsets(empty, { deityStage: { dx: 3, dy: 3 } })).toBe(empty)
  })

  it('★ 구조물과 그 앵커가 **같은 양**으로 움직인다 (그림과 자석이 어긋나지 않는다)', () => {
    const s = stageFixture()
    const moved = applyStageFixtureOffsets(s, { deityStage: { dx: -2.5, dy: 4 } })
    expect(moved.structures.map((v) => [v.x, v.y])).toEqual([
      [47.5, 55],
      [47.5, 62],
    ])
    expect(moved.structures[1].anchors.map((a) => [a.id, a.x, a.y])).toEqual([
      ['altar-left', 42.5, 57.5],
      ['altar-center', 47.5, 57.5],
      ['altar-right', 52.5, 57.5],
    ])
    // 앵커 사이 간격(정본 45/50/55 의 뜻)은 이동해도 보존된다
    const xs = moved.structures[1].anchors.map((a) => a.x)
    expect(xs[1] - xs[0]).toBeCloseTo(5, 6)
    expect(xs[2] - xs[1]).toBeCloseTo(5, 6)
  })

  it('불변이다 — 원본 stage·structures·anchors 를 손대지 않는다', () => {
    const s = stageFixture()
    const before = JSON.parse(JSON.stringify(s))
    const moved = applyStageFixtureOffsets(s, { deityStage: { dx: 6, dy: -6 } })
    expect(s).toEqual(before)
    expect(moved).not.toBe(s)
    expect(moved.structures[0]).not.toBe(s.structures[0])
    expect(moved.structures[1].anchors[0]).not.toBe(s.structures[1].anchors[0])
  })

  it('광원·벽지·바닥재는 옮기지 않는다 — 방이 받는 빛은 제단 소유가 아니다', () => {
    const s = stageFixture()
    const moved = applyStageFixtureOffsets(s, { deityStage: { dx: 9, dy: 9 } })
    expect(moved.light).toEqual(s.light)
    expect(moved.wallpaperUrl).toBe(s.wallpaperUrl)
    expect(moved.flooringUrl).toBe(s.flooringUrl)
  })

  it('무대 밖으로는 못 나간다 — [0,100] 절대 클램프', () => {
    const edge: StageSpec = {
      ...stageFixture(),
      structures: [
        {
          code: 'edge',
          assetUrl: '/x.webp',
          x: 3,
          y: 96,
          w: 10,
          anchors: [{ id: 'a', layer: 'altar', x: 1, y: 99, label: 'a' }],
        },
      ],
    }
    const moved = applyStageFixtureOffsets(edge, { deityStage: { dx: -12, dy: 14 } })
    expect(moved.structures[0]).toMatchObject({ x: 0, y: 100 })
    expect(moved.structures[0].anchors[0]).toMatchObject({ x: 0, y: 100 })
  })
})

describe('companionShiftPlacements — 제단 위 제물은 무대를 따라간다', () => {
  const anchors: StageAnchor[] = [
    { id: 'altar-left', layer: 'altar', x: 45, y: 53.5, label: '제단 왼편' },
    { id: 'altar-center', layer: 'altar', x: 50, y: 53.5, label: '제단 가운데' },
    { id: 'altar-right', layer: 'altar', x: 55, y: 53.5, label: '제단 오른편' },
  ]
  /** 두루마리 실측에 가까운 상자 — 폭 320% 세계(1664px) × 방 높이 620px */
  const box = { width: 1664, height: 620 }
  const delta = { dx: 2, dy: -3 }

  it('반경 안에 있던 배치만 같은 양으로 민다', () => {
    const near = { id: 'a', x: 50, y: 53.5 }
    // 가로 1%p = 16.64px 이라 앵커에서 3%p 떨어지면 이미 반경(34px) 밖이다
    const far = { id: 'b', x: 20, y: 90 }
    const out = companionShiftPlacements([near, far], anchors, delta, SNAP_RADIUS_PX, box)
    expect(out[0]).toEqual({ id: 'a', x: 52, y: 50.5 })
    expect(out[1]).toBe(far)
  })

  it('거리는 **화면 픽셀**로 잰다 — 가로가 넓은 방에서 % 거리계는 허공까지 끌어온다', () => {
    // 가장 가까운 앵커에서 가로 2%p(=33.3px) 떨어진 점은 px 거리계로 반경(34px) **안**,
    // 3%p(=49.9px) 떨어진 점은 **밖**이다 — 종전 % 거리계(반경 6%)라면 둘 다 안이었다(D-3 왜곡).
    const inPx = { id: 'in', x: 52, y: 53.5 }
    const outPx = { id: 'out', x: 58, y: 53.5 }
    const res = companionShiftPlacements([inPx, outPx], anchors, delta, SNAP_RADIUS_PX, box)
    expect(res[0]).not.toBe(inPx)
    expect(res[1]).toBe(outPx)
  })

  it('층을 가리지 않는다 — 「그 자리에 있던 것」이 기준이다', () => {
    const wallItem = { id: 'w', x: 45, y: 53.5, layer: 'wall' as const }
    const out = companionShiftPlacements([wallItem], anchors, delta, SNAP_RADIUS_PX, box)
    expect(out[0]).toMatchObject({ layer: 'wall', x: 47, y: 50.5 })
  })

  it('움직인 것이 하나도 없으면 **같은 배열 참조** (헛 리렌더 방지)', () => {
    const list = [{ id: 'far', x: 5, y: 5 }]
    expect(companionShiftPlacements(list, anchors, delta, SNAP_RADIUS_PX, box)).toBe(list)
  })

  it('delta 0 · 빈 앵커 · 빈 배치는 그대로 흘린다', () => {
    const list = [{ id: 'a', x: 50, y: 53.5 }]
    expect(companionShiftPlacements(list, anchors, { dx: 0, dy: 0 }, SNAP_RADIUS_PX, box)).toBe(list)
    expect(companionShiftPlacements(list, [], delta, SNAP_RADIUS_PX, box)).toBe(list)
    const empty: Array<{ x: number; y: number }> = []
    expect(companionShiftPlacements(empty, anchors, delta, SNAP_RADIUS_PX, box)).toBe(empty)
  })

  it('상자를 못 재면(0·비유한) 아무것도 옮기지 않는다 — 조용한 오작동 금지', () => {
    const list = [{ id: 'a', x: 50, y: 53.5 }]
    expect(companionShiftPlacements(list, anchors, delta, SNAP_RADIUS_PX, { width: 0, height: 620 })).toBe(list)
    expect(companionShiftPlacements(list, anchors, delta, SNAP_RADIUS_PX, { width: Number.NaN, height: 620 })).toBe(
      list
    )
    expect(companionShiftPlacements(list, anchors, delta, 0, box)).toBe(list)
  })

  it('delta 는 누적 한계로 클램프하지 않는다 — 「이번 이동분」이라 ±12 를 넘을 수 있다', () => {
    const list = [{ id: 'a', x: 50, y: 53.5 }]
    const out = companionShiftPlacements(list, anchors, { dx: -24, dy: 0 }, SNAP_RADIUS_PX, box)
    expect(out[0].x).toBe(26)
  })

  it('무대 밖으로는 못 나간다 — [0,100] 절대 클램프 유지', () => {
    const edgeAnchors: StageAnchor[] = [{ id: 'a', layer: 'altar', x: 2, y: 98, label: 'a' }]
    const list = [{ id: 'a', x: 2, y: 98 }]
    const out = companionShiftPlacements(list, edgeAnchors, { dx: -20, dy: 20 }, SNAP_RADIUS_PX, box)
    expect(out[0]).toEqual({ id: 'a', x: 0, y: 100 })
  })

  it('원본 배치를 변형하지 않는다 (동반 이동은 새 객체로만)', () => {
    const p = { id: 'a', x: 50, y: 53.5 }
    companionShiftPlacements([p], anchors, delta, SNAP_RADIUS_PX, box)
    expect(p).toEqual({ id: 'a', x: 50, y: 53.5 })
  })
})

describe('결합 계약 — 옮기고 되돌리면 제자리다', () => {
  it('앵커 왕복: +delta 뒤 -delta 면 정본 좌표로 돌아온다', () => {
    const s = stageFixture()
    const there = applyStageFixtureOffsets(s, { deityStage: { dx: 7.5, dy: -9.25 } })
    const back = applyStageFixtureOffsets(there, { deityStage: { dx: -7.5, dy: 9.25 } })
    expect(back.structures[1].anchors.map((a) => [a.x, a.y])).toEqual(s.structures[1].anchors.map((a) => [a.x, a.y]))
  })

  it('동반 이동 왕복: 제단 위 제물도 제자리로 돌아온다(「자리 초기화」 경로)', () => {
    const box = { width: 1664, height: 620 }
    const s = stageFixture()
    const moveTo = { dx: 4, dy: 5 }
    const item = [{ id: 'a', x: 50, y: 53.5 }]

    const there = companionShiftPlacements(item, s.structures[1].anchors, moveTo, SNAP_RADIUS_PX, box)
    const movedStage = applyStageFixtureOffsets(s, { deityStage: moveTo })
    const back = companionShiftPlacements(
      there,
      movedStage.structures[1].anchors,
      { dx: -moveTo.dx, dy: -moveTo.dy },
      SNAP_RADIUS_PX,
      box
    )
    expect(back[0]).toEqual({ id: 'a', x: 50, y: 53.5 })
  })

  it('오프셋은 **가산**이지 정본 수정이 아니다 — 정본 앵커 45/50/55·y53.5 는 그대로다', () => {
    const s = stageFixture()
    applyStageFixtureOffsets(s, { deityStage: { dx: 12, dy: 14 } })
    expect(s.structures[1].anchors.map((a) => [a.x, a.y])).toEqual([
      [45, 53.5],
      [50, 53.5],
      [55, 53.5],
    ])
  })
})

describe('저장 정규화 — 전체 초기화', () => {
  it('세 덩어리를 모두 되돌리면 빈 맵이 된다 (DB 기본값과 같은 값)', () => {
    const all: FixtureOffsets = {
      deityStage: { dx: 0, dy: 0 },
      familyShelf: { dx: 0, dy: 0 },
      ritualHall: { dx: 0, dy: 0 },
    }
    expect(parseFixtureOffsets(all)).toEqual(EMPTY_FIXTURE_OFFSETS)
  })
})
