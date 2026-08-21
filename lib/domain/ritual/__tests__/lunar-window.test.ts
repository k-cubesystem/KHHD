/**
 * 초하루 창 판정 골든 테스트.
 * 음력 골든 값은 lib/domain/shrine/__tests__/lunar.test.ts 와 동일 계보:
 *  - 2026-02-17 = 병오년 설날(음력 1월 1일)
 *  - 2025년은 윤6월이 있는 해 (윤6월 초하루 = 양력 2025-07-25)
 */
import {
  getRitualWindow,
  kstParts,
  toLunarParts,
  leapMonthOf,
  lunarMonthSeq,
  nextFirstDayAfter,
  RITUAL_WINDOW_DAYS,
} from '../lunar-window'

function kstNoon(dateStr: string): Date {
  // KST 정오 = UTC 03:00 — 날짜 경계에서 안전
  return new Date(`${dateStr}T03:00:00Z`)
}

describe('kstParts', () => {
  it('UTC 저녁은 KST 다음날이다 (경계 시프트)', () => {
    const p = kstParts(new Date('2026-02-16T16:30:00Z')) // KST 2026-02-17 01:30
    expect(p).toEqual({ y: 2026, m: 2, d: 17 })
  })

  it('UTC 오후 14:59는 KST 같은날 23:59다', () => {
    const p = kstParts(new Date('2026-02-17T14:59:00Z'))
    expect(p).toEqual({ y: 2026, m: 2, d: 17 })
  })
})

describe('getRitualWindow — 창 판정', () => {
  it('설날(2026-02-17, 음 1/1)은 창 1일차', () => {
    const w = getRitualWindow(kstNoon('2026-02-17'))
    expect(w.inWindow).toBe(true)
    expect(w.dayInWindow).toBe(1)
    expect(w.ritualMonth).toBe('2026-01')
    expect(w.isLeapMonth).toBe(false)
    expect(w.monthLabel).toBe('정월 초하루')
  })

  it('음 1/3(2026-02-19)은 창 마지막 날', () => {
    const w = getRitualWindow(kstNoon('2026-02-19'))
    expect(w.inWindow).toBe(true)
    expect(w.dayInWindow).toBe(RITUAL_WINDOW_DAYS)
  })

  it('음 1/4(2026-02-20)는 창 밖', () => {
    const w = getRitualWindow(kstNoon('2026-02-20'))
    expect(w.inWindow).toBe(false)
    expect(w.dayInWindow).toBeNull()
  })

  it('UTC 기준 전날 저녁이라도 KST 초하루면 창 안 (시간대 회귀 가드)', () => {
    const w = getRitualWindow(new Date('2026-02-16T16:30:00Z'))
    expect(w.inWindow).toBe(true)
    expect(w.dayInWindow).toBe(1)
  })
})

describe('윤달 (2025년 윤6월)', () => {
  it('2025년의 윤달은 6월이다', () => {
    expect(leapMonthOf(2025)).toBe(6)
  })

  it('윤6월 초하루(2025-07-25)는 isLeapMonth=true 창 안', () => {
    const w = getRitualWindow(kstNoon('2025-07-25'))
    expect(w.inWindow).toBe(true)
    expect(w.dayInWindow).toBe(1)
    expect(w.isLeapMonth).toBe(true)
    expect(w.ritualMonth).toBe('2025-06')
    expect(w.monthLabel).toBe('윤유월 초하루')
  })

  it('서수는 6월 → 윤6월 → 7월이 각각 +1 (연속 기록의 인접성)', () => {
    const normal6 = lunarMonthSeq(2025, 6, false)
    const leap6 = lunarMonthSeq(2025, 6, true)
    const month7 = lunarMonthSeq(2025, 7, false)
    expect(leap6).toBe(normal6 + 1)
    expect(month7).toBe(leap6 + 1)
  })

  it('연 경계 서수 인접: 2025-12 → 2026-01은 +1', () => {
    expect(lunarMonthSeq(2026, 1, false)).toBe(lunarMonthSeq(2025, 12, false) + 1)
  })

  it('epoch: 2000년 정월 = 0', () => {
    expect(lunarMonthSeq(2000, 1, false)).toBe(0)
  })
})

describe('nextFirstDayAfter — D-day', () => {
  it('반환 날짜는 항상 음력 1일이고 40일 이내 미래다', () => {
    const p = { y: 2026, m: 2, d: 20 }
    const next = nextFirstDayAfter(p)
    expect(next.days).toBeGreaterThan(0)
    expect(next.days).toBeLessThanOrEqual(40)
    const [y, m, d] = next.date.split('-').map(Number)
    const lp = toLunarParts({ y, m, d })
    expect(lp?.day).toBe(1)
  })

  it('창 안(초하루 당일)에도 다음 달 초하루를 가리킨다', () => {
    const w = getRitualWindow(kstNoon('2026-02-17'))
    expect(w.nextFirstDay > w.kstDate).toBe(true)
    const [y, m, d] = w.nextFirstDay.split('-').map(Number)
    expect(toLunarParts({ y, m, d })?.day).toBe(1)
  })
})
