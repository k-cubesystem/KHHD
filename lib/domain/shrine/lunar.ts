/**
 * 신당 「달 위상(月相)」 도메인 — KST 달력 날짜 → 달의 나이·조도·위상 키.
 *
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now() / 무인자 new Date() / Math.random() 금지.
 * 시각은 호출자가 KST 달력 날짜({y,m,d})로 주입한다(SSR·클라 결과 동일 = 하이드레이션 불일치 0).
 *
 * ── 음력 변환 경로 ──────────────────────────────────────────────
 * 앱의 만세력 엔진(lunar-javascript 1.7.7)을 **재사용**한다. 새 변환기를 만들지 않고
 * lib/domain/saju/saju.ts 가 이미 export 하는 `toLunar()` 를 그대로 호출한다(그 파일 무수정).
 * 사주·궁합·윤달 골든테스트가 쓰는 것과 같은 엔진이라 제품 안에서 음력 표기가 갈라지지 않는다.
 *
 * 엔진 지원 구간(MANSE_YEAR_RANGE) 밖이거나 변환이 실패하면 합삭 주기 근사(lunarPhaseApproximate)로
 * 물러난다 — 표시용 ±1일 정밀도. 두 경로 모두 항상 유효한 LunarPhaseInfo 를 돌려준다(throw 없음).
 */

import { toLunar } from '@/lib/domain/saju/saju'

// ─── 계약 타입 ────────────────────────────────────────────────

/** KST 달력 날짜. 양력 기준, m 은 1~12, d 는 1~31. */
export interface CalendarDate {
  y: number
  m: number
  d: number
}

export type MoonPhaseKey =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent'

export type LunarPhaseInfo = {
  /** 합삭(朔)으로부터 지난 일수. 0 이상 SYNODIC_MONTH_DAYS 미만. 합삭=0. */
  age: number
  /** 조도 0~1 (코사인 근사). 합삭 0 · 망 1. */
  illum: number
  /** 음력 일(1~30). 만세력 경로면 정확값, 근사 경로면 age 기반. */
  lunarDay: number
  /** 보름(음력 15일) ±1일 = 음력 14·15·16일. */
  isFullMoon: boolean
  phaseKey: MoonPhaseKey
}

// ─── 상수 (렌더·테스트 공용 단일 출처) ─────────────────────────

/** 평균 삭망월(synodic month) 길이. */
export const SYNODIC_MONTH_DAYS = 29.530588853

/**
 * 근사 경로의 기준 합삭 — 2000-01-06 18:14 UTC 의 율리우스일.
 * (표준 J2000 신월. 근사 경로에서만 쓰이고 만세력 경로에는 영향 없다.)
 */
const REFERENCE_NEW_MOON_JD = 2451550.259722

/** KST 자정(00:00)은 UTC 기준 전날 15:00 → JDN 에서 0.875일 뺀 지점. */
const KST_MIDNIGHT_JD_OFFSET = 0.875

/**
 * 만세력 엔진을 신뢰하는 연도 구간. 밖이면 근사로 내려간다.
 * lunar-javascript 는 이 밖에서도 답을 내지만 천문 계산 오차가 보증되지 않으므로 표시 품질을 근사와 맞춘다.
 */
export const MANSE_YEAR_RANGE = Object.freeze({ min: 1900, max: 2100 })

/** age 균등 8분할 순서 — 인덱스 0이 합삭. */
export const MOON_PHASE_KEYS: readonly MoonPhaseKey[] = Object.freeze([
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
] as const)

/** 보름 판정 폭 — 음력 15일 ±1일. */
const FULL_MOON_LUNAR_DAY = 15
const FULL_MOON_TOLERANCE_DAYS = 1

// ─── 날짜 산술 (Date 객체 없이 정수로만) ───────────────────────

/**
 * 원사용(proleptic) 그레고리력 날짜 → 율리우스 적일(JDN).
 * 존재하지 않는 날짜(2026-02-30 등)도 던지지 않고 넘겨받은 만큼 흘려 정규화된 값을 만든다.
 */
export function toDayNumber(date: CalendarDate): number {
  const y = Math.trunc(date.y)
  const m = Math.trunc(date.m)
  const d = Math.trunc(date.d)
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  )
}

