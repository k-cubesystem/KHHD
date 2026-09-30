/**
 * 입춘(立春) 기준 «세운 연도».
 *
 * 연도가 둘이다. 섞으면 어긋난다:
 *  - 달력 연도(`kstYmd`) — 나이·월별 기록 키·«작년» 같은 생활 연도. 1월 1일 0시(서울)에 바뀐다.
 *  - 세운 연도(`seunYearAt`) — 명리의 해. 입춘 시각을 지나야 바뀐다. 삼재·세운은 이쪽이다.
 */
import { Solar } from 'lunar-javascript'
import { kstYmd } from '@/lib/domain/saju/kst-ymd'

/** lunar-javascript 의 절기 시각은 중국 표준시(UTC+8) 벽시계다. */
const CST_OFFSET_MS = 8 * 60 * 60 * 1000

/** 그 달력 연도의 입춘 시각(절대 시각). 2월 초라 서울·베이징 어느 쪽 달력으로 읽어도 같은 해다. */
export function ipchunInstant(year: number): Date {
  const term = Solar.fromYmdHms(year, 6, 15, 12, 0, 0).getLunar().getJieQiTable()['立春']
  if (!term) throw new Error(`입춘 시각을 찾지 못했습니다: ${year}`)
  return new Date(
    Date.UTC(term.getYear(), term.getMonth() - 1, term.getDay(), term.getHour(), term.getMinute(), term.getSecond()) -
      CST_OFFSET_MS
  )
}

/** 지금 적용 중인 세운의 해. 1월 1일~입춘 전에는 아직 전해다. */
export function seunYearAt(now: Date): number {
  const { year } = kstYmd(now)
  return now.getTime() >= ipchunInstant(year).getTime() ? year : year - 1
}
