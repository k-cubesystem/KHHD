/**
 * 결제 도우미 표시 모델 — 순수 변환. 서버에서 한 번 계산해 클라이언트로 넘긴다.
 *
 * 🔴 가격·혜택 «숫자»는 이 파일이 만들지 않는다. 전부 기존 단일 출처에서 흘러들어온다:
 *   - 기능별 이용권 장 수 → lib/domain/payment/feature-costs.ts (FEATURE_COST)
 *   - 멤버십 가격·월 이용권 → membership_plans (DB, getMembershipPlans)
 *   - 이용권 팩           → price_plans · product_kind='pass' (DB, getActivePlans)
 *   - 등급별 기능          → lib/domain/payment/membership-benefits.ts (tierFeatureSummaryLine)
 *   - 등급이 있어야 쓰는 풀이 → lib/domain/payment/membership-tiers.ts (FEATURE_MIN_TIER)
 *   - 기록 보관 기간       → lib/auth/subscription.ts (FREE_RETENTION_DAYS)
 * 값이 바뀌면 안내 문구의 숫자도 저절로 따라간다. 여기서 숫자를 새로 쓰면 그 계약이 깨진다.
 *
 * 🔴 문구 사실관계(2026-09-18 복채 폐지):
 *   - 멤버십 결제는 아무것도 «지급»하지 않는다. monthly_passes 는 구독 월 창마다 쓸 수 있는 장 수이고
 *     이월되지 않는다(subscription_usage).
 *   - 멤버십 몫과 따로 산 이용권을 한 숫자로 더해 보이지 않는다.
 */

