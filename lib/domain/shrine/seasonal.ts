/**
 * 신당 「절기·명절」 도메인 — KST 달력 날짜 → 지금 열려 있는 절기 이벤트.
 *
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now() / 무인자 new Date() / Math.random() 금지.
 * 시각은 호출자가 KST 달력 날짜({y,m,d})로 주입한다(SSR·클라 결과 동일).
 *
 * ── 산출 근거 ───────────────────────────────────────────────────
 * · 설(음 1/1) · 정월대보름(음 1/15) · 단오(음 5/5) · 추석(음 8/15)
 *   → 앱의 만세력 엔진(lunar-javascript 1.7.7)으로 **음력→양력 역변환**해서 얻는다.
 *     lib/domain/saju/saju.ts 의 export 된 toLunar(isSolar=false) 를 그대로 쓴다(그 파일 무수정).
 * · 동지 → 같은 엔진의 24절기표에서 `DONG_ZHI`(당해 12월 동지) 를 읽는다.
 *   ⚠️ 엔진의 절기 시각은 **중국 표준시(UTC+8)** 다. KST(UTC+9)는 +1시간 →
 *     CST 23시대에 든 동지는 KST 로 **다음 날**이다(2025 동지: CST 12/21 23:03 = KST 12/22).
 *     이 보정이 빠지면 2025 같은 해에 동지가 하루 앞당겨진다.
 *
 * 미래 연도 하드코딩 표는 두지 않는다 — 엔진이 연도별로 계산하므로 표 만료가 없다.
 * 대신 엔진 신뢰 구간(MANSE_YEAR_RANGE, 1900~2100) 밖 입력은 null 로 막는다.
 */

import { toLunar } from '@/lib/domain/saju/saju'
import { fromDayNumber, isFiniteDate, normalizeDate, toDayNumber, MANSE_YEAR_RANGE, type CalendarDate } from './lunar'

// ─── 계약 타입 ────────────────────────────────────────────────

export type SeasonalEventKey = 'seol' | 'daeboreum' | 'dano' | 'chuseok' | 'dongji'

export type SeasonalEventInfo = {
  key: SeasonalEventKey
  label: string
  /** 노출 창 첫날(KST) = 명절 당일 -1일 */
  start: CalendarDate
  /** 노출 창 마지막날(KST) = 명절 당일 +1일 */
  end: CalendarDate
}

export type SeasonalEvent = SeasonalEventInfo | null

// ─── 상수 (렌더·테스트 공용 단일 출처) ─────────────────────────

/** 명절 당일 앞뒤 노출 폭(일). 총 노출 = 3일. */
export const SEASONAL_WINDOW_DAYS = 1

/** 입력 날짜 기준 이 일수 밖의 이벤트는 아예 판정하지 않는다(탐색 범위 가드). */
export const SEASONAL_SCAN_DAYS = 60

/**
 * 5대 절기가 양력에서 들 수 있는 최이른/최늦은 날(1900~2100 전수 확인).
 * 설이 가장 이르고(1/21) 동지가 가장 늦다(12/23) → 노출 창(±1일)까지 합쳐도 1/20 ~ 12/24 로 그 해 안에 갇힌다.
 * 그래서 activeSeasonal 은 **입력 연도 하나만** 훑으면 되고, 전년·다음해를 볼 필요가 없다.
 * (연도를 3개 훑으면 만세력 엔진의 연도 캐시가 매번 깨져 판정이 한 자릿수 배 느려진다.)
 */
export const SEASONAL_SOLAR_BOUNDS = Object.freeze({
  earliest: Object.freeze({ month: 1, day: 21 }),
  latest: Object.freeze({ month: 12, day: 23 }),
})

/** 판정 순서 = 결정론 보장용 고정 순서. 창(3일)이 서로 겹치지 않아 실제 충돌은 없다. */
export const SEASONAL_EVENT_KEYS: readonly SeasonalEventKey[] = Object.freeze([
  'seol',
  'daeboreum',
  'dano',
  'chuseok',
  'dongji',
] as const)

export const SEASONAL_LABELS: Readonly<Record<SeasonalEventKey, string>> = Object.freeze({
  seol: '설날',
  daeboreum: '정월대보름',
  dano: '단오',
  chuseok: '추석',
  dongji: '동지',
})

/** 음력 고정일 명절. 윤달은 명절이 아니므로 평달(isLeapMonth=false)로만 뽑는다. */
const LUNAR_EVENTS: Readonly<Record<Exclude<SeasonalEventKey, 'dongji'>, { month: number; day: number }>> =
  Object.freeze({
    seol: { month: 1, day: 1 },
    daeboreum: { month: 1, day: 15 },
    dano: { month: 5, day: 5 },
    chuseok: { month: 8, day: 15 },
  })

