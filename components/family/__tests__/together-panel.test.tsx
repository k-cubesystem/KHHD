import { fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { TogetherPanel } from '@/components/family/together-panel'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'

const generateNarrative = jest.fn()
jest.mock('@/lib/analytics/ga4', () => ({ trackEvent: jest.fn(), GA: {} }))
jest.mock('@/app/actions/circle/narrative', () => ({
  generateNarrative: (...args: unknown[]) => generateNarrative(...args),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), message: jest.fn() } }))

const PEOPLE = [
  { targetId: 'self', name: '나', relation: '본인' },
  { targetId: 'b', name: '지영', relation: '동료' },
  { targetId: 'c', name: '현우', relation: '동료' },
  { targetId: 'd', name: '소연', relation: '동료' },
  { targetId: 'e', name: '민재', relation: '동료' },
]

describe('TogetherPanel — 둘·셋·넷 함께 보기', () => {
  beforeEach(() => jest.clearAllMocks())

  it('처음엔 두 명이 골라져 있고, 단추에 표시 복채가 feature-costs 값으로 선다', () => {
    render(<TogetherPanel people={PEOPLE} kind="work" />)
    expect(screen.getByRole('button', { name: /나·지영 함께 보기/ })).toBeEnabled()
    expect(screen.getByText(`· ${FEATURE_COST.togetherNarrative.display}만냥`)).toBeInTheDocument()
  })

  it('🔴 네 명을 넘기면 고르지 못하고 안내만 뜬다', () => {
    render(<TogetherPanel people={PEOPLE} kind="work" />)
    fireEvent.click(screen.getByRole('button', { name: /현우/ }))
    fireEvent.click(screen.getByRole('button', { name: /소연/ }))
    fireEvent.click(screen.getByRole('button', { name: /민재/ }))
    expect(toast.message).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /나·지영·현우·소연 함께 보기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /민재/, pressed: false })).toBeInTheDocument()
  })

  it('한 명만 남기면 단추가 잠기고 «두 명 이상» 안내로 바뀐다', () => {
    render(<TogetherPanel people={PEOPLE} kind="work" />)
    fireEvent.click(screen.getByRole('button', { name: /지영/, pressed: true }))
    expect(screen.getByRole('button', { name: /두 명 이상 고르세요/ })).toBeDisabled()
  })

  it('고른 id 를 쉼표로 이어 together 풀이를 부르고, 문단으로 나눠 보여 준다', async () => {
    generateNarrative.mockResolvedValue({
      success: true,
      text: '첫 문단입니다.\n\n둘째 문단입니다.',
      cached: false,
      createdAt: '2026-09-12T00:00:00.000Z',
    })
    render(<TogetherPanel people={PEOPLE} kind="family" />)
    fireEvent.click(screen.getByRole('button', { name: /현우/ }))
    fireEvent.click(screen.getByRole('button', { name: /나·지영·현우 함께 보기/ }))
    expect(await screen.findByText('첫 문단입니다.')).toBeInTheDocument()
    expect(screen.getByText('둘째 문단입니다.')).toBeInTheDocument()
    expect(generateNarrative).toHaveBeenCalledWith('together', 'self,b,c')
  })

  it('복채가 모자라면 오류 토스트만 띄운다', async () => {
    generateNarrative.mockResolvedValue({
      success: false,
      error: '복채가 부족합니다.',
      errorType: 'INSUFFICIENT_BALANCE',
    })
    render(<TogetherPanel people={PEOPLE} kind="family" />)
    fireEvent.click(screen.getByRole('button', { name: /나·지영 함께 보기/ }))
    await screen.findByRole('button', { name: /나·지영 함께 보기/ })
    expect(toast.error).toHaveBeenCalledWith('복채가 부족합니다.')
    expect(screen.queryByText(/문단/)).toBeNull()
  })
})
