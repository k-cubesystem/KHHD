import { fromDayNumber, toDayNumber, MANSE_YEAR_RANGE, type CalendarDate } from '../lunar'
import {
  activeSeasonal,
  seasonalSolarDate,
  SEASONAL_EVENT_KEYS,
  SEASONAL_LABELS,
  SEASONAL_SOLAR_BOUNDS,
  SEASONAL_WINDOW_DAYS,
  type SeasonalEventKey,
} from '../seasonal'

// 골든 출처 = 앱의 만세력 엔진(lunar-javascript 1.7.7) 직접 실행 — 사주 골든테스트가 오라클로 쓰는 그 엔진.
// 교차 검증(대한민국 관보 공휴일): 2025 설날 1/29·추석 10/6, 2026 설날 2/17·추석 9/25,
//   2027 설날 2/6·추석 9/15, 2028 설날 1/26·추석 10/3 — 전부 일치.
// 동지는 천문 동지(24절기)를 KST로 보정한 날. 2025는 엔진값이 중국시 12/21 23:03 → KST 12/22 (보정 회귀 케이스).
const GOLDENS: Readonly<Record<number, Readonly<Record<SeasonalEventKey, CalendarDate>>>> = {
  2025: {
    seol: { y: 2025, m: 1, d: 29 },
    daeboreum: { y: 2025, m: 2, d: 12 },
    dano: { y: 2025, m: 5, d: 31 },
    chuseok: { y: 2025, m: 10, d: 6 },
    dongji: { y: 2025, m: 12, d: 22 },
  },
  2026: {
    seol: { y: 2026, m: 2, d: 17 },
    daeboreum: { y: 2026, m: 3, d: 3 },
    dano: { y: 2026, m: 6, d: 19 },
    chuseok: { y: 2026, m: 9, d: 25 },
    dongji: { y: 2026, m: 12, d: 22 },
  },
  2027: {
    seol: { y: 2027, m: 2, d: 6 },
    daeboreum: { y: 2027, m: 2, d: 20 },
    dano: { y: 2027, m: 6, d: 9 },
    chuseok: { y: 2027, m: 9, d: 15 },
    dongji: { y: 2027, m: 12, d: 22 },
  },
  2028: {
    seol: { y: 2028, m: 1, d: 26 },
    daeboreum: { y: 2028, m: 2, d: 9 },
    dano: { y: 2028, m: 5, d: 28 },
    chuseok: { y: 2028, m: 10, d: 3 },
    dongji: { y: 2028, m: 12, d: 21 },
  },
}

const GOLDEN_YEARS = [2025, 2026, 2027, 2028] as const

function shift(date: CalendarDate, days: number): CalendarDate {
  return fromDayNumber(toDayNumber(date) + days)
}

function eachDay(from: CalendarDate, to: CalendarDate): CalendarDate[] {
  const out: CalendarDate[] = []
  for (let n = toDayNumber(from); n <= toDayNumber(to); n++) out.push(fromDayNumber(n))
  return out
}

const ALL_CASES: Array<{ label: string; year: number; key: SeasonalEventKey; date: CalendarDate }> = []
for (const year of GOLDEN_YEARS) {
  for (const key of SEASONAL_EVENT_KEYS) {
    ALL_CASES.push({ label: `${year} ${SEASONAL_LABELS[key]}`, year, key, date: GOLDENS[year][key] })
  }
}

describe('seasonalSolarDate — 5대 절기 양력 골든 (만세력 역변환)', () => {
  it.each(ALL_CASES)('$label', ({ year, key, date }) => {
    expect(seasonalSolarDate(key, year)).toEqual(date)
  })

  it('동지 KST 보정 회귀 — 엔진이 중국시 23시대에 놓은 해는 KST로 하루 뒤', () => {
    // 엔진 원값: 2021 CST 12/21 23:59 · 2025 CST 12/21 23:03 → 둘 다 KST 12/22.
    // 한국천문연구원 발표 동지도 2021·2025 모두 12월 22일이다. 보정이 빠지면 둘 다 12/21로 밀린다.
    expect(seasonalSolarDate('dongji', 2021)).toEqual({ y: 2021, m: 12, d: 22 })
    expect(seasonalSolarDate('dongji', 2025)).toEqual({ y: 2025, m: 12, d: 22 })
  })

  it('동지는 언제나 양력 12월 21~23일, 현대 구간(1960~)에서는 21~22일', () => {
    for (let year = MANSE_YEAR_RANGE.min; year <= MANSE_YEAR_RANGE.max; year++) {
      const dongji = seasonalSolarDate('dongji', year)
      expect(dongji).not.toBeNull()
      expect(dongji?.y).toBe(year)
      expect(dongji?.m).toBe(12)
      expect(dongji?.d).toBeGreaterThanOrEqual(21)
      expect(dongji?.d).toBeLessThanOrEqual(year < 1960 ? 23 : 22)
    }
  })

  it('모든 절기와 그 노출 창이 자기 양력 연도 안에 갇힌다 (1900~2100 전수)', () => {
    // activeSeasonal 이 입력 연도 하나만 훑어도 되는 근거. 이 성질이 깨지면 전년/다음해 명절을 놓친다.
    const { earliest, latest } = SEASONAL_SOLAR_BOUNDS
    const lowerBound = toDayNumber({ y: 2000, m: earliest.month, d: earliest.day })
    const upperBound = toDayNumber({ y: 2000, m: latest.month, d: latest.day })
    for (let year = MANSE_YEAR_RANGE.min; year <= MANSE_YEAR_RANGE.max; year++) {
      for (const key of SEASONAL_EVENT_KEYS) {
        const event = seasonalSolarDate(key, year)
        expect(event).not.toBeNull()
        expect(event?.y).toBe(year)
        const asRefYear = toDayNumber({ y: 2000, m: event?.m ?? 0, d: event?.d ?? 0 })
        expect(asRefYear).toBeGreaterThanOrEqual(lowerBound)
        expect(asRefYear).toBeLessThanOrEqual(upperBound)
      }
    }
    // 창(±1일)까지 붙여도 연 경계를 넘지 않는다
    expect(lowerBound - SEASONAL_WINDOW_DAYS).toBeGreaterThan(toDayNumber({ y: 1999, m: 12, d: 31 }))
    expect(upperBound + SEASONAL_WINDOW_DAYS).toBeLessThan(toDayNumber({ y: 2001, m: 1, d: 1 }))
  })

  it('지원 구간(1900~2100) 밖은 null — 표 만료가 아니라 엔진 신뢰 구간 가드', () => {
    for (const key of SEASONAL_EVENT_KEYS) {
      expect(seasonalSolarDate(key, MANSE_YEAR_RANGE.max + 1)).toBeNull()
      expect(seasonalSolarDate(key, MANSE_YEAR_RANGE.min - 1)).toBeNull()
      expect(seasonalSolarDate(key, Number.NaN)).toBeNull()
    }
  })
})

