import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SubscriptionActions } from '../subscription-actions'
import { MEMBER_WEEKLY_QUESTIONS } from '@/lib/domain/chat/entitlements'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import { FREE_RETENTION_DAYS, FREE_TIER_LIMITS, MEMBERSHIP_LOSS_LINES } from '@/lib/domain/payment/membership-benefits'

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('@/app/actions/payment/subscription', () => ({
  cancelSubscription: jest.fn(),
  reactivateSubscription: jest.fn(),
  changeBillingMethod: jest.fn(),
}))

/**
 * 해지 확인창의 «잃게 되는 혜택» — 해지를 말리는 자리라 없는 혜택이 한 줄만 섞여도 표시광고법 문제다.
 * 라이브에 0편인 «웹툰 멤버십 전용 회차»를 잃는다고 적고 있었다(배포 전 리뷰 잔여).
 */
describe('해지 확인창 — 잃는 것만 적는다', () => {
  it('★ 목록은 단일 출처(MEMBERSHIP_LOSS_LINES) 그대로다', async () => {
    render(<SubscriptionActions subscriptionId="sub-1" status="ACTIVE" periodEnd={null} />)
    await userEvent.click(screen.getByRole('button', { name: /구독 해지/ }))

    const dialog = screen.getByRole('alertdialog')
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual([...MEMBERSHIP_LOSS_LINES])
    expect(dialog.textContent).not.toContain('웹툰')
    expect(findBannedPassTerms(dialog.textContent ?? '')).toEqual([])
  })

  it('★ 아직 없는 혜택(웹툰 멤버십 회차)은 잃는 것이 아니다', () => {
    expect(MEMBERSHIP_LOSS_LINES.join(' ')).not.toContain('웹툰')
  })

  it('속풀이는 «입장»이 아니라 주간 몫을 잃는다 — 숫자는 정본에서 온다', () => {
    const counsel = MEMBERSHIP_LOSS_LINES.filter((line) => line.includes('속풀이'))
    expect(counsel).toHaveLength(1)
    expect(counsel[0]).toContain(`주 ${MEMBER_WEEKLY_QUESTIONS}문`)
    expect(counsel[0]).not.toContain('입장')
  })

  it('기록 보관은 무료 한도(열람 기간 · 개수)를 그대로 밝힌다', () => {
    const records = MEMBERSHIP_LOSS_LINES.find((line) => line.includes('기록 보관')) ?? ''
    expect(records).toContain(`${FREE_RETENTION_DAYS}일`)
    expect(records).toContain(`${FREE_TIER_LIMITS.storageLimit}개`)
  })

  it('과장·잔액형 어휘가 없다', () => {
    for (const line of MEMBERSHIP_LOSS_LINES) {
      expect(`${line} → ${findBannedPassTerms(line).join(',')}`).toBe(`${line} → `)
      expect(line).not.toMatch(/매일|무제한|평생|모두 이용|정액|지급/)
    }
  })
})
