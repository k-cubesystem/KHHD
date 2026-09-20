import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import { firstMonthEligibilityLine } from '@/lib/domain/payment/membership-intro'
import { planDisplayName } from '@/lib/domain/payment/membership-tiers'
import { MEMBERSHIP_STORE_PATH, membershipUpsell } from '@/lib/domain/payment/membership-upsell'

const base = { tier: null, isSubscribed: false, firstMonthEligible: false, unlimited: false }

describe('membershipUpsell — 상단 바 이용권 팝업의 멤버십 권유', () => {
  it('비회원 + 첫 달 할인 대상이면 할인 자격 문구(단일 출처)를 그대로 쓴다', () => {
    const upsell = membershipUpsell({ ...base, firstMonthEligible: true })
    expect(upsell).toEqual({
      label: '멤버십 시작하기',
      note: firstMonthEligibilityLine(),
      href: MEMBERSHIP_STORE_PATH,
      target: 'start',
    })
  })

  it('비회원인데 할인 대상이 아니면 할인을 약속하지 않는다', () => {
    const upsell = membershipUpsell(base)
    expect(upsell?.label).toBe('멤버십 시작하기')
    expect(upsell?.note).not.toContain('할인')
    expect(upsell?.note).toContain('이월 없음')
  })

  it.each([
    ['SINGLE', '패밀리 등급 살펴보기', '가족 기운 지도·처방전은 패밀리 멤버십부터 쓸 수 있어요.', 'FAMILY'],
    ['FAMILY', '비즈니스 등급 살펴보기', '둘·셋·넷 함께 보기는 비즈니스 멤버십부터 쓸 수 있어요.', 'BUSINESS'],
  ])('%s 회원에게는 바로 위 등급을 «살펴보기»로 권한다', (tier, label, note, target) => {
    expect(membershipUpsell({ ...base, tier, isSubscribed: true })).toEqual({
      label,
      note,
      href: MEMBERSHIP_STORE_PATH,
      target,
    })
  })

  it('🔴 회원에게 «올리기·업그레이드»를 약속하지 않는다 — 정기결제 중에는 등급을 바로 바꿀 수 없다', () => {
    for (const tier of ['SINGLE', 'FAMILY']) {
      const label = membershipUpsell({ ...base, tier, isSubscribed: true })?.label ?? ''
      expect(label).not.toMatch(/올리기|업그레이드|변경/)
    }
  })

  it.each(['BUSINESS', 'MASTER', 'MEMBER', null])('%s 회원에게는 권할 윗 등급이 없다', (tier) => {
    expect(membershipUpsell({ ...base, tier, isSubscribed: true })).toBeNull()
  })

  it('관리자·검수 계정에는 아무것도 권하지 않는다', () => {
    expect(membershipUpsell({ ...base, unlimited: true })).toBeNull()
  })

  it('권유 문구에 금지어가 없다', () => {
    const cases = [
      membershipUpsell(base),
      membershipUpsell({ ...base, firstMonthEligible: true }),
      membershipUpsell({ ...base, tier: 'SINGLE', isSubscribed: true }),
      membershipUpsell({ ...base, tier: 'FAMILY', isSubscribed: true }),
    ]
    for (const upsell of cases) {
      expect(findBannedPassTerms(`${upsell?.label} ${upsell?.note}`)).toEqual([])
    }
  })
})

describe('planDisplayName — 등급 표시명', () => {
  it.each([
    [null, '무료 회원'],
    [{ is_subscribed: false, tier: 'FAMILY' }, '무료 회원'],
    [{ is_subscribed: true, tier: 'SINGLE' }, '싱글 멤버십'],
    [{ is_subscribed: true, tier: 'FAMILY' }, '패밀리 멤버십'],
    [{ is_subscribed: true, tier: 'BUSINESS' }, '비즈니스 멤버십'],
    [{ is_subscribed: true, tier: 'MASTER' }, '관리자'],
    [{ is_subscribed: true, tier: 'TESTER' }, '테스터'],
    [{ is_subscribed: true, tier: null }, '멤버십 회원'],
  ])('%j → %s', (limits, expected) => {
    expect(planDisplayName(limits)).toBe(expected)
  })
})