/** 24절기표에서 당해 12월 동지를 가리키는 키(한자 '冬至' 키는 전년도분 — manse.ts 와 같은 규약). */
const DONG_ZHI_KEY = 'DONG_ZHI'

/** 엔진 절기 시각(중국 표준시)이 이 시(時) 이상이면 KST(+1h) 로는 다음 날이다. */
const CST_TO_KST_ROLLOVER_HOUR = 23

/** 절기표를 뽑을 때 쓰는 기준일 — 연중(6/15)이라야 그 양력 연도의 24절기가 모두 담긴다(manse.ts 와 동일). */
const JIEQI_PROBE_MONTH_DAY = '06-15'

// ─── 내부 유틸 ────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function pad4(n: number): string {
  return String(n).padStart(4, '0')
}

function inSupportedRange(year: number): boolean {
  return year >= MANSE_YEAR_RANGE.min && year <= MANSE_YEAR_RANGE.max
}

/** 음력(평달) y/m/d → 양력 KST 날짜. 없는 날짜·엔진 실패는 null. */
function lunarToSolar(year: number, month: number, day: number): CalendarDate | null {
  try {
    const solar = toLunar(`${pad4(year)}-${pad2(month)}-${pad2(day)}`, '12:00', false, false).getSolar()
    const converted = { y: solar.getYear(), m: solar.getMonth(), d: solar.getDay() }
    return isFiniteDate(converted) ? converted : null
  } catch {
    return null
  }
}

/** 그 양력 연도 12월의 동지(KST 날짜). 엔진 값(중국 표준시)에 +1시간 보정을 적용한다. */
function dongjiSolarDate(year: number): CalendarDate | null {
  try {
    const table = toLunar(`${pad4(year)}-${JIEQI_PROBE_MONTH_DAY}`, '12:00', true).getJieQiTable()
    const dongji = table[DONG_ZHI_KEY]
    if (!dongji || dongji.getYear() !== year) return null
    const cstDate = { y: dongji.getYear(), m: dongji.getMonth(), d: dongji.getDay() }
    if (!isFiniteDate(cstDate)) return null
    const rollsOver = dongji.getHour() >= CST_TO_KST_ROLLOVER_HOUR
    return rollsOver ? fromDayNumber(toDayNumber(cstDate) + 1) : cstDate
  } catch {
    return null
  }
}

// ─── 공개 API ─────────────────────────────────────────────────

/**
 * 그 연도의 절기 이벤트 당일(양력 KST).
 * 음력 명절은 음력 연도 == 그 명절이 드는 양력 연도라 인자는 언제나 양력 연도로 읽어도 된다
 * (음 1/1 은 양력 1/21~2/21 사이에만 든다).
 * 지원 구간 밖이거나 엔진 실패면 null.
 */
export function seasonalSolarDate(key: SeasonalEventKey, year: number): CalendarDate | null {
  if (!Number.isFinite(year) || !inSupportedRange(year)) return null
  if (key === 'dongji') return dongjiSolarDate(year)
  const spec = LUNAR_EVENTS[key]
  return lunarToSolar(year, spec.month, spec.day)
}

/**
 * 그 KST 날짜에 열려 있는 절기 이벤트. 없으면 null.
 * 노출 창 = 명절 당일 ±SEASONAL_WINDOW_DAYS(총 3일). 입력 ±SEASONAL_SCAN_DAYS 밖 이벤트는 보지 않는다.
 * 판정 대상은 입력 연도의 5절기뿐 — 근거는 SEASONAL_SOLAR_BOUNDS 주석.
 */
export function activeSeasonal(date: CalendarDate): SeasonalEvent {
  if (!isFiniteDate(date)) return null
  const today = normalizeDate(date)
  if (!inSupportedRange(today.y)) return null
  const todayNumber = toDayNumber(today)

  for (const key of SEASONAL_EVENT_KEYS) {
    const eventDate = seasonalSolarDate(key, today.y)
    if (!eventDate) continue
    const eventNumber = toDayNumber(eventDate)
    const distance = Math.abs(eventNumber - todayNumber)
    // 두 관문은 뜻이 다르다 — 스캔 범위는 "판정 대상인가", 노출 창은 "지금 열려 있는가".
    if (distance > SEASONAL_SCAN_DAYS) continue
    if (distance > SEASONAL_WINDOW_DAYS) continue
    return {
      key,
      label: SEASONAL_LABELS[key],
      start: fromDayNumber(eventNumber - SEASONAL_WINDOW_DAYS),
      end: fromDayNumber(eventNumber + SEASONAL_WINDOW_DAYS),
    }
  }
  return null
}
