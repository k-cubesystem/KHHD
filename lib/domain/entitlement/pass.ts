/**
 * 이용권(pass) 단일 출처 — 순수 로직(서버·클라이언트 공용).
 *
 * 2026-09-18 복채(잔액) → 이용권 전환. 설계: TEAM_G_DESIGN/prd/PRD-voucher-system-v1.md
 *
 * 🔴 설계의 두 축 — 되돌리지 말 것.
 *  1. 잔액 칸이 없다. 이용권은 «발급 1건 = 행 1개»(entitlement_grants)로만 존재한다.
 *  2. 주머니를 섞지 않는다. 멤버십 이번 달 몫과 보유 이용권은 다른 표·다른 화면 줄이다.
 *     토스 심사가 «잔액형 재화»로 보는 가장 큰 근거가 «출처가 섞인 하나의 통»이다.
 *
 * 🔴 화면 문구에 금지어(BANNED_PASS_TERMS)를 쓰지 않는다 — 회귀 테스트가 강제한다.
 */

import { PURCHASE_QUESTIONS } from '@/lib/domain/chat/entitlements'

/** 구매한 이용권의 유효기간(일) — 결제일로부터. 토스 기준(1년 이내)보다 짧게 둔다. */
export const PASS_VALID_DAYS = 90

/** 가입 맛보기 — 평생 한 번. */
export const ONBOARDING_PASSES = 1
export const ONBOARDING_VALID_DAYS = 90

/** 친구 추천 — 추천한 사람·가입한 사람 각각. */
export const REFERRAL_PASSES = 1
export const REFERRAL_VALID_DAYS = 30

/** 복채 이관 환산 — 사주 1회였던 2만냥을 이용권 1장으로. 올림(이용자에게 불리해지지 않게). */
export const MIGRATION_MANYANG_PER_PASS = 2

/** 이용권 1장으로 여는 속풀이 질문 수(30일) — 질문권의 정본은 chat/entitlements. */
export const SHAMAN_QUESTIONS_PER_PASS = PURCHASE_QUESTIONS

/** 서버가 «이용권이 모자라다»고 알릴 때 쓰는 errorType. 화면의 안내 모달이 이 값으로 뜬다. */
export const NO_PASS_ERROR = 'NO_PASS' as const
export type PassErrorType = typeof NO_PASS_ERROR | 'CHARGE_FAILED'

export type PassSource = 'purchase' | 'onboarding' | 'referral' | 'migration' | 'admin' | 'reward'

export const PASS_SOURCE_LABEL: Record<PassSource, string> = {
  purchase: '구매한 이용권',
  onboarding: '가입 선물',
  referral: '친구 추천 선물',
  migration: '이전 보유분',
  admin: '운영 지급',
  reward: '보상',
}

export function isPassSource(value: unknown): value is PassSource {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PASS_SOURCE_LABEL, value)
}

/**
 * 화면 문구 금지어. 잔액형 재화로 읽히는 말 · 사실이 아닌 과장(표시광고법).
 * 🔴 식별자(변수·DB 열 이름)가 아니라 **사용자가 읽는 문구**에만 적용한다.
 */
export const BANNED_PASS_TERMS: readonly string[] = [
  '복채',
  '만냥',
  '충전',
  '포인트',
  '잔액',
  '적립',
  '환전',
  '영구',
  '만료 없이',
  '무제한',
  '평생 보관',
  '단일 통화',
  'Token',
]

/** 문구에 섞인 금지어 목록(없으면 빈 배열). */
export function findBannedPassTerms(text: string): string[] {
  return BANNED_PASS_TERMS.filter((term) => text.includes(term))
}

// ────────────────────────────────────────────────────────────
// 멤버십 월 창 — 구독 시작일에 앵커한 한 달
// ────────────────────────────────────────────────────────────

