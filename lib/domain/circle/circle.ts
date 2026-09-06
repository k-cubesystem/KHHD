/**
 * 무리(群) — 가족·직장·모임·직접 이름. 사람 한 명이 여러 무리에 들어간다.
 *
 * 🔴 가족 무리는 **가상**이다(PRD-energy-circle §12-7 기본안): `family_members.member_category='family'`
 *    에서 파생하고 행을 만들지 않는다. 그래서 기존 가족 화면은 한 줄도 바뀌지 않는다.
 *
 * 🔴 직장(work) 무리는 «판단 도구»가 아니라 «돌봄 도구»다(채용절차법 §9-2 승계). 숫자 점수를 그리지
 *    않고(scoreMode 'bands'), 상단 고지를 달며, 사람을 넣을 때 본인 동의를 받는다.
 */

export type CircleKind = 'family' | 'work' | 'friends' | 'custom'

/** 사용자가 만들 수 있는 종류 — 가족은 가상이라 만들지 않는다. */
export const CREATABLE_CIRCLE_KINDS: readonly Exclude<CircleKind, 'family'>[] = ['work', 'friends', 'custom']

/** 가족 무리의 고정 id — URL·액션에서 «행이 없는 무리»를 가리키는 값. */
export const FAMILY_CIRCLE_ID = 'family'

export interface CircleKindMeta {
  readonly label: string
  /** 만들기 화면의 한 줄. */
  readonly hint: string
  /** 'bands' 면 숫자 점수·순위를 어디에도 그리지 않는다. */
  readonly scoreMode: 'bands' | 'full'
  /** 사람을 넣을 때 본인 동의 체크가 필수인가. */
  readonly consentRequired: boolean
  /** 화면 머리에 고정으로 붙는 고지. null 이면 없음. */
  readonly notice: string | null
}

/** 직장 무리 상단 고지 — PLAN-popular-theme-fortune §9-4 강화 고지 그대로. */
export const WORK_NOTICE =
  '이 화면은 이미 함께 일하고 있는 사람과의 소통을 돕기 위한 것입니다. 채용·평가·인사 결정의 근거로 사용할 수 없습니다.'

/** 사람을 넣을 때 받는 동의 문구 — 목적·범위·삭제권을 한 문장에. */
export const CONSENT_TEXT =
  '이 사람에게 기운 지도에 올린다는 것을 알리고 동의를 받았습니다. 생년월일은 기운 지도 밖의 용도로 쓰지 않으며, 언제든 뺄 수 있습니다.'

export const CIRCLE_KIND_META: Record<CircleKind, CircleKindMeta> = {
  family: {
    label: '가족',
    hint: '등록된 가족이 그대로 한 무리입니다.',
    scoreMode: 'full',
    consentRequired: false,
    notice: null,
  },
  work: {
    label: '직장',
    hint: '이미 함께 일하는 사람들 — 누가 누구를 채우고, 팀이 무엇이 옅은지 봅니다.',
    scoreMode: 'bands',
    consentRequired: true,
    notice: WORK_NOTICE,
  },
  friends: {
    label: '모임',
    hint: '친구·동호회·스터디 — 같이 있으면 기운이 트이는 사람을 찾습니다.',
    scoreMode: 'full',
    consentRequired: false,
    notice: null,
  },
  custom: {
    label: '직접 이름',
    hint: '내가 이름 붙인 무리.',
    scoreMode: 'full',
    consentRequired: false,
    notice: null,
  },
}

export function isCircleKind(value: unknown): value is CircleKind {
  return value === 'family' || value === 'work' || value === 'friends' || value === 'custom'
}

export function isCreatableCircleKind(value: unknown): value is Exclude<CircleKind, 'family'> {
  return value === 'work' || value === 'friends' || value === 'custom'
}

/** 티어별 상한 — 화면은 이 수를 직접 쓰지 않고 «몇 개 더 만들 수 있는지»만 말한다(표시광고법 규율). */
export interface CircleLimits {
  readonly maxCircles: number
  readonly maxMembers: number
}

/**
 * PRD §12-2 기본안: SINGLE 1/10 · FAMILY 3/10 · BUSINESS 10/30.
 * MEMBER 는 tier 조회 실패 폴백(활성 구독은 맞는데 플랜 행을 못 읽은 경우) — 가장 낮은 유료 상한으로 본다.
 * MASTER 는 BUSINESS 와 같다(무제한이라는 말은 쓰지 않는다 — 숫자로 둔다).
 */
export const CIRCLE_LIMITS_BY_TIER: Record<string, CircleLimits> = {
  SINGLE: { maxCircles: 1, maxMembers: 10 },
  FAMILY: { maxCircles: 3, maxMembers: 10 },
  BUSINESS: { maxCircles: 10, maxMembers: 30 },
  MASTER: { maxCircles: 10, maxMembers: 30 },
  MEMBER: { maxCircles: 1, maxMembers: 10 },
}

export const NO_CIRCLE_LIMITS: CircleLimits = { maxCircles: 0, maxMembers: 0 }

/** 티어 문자열(ActiveMembership.tier) → 상한. 비회원(null)은 0. */
export function circleLimits(tier: string | null | undefined): CircleLimits {
  if (!tier) return NO_CIRCLE_LIMITS
  return CIRCLE_LIMITS_BY_TIER[tier.toUpperCase()] ?? CIRCLE_LIMITS_BY_TIER.MEMBER
}

/** 무리 상한에 걸렸을 때 다음 티어 — 업셀 문구가 «어느 티어가 여는지»만 말한다. */
export function nextTierForCircles(tier: string | null | undefined): 'SINGLE' | 'FAMILY' | 'BUSINESS' | null {
  const t = tier?.toUpperCase()
  if (!t) return 'SINGLE'
  if (t === 'SINGLE' || t === 'MEMBER') return 'FAMILY'
  if (t === 'FAMILY') return 'BUSINESS'
  return null
}

export const CIRCLE_NAME_MAX = 20

/** 이름 정리 — 앞뒤 공백 제거, 연속 공백 하나로. 비거나 상한을 넘으면 null. */
export function normalizeCircleName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim()
  if (name.length === 0 || name.length > CIRCLE_NAME_MAX) return null
  return name
}

/** 하루에 만들 수 있는 무리 수 — 대량 생성 차단(ARCH §7). */
export const CIRCLE_CREATE_DAILY_LIMIT = 5

export interface CircleSummary {
  id: string
  name: string
  kind: CircleKind
  memberCount: number
  createdAt: string | null
}
