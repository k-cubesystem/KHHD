import {
  lunarPhase,
  lunarPhaseApproximate,
  toDayNumber,
  fromDayNumber,
  normalizeDate,
  isFiniteDate,
  SYNODIC_MONTH_DAYS,
  MOON_PHASE_KEYS,
  MANSE_YEAR_RANGE,
  type CalendarDate,
  type LunarPhaseInfo,
} from '../lunar'

// 골든 출처 = 앱의 만세력 엔진(lunar-javascript 1.7.7) 직접 실행.
// 사주 골든테스트(lib/domain/saju/__tests__/saju-golden.test.ts)가 오라클로 쓰는 바로 그 엔진이라
// 제품 안에서 음력 표기가 갈라질 수 없다. 아래 4건은 한국 공휴일 달력과도 일치한다
// (2026 설날 2/17, 2026 추석 9/25 — 실제 대한민국 관보 공휴일).
const LUNAR_GOLDENS: ReadonlyArray<{ label: string; solar: CalendarDate; lunarDay: number }> = [
  { label: '설 2026-02-17 = 음 1/1', solar: { y: 2026, m: 2, d: 17 }, lunarDay: 1 },
  { label: '정월대보름 2026-03-03 = 음 1/15', solar: { y: 2026, m: 3, d: 3 }, lunarDay: 15 },
  { label: '단오 2026-06-19 = 음 5/5', solar: { y: 2026, m: 6, d: 19 }, lunarDay: 5 },
  { label: '추석 2026-09-25 = 음 8/15', solar: { y: 2026, m: 9, d: 25 }, lunarDay: 15 },
  { label: '동지 2026-12-22 = 음 11/14', solar: { y: 2026, m: 12, d: 22 }, lunarDay: 14 },
]

/** [from, to] 구간의 모든 KST 날짜 */
function eachDay(from: CalendarDate, to: CalendarDate): CalendarDate[] {
  const out: CalendarDate[] = []
  for (let n = toDayNumber(from); n <= toDayNumber(to); n++) out.push(fromDayNumber(n))
  return out
}

/** 삭망월 위에서의 최단 거리(순환 거리) */
function circularDiff(a: number, b: number): number {
  const raw = Math.abs(a - b)
  return Math.min(raw, SYNODIC_MONTH_DAYS - raw)
}

const YEAR_2026 = eachDay({ y: 2026, m: 1, d: 1 }, { y: 2026, m: 12, d: 31 })

describe('toDayNumber / fromDayNumber — Date 객체 없는 날짜 산술', () => {
  it('왕복 보존 (2024~2028 전수)', () => {
    for (const day of eachDay({ y: 2024, m: 1, d: 1 }, { y: 2028, m: 12, d: 31 })) {
      expect(fromDayNumber(toDayNumber(day))).toEqual(day)
    }
  })

  it('하루 차 = 적일 1 차 (윤년 2/28→2/29→3/1)', () => {
    expect(toDayNumber({ y: 2028, m: 2, d: 29 }) - toDayNumber({ y: 2028, m: 2, d: 28 })).toBe(1)
    expect(toDayNumber({ y: 2028, m: 3, d: 1 }) - toDayNumber({ y: 2028, m: 2, d: 29 })).toBe(1)
    expect(toDayNumber({ y: 2026, m: 3, d: 1 }) - toDayNumber({ y: 2026, m: 2, d: 28 })).toBe(1)
  })

  it('normalizeDate — 없는 날짜는 실제 날짜로 흘러간다', () => {
    expect(normalizeDate({ y: 2026, m: 2, d: 30 })).toEqual({ y: 2026, m: 3, d: 2 })
    expect(normalizeDate({ y: 2026, m: 9, d: 25 })).toEqual({ y: 2026, m: 9, d: 25 })
  })

  it('isFiniteDate — NaN/Infinity 거부', () => {
    expect(isFiniteDate({ y: 2026, m: 9, d: 25 })).toBe(true)
    expect(isFiniteDate({ y: Number.NaN, m: 9, d: 25 })).toBe(false)
    expect(isFiniteDate({ y: 2026, m: Number.POSITIVE_INFINITY, d: 25 })).toBe(false)
  })
})