import { FEATURE_COST, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { PASS_VALID_DAYS, SHAMAN_QUESTIONS_PER_PASS } from '@/lib/domain/entitlement/pass'
import { PURCHASE_EXPIRE_DAYS } from '@/lib/domain/chat/entitlements'
import { intervalWords } from '@/lib/domain/payment/membership-benefits'
import { FEATURE_MIN_TIER, TIER_LABEL, type MembershipTier } from '@/lib/domain/payment/membership-tiers'

// 주기 표기는 멤버십 혜택 문구와 한 곳에서 나온다 — 여기선 다시 정의하지 않고 통과시킨다.
export { intervalWords }

/**
 * 기능의 «이름»만 여기서 정한다(장 수는 FEATURE_COST 소관).
 * satisfies 로 키 전체를 강제 — 기능이 늘면 컴파일이 깨져 라벨 누락을 막는다.
 * 선언 순서가 곧 표시 순서다.
 */
const FEATURE_LABEL = {
  saju: '사주 풀이',
  compatibility: '궁합',
  face: '관상',
  palm: '손금',
  fengshui: '풍수',
  wealth: '재물운 심층',
  samhap: '종합사주풀이',
  themeFortune: '인기테마운세',
  circleNarrative: '기운 처방전·그룹 AI 풀이',
  togetherNarrative: '둘·셋·넷 함께 보기',
  obangkiDraw: '오방기 (하루 무료분 뒤)',
  shamanQuestions: `속풀이 질문 ${SHAMAN_QUESTIONS_PER_PASS}문(${PURCHASE_EXPIRE_DAYS}일)`,
  imageGeneration: '이미지 생성',
  today: '오늘의 운세',
  newYear: '신년운세',
} as const satisfies Record<FeatureCostKey, string>

/**
 * 이용권만으로는 열리지 않는 풀이 — 서버 입구가 등급으로 먼저 막는다(app/actions/circle/narrative.ts KIND_META).
 * 🔴 안내표에 «2장»만 적으면 비회원·싱글이 이용권을 사서 쓸 수 있는 것처럼 읽힌다 → 최소 등급을 함께 싣는다.
 * 🔴 오방기는 신당 안에 있다 — 신당은 등급을 가리지 않는 멤버십 게이트(app/protected/shrine/layout.tsx)라
 *    가장 낮은 등급을 적는다. «싱글 멤버십부터» = 멤버십이면 누구나.
 */
const GUIDE_MIN_TIER: Partial<Record<FeatureCostKey, MembershipTier>> = {
  circleNarrative: FEATURE_MIN_TIER.familyMap,
  togetherNarrative: FEATURE_MIN_TIER.togetherView,
  obangkiDraw: 'SINGLE',
}

/** 플랜을 못 찾았을 때의 등급 표기(마스터 등 DB 플랜이 없는 경우). */
const TIER_FALLBACK_LABEL: Record<string, string> = {
  SINGLE: '싱글 멤버십',
  FAMILY: '패밀리 멤버십',
  BUSINESS: '비즈니스 멤버십',
  MASTER: '마스터',
  MEMBER: '멤버십',
}

export interface GuideFeature {
  key: FeatureCostKey
  label: string
  /** 이용권 장 수. 무료 기능은 0. */
  cost: number
  /** 이 풀이를 여는 최소 멤버십 등급 이름(«패밀리»). 이용권만 있으면 되는 풀이는 null. */
  minTierLabel: string | null
}

export interface GuidePlan {
  id: string
  tier: string
  name: string
  /** 원(KRW). */
  price: number
  interval: string
  /** 한 달(구독 시작일 앵커)마다 쓸 수 있는 이용권 장 수 — monthly_passes. 이월 없음. */
  monthlyPasses: number
  /** 등록 가능한 인연 수(가족·지인 각각). */
  relationshipLimit: number
}

export interface GuidePack {
  name: string
  /** 이용권 장 수. */
  passes: number
  /** 원(KRW). */
  price: number
  /** 유효기간(일) — 결제일로부터. */
  validDays: number
}

export interface GuideMembership {
  tier: string
  label: string
  /** 현재 등급에 해당하는 플랜. 마스터·미상 등급이면 null(숫자 문구를 지운다). */
  plan: GuidePlan | null
}

export interface PaymentGuideModel {
  /** 이용권을 쓰는 기능 — 선언 순서. */
  paidFeatures: GuideFeature[]
  /** 이용권 없이 쓰는 기능. */
  freeFeatures: GuideFeature[]
  /** 가장 저렴한 이용권 팩(«…부터» 표기용). 없으면 null. */
  entryPack: GuidePack | null
  /** 가장 저렴한 멤버십(«…부터» 표기용). 없으면 null. */
  entryPlan: GuidePlan | null
  /** 무료 사용자의 기록 보관 일수. */
  retentionDays: number
  /** 이용 중인 멤버십. 비회원이면 null → 안내 문구가 통째로 갈린다. */
  membership: GuideMembership | null
}

/** 표시 모델 입력 — DB 행에서 필요한 필드만(구조적 타입이라 서버 모듈을 끌어오지 않는다). */
export interface PlanInput {
  id: string
  name: string
  tier: string
  price: number
  interval: string
  monthly_passes: number
  relationship_limit: number
  is_active?: boolean
}

export interface PackInput {
  name: string
  credits: number
  price: number
  product_kind?: string
  valid_days?: number | null
  is_active?: boolean
}

export interface PaymentGuideInput {
  plans: readonly PlanInput[]
  packs: readonly PackInput[]
  retentionDays: number
  /** getCurrentUserMembership() 결과. 비회원이면 null. */
  membership: { tier: string; planId: string | null } | null
}

function toGuidePlan(p: PlanInput): GuidePlan {
  return {
    id: p.id,
    tier: p.tier,
    name: p.name,
    price: p.price,
    interval: p.interval,
    monthlyPasses: p.monthly_passes,
    relationshipLimit: p.relationship_limit,
  }
}

function resolveMembership(membership: PaymentGuideInput['membership'], plans: GuidePlan[]): GuideMembership | null {
  if (!membership) return null
  // planId 우선(정확), 없으면 등급으로 — 마스터처럼 플랜이 없는 경우 null 로 남겨 숫자 문구를 지운다.
  const plan =
    plans.find((p) => membership.planId !== null && p.id === membership.planId) ??
    plans.find((p) => p.tier === membership.tier) ??
    null
  return {
    tier: membership.tier,
    label: plan?.name ?? TIER_FALLBACK_LABEL[membership.tier] ?? '멤버십',
    plan,
  }
}

function allGuideFeatures(): GuideFeature[] {
  return (Object.keys(FEATURE_LABEL) as FeatureCostKey[]).map((key): GuideFeature => {
    const minTier = GUIDE_MIN_TIER[key]
    return {
      key,
      label: FEATURE_LABEL[key],
      cost: FEATURE_COST[key].display,
      minTierLabel: minTier ? TIER_LABEL[minTier] : null,
    }
  })
}

/**
 * 이용권의 «사용처» — 이용권을 쓰는 기능 전부와 장 수. 주문 확인 화면(심사 캡처)과 결제 도우미가 같은 목록을 본다.
 * 🔴 토스 충전업종 양식이 «사용처»를 묻는다 — 일부만 적으면 적지 않은 기능에 쓰이는 것이 고지 밖이 된다.
 */
export function passUsageFeatures(): GuideFeature[] {
  return allGuideFeatures().filter((f) => !FEATURE_COST[f.key].free)
}

/** 결제 도우미가 보여줄 값 일체를 단일 출처에서 조립한다. */
export function buildPaymentGuideModel({
  plans,
  packs,
  retentionDays,
  membership,
}: PaymentGuideInput): PaymentGuideModel {
  const features = allGuideFeatures()

  const activePlans = plans.filter((p) => p.is_active !== false).map(toGuidePlan)
  // 옛 복채 팩 행이 섞여 들어와도 이용권 팩만 본다(product_kind 가 없으면 이미 걸러진 목록으로 믿는다).
  const activePacks = packs.filter((p) => p.is_active !== false && (p.product_kind ?? 'pass') === 'pass')

  const entryPack = activePacks.reduce<PackInput | null>((min, p) => (!min || p.price < min.price ? p : min), null)
  const entryPlan = activePlans.reduce<GuidePlan | null>((min, p) => (!min || p.price < min.price ? p : min), null)

  return {
    paidFeatures: features.filter((f) => !FEATURE_COST[f.key].free),
    freeFeatures: features.filter((f) => FEATURE_COST[f.key].free),
    entryPack: entryPack
      ? {
          name: entryPack.name,
          passes: entryPack.credits,
          price: entryPack.price,
          validDays: entryPack.valid_days ?? PASS_VALID_DAYS,
        }
      : null,
    entryPlan,
    retentionDays,
    membership: resolveMembership(membership, activePlans),
  }
}
