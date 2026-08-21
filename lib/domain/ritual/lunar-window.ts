/**
 * 초하루 의례 — 음력 창(窓) 판정 단일 출처.
 *
 * 설계: docs/designs/ritual-loop-traditional-rollout.md (결정 5A·T5·E1·E2)
 *
 *   [KST 오늘] ──▶ [음력 변환(lunar-javascript)] ──▶ [창 판정]
 *        │              │                              │
 *        ▼              ▼                              ▼
 *   UTC+9 고정      음월·윤달·일(1..30)          음력 1~3일 = 의례 창
 *   (DST 없음)      leap = month < 0            밖이면 D-day만 노출
 *
 * 서버 액션·크론·페이지가 전부 이 모듈만 사용한다 — 판정 이원화 금지.
 * lunar_month_seq: 2000년 음력 정월을 0으로 하는 음력 월 서수.
 * 윤달도 하나의 서수를 가지므로 연속 기록 판정은 seq + 1 비교로 끝난다
 * (문자열 "YYYY-MM" + 윤달 플래그만으로는 윤달 삽입 위치 때문에 인접성 판정 불가).
 */
import { Solar } from 'lunar-javascript'

export const RITUAL_WINDOW_DAYS = 3
export const RITUAL_PUSH_TOPIC = 'ritual'

/** 음력 월 서수 epoch — 2000년 음력 1월 = 0 */
const SEQ_EPOCH_YEAR = 2000
/** lunar-javascript 만세력 신뢰 범위 (lib/domain/shrine/lunar.ts 와 동일 기준) */
const LUNAR_YEAR_MIN = 1950
const LUNAR_YEAR_MAX = 2100

export type RitualWishCategory = 'PEACE' | 'WEALTH' | 'STUDY' | 'HEALTH' | 'CUSTOM'

export const RITUAL_WISH_CATEGORIES: Array<{ key: RitualWishCategory; label: string }> = [
  { key: 'PEACE', label: '식구들 무탈' },
  { key: 'WEALTH', label: '재물' },
  { key: 'STUDY', label: '학업' },
  { key: 'HEALTH', label: '건강' },
  { key: 'CUSTOM', label: '직접 적기' },
]

export const RITUAL_WISH_TEXT_MAX = 100

/** GA4 이벤트 이름 단일 출처 (BAEKIL_GA 패턴) */
export const RITUAL_GA = {
  enter: 'ritual_enter',
  cardView: 'member_card_view',
  pray: 'pray_tap',
  complete: 'ritual_complete',
  pushOptin: 'ritual_push_optin',
  familyInvite: 'family_invite_from_ritual',
} as const

export interface RitualWindow {
  /** 의례 창(음력 1~3일) 안인가 */
  inWindow: boolean
  /** 창 안일 때 1..3, 밖이면 null */
  dayInWindow: number | null
  /** 음력 "YYYY-MM" (윤달 여부는 isLeapMonth 로 별도) */
  ritualMonth: string
  isLeapMonth: boolean
  /** 2000년 음력 정월 = 0 기준 음력 월 서수 */
  lunarMonthSeq: number
  /** 오늘 이후 첫 초하루(양력, KST, YYYY-MM-DD). 창 안이면 다음 달 초하루. */
  nextFirstDay: string
  /** nextFirstDay 까지 남은 일수 (KST 달력일 기준) */
  daysUntilNext: number
  /** KST 오늘 날짜 YYYY-MM-DD */
  kstDate: string
  /** 이번 달 표기용: "구월 초하루" 처럼 쓸 한글 수사 월 이름 */
  monthLabel: string
}

const KOREAN_MONTH_NAMES = [
  '정월',
  '이월',
  '삼월',
  '사월',
  '오월',
  '유월',
  '칠월',
  '팔월',
  '구월',
  '시월',
  '동짓달',
  '섣달',
] as const

interface KstParts {
  y: number
  m: number
  d: number
}