describe('lunarPhase — 만세력 골든', () => {
  it.each(LUNAR_GOLDENS)('$label', ({ solar, lunarDay }) => {
    expect(lunarPhase(solar).lunarDay).toBe(lunarDay)
  })

  it('보름 골든(음 1/15 · 8/15)은 isFullMoon + phaseKey full + 조도 0.99 이상', () => {
    for (const solar of [
      { y: 2026, m: 3, d: 3 },
      { y: 2026, m: 9, d: 25 },
    ]) {
      const info = lunarPhase(solar)
      expect(info.isFullMoon).toBe(true)
      expect(info.phaseKey).toBe('full')
      expect(info.illum).toBeGreaterThan(0.99)
    }
  })

  it('합삭(음 1/1 = 설 2026-02-17)은 age 0 · 조도 0 · phaseKey new', () => {
    const info = lunarPhase({ y: 2026, m: 2, d: 17 })
    expect(info.age).toBe(0)
    expect(info.illum).toBe(0)
    expect(info.phaseKey).toBe('new')
    expect(info.isFullMoon).toBe(false)
  })

  it('합삭 전후 하루는 age가 0 근처(≤1일) — 그믐/초하루 경계', () => {
    for (const solar of [
      { y: 2026, m: 2, d: 16 },
      { y: 2026, m: 2, d: 18 },
    ]) {
      const info = lunarPhase(solar)
      expect(circularDiff(info.age, 0)).toBeLessThanOrEqual(1.6)
      expect(info.phaseKey).toBe('new')
    }
  })
})

describe('lunarPhase — 값 계약 (2026 전수)', () => {
  const infos: LunarPhaseInfo[] = YEAR_2026.map(lunarPhase)

  it('age는 [0, 삭망월) 구간', () => {
    for (const info of infos) {
      expect(info.age).toBeGreaterThanOrEqual(0)
      expect(info.age).toBeLessThan(SYNODIC_MONTH_DAYS)
    }
  })

  it('illum은 [0, 1] 구간이고 항상 유한', () => {
    for (const info of infos) {
      expect(Number.isFinite(info.illum)).toBe(true)
      expect(info.illum).toBeGreaterThanOrEqual(0)
      expect(info.illum).toBeLessThanOrEqual(1)
    }
  })

  it('lunarDay는 1~30 정수', () => {
    for (const info of infos) {
      expect(Number.isInteger(info.lunarDay)).toBe(true)
      expect(info.lunarDay).toBeGreaterThanOrEqual(1)
      expect(info.lunarDay).toBeLessThanOrEqual(30)
    }
    expect(infos.some((i) => i.lunarDay === 30)).toBe(true)
  })

  it('phaseKey는 계약된 8개 안에서만 나오고, 한 해 안에 8개가 모두 등장', () => {
    const seen = new Set(infos.map((i) => i.phaseKey))
    for (const key of seen) expect(MOON_PHASE_KEYS).toContain(key)
    expect(seen.size).toBe(MOON_PHASE_KEYS.length)
  })

  it('isFullMoon = 음력 14·15·16일이며, 참이면 phaseKey는 반드시 full (셋이 어긋나지 않는다)', () => {
    for (const info of infos) {
      expect(info.isFullMoon).toBe(Math.abs(info.lunarDay - 15) <= 1)
      if (info.isFullMoon) expect(info.phaseKey).toBe('full')
    }
  })

  it('음력 일 → 위상 대응이 전승과 맞는다 (초하루 삭 · 초여드레 상현 · 스무사흘 하현)', () => {
    for (const info of infos) {
      if (info.lunarDay === 1) expect(info.phaseKey).toBe('new')
      if (info.lunarDay === 8) expect(info.phaseKey).toBe('first-quarter')
      if (info.lunarDay === 23) expect(info.phaseKey).toBe('last-quarter')
    }
  })

  it('결정론 — 같은 입력은 언제나 같은 출력 (Date.now/Math.random 회귀 방지)', () => {
    for (const solar of [
      { y: 2026, m: 9, d: 25 },
      { y: 2026, m: 2, d: 17 },
      { y: 1999, m: 12, d: 31 },
    ]) {
      expect(lunarPhase(solar)).toEqual(lunarPhase(solar))
    }
    expect(YEAR_2026.map(lunarPhase)).toEqual(infos)
  })
})

