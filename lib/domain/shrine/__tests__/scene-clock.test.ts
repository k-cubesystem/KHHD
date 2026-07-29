import { kstHour, phaseMix, sceneLight, PHASE_BLEND_HOURS, type DayPhaseName } from '../scene-clock'
import { lightingOverlayStyle, type StageLight } from '../stage'

// 기준 광원 = stage.ts DEFAULT_LIGHT_COLOR(촛불금)와 같은 값. 틴트 기대값은 전부 이 원색 기준이다.
const BASE: StageLight = Object.freeze({
  color: 'rgba(255,214,160,0.55)',
  intensity: 0.5,
  origin: { x: 50, y: 18 },
})

function rgbaOf(color: string): [number, number, number, number] {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(color)
  if (!m) throw new Error(`계약 밖 색 형식: ${color}`)
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
}

/** 순수 위상의 대표 시각 — 어느 블렌드 창(경계 ±1h)에도 걸리지 않는 값 */
const PURE_HOUR: Readonly<Record<DayPhaseName, number>> = { night: 0, dawn: 6.5, day: 12, dusk: 18.5 }

describe('kstHour — UTC epoch → KST 하루 안의 시각', () => {
  const cases: Array<[string, number, number]> = [
    ['UTC 자정 = KST 09시', Date.UTC(2026, 6, 29, 0, 0, 0), 9],
    ['epoch 0 = KST 09시', 0, 9],
    ['UTC 15시 = KST 익일 00시', Date.UTC(2026, 6, 29, 15, 0, 0), 0],
    ['UTC 14:30 = KST 23:30', Date.UTC(2026, 6, 29, 14, 30, 0), 23.5],
    ['UTC 00:30 = KST 09:30 (분 포함)', Date.UTC(2026, 6, 29, 0, 30, 0), 9.5],
    ['UTC 23:59 = KST 익일 08:59', Date.UTC(2026, 6, 29, 23, 59, 0), 8.9833],
    ['epoch 이전(음수)도 하루를 감아 돈다', Date.UTC(1969, 11, 31, 15, 0, 0), 0],
  ]
  it.each(cases)('%s', (_label, epochMs, expected) => {
    expect(kstHour(epochMs)).toBe(expected)
  })

  it('항상 0 이상 24 미만', () => {
    for (let i = 0; i < 24 * 60; i += 7) {
      const h = kstHour(Date.UTC(2026, 6, 29) + i * 60_000)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(24)
    }
  })

  it('비유한 방어 — 0시로 떨어뜨려 결정론 유지', () => {
    expect(kstHour(Number.NaN)).toBe(0)
    expect(kstHour(Infinity)).toBe(0)
    expect(kstHour(-Infinity)).toBe(0)
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    const t = Date.UTC(2026, 6, 29, 3, 21, 44)
    expect(kstHour(t)).toBe(kstHour(t))
  })
})

describe('phaseMix — 위상 교차', () => {
  describe('순수 위상 (블렌드 창 밖)', () => {
    const cases: Array<[number, DayPhaseName]> = [
      [0, 'night'],
      [3, 'night'],
      [6.5, 'dawn'],
      [10, 'day'],
      [12, 'day'],
      [15.5, 'day'],
      [18.5, 'dusk'],
      [22, 'night'],
      [23.9, 'night'],
    ]
    it.each(cases)('%s시 → %s (from===to, t=0)', (hour, expected) => {
      expect(phaseMix(hour)).toEqual({ from: expected, to: expected, t: 0 })
    })
  })

  describe('확정 밴드 경계 (새벽 05 · 낮 08 · 해질녘 17 · 밤 20)', () => {
    const boundaries: Array<[number, DayPhaseName, DayPhaseName]> = [
      [5, 'night', 'dawn'],
      [8, 'dawn', 'day'],
      [17, 'day', 'dusk'],
      [20, 'dusk', 'night'],
    ]
    it.each(boundaries)('경계 %s시 정각은 두 위상의 정중앙(t=0.5)', (at, from, to) => {
      expect(phaseMix(at)).toEqual({ from, to, t: 0.5 })
    })
    it.each(boundaries)('경계 %s시 ±%s h 가 블렌드 구간의 양 끝(t=0 / t=1)', (at, from, to) => {
      expect(phaseMix(at - PHASE_BLEND_HOURS)).toEqual({ from, to, t: 0 })
      expect(phaseMix(at + PHASE_BLEND_HOURS)).toEqual({ from, to, t: 1 })
    })
  })

  it('24시간 정규화 — 24=0시, 25=1시, -1=23시', () => {
    expect(phaseMix(24)).toEqual(phaseMix(0))
    expect(phaseMix(25)).toEqual(phaseMix(1))
    expect(phaseMix(-1)).toEqual(phaseMix(23))
  })

  it('비유한 방어 — 0시(밤)로', () => {
    expect(phaseMix(Number.NaN)).toEqual({ from: 'night', to: 'night', t: 0 })
    expect(phaseMix(Infinity)).toEqual({ from: 'night', to: 'night', t: 0 })
  })

  it('t 는 전 구간 0~1, 위상 4종이 모두 등장한다', () => {
    const seen = new Set<DayPhaseName>()
    for (let i = 0; i < 2400; i++) {
      const m = phaseMix(i / 100)
      expect(m.t).toBeGreaterThanOrEqual(0)
      expect(m.t).toBeLessThanOrEqual(1)
      seen.add(m.from)
      seen.add(m.to)
    }
    expect(seen).toEqual(new Set<DayPhaseName>(['dawn', 'day', 'dusk', 'night']))
  })
})

