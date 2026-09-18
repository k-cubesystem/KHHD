/**
 * 멤버십 혜택 문구 단일 출처 — 순수 변환(서버·클라이언트 공용).
 *
 * 🔴 숫자·주기를 이 파일이 «만들지» 않는다. 전부 membership_plans(DB) 행에서 흘러들어온다.
 *    화면이 숫자를 직접 쓰면 플랜을 고칠 때마다 문구가 어긋나므로, 표기는 여기로 모은다.
 *
 * 🔴 문구 사실관계(2026-09-18 이용권 전환 — 표시광고법·토스 심사):
 *  - monthly_passes = 한 달 창(구독 시작일 앵커)마다 **쓸 수 있는** 이용권 장 수다. 멤버십 결제·갱신은
 *    아무것도 지급하지 않고, 사용량 표(subscription_usage)로만 센다 → «지급»·«적립»으로 쓰지 않는다.
 *    남은 장은 다음 달로 넘어가지 않는다 → 「이월 없음」을 함께 적는다.
 *  - 일일 사용 상한(daily_talisman_limit)은 폐지됐다 → 한도 문구를 만들지 않는다.
 *  - 속풀이(구 고민상담) 질문 수의 정본은 lib/domain/chat/entitlements.ts:
 *    멤버십은 «구독 주기 기준 7일»마다 10문 · 명식 입력을 마치면 1문 · 광고 1문/방문 · 이용권 1장 = 10문(30일).
 *    → 회원 문구에 «무제한»·«매일»을 쓰면 사실과 다르다. 「주 10문」이라고만 적을 것.
 *  - 멤버십 회원도 풀이마다 이용권을 쓴다(이번 달 몫 → 보유 이용권 순). 관리자·검수 역할만 통과
 *    → «모두 이용»·«무제한» 금지.
 *  - storage_limit 은 보관 «개수» 상한이고, 초과분은 즐겨찾기가 아닌 오래된 기록부터 자동 삭제된다
 *    (app/actions/user/history.ts) → «평생 보관» 금지.
 *  - 등급 기능(가족 기운 지도·처방전 · 함께 보기)의 정본은 membership-tiers.ts 다.
 */

import { MEMBER_WEEKLY_QUESTIONS } from '@/lib/domain/chat/entitlements'
import {
  FEATURE_MIN_TIER,
  TIER_FEATURE_LABEL,
  TIER_LABEL,
  tierAllows,
  type TierFeature,
  topicParticle,
} from '@/lib/domain/payment/membership-tiers'

/** storage_limit 이 이 값이면 개수 제한 없음(기존 DB 관례 — 내부 값이다. 화면에 «무제한»이라 쓰지 않는다). */
export const UNLIMITED_STORAGE_LIMIT = 999

/**
 * 무료 사용자 기록 보관 기간(일). 이 기간 이전 기록은 삭제하지 않고 잠근다(멤버십 가입 시 복원).
 * 서버 판정(lib/auth/subscription.ts)과 화면 문구가 같은 값을 봐야 해서 순수 모듈인 여기에 둔다.
 */
export const FREE_RETENTION_DAYS = 30

/**
 * 멤버십이 없는 사용자의 한도 — app/actions/payment/membership.ts getUserTierLimits 가 돌려주는 값과
 * 같은 출처여야 한다(등급 비교표가 실제와 어긋나던 자리). 여기가 정본이고 그쪽이 이걸 읽는다.
 */
export const FREE_TIER_LIMITS = {
  relationshipLimit: 3,
  /** 보관 개수 5개(CEO 2026-08-15). 초과분은 즐겨찾기가 아닌 오래된 기록부터 자동 삭제. */
  storageLimit: 5,
} as const

/** 혜택 문구에 필요한 플랜 사실만 — 구조적 타입이라 서버 모듈을 끌어오지 않는다. */
export interface MembershipPlanFacts {
  /** 'MONTH' | 'YEAR' — 결제 주기. */
  interval: string
  /** 한 달에 쓸 수 있는 이용권 장 수(이월 없음). */
  monthlyPasses: number
  /** 등록 가능한 인연 수 — 가족·지인 갈래마다 각각. */
  relationshipLimit: number
  /** 보관 가능한 기록 개수. UNLIMITED_STORAGE_LIMIT 이면 개수 제한 없음. */
  storageLimit: number
  /** 등급(SINGLE·FAMILY·BUSINESS). 있으면 등급 기능 줄을 붙인다. */
  tier?: string | null
}

/** 결제 주기 표기 — «달마다 결제» / «월 12,800원». */
export function intervalWords(interval: string): { every: string; price: string } {
  return interval === 'YEAR' ? { every: '해', price: '연' } : { every: '달', price: '월' }
}

/**
 * 멤버십 이용권 — 「이용권 — 매달 5장 (이월 없음)」.
 * 지급이 아니라 «쓸 수 있는 몫»이다. 플랜을 모르면 장 수를 단정하지 않는다.
 */
export function monthlyPassLine(plan: MembershipPlanFacts | null): string {
  if (!plan) return '이용권 — 매달 등급별 장 수 (이월 없음)'
  return `이용권 — 매달 ${plan.monthlyPasses}장 (이월 없음)`
}

