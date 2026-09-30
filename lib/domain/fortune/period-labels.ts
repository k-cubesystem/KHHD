/**
 * 운세 풀이 지시문에 실리는 «분석 기간» 글자 — 오늘·이번 주(월~일)·이번 달.
 *
 * 🔴 서울 달력으로 센다. 서버(UTC)의 달력·`getDay()` 로 세면 서울 월요일 00~09시가 일요일이라
 *    «이번 주»가 지난주로 나가고, 같은 시간대의 «오늘»도 어제 날짜로 찍힌다.
 */
import { kstYmd } from '@/lib/domain/saju/kst-ymd'

export interface FortunePeriodLabels {
  today: string
  week: string
  month: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function fortunePeriodLabels(now: Date): FortunePeriodLabels {
  const { year, month, day } = kstYmd(now)
  // 서울의 «오늘»을 UTC 자정 벽시계로 옮겨 두면 이후 계산·서식이 서버 시간대와 무관하다.
  const civil = Date.UTC(year, month - 1, day)
  const weekday = new Date(civil).getUTCDay()
  const monday = civil - (weekday === 0 ? 6 : weekday - 1) * DAY_MS
  const sunday = monday + 6 * DAY_MS

  const fmt = (ms: number, options: Intl.DateTimeFormatOptions) =>
    new Date(ms).toLocaleDateString('ko-KR', { ...options, timeZone: 'UTC' })
  const monthDay: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }

  return {
    today: fmt(civil, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    week: `${fmt(monday, monthDay)} ~ ${fmt(sunday, monthDay)}`,
    month: fmt(civil, { year: 'numeric', month: 'long' }),
  }
}