describe('sceneLight — 위상별 확정 틴트', () => {
  it('밤(0시): 테마 원색 그대로 + 밝기 ×1.08', () => {
    const lit = sceneLight(BASE, PURE_HOUR.night)
    expect(rgbaOf(lit.color)).toEqual([255, 214, 160, 0.55])
    expect(lit.intensity).toBe(0.54)
  })
  it('새벽(6.5시): 청람으로 60% — 파랑이 빨강을 앞선다', () => {
    const lit = sceneLight(BASE, PURE_HOUR.dawn)
    const [r, g, b] = rgbaOf(lit.color)
    expect([r, g, b]).toEqual([174, 179, 198])
    expect(b).toBeGreaterThan(r)
    expect(lit.intensity).toBe(0.425)
  })
  it('낮(12시): 중립으로 50% + 밝기 ×0.75', () => {
    const lit = sceneLight(BASE, PURE_HOUR.day)
    expect(rgbaOf(lit.color).slice(0, 3)).toEqual([246, 226, 201])
    expect(lit.intensity).toBe(0.375)
  })
  it('해질녘(18.5시): 주홍으로 50% — r>g>b', () => {
    const lit = sceneLight(BASE, PURE_HOUR.dusk)
    const [r, g, b] = rgbaOf(lit.color)
    expect([r, g, b]).toEqual([255, 168, 113])
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
    expect(lit.intensity).toBe(0.475)
  })

  it('낮은 밤보다 어둡고 채도도 낮다(볕에 광원이 묻히는 연출)', () => {
    const day = sceneLight(BASE, PURE_HOUR.day)
    const night = sceneLight(BASE, PURE_HOUR.night)
    const chroma = (c: string): number => {
      const [r, g, b] = rgbaOf(c)
      return Math.max(r, g, b) - Math.min(r, g, b)
    }
    expect(day.intensity).toBeLessThan(night.intensity)
    expect(chroma(day.color)).toBeLessThan(chroma(night.color))
  })

  it('결정론 — 같은 입력 같은 결과', () => {
    expect(sceneLight(BASE, 5.37)).toEqual(sceneLight(BASE, 5.37))
  })
})

describe('sceneLight — 경계 연속성', () => {
  it('19.99h vs 20.01h — 색·밝기 차이가 미소', () => {
    const before = sceneLight(BASE, 19.99)
    const after = sceneLight(BASE, 20.01)
    const [r0, g0, b0] = rgbaOf(before.color)
    const [r1, g1, b1] = rgbaOf(after.color)
    expect(Math.abs(r1 - r0)).toBeLessThanOrEqual(1)
    expect(Math.abs(g1 - g0)).toBeLessThanOrEqual(1)
    expect(Math.abs(b1 - b0)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.intensity - before.intensity)).toBeLessThanOrEqual(0.01)
  })

  it('0~24h 전 구간 0.01h 간격 — 채널 점프 2 이하, 밝기 점프 0.01 이하', () => {
    let prev = sceneLight(BASE, 0)
    for (let i = 1; i <= 2400; i++) {
      const cur = sceneLight(BASE, i / 100)
      const [pr, pg, pb] = rgbaOf(prev.color)
      const [cr, cg, cb] = rgbaOf(cur.color)
      expect(Math.abs(cr - pr)).toBeLessThanOrEqual(2)
      expect(Math.abs(cg - pg)).toBeLessThanOrEqual(2)
      expect(Math.abs(cb - pb)).toBeLessThanOrEqual(2)
      expect(Math.abs(cur.intensity - prev.intensity)).toBeLessThanOrEqual(0.01)
      prev = cur
    }
  })

  it('자정 랩어라운드도 연속 (23.999h ≈ 0.001h)', () => {
    expect(sceneLight(BASE, 23.999)).toEqual(sceneLight(BASE, 0.001))
  })
})

