import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MembershipTabs } from '../membership-tabs'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/lib/analytics/ga4', () => ({ GA: { membershipCta: jest.fn() } }))

/**
 * 정기결제 중인 회원에게 다른 등급의 «지금 시작하기»를 보이면, 결제 화면까지 가서야 서버가
 * «이미 활성화된 구독»으로 막는다(F36). 구독 중에는 현재 등급 = «이용 중», 다른 등급 = «해지 후 변경» 안내.
 */

const plan = (tier: string, name: string, price: number) => ({
  id: `plan-${tier}`,
  name,
  tier,
  price,
  interval: 'MONTH',
  relationship_limit: 5,
  storage_limit: 20,
  monthly_passes: 5,
})
const PLANS = [plan('SINGLE', '싱글', 12800), plan('FAMILY', '패밀리', 29900), plan('BUSINESS', '비즈니스', 99000)]

describe('MembershipTabs — 구독 중 등급 업셀', () => {
  beforeEach(() => mockPush.mockReset())

  it('구독 중이 아니면 «지금 시작하기»가 결제 화면으로 보낸다', async () => {
    render(<MembershipTabs plans={PLANS} isGuest={false} />)
    await userEvent.click(screen.getByRole('button', { name: '지금 시작하기' }))
    expect(mockPush).toHaveBeenCalledWith('/protected/membership/checkout?plan=plan-FAMILY')
  })

  it('★ 정기결제 중이면 현재 등급 카드가 먼저 열리고 «이용 중»으로 보인다 — 시작 버튼이 없다', () => {
    render(<MembershipTabs plans={PLANS} isGuest={false} payingPlanId="plan-SINGLE" />)
    expect(screen.getByRole('tab', { name: '싱글' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('이용 중')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지금 시작하기' })).toBeNull()
  })

  it('★ 정기결제 중이면 다른 등급은 «해지 후 변경» 안내와 멤버십 관리 링크다 — 결제 화면으로 보내지 않는다', async () => {
    render(<MembershipTabs plans={PLANS} isGuest={false} payingPlanId="plan-SINGLE" />)
    await userEvent.click(screen.getByRole('tab', { name: '비즈니스' }))

    expect(screen.queryByRole('button', { name: '지금 시작하기' })).toBeNull()
    const link = screen.getByRole('link', { name: /해지 후 변경/ })
    expect(link).toHaveAttribute('href', '/protected/membership/manage')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('안내 문구에 금지어가 없다', async () => {
    const { container } = render(<MembershipTabs plans={PLANS} isGuest={false} payingPlanId="plan-SINGLE" />)
    await userEvent.click(screen.getByRole('tab', { name: '패밀리' }))
    expect(findBannedPassTerms(container.textContent ?? '')).toEqual([])
  })
})
