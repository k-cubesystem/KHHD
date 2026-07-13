/**
 * 달력 유형(양력/음력) 판정 단일 유틸
 *
 * DB의 calendar_type은 'solar' | 'lunar' | null이 혼재한다.
 * null/미상은 양력으로 간주한다 — 'solar'와의 동등 비교(=== 'solar')는
 * null을 음력으로 오판하므로 반드시 이 함수를 사용한다.
 */
export function isSolarCalendar(calendarType: string | null | undefined): boolean {
  return calendarType !== 'lunar'
}