export interface PassWindow {
  startIso: string
  endIso: string
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/** 앵커 시각에서 k달 뒤 — 말일 앵커는 짧은 달의 말일로 붙인다(1/31 → 2/28 → 3/31). */
export function addMonthsAnchored(anchorMs: number, k: number): number {
  const a = new Date(anchorMs)
  const total = a.getUTCMonth() + k
  const year = a.getUTCFullYear() + Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const day = Math.min(a.getUTCDate(), daysInUtcMonth(year, month))
  return Date.UTC(year, month, day, a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds(), a.getUTCMilliseconds())
}

/**
 * 지금이 속한 멤버십 창 [start, end).
 *
 * 달력 1일 리셋을 쓰지 않는다 — 말일 가입자가 하루 만에 한 달치를 잃는다.
 * 구독 시작일에서 한 달씩 끊고, 구독이 끝나는 시각(periodEnd)을 넘지 않는다.
 * 구독이 이미 끝났으면 null.
 */
export function membershipWindow(periodStartMs: number, periodEndMs: number | null, nowMs: number): PassWindow | null {
  if (!Number.isFinite(periodStartMs)) return null
  if (periodEndMs !== null && Number.isFinite(periodEndMs) && nowMs >= periodEndMs) return null

  let k = 0
  if (nowMs > periodStartMs) {
    // 대략의 달 수에서 시작해 앞뒤로 맞춘다 — 루프가 길어질 일이 없다.
    const approx = Math.floor((nowMs - periodStartMs) / (31 * 86_400_000))
    k = Math.max(0, approx)
    while (addMonthsAnchored(periodStartMs, k + 1) <= nowMs) k += 1
    while (k > 0 && addMonthsAnchored(periodStartMs, k) > nowMs) k -= 1
  }

  const start = addMonthsAnchored(periodStartMs, k)
  let end = addMonthsAnchored(periodStartMs, k + 1)
  if (periodEndMs !== null && Number.isFinite(periodEndMs) && periodEndMs < end) end = periodEndMs
  if (end <= start) return null

  return { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString() }
}

/** 기한(일) → 만료 시각. validDays 가 null 이면 기한 없음. */
export function passExpiryFrom(nowMs: number, validDays: number | null): Date | null {
  if (validDays === null) return null
  return new Date(nowMs + validDays * 86_400_000)
}

/** 복채 잔액(만냥) → 이관 이용권 장수. 올림 — 1만냥짜리도 한 장이 된다. */
export function migrationPassCount(balanceManyang: number): number {
  if (!Number.isFinite(balanceManyang) || balanceManyang <= 0) return 0
  return Math.ceil(balanceManyang / MIGRATION_MANYANG_PER_PASS)
}

// ────────────────────────────────────────────────────────────
// 요약 — 화면이 읽는 모양. 🔴 주머니를 합친 «총 몇 장» 필드를 두지 않는다.
// ────────────────────────────────────────────────────────────

export interface MembershipPocket {
  /** 이번 달 받은 장수 */
  quota: number
  used: number
  remaining: number
  /** 다음에 다시 채워지는 시각(이번 창의 끝) ISO */
  resetsAt: string
}

export interface PassHolding {
  id: string
  source: PassSource
  remaining: number
  /** ISO. null = 기한 없음(이전 보유분) */
  expiresAt: string | null
}

export interface PassSummary {
  /** 관리자·검수 계정 — 이용권을 쓰지 않고 통과한다 */
  unlimited: boolean
  /** 멤버십 이번 달 몫. 비회원이면 null */
  membership: MembershipPocket | null
  /** 보유 이용권 — 만료가 가까운 순 */
  holdings: PassHolding[]
}

export const EMPTY_PASS_SUMMARY: PassSummary = { unlimited: false, membership: null, holdings: [] }

/** 보유 이용권(구매·선물·이전분) 장수. 멤버십 몫은 더하지 않는다. */
export function heldPassCount(summary: Pick<PassSummary, 'holdings'>): number {
  return summary.holdings.reduce((n, h) => n + Math.max(0, h.remaining), 0)
}

/**
 * 이 장수를 쓸 수 있는지 — 화면의 사전 판단용(버튼 문구·안내). 정본 판정은 서버(ent_consume)다.
 * 여러 주머니에서 나눠 쓰는 것은 허용되므로 «쓸 수 있는가»만 본다.
 */
export function canCoverUnits(summary: PassSummary, units: number): boolean {
  if (summary.unlimited) return true
  const member = summary.membership?.remaining ?? 0
  return member + heldPassCount(summary) >= units
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

/**
 * 주머니별 한 줄씩 — 머리글·상점·내 정보가 같은 문구를 쓴다.
 * 비었으면 빈 배열(화면이 «이용권이 없어요»를 스스로 고른다).
 */
export function passSummaryLines(summary: PassSummary): string[] {
  if (summary.unlimited) return ['관리자 계정 — 이용권 없이 이용']
  const lines: string[] = []
  if (summary.membership) {
    lines.push(
      `멤버십 이번 달 ${summary.membership.remaining}장 남음 (${shortDate(summary.membership.resetsAt)}에 다시 ${summary.membership.quota}장)`
    )
  }
  for (const h of summary.holdings) {
    if (h.remaining <= 0) continue
    const until = h.expiresAt ? `${shortDate(h.expiresAt)}까지` : '기한 없음'
    lines.push(`${PASS_SOURCE_LABEL[h.source]} ${h.remaining}장 (${until})`)
  }
  return lines
}

/** 머리글·짧은 자리용 한 마디. 멤버십이면 이번 달 몫을, 아니면 보유 장수를 보인다. */
export function passBadgeLabel(summary: PassSummary): string {
  if (summary.unlimited) return '이용권 관리자'
  if (summary.membership) return `이번 달 ${summary.membership.remaining}장`
  return `이용권 ${heldPassCount(summary)}장`
}

/** 이용권 N장 — 표기 통일. */
export function formatPassUnits(units: number): string {
  return `이용권 ${units}장`
}