describe('lunarPhase — 방어 입력', () => {
  it('없는 날짜는 정규화 후 계산 (2026-02-30 === 2026-03-02)', () => {
    expect(lunarPhase({ y: 2026, m: 2, d: 30 })).toEqual(lunarPhase({ y: 2026, m: 3, d: 2 }))
  })

  it('비유한 입력도 던지지 않고 안전한 삭(朔) 기본값', () => {
    const info = lunarPhase({ y: Number.NaN, m: 9, d: 25 })
    expect(info).toEqual({ age: 0, illum: 0, lunarDay: 1, isFullMoon: false, phaseKey: 'new' })
  })
})

describe('lunarPhaseApproximate — 만세력 구간 밖 폴백', () => {
  it('지원 구간(1900~2100) 밖은 근사 경로로 내려간다', () => {
    const beyond = { y: MANSE_YEAR_RANGE.max + 100, m: 6, d: 15 }
    const before = { y: MANSE_YEAR_RANGE.min - 100, m: 6, d: 15 }
    expect(lunarPhase(beyond)).toEqual(lunarPhaseApproximate(beyond))
    expect(lunarPhase(before)).toEqual(lunarPhaseApproximate(before))
  })

  it('지원 구간 안은 근사가 아니라 만세력 경로를 쓴다 (경계 연도 포함)', () => {
    // 근사와 만세력은 값이 다르다 — 다름 자체가 "만세력을 실제로 탔다"는 증거.
    expect(lunarPhase({ y: 2026, m: 9, d: 25 }).lunarDay).toBe(15)
    expect(lunarPhase({ y: 2026, m: 9, d: 25 })).not.toEqual(lunarPhaseApproximate({ y: 2026, m: 9, d: 25 }))
    expect(lunarPhase({ y: MANSE_YEAR_RANGE.min, m: 6, d: 15 })).not.toEqual(
      lunarPhaseApproximate({ y: MANSE_YEAR_RANGE.min, m: 6, d: 15 })
    )
  })

  it('근사도 같은 값 계약을 지킨다 (age·illum·lunarDay·phaseKey)', () => {
    for (const day of YEAR_2026) {
      const info = lunarPhaseApproximate(day)
      expect(info.age).toBeGreaterThanOrEqual(0)
      expect(info.age).toBeLessThan(SYNODIC_MONTH_DAYS)
      expect(info.illum).toBeGreaterThanOrEqual(0)
      expect(info.illum).toBeLessThanOrEqual(1)
      expect(info.lunarDay).toBeGreaterThanOrEqual(1)
      expect(info.lunarDay).toBeLessThanOrEqual(30)
      expect(MOON_PHASE_KEYS).toContain(info.phaseKey)
    }
  })

  it('근사는 하루에 정확히 1일씩 늙는다 (합삭에서만 되감김)', () => {
    let previous = lunarPhaseApproximate(YEAR_2026[0]).age
    for (const day of YEAR_2026.slice(1)) {
      const age = lunarPhaseApproximate(day).age
      const delta = age - previous
      const wrapped = delta < 0
      // age는 소수 4자리로 반올림되므로 되감김 지점에서 최대 1e-4 오차가 남는다.
      expect(wrapped ? delta + SYNODIC_MONTH_DAYS : delta).toBeCloseTo(1, 3)
      previous = age
    }
  })

  it('근사와 만세력의 나이 차는 표시 오차 안(순환거리 ≤ 2일, 2024~2028 전수)', () => {
    // 근사는 평균 삭망월이라 실제 합삭에서 ±0.6일 흔들리고,
    // 만세력 age는 "음력 일 - 1"이라 합삭 순간보다 최대 1일 앞선다 → 합쳐 최대 ~1.76일.
    let worst = 0
    for (const day of eachDay({ y: 2024, m: 1, d: 1 }, { y: 2028, m: 12, d: 31 })) {
      worst = Math.max(worst, circularDiff(lunarPhase(day).age, lunarPhaseApproximate(day).age))
    }
    expect(worst).toBeLessThanOrEqual(2)
  })

  it('결정론 — 근사도 같은 입력 같은 출력', () => {
    const solar = { y: 2300, m: 4, d: 9 }
    expect(lunarPhaseApproximate(solar)).toEqual(lunarPhaseApproximate(solar))
  })
})
