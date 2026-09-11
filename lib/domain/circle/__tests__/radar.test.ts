import {
  RADAR_AXES,
  RADAR_MAX_SHARE,
  RADAR_MIN_RATIO,
  axisAngle,
  pointAt,
  polygonAttr,
  radarPoints,
  ringPoints,
} from '@/lib/domain/circle/radar'

describe('오각형 그래프 기하', () => {
  it('축은 상생 순(木火土金水)이고 木이 맨 위다', () => {
    expect(RADAR_AXES).toEqual(['wood', 'fire', 'earth', 'metal', 'water'])
    expect(axisAngle(0)).toBeCloseTo(-Math.PI / 2)
    const top = pointAt(0, 100, 0, 0)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(-100)
  })

  it('균형 20% 는 반지름의 절반, 40% 이상은 가득, 0% 는 최소 비율', () => {
    const pts = radarPoints({ wood: 20, fire: 40, earth: 60, metal: 0, water: 10 }, 100, 0, 0)
    expect(pts).toHaveLength(5)
    expect(Math.hypot(pts[0].x, pts[0].y)).toBeCloseTo(50, 0)
    expect(Math.hypot(pts[1].x, pts[1].y)).toBeCloseTo(100, 0)
    expect(Math.hypot(pts[2].x, pts[2].y)).toBeCloseTo(100, 0)
    expect(Math.hypot(pts[3].x, pts[3].y)).toBeCloseTo(100 * RADAR_MIN_RATIO, 0)
    expect(RADAR_MAX_SHARE).toBe(40)
  })

  it('고리는 다섯 점이고 polygon 속성 문자열로 이어진다', () => {
    const ring = ringPoints(100, 120, 120, 0.5)
    expect(ring).toHaveLength(5)
    expect(polygonAttr(ring).split(' ')).toHaveLength(5)
    expect(
      polygonAttr([
        { x: 1, y: 2 },
        { x: 3.5, y: 4 },
      ])
    ).toBe('1,2 3.5,4')
  })

  it('결정론 — 같은 비율이면 같은 점', () => {
    const s = { wood: 33, fire: 9, earth: 21, metal: 17, water: 20 }
    expect(radarPoints(s, 90, 100, 100)).toEqual(radarPoints(s, 90, 100, 100))
  })
})
