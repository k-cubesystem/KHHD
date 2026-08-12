/**
 * 결제 도우미 표시 규칙 — «방금 걷어낸 팝업»이 되지 않게 못 박는다.
 *
 *  1. 첫 1회만 자동으로 뜬다. 두 번째 진입에선 안 뜬다.
 *  2. 닫은 뒤에도 «결제 안내» 버튼으로 언제든 다시 열린다.
 *  3. 회원에겐 가입 권유 대신 복채 추가 구매 안내가 뜬다.
 *  4. 탭 지정 진입(정문 아님)에서는 자동으로 뜨지 않는다.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PaymentGuide } from '../PaymentGuide'
import { buildPaymentGuideModel, type PlanInput, type PackInput } from '../payment-guide-model'

jest.mock('@/lib/analytics/ga4', () => ({
  GA: {
    paymentGuideOpen: jest.fn(),
    paymentGuideClose: jest.fn(),
    paymentGuideCta: jest.fn(),
  },
}))

import { GA } from '@/lib/analytics/ga4'

const PLANS: PlanInput[] = [
  {
    id: 'plan-single',
    name: '싱글 멤버십',
    tier: 'SINGLE',
    price: 9900,
    interval: 'MONTH',
    talismans_per_period: 10,
    relationship_limit: 3,
  },
]
const PACKS: PackInput[] = [{ name: '소복 씨앗', credits: 5, bonus_credits: 0, price: 50000 }]

const model = (membership: { tier: string; planId: string | null } | null = null) =>
  buildPaymentGuideModel({ plans: PLANS, packs: PACKS, retentionDays: 30, membership })

/** 자동 열림은 한 박자 뒤(AUTO_OPEN_DELAY_MS)라 렌더 직후 타이머를 흘려 보낸다. */
const renderGuide = (opts: { member?: boolean; autoOpenEligible?: boolean } = {}) => {
  const utils = render(
    <PaymentGuide
      model={model(opts.member ? { tier: 'SINGLE', planId: 'plan-single' } : null)}
      autoOpenEligible={opts.autoOpenEligible ?? true}
    />
  )
  act(() => {
    jest.advanceTimersByTime(1_000)
  })
  return utils
}

const dialog = () => screen.queryByRole('dialog', { name: '결제 도우미' })

beforeEach(() => {
  jest.useFakeTimers()
  window.localStorage.clear()
  jest.clearAllMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('PaymentGuide 표시 규칙', () => {
  it('첫 진입에는 자동으로 열린다', () => {
    renderGuide()
    expect(dialog()).not.toBeNull()
    expect(GA.paymentGuideOpen).toHaveBeenCalledWith('auto')
  })

  it('두 번째 진입에는 자동으로 열리지 않는다', () => {
    const first = renderGuide()
    expect(dialog()).not.toBeNull()
    first.unmount()

    renderGuide()
    expect(dialog()).toBeNull()
    expect(GA.paymentGuideOpen).toHaveBeenCalledTimes(1)
  })

  it('탭을 지정해 들어온 진입에서는 자동으로 열리지 않는다', () => {
    renderGuide({ autoOpenEligible: false })
    expect(dialog()).toBeNull()
    expect(GA.paymentGuideOpen).not.toHaveBeenCalled()
  })

  it('열리기 전에 떠난 사용자는 «봤음»으로 치지 않는다 — 다음 진입에 다시 뜬다', () => {
    const first = render(<PaymentGuide model={model()} autoOpenEligible />)
    first.unmount() // 지연 시간이 흐르기 전에 이탈
    act(() => {
      jest.advanceTimersByTime(1_000)
    })
    expect(GA.paymentGuideOpen).not.toHaveBeenCalled()

    renderGuide()
    expect(dialog()).not.toBeNull()
  })

  it('닫은 뒤에도 «결제 안내» 버튼으로 다시 열린다', () => {
    renderGuide()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialog()).toBeNull()
    expect(GA.paymentGuideClose).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '결제 안내' }))
    expect(dialog()).not.toBeNull()
    expect(GA.paymentGuideOpen).toHaveBeenLastCalledWith('manual')
  })

  it('이미 본 사용자도 버튼으로는 열 수 있다', () => {
    renderGuide().unmount()
    renderGuide()
    expect(dialog()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '결제 안내' }))
    expect(dialog()).not.toBeNull()
  })
})

describe('PaymentGuide 내용', () => {
  it('비회원에게는 복채·멤버십 두 층과 «둘 다 필요하다»는 연결 문장을 보여준다', () => {
    renderGuide()
    expect(screen.getByText('복채 — 쓴 만큼')).not.toBeNull()
    expect(screen.getByText('멤버십 — 기능이 열립니다')).not.toBeNull()
    expect(screen.getByText('멤버십을 써도 복채는 따로 삽니다')).not.toBeNull()
    expect(screen.getByText('나는 어느 쪽?')).not.toBeNull()
    expect(screen.getByRole('link', { name: /멤버십 보기/ })).not.toBeNull()
  })

  it('비회원 안내의 숫자는 전부 모델에서 온다', () => {
    renderGuide()
    // 멤버십 가격·인연 수·주기 복채
    expect(screen.getByText(/9,900원/)).not.toBeNull()
    expect(screen.getByText('가족관리 — 인연 3명 등록·궁합')).not.toBeNull()
    expect(screen.getByText('복채 — 달마다 10만냥 지급')).not.toBeNull()
    // 기록 보관 일수
    expect(screen.getByText('기록 보관 — 무료는 최근 30일까지, 멤버십은 제한 없이')).not.toBeNull()
    // 복채 요금(FEATURE_COST)
    expect(screen.getByText('사주 풀이')).not.toBeNull()
  })

  it('회원에게는 가입 권유 대신 복채 추가 구매를 안내한다', () => {
    renderGuide({ member: true })
    expect(screen.getByText('복채가 떨어졌다면')).not.toBeNull()
    expect(screen.getByText(/멤버십에 포함된 복채 10만냥은 달마다 채워집니다/)).not.toBeNull()

    // 가입 권유 요소는 없어야 한다
    expect(screen.queryByText('멤버십 — 기능이 열립니다')).toBeNull()
    expect(screen.queryByRole('link', { name: /멤버십 보기/ })).toBeNull()
    expect(screen.queryByText('나는 어느 쪽?')).toBeNull()

    expect(screen.getByRole('link', { name: /복채 충전하기/ })).not.toBeNull()
    expect(screen.getByRole('link', { name: '멤버십 관리' })).not.toBeNull()
  })

  it('CTA 클릭은 계측되고 도우미를 닫는다', () => {
    renderGuide()
    fireEvent.click(screen.getByRole('link', { name: /복채 충전하기/ }))
    expect(GA.paymentGuideCta).toHaveBeenCalledWith('bokchae')
    expect(dialog()).toBeNull()
  })
})
