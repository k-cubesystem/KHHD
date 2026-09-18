/**
 * 출석 달력 계산 — KST 날짜 문자열("YYYY-MM-DD")만 다루는 순수 함수(서버·클라이언트 공용).
 *
 * 🔴 KST 날짜를 Date 의 로컬 시각 메서드(setDate·getDay)로 옮기지 않는다. 서버(UTC)에서
 *    `new Date('…T00:00:00+09:00')` 에 setDate 를 걸고 toISOString 으로 읽으면 하루가 밀려,
 *    연속 출석이 «어제»를 건너뛰고 그제부터 셌다. 날짜는 UTC 자정 기준 정수로만 더하고 뺀다.
 */

const DAY_MS = 86_400_000

/** 연속 출석을 셀 때 거슬러 보는 최대 일수 — 조회 한 번으로 끝나는 범위. */
export const STREAK_LOOKBACK_DAYS = 366

function toUtcMs(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** 날짜를 n일 옮긴다(음수면 과거). */
export function shiftKstDate(date: string, days: number): string {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10)
}

/** 그 날짜가 속한 주의 월요일. */
export function kstWeekStart(date: string): string {
  const dayOfWeek = new Date(toUtcMs(date)).getUTCDay()
  return shiftKstDate(date, dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
}

/** 그 날짜가 속한 달의 첫날·말일. */
export function kstMonthRange(date: string): { start: string; end: string } {
  const [year, month] = date.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const mm = String(month).padStart(2, '0')
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

/**
 * 오늘까지 이어진 연속 출석일. 오늘 아직 안 했으면 어제부터 센다(오늘 하면 이어진다).
 * STREAK_LOOKBACK_DAYS 를 넘겨 세지 않는다.
 */
export function consecutiveStreak(checked: ReadonlySet<string>, today: string): number {
  let cursor = checked.has(today) ? today : shiftKstDate(today, -1)
  let streak = 0
  while (streak < STREAK_LOOKBACK_DAYS && checked.has(cursor)) {
    streak += 1
    cursor = shiftKstDate(cursor, -1)
  }
  return streak
}
