/**
 * 운세 풀이 지시문의 «분석 기간» 글자 — 서울 달력으로 센다(2026-10-01).
 *
 * 전에는 서버(UTC)의 `getDay()`·`getDate()` 로 이번 주를 셌다. 서울 월요일 00~09시는 UTC 로 일요일이라
 * «이번 주»가 지난주(9/21~9/27)로 나갔고, 같은 시간대의 «오늘»도 어제 날짜로 찍혔다.
 * 어느 시간대에서 돌려도 같아야 한다: `TZ=UTC` · `TZ=PST8PDT` · 서울 기본값.
 */
import { fortunePeriodLabels } from '../period-labels'

const at = (iso: string) => new Date(iso)

describe('fortunePeriodLabels — 서울 달력', () => {
  it('평일 낮(2026-09-29 화)', () => {
    expect(fortunePeriodLabels(at('2026-09-29T10:00:00+09:00'))).toEqual({
      today: '2026년 9월 29일 화요일',
      week: '9월 28일 ~ 10월 4일',
      month: '2026년 9월',
    })
  })

  it('🔴 서울 월요일 00:30(UTC 일요일 15:30)은 이번 주가 9/28~10/4 다 — 지난주가 아니다', () => {
    expect(fortunePeriodLabels(at('2026-09-27T15:30:00Z'))).toEqual({
      today: '2026년 9월 28일 월요일',
      week: '9월 28일 ~ 10월 4일',
      month: '2026년 9월',
    })
  })

  it('서울 일요일 23:59(UTC 일요일 14:59)는 아직 지난 주(9/21~9/27)', () => {
    expect(fortunePeriodLabels(at('2026-09-27T14:59:00Z')).week).toBe('9월 21일 ~ 9월 27일')
    expect(fortunePeriodLabels(at('2026-09-27T14:59:00Z')).today).toBe('2026년 9월 27일 일요일')
  })

  it('월말 자정 넘김(UTC 9/30 15:30 = 서울 10/1 00:30)은 이번 달이 10월', () => {
    expect(fortunePeriodLabels(at('2026-09-30T15:30:00Z')).month).toBe('2026년 10월')
  })

  it('한 주가 해를 넘겨도 끊기지 않는다(2026-12-31 목 → 12/28~1/3)', () => {
    expect(fortunePeriodLabels(at('2026-12-31T12:00:00+09:00')).week).toBe('12월 28일 ~ 1월 3일')
  })
})
