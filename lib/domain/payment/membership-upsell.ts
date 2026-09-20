/**
 * 상단 바 이용권 팝업의 «멤버십 쪽 권유» — 순수 판정(서버·클라이언트 공용).
 *
 * 🔴 정기결제 중인 회원은 등급을 바로 바꿀 수 없다(서버가 새 구독 결제를 막고, 멤버십 탭이 «해지 후 변경»을 안내한다).
 *    그래서 회원에게는 «올리기»가 아니라 «살펴보기»라고 적는다 — 눌러서 막다른 길이 나오는 약속을 하지 않는다.
 * 🔴 숫자(장 수·가격)를 여기서 만들지 않는다. 정본은 membership_plans(DB)와 membership-benefits 다.
 */
import { firstMonthEligibilityLine } from '@/lib/domain/payment/membership-intro'
import {
  TIER_LABEL,
  isMembershipTier,
  tierUpsellLine,
  type MembershipTier,
  type TierFeature,
} from '@/lib/domain/payment/membership-tiers'

export const MEMBERSHIP_STORE_PATH = '/protected/store?tab=membership'
export const PASS_STORE_PATH = '/protected/store?tab=pass'

export interface MembershipUpsell {
  label: string
  note: string
  href: string
  /** GA 라벨 — start(비회원) · FAMILY · BUSINESS */
  target: 'start' | MembershipTier
}

const NEXT_STEP: Partial<Record<MembershipTier, { next: MembershipTier; feature: TierFeature }>> = {
  SINGLE: { next: 'FAMILY', feature: 'familyMap' },
  FAMILY: { next: 'BUSINESS', feature: 'togetherView' },
}

export function membershipUpsell(input: {
  tier: string | null
  isSubscribed: boolean
  firstMonthEligible: boolean
  unlimited: boolean
}): MembershipUpsell | null {
  if (input.unlimited) return null

  if (!input.isSubscribed) {
    return {
      label: '멤버십 시작하기',
      note: input.firstMonthEligible
        ? firstMonthEligibilityLine()
        : '멤버십은 매달 쓸 수 있는 이용권(이월 없음)과 등급별 기능을 엽니다.',
      href: MEMBERSHIP_STORE_PATH,
      target: 'start',
    }
  }

  const step = isMembershipTier(input.tier) ? NEXT_STEP[input.tier] : undefined
  if (!step) return null
  return {
    label: `${TIER_LABEL[step.next]} 등급 살펴보기`,
    note: `${tierUpsellLine(step.feature)}.`,
    href: MEMBERSHIP_STORE_PATH,
    target: step.next,
  }
}