/** UTC Date → KST(UTC+9, DST 없음) 달력 날짜. */
export function kstParts(now: Date): KstParts {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

interface LunarParts {
  year: number
  /** 1..12 (윤달 부호 제거) */
  month: number
  isLeap: boolean
  /** 1..30 */
  day: number
}

/** 양력(KST 달력일) → 음력. 범위 밖이면 null. */
export function toLunarParts(p: KstParts): LunarParts | null {
  if (p.y < LUNAR_YEAR_MIN || p.y > LUNAR_YEAR_MAX) return null
  try {
    const lunar = Solar.fromYmd(p.y, p.m, p.d).getLunar()
    const rawMonth = lunar.getMonth()
    return {
      year: lunar.getYear(),
      month: Math.abs(rawMonth),
      isLeap: rawMonth < 0,
      day: lunar.getDay(),
    }
  } catch {
    return null
  }
}

/**
 * 해당 음력 연도의 윤달 번호 (없으면 0).
 * lunar-javascript 의 LunarYear 는 타입 심에 없어 런타임 로드로 사용한다.
 * 로드 실패 시엔 그 해 12개월을 일 단위로 훑어 윤달을 찾는 결정론 폴백을 쓴다.
 */
const leapMonthCache = new Map<number, number>()

export function leapMonthOf(year: number): number {
  const cached = leapMonthCache.get(year)
  if (cached !== undefined) return cached

  let leap = 0
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const lj = require('lunar-javascript') as { LunarYear?: { fromYear(y: number): { getLeapMonth(): number } } }
  if (lj.LunarYear) {
    leap = lj.LunarYear.fromYear(year).getLeapMonth()
  } else {
    // 폴백: 음력 그 해 전체(양력 이듬해 3월 말까지)를 훑으며 month<0 탐지
    for (let dayOffset = 0; dayOffset < 400 && leap === 0; dayOffset += 15) {
      const base = Date.UTC(year, 0, 20)
      const probe = new Date(base + dayOffset * 86400000)
      const lp = toLunarParts({ y: probe.getUTCFullYear(), m: probe.getUTCMonth() + 1, d: probe.getUTCDate() })
      if (lp && lp.year === year && lp.isLeap) leap = lp.month
    }
  }
  leapMonthCache.set(year, leap)
  return leap
}

/**
 * 음력 (년, 월, 윤달) → 월 서수. 2000년 음력 정월 = 0.
 * 연속 기록 판정: 이번 달 seq === 지난 기록 seq + 1 이면 연속.
 */
export function lunarMonthSeq(year: number, month: number, isLeap: boolean): number {
  let seq = 0
  for (let y = SEQ_EPOCH_YEAR; y < year; y++) {
    seq += 12 + (leapMonthOf(y) > 0 ? 1 : 0)
  }
  const leap = leapMonthOf(year)
  let idx = month - 1
  if (leap > 0 && (month > leap || (month === leap && isLeap))) idx += 1
  return seq + idx
}

/** 오늘(포함하지 않음) 이후 첫 초하루의 양력 KST 날짜. 최대 40일 탐색. */
export function nextFirstDayAfter(p: KstParts): { date: string; days: number } {
  const base = Date.UTC(p.y, p.m - 1, p.d)
  for (let i = 1; i <= 40; i++) {
    const probe = new Date(base + i * 86400000)
    const parts: KstParts = { y: probe.getUTCFullYear(), m: probe.getUTCMonth() + 1, d: probe.getUTCDate() }
    const lp = toLunarParts(parts)
    if (lp && lp.day === 1) {
      return { date: `${parts.y}-${pad2(parts.m)}-${pad2(parts.d)}`, days: i }
    }
  }
  // 만세력 범위를 벗어난 경우 — 도달 불가에 가깝지만 조용히 죽지 않는다
  throw new Error(`ritual: next first lunar day not found after ${p.y}-${p.m}-${p.d}`)
}

/** 월 서수 → 음력 (년, 월, 윤달). lunarMonthSeq 의 역함수 — 장부 빈달 라벨용. */
export function seqToLunarMonth(seq: number): { year: number; month: number; isLeap: boolean } {
  let year = SEQ_EPOCH_YEAR
  let remaining = seq
  for (;;) {
    const monthsInYear = 12 + (leapMonthOf(year) > 0 ? 1 : 0)
    if (remaining < monthsInYear) break
    remaining -= monthsInYear
    year += 1
    if (year > LUNAR_YEAR_MAX) throw new Error(`ritual: seq ${seq} out of range`)
  }
  const leap = leapMonthOf(year)
  if (leap === 0) return { year, month: remaining + 1, isLeap: false }
  if (remaining + 1 <= leap) return { year, month: remaining + 1, isLeap: false }
  if (remaining + 1 === leap + 1) return { year, month: leap, isLeap: true }
  return { year, month: remaining, isLeap: false }
}

/** 월 서수 → "정월"·"윤유월" 표기 */
export function monthLabelOfSeq(seq: number): string {
  const m = seqToLunarMonth(seq)
  return `${m.isLeap ? '윤' : ''}${KOREAN_MONTH_NAMES[m.month - 1]}`
}

/**
 * 의례 창 판정 — 서버 액션·크론·페이지 공용 단일 진입점.
 * now 를 안 주면 현재 시각(서버) 기준. 클라이언트에서는 표시 목적으로만 쓸 것.
 */
export function getRitualWindow(now: Date = new Date()): RitualWindow {
  const p = kstParts(now)
  const lp = toLunarParts(p)
  if (!lp) {
    throw new Error(`ritual: lunar conversion out of range for ${p.y}-${p.m}-${p.d}`)
  }
  const inWindow = lp.day >= 1 && lp.day <= RITUAL_WINDOW_DAYS
  const next = nextFirstDayAfter(p)
  return {
    inWindow,
    dayInWindow: inWindow ? lp.day : null,
    ritualMonth: `${lp.year}-${pad2(lp.month)}`,
    isLeapMonth: lp.isLeap,
    lunarMonthSeq: lunarMonthSeq(lp.year, lp.month, lp.isLeap),
    nextFirstDay: next.date,
    daysUntilNext: next.days,
    kstDate: `${p.y}-${pad2(p.m)}-${pad2(p.d)}`,
    monthLabel: `${lp.isLeap ? '윤' : ''}${KOREAN_MONTH_NAMES[lp.month - 1]} 초하루`,
  }
}