/**
 * 이용기간 — **결제 1건이 여는 기간**.
 *
 * 🔴 카드사 심사가 「결제시점부터 서비스 제공이 종료될 때까지의 최대 제공기간」을 묻고,
 *    그 값이 상품페이지에 **명확히 적혀 있을 것**을 요구한다(토스페이먼츠 판매정책).
 *    멤버십은 월 단위 자동결제라 1회 결제가 여는 기간은 1개월이고, 갱신은 새 결제다.
 *    상한(12개월)을 넘길 여지가 없다는 사실이 화면에 보여야 한다.
 */
export function servicePeriodLine(): string {
  return '이용기간 — 결제일로부터 1개월 · 매월 자동 갱신 · 언제든 해지 가능'
}

/**
 * 기록 보관 — 개수 상한이 실재하고 초과분은 자동 정리되므로 «평생»이라 쓰지 않는다.
 * 플랜을 모르면 개수를 단정하지 않는다(등급마다 다르다).
 */
export function recordKeepingLine(plan: MembershipPlanFacts | null): string {
  if (!plan) return '기록 보관 — 기간 제한 없이 (개수는 등급별)'
  if (plan.storageLimit === UNLIMITED_STORAGE_LIMIT) return '기록 보관 — 기간·개수 제한 없이'
  return `기록 보관 — 최대 ${plan.storageLimit}개 · 기간 제한 없이`
}

/** 인연 등록 — relationship_limit 은 **갈래마다** 적용된다(가족 N · 지인 N, 2026-08-16). */
export function relationshipLine(plan: MembershipPlanFacts | null): string {
  if (!plan) return '가족관리 — 인연 등록·궁합'
  // 🔴 «각»을 빼면 합산 한도로 읽힌다 — 표시와 실제가 어긋나는 순간 표시광고법 문제다.
  return `가족관리 — 가족·지인 각 ${plan.relationshipLimit}명 등록·궁합`
}

/** 신당 — 신위·테마는 등급별로 열린다(구매 경로 없음). 정본 required_tier. */
export function shrineLine(): string {
  return '신당 — 등급에 맞는 신위·테마 모시기'
}

/** 이 등급이 여는 기능 줄 — 「가족 기운 지도·처방전 이용」. 싱글이면 빈 배열. */
export function tierFeatureLines(tier: string | null | undefined): string[] {
  return (Object.keys(FEATURE_MIN_TIER) as TierFeature[])
    .filter((feature) => tierAllows(tier, feature))
    .map((feature) => `${TIER_FEATURE_LABEL[feature]} 이용`)
}

/** 주제 조사 은/는 — 라벨이 바뀌어도 받침에 맞게 붙는다. */
/** 등급을 모를 때의 기능 안내 한 줄 — 「가족 기운 지도·처방전은 패밀리부터 · 둘·셋·넷 함께 보기는 비즈니스부터」. */
export function tierFeatureSummaryLine(): string {
  return (Object.keys(FEATURE_MIN_TIER) as TierFeature[])
    .map((feature) => {
      const label = TIER_FEATURE_LABEL[feature]
      return `${label}${topicParticle(label)} ${TIER_LABEL[FEATURE_MIN_TIER[feature]]}부터`
    })
    .join(' · ')
}

/**
 * 멤버십이 «여는 것» 전체. 멤버십은 기능과 한 달 몫을 열고, 그 몫을 다 쓰면 이용권을 따로 산다.
 */
export function membershipBenefitLines(plan: MembershipPlanFacts | null): string[] {
  const featureLines = plan?.tier ? tierFeatureLines(plan.tier) : [tierFeatureSummaryLine()]
  return [
    monthlyPassLine(plan),
    shrineLine(),
    relationshipLine(plan),
    `속풀이 — 신령님께 주 ${MEMBER_WEEKLY_QUESTIONS}문 (다 쓰면 광고·이용권으로 이어가기)`,
    '웹툰 — 멤버십 전용 회차 열람',
    recordKeepingLine(plan),
    ...featureLines,
  ]
}

/**
 * 플랜 데이터가 없는 화면(게이트 업셀)의 공통 꼬리 문구.
 * 숫자·주기를 단정하지 않으므로 플랜이 바뀌어도 어긋나지 않는다.
 */
export const GENERIC_MEMBERSHIP_BENEFIT_LINES: readonly string[] = [
  '이용권 — 매달 등급별 장 수만큼 (이월 없음 · 풀이는 회원도 이용권으로 봅니다)',
  // 🔴 이 묶음에는 숫자를 넣지 않는다(회귀 테스트가 강제). 플랜·정책이 바뀌어도 어긋날 자리를 없앤다 —
  //    구체적 횟수가 필요한 화면은 entitlements 상수를 직접 인용해 자기 줄을 만든다.
  '속풀이 입장 · 웹툰 멤버십 회차 입장',
  '기록 보관 — 기간 제한 없이 (개수는 등급별)',
  tierFeatureSummaryLine(),
]

/** membership_plans 행(스네이크 케이스) → 혜택 문구용 사실. */
export function toPlanFacts(row: {
  interval: string
  monthly_passes: number
  relationship_limit: number
  storage_limit: number
  tier?: string | null
}): MembershipPlanFacts {
  return {
    interval: row.interval,
    monthlyPasses: row.monthly_passes,
    relationshipLimit: row.relationship_limit,
    storageLimit: row.storage_limit,
    tier: row.tier ?? null,
  }
}
