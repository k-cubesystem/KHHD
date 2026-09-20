import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PassQuickView } from '@/components/payment/pass-quick-view'
import { getMyPassOverview, type PassOverview } from '@/app/actions/payment/passes'
import { trackEvent } from '@/lib/analytics/ga4'
import { EMPTY_PASS_SUMMARY, findBannedPassTerms, type PassSummary } from '@/lib/domain/entitlement/pass'

jest.mock('@/app/actions/payment/passes', () => ({ getMyPassOverview: jest.fn() }))
jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))

const mockOverview = jest.mocked(getMyPassOverview)

const HELD: PassSummary = {
  unlimited: false,
  membership: null,
  holdings: [{ id: 'g1', source: 'purchase', remaining: 3, expiresAt: '2026-12-18T00:00:00.000Z' }],
}

const MEMBER: PassSummary = {
  unlimited: false,
  membership: { quota: 5, used: 3, remaining: 2, resetsAt: '2026-10-19T00:00:00.000Z', renews: true },
  holdings: [{ id: 'g2', source: 'onboarding', remaining: 1, expiresAt: '2026-12-01T00:00:00.000Z' }],
}

function overview(partial: Partial<PassOverview>): PassOverview {
  return {
    passes: EMPTY_PASS_SUMMARY,
    tier: null,
    planName: '무료 회원',
    isSubscribed: false,
    firstMonthEligible: false,
    ...partial,
  }
}

const open = () => fireEvent.click(screen.getByLabelText('내 이용권 보기'))

