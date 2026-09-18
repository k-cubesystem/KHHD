import { consecutiveStreak, kstMonthRange, kstWeekStart, shiftKstDate, STREAK_LOOKBACK_DAYS } from '../streak'

describe('shiftKstDate', () => {
  it('달·해의 경계를 넘는다', () => {
    expect(shiftKstDate('2026-09-01', -1)).toBe('2026-08-31')
    expect(shiftKstDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftKstDate('2028-03-01', -1)).toBe('2028-02-29')
  })
})

describe('kstWeekStart', () => {
  it('월요일로 떨어진다 — 일요일은 앞 주 월요일', () => {
    expect(kstWeekStart('2026-09-14')).toBe('2026-09-14')
    expect(kstWeekStart('2026-09-18')).toBe('2026-09-14')
    expect(kstWeekStart('2026-09-20')).toBe('2026-09-14')
    expect(kstWeekStart('2026-09-01')).toBe('2026-08-31')
  })
})

describe('kstMonthRange', () => {
  it('말일을 달마다 맞춘다', () => {
    expect(kstMonthRange('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(kstMonthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(kstMonthRange('2026-09-18')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
  })
})

describe('consecutiveStreak', () => {
  it('오늘 했으면 오늘부터, 어제가 이어지면 어제도 센다', () => {
    const checked = new Set(['2026-09-16', '2026-09-17', '2026-09-18'])
    expect(consecutiveStreak(checked, '2026-09-18')).toBe(3)
  })

  it('오늘 아직 안 했으면 어제까지의 연속을 보인다(끊기지 않았다)', () => {
    const checked = new Set(['2026-09-16', '2026-09-17'])
    expect(consecutiveStreak(checked, '2026-09-18')).toBe(2)
  })

  it('어제를 건너뛰면 끊긴다 — 그제는 세지 않는다', () => {
    const checked = new Set(['2026-09-16', '2026-09-18'])
    expect(consecutiveStreak(checked, '2026-09-18')).toBe(1)
  })

  it('달이 바뀌어도 이어서 센다', () => {
    const checked = new Set(['2026-08-30', '2026-08-31', '2026-09-01'])
    expect(consecutiveStreak(checked, '2026-09-01')).toBe(3)
  })

  it('거슬러 보는 범위를 넘겨 세지 않는다', () => {
    const today = '2026-09-18'
    const checked = new Set(Array.from({ length: STREAK_LOOKBACK_DAYS + 30 }, (_, i) => shiftKstDate(today, -i)))
    expect(consecutiveStreak(checked, today)).toBe(STREAK_LOOKBACK_DAYS)
  })
})