describe('activeSeasonal — 노출 창 (명절 당일 ±1일)', () => {
  it.each(ALL_CASES)('$label 당일 — key·label·창 경계가 정확', ({ key, date }) => {
    const event = activeSeasonal(date)
    expect(event).not.toBeNull()
    expect(event?.key).toBe(key)
    expect(event?.label).toBe(SEASONAL_LABELS[key])
    expect(event?.start).toEqual(shift(date, -SEASONAL_WINDOW_DAYS))
    expect(event?.end).toEqual(shift(date, SEASONAL_WINDOW_DAYS))
  })

  it.each(ALL_CASES)('$label — 전날·다음날은 열려 있고, 이틀 밖은 닫혀 있다', ({ key, date }) => {
    expect(activeSeasonal(shift(date, -1))?.key).toBe(key)
    expect(activeSeasonal(shift(date, 1))?.key).toBe(key)
    expect(activeSeasonal(shift(date, -2))).toBeNull()
    expect(activeSeasonal(shift(date, 2))).toBeNull()
  })

  it('동지 KST 보정 회귀 — 2025-12-23 열림 / 2025-12-20 닫힘 (미보정이면 정반대)', () => {
    expect(activeSeasonal({ y: 2025, m: 12, d: 23 })?.key).toBe('dongji')
    expect(activeSeasonal({ y: 2025, m: 12, d: 20 })).toBeNull()
  })

  it('평일은 null', () => {
    for (const date of [
      { y: 2026, m: 1, d: 1 },
      { y: 2026, m: 5, d: 1 },
      { y: 2026, m: 7, d: 15 },
      { y: 2026, m: 11, d: 30 },
    ]) {
      expect(activeSeasonal(date)).toBeNull()
    }
  })

  it('한 해 열리는 날은 정확히 5절기 × 3일 = 15일이고, 하루에 두 절기가 겹치지 않는다', () => {
    for (const year of GOLDEN_YEARS) {
      const open = eachDay({ y: year, m: 1, d: 1 }, { y: year, m: 12, d: 31 })
        .map(activeSeasonal)
        .filter((event): event is NonNullable<typeof event> => event !== null)
      expect(open).toHaveLength(SEASONAL_EVENT_KEYS.length * (SEASONAL_WINDOW_DAYS * 2 + 1))
      const perKey = new Map<SeasonalEventKey, number>()
      for (const event of open) perKey.set(event.key, (perKey.get(event.key) ?? 0) + 1)
      expect([...perKey.keys()].sort()).toEqual([...SEASONAL_EVENT_KEYS].sort())
      for (const count of perKey.values()) expect(count).toBe(3)
    }
  })

  it('연 경계를 넘는 명절도 잡힌다 — 2028 설(1/26) 창은 전년도 스캔 없이도 열린다', () => {
    expect(activeSeasonal({ y: 2028, m: 1, d: 25 })?.key).toBe('seol')
    expect(activeSeasonal({ y: 2025, m: 12, d: 31 })).toBeNull()
    // 2026-01-01 은 2025 동지(12/22) 창 밖 → 전년도 스캔이 오작동하면 여기서 터진다
    expect(activeSeasonal({ y: 2026, m: 1, d: 1 })).toBeNull()
  })

  it('지원 구간 밖 · 비유한 입력은 null', () => {
    expect(activeSeasonal({ y: MANSE_YEAR_RANGE.max + 1, m: 2, d: 17 })).toBeNull()
    expect(activeSeasonal({ y: MANSE_YEAR_RANGE.min - 1, m: 2, d: 5 })).toBeNull()
    expect(activeSeasonal({ y: Number.NaN, m: 9, d: 25 })).toBeNull()
    expect(activeSeasonal({ y: 2026, m: Number.POSITIVE_INFINITY, d: 25 })).toBeNull()
  })

  it('없는 날짜는 정규화 후 판정 (2026-02-16 = 2026-01-47)', () => {
    expect(activeSeasonal({ y: 2026, m: 1, d: 47 })).toEqual(activeSeasonal({ y: 2026, m: 2, d: 16 }))
  })

  it('결정론 — 같은 입력은 언제나 같은 출력 (Date.now/Math.random 회귀 방지)', () => {
    for (const date of [
      { y: 2026, m: 9, d: 25 },
      { y: 2026, m: 5, d: 1 },
      { y: 2025, m: 12, d: 22 },
    ]) {
      expect(activeSeasonal(date)).toEqual(activeSeasonal(date))
    }
  })
})