describe('상단 바 「내 이용권」 팝업', () => {
  beforeEach(() => {
    mockOverview.mockReset()
    jest.mocked(trackEvent).mockClear()
  })

  it('누르기 전에는 아무것도 읽지 않는다 — 상단 바는 전 화면에 있다', () => {
    render(<PassQuickView />)
    expect(mockOverview).not.toHaveBeenCalled()
  })

  it('비회원 — 보유 장 수·등급·이용권 구매·멤버십 시작(첫 달 할인 자격) 을 보인다', async () => {
    mockOverview.mockResolvedValue(overview({ passes: HELD, firstMonthEligible: true }))
    render(<PassQuickView />)
    open()

    expect(await screen.findByText('이용권 3장')).not.toBeNull()
    expect(screen.getByText('무료 회원')).not.toBeNull()
    expect(screen.getByText(/구매한 이용권 3장/)).not.toBeNull()
    expect(screen.getByText('이용권 구매하기').closest('a')?.getAttribute('href')).toBe('/protected/store?tab=pass')
    expect(screen.getByText('멤버십 시작하기').closest('a')?.getAttribute('href')).toBe(
      '/protected/store?tab=membership'
    )
    expect(screen.getByText(/첫 달 요금을 50% 할인/)).not.toBeNull()
    expect(screen.queryByText('결제 · 구독 관리')).toBeNull()
  })

  it('🔴 회원 — 이번 달 몫과 보유 이용권을 따로 적고 합친 숫자를 만들지 않는다', async () => {
    mockOverview.mockResolvedValue(
      overview({ passes: MEMBER, tier: 'SINGLE', planName: '싱글 멤버십', isSubscribed: true })
    )
    render(<PassQuickView />)
    open()

    expect(await screen.findByText('이번 달 2장')).not.toBeNull()
    expect(screen.getByText(/멤버십 이번 달 2장 남음/)).not.toBeNull()
    expect(screen.getByText(/가입 선물 1장/)).not.toBeNull()
    expect(screen.queryByText(/3장/)).toBeNull()
    expect(screen.getByText('싱글 멤버십')).not.toBeNull()
    expect(screen.getByText('패밀리 등급 살펴보기')).not.toBeNull()
    expect(screen.getByText('결제 · 구독 관리').closest('a')?.getAttribute('href')).toBe('/protected/membership/manage')
  })

  it('이용권이 하나도 없으면 없다고 말하고 구매 문을 연다', async () => {
    mockOverview.mockResolvedValue(overview({}))
    render(<PassQuickView />)
    open()

    expect(await screen.findByText('지금 쓸 수 있는 이용권이 없어요.')).not.toBeNull()
    expect(screen.getByText('이용권 0장')).not.toBeNull()
    expect(screen.getByText('이용권 구매하기')).not.toBeNull()
  })

  it('비즈니스 회원에게는 윗 등급 권유가 없다', async () => {
    mockOverview.mockResolvedValue(
      overview({ passes: MEMBER, tier: 'BUSINESS', planName: '비즈니스 멤버십', isSubscribed: true })
    )
    render(<PassQuickView />)
    open()

    await screen.findByText('비즈니스 멤버십')
    expect(screen.queryByText(/등급 살펴보기|멤버십 시작하기/)).toBeNull()
    expect(screen.getByText('이용권 구매하기')).not.toBeNull()
  })

  it('관리자·검수 계정에는 구매·권유 버튼을 보이지 않는다', async () => {
    mockOverview.mockResolvedValue(
      overview({
        passes: { ...EMPTY_PASS_SUMMARY, unlimited: true },
        tier: 'MASTER',
        planName: '관리자',
        isSubscribed: true,
      })
    )
    render(<PassQuickView />)
    open()

    expect(await screen.findByText('이용권 관리자')).not.toBeNull()
    expect(screen.queryByText('이용권 구매하기')).toBeNull()
    expect(screen.queryByText(/등급 살펴보기|멤버십 시작하기/)).toBeNull()
  })

  it('🔴 열 때마다 다시 읽는다 — 풀이를 보고 오면 장 수가 바뀌어 있다', async () => {
    mockOverview.mockResolvedValueOnce(overview({ passes: HELD }))
    mockOverview.mockResolvedValueOnce(
      overview({ passes: { ...HELD, holdings: [{ ...HELD.holdings[0]!, remaining: 2 }] } })
    )
    render(<PassQuickView />)

    open()
    expect(await screen.findByText('이용권 3장')).not.toBeNull()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('이용권 3장')).toBeNull())

    open()
    expect(await screen.findByText('이용권 2장')).not.toBeNull()
    expect(mockOverview).toHaveBeenCalledTimes(2)
  })

  it('비로그인이면 로그인 안내, 조회 실패면 실패 안내', async () => {
    mockOverview.mockResolvedValueOnce(null)
    const { unmount } = render(<PassQuickView />)
    open()
    expect(await screen.findByText('로그인이 필요합니다.')).not.toBeNull()
    unmount()

    mockOverview.mockRejectedValueOnce(new Error('boom'))
    render(<PassQuickView />)
    open()
    expect(await screen.findByText(/이용권을 불러오지 못했습니다/)).not.toBeNull()
  })

  it('계측 — 열기와 구매 버튼이 각각 남는다', async () => {
    // jsdom 은 링크 이동을 구현하지 않는다 — 누름만 보고 이동은 막는다.
    const stopNavigation = (e: Event) => e.preventDefault()
    document.addEventListener('click', stopNavigation)
    mockOverview.mockResolvedValue(overview({ passes: HELD }))
    render(<PassQuickView />)
    open()
    expect(trackEvent).toHaveBeenCalledWith({ action: 'pass_popup_open', category: 'conversion' })

    fireEvent.click(await screen.findByText('이용권 구매하기'))
    expect(trackEvent).toHaveBeenCalledWith({ action: 'pass_popup_cta', category: 'conversion', label: 'buy_pass' })
    document.removeEventListener('click', stopNavigation)
  })

  it('팝업 문구에 금지어가 없다', async () => {
    mockOverview.mockResolvedValue(
      overview({ passes: MEMBER, tier: 'SINGLE', planName: '싱글 멤버십', isSubscribed: true })
    )
    render(<PassQuickView />)
    open()
    await screen.findByText('이번 달 2장')

    expect(findBannedPassTerms(document.body.textContent ?? '')).toEqual([])
  })
})
