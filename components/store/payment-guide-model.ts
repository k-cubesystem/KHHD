/**
 * 결제 도우미 표시 모델 — 순수 변환. 서버에서 한 번 계산해 클라이언트로 넘긴다.
 *
 * 🔴 가격·혜택 «숫자»는 이 파일이 만들지 않는다. 전부 기존 단일 출처에서 흘러들어온다:
 *   - 기능별 복채    → lib/domain/payment/feature-costs.ts (FEATURE_COST)
 *   - 멤버십 가격·혜택 → membership_plans (DB, getMembershipPlans)
 *   - 복채 충전 팩    → price_plans (DB, getActivePlans)
 *   - 이용권         → lib/domain/payment/vouchers.ts (VOUCHER_CATALOG)
 *   - 기록 보관 기간  → lib/auth/subscription.ts (FREE_RETENTION_DAYS)
 * 값이 바뀌면 안내 문구의 숫자도 저절로 따라간다. 여기서 숫자를 새로 쓰면 그 계약이 깨진다.
 *
 * 🔴 문구 사실관계(2026-08-12 코드 실측):
 *   - talismans_per_period = «결제 주기(월)마다» 지급되는 복채. 첫 결제 subscription.ts,
 *     갱신 api/cron/billing 두 곳이 유일한 지급 경로다.
 *   - daily_talisman_limit 은 «하루 사용 상한»이지 일일 지급이 아니다 → 안내에 쓰지 않는다.
 *   - 멤버십 회원도 풀이마다 복채를 낸다(deductTalisman 에 구독 우회 없음). «무제한» 금지.
 */

import { FEATURE_COST, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { VOUCHER_CATALOG } from '@/lib/domain/payment/vouchers'
import { intervalWords } from '@/lib/domain/payment/membership-benefits'

// 주기 표기는 멤버십 혜택 문구와 한 곳에서 나온다 — 여기선 다시 정의하지 않고 통과시킨다.
export { intervalWords }

/**
 * 기능의 «이름»만 여기서 정한다(가격은 FEATURE_COST 소관).
 * satisfies 로 키 전체를 강제 — 기능이 늘면 컴파일이 깨져 라벨 누락을 막는다.
 * 선언 순서가 곧 표시 순서다.
 */
const FEATURE_LABEL = {
  saju: '사주 풀이',
  compatibility: '궁합',
  face: '관상',
  palm: '손금',
  fengshui: '풍수',
  wealth: '재물운',
  samhap: '종합사주풀이',
  imageGeneration: '이미지 생성',
  today: '오늘의 운세',
  newYear: '신년운세',
} as const satisfies Record<FeatureCostKey, string>

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
  /** 복채(만냥). 무료 기능은 0. */
  cost: number
}

export interface GuidePlan {
  id: string
  tier: string
  name: string
  /** 원(KRW). */
  price: number
  interval: string
  /** 결제 주기마다 지급되는 복채(만냥) — talismans_per_period. */
  bokchaePerPeriod: number
  /** 등록 가능한 인연 수. */
  relationshipLimit: number
}

export interface GuidePack {
  name: string
  /** 복채(만냥). */
  credits: number
  bonusCredits: number
  /** 원(KRW). */
  price: number
}

export interface GuideChatPass {
  label: string
  priceBokchae: number
  durationHours: number
}

export interface GuideMembership {
  tier: string
  label: string
  /** 현재 등급에 해당하는 플랜. 마스터·미상 등급이면 null(숫자 문구를 지운다). */
  plan: GuidePlan | null
}

export interface PaymentGuideModel {
  /** 복채가 차감되는 기능 — 선언 순서. */
  paidFeatures: GuideFeature[]
  /** 복채 없이 쓰는 기능. */
  freeFeatures: GuideFeature[]
  /** 가장 저렴한 복채 팩(«…부터» 표기용). 없으면 null. */
  entryPack: GuidePack | null
  /** 가장 저렴한 멤버십(«…부터» 표기용). 없으면 null. */
  entryPlan: GuidePlan | null
  chatPass: GuideChatPass
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
  talismans_per_period: number
  relationship_limit: number
  is_active?: boolean
}

export interface PackInput {
  name: string
  credits: number
  price: number
  bonus_credits?: number
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
    bokchaePerPeriod: p.talismans_per_period,
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

/** 결제 도우미가 보여줄 값 일체를 단일 출처에서 조립한다. */
export function buildPaymentGuideModel({
  plans,
  packs,
  retentionDays,
  membership,
}: PaymentGuideInput): PaymentGuideModel {
  const features = (Object.keys(FEATURE_LABEL) as FeatureCostKey[]).map((key) => ({
    key,
    label: FEATURE_LABEL[key],
    cost: FEATURE_COST[key].display,
  }))

  const activePlans = plans.filter((p) => p.is_active !== false).map(toGuidePlan)
  const activePacks = packs.filter((p) => p.is_active !== false)

  const entryPack = activePacks.reduce<PackInput | null>((min, p) => (!min || p.price < min.price ? p : min), null)
  const entryPlan = activePlans.reduce<GuidePlan | null>((min, p) => (!min || p.price < min.price ? p : min), null)

  return {
    paidFeatures: features.filter((f) => !FEATURE_COST[f.key].free),
    freeFeatures: features.filter((f) => FEATURE_COST[f.key].free),
    entryPack: entryPack
      ? {
          name: entryPack.name,
          credits: entryPack.credits,
          bonusCredits: entryPack.bonus_credits ?? 0,
          price: entryPack.price,
        }
      : null,
    entryPlan,
    chatPass: {
      label: VOUCHER_CATALOG.CHAT_DAY_PASS.label,
      priceBokchae: VOUCHER_CATALOG.CHAT_DAY_PASS.priceBokchae,
      durationHours: VOUCHER_CATALOG.CHAT_DAY_PASS.durationHours,
    },
    retentionDays,
    membership: resolveMembership(membership, activePlans),
  }
}
