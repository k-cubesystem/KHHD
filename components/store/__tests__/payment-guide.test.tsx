/**
 * 결제 도우미 표시 규칙 — «방금 걷어낸 팝업»이 되지 않게 못 박는다.
 *
 *  1. 첫 1회만 자동으로 뜬다. 두 번째 진입에선 안 뜬다.
 *  2. 닫은 뒤에도 «결제 안내» 버튼으로 언제든 다시 열린다.
 *  3. 회원에겐 가입 권유 대신 이용권 추가 구매 안내가 뜬다.
 *  4. 탭 지정 진입(정문 아님)에서는 자동으로 뜨지 않는다.
 *  5. 화면 문구에 금지어(BANNED_PASS_TERMS)가 없다 — 토스 심사가 «잔액형 재화»로 읽는 말.
 *  6. 등급이 있어야 쓰는 풀이는 그 등급을 함께 적는다 — 이용권만 사면 되는 것처럼 읽히지 않게.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { PaymentGuide } from '../PaymentGuide'
import { buildPaymentGuideModel, type PlanInput, type PackInput } from '../payment-guide-model'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import { tierFeatureSummaryLine } from '@/lib/domain/payment/membership-benefits'

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
    price: 12800,
    interval: 'MONTH',
    monthly_passes: 5,
    relationship_limit: 5,
  },
]
const PACKS: PackInput[] = [{ name: '이용권 1장', credits: 1, price: 4800, product_kind: 'pass', valid_days: 90 }]

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
  it('비회원에게는 이용권·멤버십 두 층과 «이번 달 몫을 다 쓰면 이용권만 더»라는 연결 문장을 보여준다', () => {
    renderGuide()
    expect(screen.getByText('이용권 — 필요할 때 한 장씩')).not.toBeNull()
    expect(screen.getByText('멤버십 — 매달 이용권과 기능')).not.toBeNull()
    expect(screen.getByText('이번 달 몫을 다 쓰면 이용권만 더 사면 됩니다')).not.toBeNull()
    expect(screen.getByText('나는 어느 쪽?')).not.toBeNull()
    expect(screen.getByRole('link', { name: /멤버십 보기/ })).not.toBeNull()
  })

  it('비회원 안내의 숫자는 전부 모델에서 온다', () => {
    renderGuide()
    expect(screen.getByText(/12,800원/)).not.toBeNull()
    expect(screen.getByText('가족관리 — 가족·지인 각 5명 등록·궁합')).not.toBeNull()
    expect(screen.getByText('이용권 — 매달 5장 (다음 달로 넘어가지 않아요)')).not.toBeNull()
    expect(screen.getByText('기록 보관 — 무료는 최근 30일까지, 멤버십은 기간 제한 없이')).not.toBeNull()
    expect(screen.getByText(tierFeatureSummaryLine())).not.toBeNull()
    expect(screen.getAllByText(/4,800원/).length).toBeGreaterThan(0)
    expect(screen.getByText('사주 풀이')).not.toBeNull()
  })

  it('회원에게는 가입 권유 대신 이용권 추가 구매를 안내한다', () => {
    renderGuide({ member: true })
    expect(screen.getByText('이번 달 이용권을 다 쓰셨다면')).not.toBeNull()
    expect(screen.getByText(/멤버십 이용권 5장은 구독 시작일을 기준으로 한 달마다 새로 열리고/)).not.toBeNull()

    expect(screen.queryByText('멤버십 — 매달 이용권과 기능')).toBeNull()
    expect(screen.queryByRole('link', { name: /멤버십 보기/ })).toBeNull()
    expect(screen.queryByText('나는 어느 쪽?')).toBeNull()

    expect(screen.getByRole('link', { name: /이용권 구매하기/ })).not.toBeNull()
    expect(screen.getByRole('link', { name: '멤버십 관리' })).not.toBeNull()
  })

  it('CTA 클릭은 계측되고 도우미를 닫는다', () => {
    renderGuide()
    fireEvent.click(screen.getByRole('link', { name: /이용권 구매하기/ }))
    expect(GA.paymentGuideCta).toHaveBeenCalledWith('pass')
    expect(dialog()).toBeNull()
  })

  it.each([
    ['비회원', false],
    ['회원', true],
  ])('%s 안내의 요금표는 등급이 필요한 풀이에 그 등급을 적는다', (_label, member) => {
    renderGuide({ member })
    expect(screen.getByText(/패밀리 멤버십부터/)).not.toBeNull()
    expect(screen.getByText(/비즈니스 멤버십부터/)).not.toBeNull()
    expect(screen.getByText(/오방기/).textContent).toContain('싱글 멤버십부터')
  })

  // 라이브에 멤버십 전용 웹툰 회차가 아직 없다 — «열린다»고 적으면 없는 혜택을 파는 문구다.
  it.each([
    ['비회원', false],
    ['회원', true],
  ])('%s 안내는 웹툰 멤버십 회차를 이미 있는 혜택처럼 말하지 않는다', (_label, member) => {
    renderGuide({ member })
    const text = document.body.textContent ?? ''
    expect(text).toContain('웹툰')
    expect(text).not.toMatch(/웹툰[^.]*(열람|열립니다|열려 있습니다)/)
    expect(text).toMatch(/웹툰[^.]*연재 예정/)
  })

  it.each([
    ['비회원', false],
    ['회원', true],
  ])('%s 안내에 금지어가 없다', (_label, member) => {
    renderGuide({ member })
    expect(findBannedPassTerms(document.body.textContent ?? '')).toEqual([])
  })
})