describe('sceneLight — alpha·origin 보존', () => {
  it('alpha 는 전 시간대에서 원본 유지', () => {
    for (let i = 0; i <= 2400; i += 13) {
      expect(rgbaOf(sceneLight(BASE, i / 100).color)[3]).toBe(0.55)
    }
  })
  it('alpha 없는 rgb() 는 1 로 승격 후 유지', () => {
    const lit = sceneLight({ ...BASE, color: 'rgb(255, 214, 160)' }, PURE_HOUR.day)
    expect(rgbaOf(lit.color)[3]).toBe(1)
  })
  it('origin 은 값·참조 모두 불변', () => {
    const lit = sceneLight(BASE, PURE_HOUR.dusk)
    expect(lit.origin).toEqual({ x: 50, y: 18 })
    expect(lit.origin).toBe(BASE.origin)
  })
})

describe('sceneLight — 색 파싱 방어', () => {
  it.each(['chartreuse', 'hsl(30,50%,50%)', 'rgba(a,b,c,d)', '', '  ', '#ff', '#fffff', 'rgb(100%,50%,0%)'])(
    '파싱 불가 색 %p 은 base 를 그대로 반환(조명 소실 금지)',
    (color) => {
      const broken: StageLight = { ...BASE, color }
      expect(sceneLight(broken, PURE_HOUR.day)).toBe(broken)
    }
  )

  it('문자열이 아닌 색도 base 그대로', () => {
    const broken = { ...BASE, color: 123 } as unknown as StageLight
    expect(sceneLight(broken, PURE_HOUR.day)).toBe(broken)
  })

  it('hex 테마(stage.ts safeColor 허용 형식)도 낮밤이 돈다', () => {
    expect(rgbaOf(sceneLight({ ...BASE, color: '#ffd6a0' }, PURE_HOUR.night).color)).toEqual([255, 214, 160, 1])
    expect(rgbaOf(sceneLight({ ...BASE, color: '#fff' }, PURE_HOUR.night).color)).toEqual([255, 255, 255, 1])
    expect(rgbaOf(sceneLight({ ...BASE, color: '#ffd6a08c' }, PURE_HOUR.night).color)[3]).toBe(0.549)
  })

  it('범위 밖 채널은 0~255 로 클램프', () => {
    const lit = sceneLight({ ...BASE, color: 'rgba(999,214,160,9)' }, PURE_HOUR.night)
    expect(rgbaOf(lit.color)).toEqual([255, 214, 160, 1])
  })
})

describe('sceneLight — intensity 클램프', () => {
  it('밤 배수(×1.08)로도 1 을 넘지 않는다', () => {
    expect(sceneLight({ ...BASE, intensity: 0.98 }, PURE_HOUR.night).intensity).toBe(1)
    expect(sceneLight({ ...BASE, intensity: 1 }, PURE_HOUR.night).intensity).toBe(1)
  })
  it('0·음수·비유한 방어', () => {
    expect(sceneLight({ ...BASE, intensity: 0 }, PURE_HOUR.night).intensity).toBe(0)
    expect(sceneLight({ ...BASE, intensity: -5 }, PURE_HOUR.dusk).intensity).toBe(0)
    expect(sceneLight({ ...BASE, intensity: Number.NaN }, PURE_HOUR.day).intensity).toBe(0)
    expect(sceneLight({ ...BASE, intensity: Infinity }, PURE_HOUR.day).intensity).toBe(0)
  })
  it('전 구간 0~1 범위', () => {
    for (let i = 0; i <= 2400; i += 11) {
      const v = sceneLight({ ...BASE, intensity: 0.95 }, i / 100).intensity
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('stage.ts 소비 계약', () => {
  it('출력 색이 lightingOverlayStyle 의 색 방어(safeColor)를 통과한다', () => {
    for (const hour of [0, 5, 6.5, 8, 12, 17, 18.5, 20]) {
      const lit = sceneLight(BASE, hour)
      // 통과하지 못하면 기본 촛불색으로 대체되어 낮밤 연출이 조용히 사라진다
      expect(lightingOverlayStyle(lit, 0).backgroundImage).toContain(lit.color)
      expect(lit.color.length).toBeLessThanOrEqual(64)
    }
  })
})