/** 율리우스 적일(JDN) → 그레고리력 날짜. toDayNumber 의 역함수. */
export function fromDayNumber(dayNumber: number): CalendarDate {
  const a = Math.trunc(dayNumber) + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const dd = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * dd) / 4)
  const mm = Math.floor((5 * e + 2) / 153)
  return {
    y: 100 * b + dd - 4800 + Math.floor(mm / 10),
    m: mm + 3 - 12 * Math.floor(mm / 10),
    d: e - Math.floor((153 * mm + 2) / 5) + 1,
  }
}

/** 유한 정수 3개로 이뤄진 날짜인지. 달·일의 존재 여부는 보지 않는다(정규화가 처리). */
export function isFiniteDate(date: CalendarDate): boolean {
  return Number.isFinite(date.y) && Number.isFinite(date.m) && Number.isFinite(date.d)
}

/** 존재하지 않는 날짜를 실제 날짜로 흘려보낸다(2026-02-30 → 2026-03-02). */
export function normalizeDate(date: CalendarDate): CalendarDate {
  return fromDayNumber(toDayNumber(date))
}

// ─── 내부 유틸 ────────────────────────────────────────────────

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function pad4(n: number): string {
  return String(n).padStart(4, '0')
}

/** age → 8위상. 각 위상이 자기 순간(합삭·상현·망·하현)을 **중심**에 두는 균등 분할. */
function phaseKeyFromAge(age: number): MoonPhaseKey {
  const octant = Math.floor((age / SYNODIC_MONTH_DAYS) * 8 + 0.5)
  return MOON_PHASE_KEYS[((octant % 8) + 8) % 8]
}

/** 코사인 근사 조도. 합삭 0 · 망 1. */
function illumFromAge(age: number): number {
  const raw = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH_DAYS)) / 2
  return Math.min(1, Math.max(0, raw))
}

function buildInfo(age: number, lunarDay: number): LunarPhaseInfo {
  const wrapped = ((age % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS
  const day = Math.min(30, Math.max(1, Math.trunc(lunarDay)))
  return {
    age: round(wrapped, 4),
    illum: round(illumFromAge(wrapped), 4),
    lunarDay: day,
    isFullMoon: Math.abs(day - FULL_MOON_LUNAR_DAY) <= FULL_MOON_TOLERANCE_DAYS,
    phaseKey: phaseKeyFromAge(wrapped),
  }
}

// ─── 근사 경로 (만세력 밖 폴백) ────────────────────────────────

/**
 * 합삭 주기 근사로만 계산한 달 위상 — 만세력 지원 구간 밖의 폴백이자 교차검증용.
 * 기준 합삭 + 평균 삭망월 주기, KST 자정 기준. 표시용 정밀도(±1일)까지만 보증한다.
 */
export function lunarPhaseApproximate(date: CalendarDate): LunarPhaseInfo {
  if (!isFiniteDate(date)) return buildInfo(0, 1)
  const jd = toDayNumber(date) - KST_MIDNIGHT_JD_OFFSET
  const age = (((jd - REFERENCE_NEW_MOON_JD) % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS
  return buildInfo(age, Math.floor(age) + 1)
}

// ─── 만세력 경로 ──────────────────────────────────────────────

/** 만세력(lunar-javascript) 으로 양력 → 음력 일. 실패하면 null 을 돌려 폴백에 넘긴다. */
function manseLunarDay(date: CalendarDate): number | null {
  if (date.y < MANSE_YEAR_RANGE.min || date.y > MANSE_YEAR_RANGE.max) return null
  try {
    // 정오로 물어본다 — 음력 일은 시각에 영향받지 않지만(엔진 규약) 야자시 경계 논쟁을 아예 피한다.
    const lunar = toLunar(`${pad4(date.y)}-${pad2(date.m)}-${pad2(date.d)}`, '12:00', true)
    const day = lunar.getDay()
    return Number.isInteger(day) && day >= 1 && day <= 30 ? day : null
  } catch {
    return null
  }
}

/**
 * KST 달력 날짜의 달 위상.
 *
 * age 는 만세력 경로에서 `음력 일 - 1`(일 해상도)로 잡는다 — 합삭이 음력 1일에 드므로 age 0 = 합삭이고,
 * age·lunarDay·phaseKey 가 서로 어긋나지 않는다(isFullMoon 이면 phaseKey 는 반드시 'full').
 */
export function lunarPhase(date: CalendarDate): LunarPhaseInfo {
  if (!isFiniteDate(date)) return buildInfo(0, 1)
  const normalized = normalizeDate(date)
  const lunarDay = manseLunarDay(normalized)
  if (lunarDay === null) return lunarPhaseApproximate(normalized)
  return buildInfo(lunarDay - 1, lunarDay)
}
