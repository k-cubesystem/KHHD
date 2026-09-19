import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PassGateCta } from '../pass-gate-cta'
import { SHAMAN_QUESTIONS_PER_PASS, findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'

const mockRefresh = jest.fn()
const mockPurchase = jest.fn()
const mockRefreshPasses = jest.fn()
const mockToast = { success: jest.fn(), error: jest.fn() }

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
jest.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => mockToast.success(...a), error: (...a: unknown[]) => mockToast.error(...a) },
}))
jest.mock('@/app/actions/ai/shaman-chat', () => ({ purchaseShamanQuestions: () => mockPurchase() }))
jest.mock('@/hooks/use-passes', () => ({ useRefreshPasses: () => mockRefreshPasses }))
jest.mock('@/lib/analytics/chat-ga', () => ({ GAChat: { ticketPurchase: jest.fn(), rechargeRedirect: jest.fn() } }))
jest.mock('@/components/payment/insufficient-pass-modal', () => ({
  InsufficientPassModal: ({ isOpen, requiredUnits }: { isOpen: boolean; requiredUnits: number }) =>
    isOpen ? <div role="dialog">이용권 {requiredUnits}장 필요</div> : null,
}))

/**
 * 속풀이 게이트가 «이용권으로 질문을 열어 이어가세요»라고 말하면서 여는 자리는 채팅 안에만 있어,
 * 잔여 0문인 비회원은 이용권을 들고도 문 앞에서 막혔다(F27).
 */

const OPEN_LABEL = `이용권 ${FEATURE_COST.shamanQuestions.display}장으로 질문 ${SHAMAN_QUESTIONS_PER_PASS}문 열기`

describe('PassGateCta — 게이트에서 이용권으로 질문 열기', () => {
  beforeEach(() => jest.clearAllMocks())

  it('★ 열면 게이트를 다시 평가한다(router.refresh) — 요약도 다시 읽는다', async () => {
    mockPurchase.mockResolvedValue({ success: true, newPurchasedCredits: SHAMAN_QUESTIONS_PER_PASS })
    render(<PassGateCta canOpen />)
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(mockRefreshPasses).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalled()
  })

  it('★ 서버가 NO_PASS 면 이용권 안내를 연다 — 게이트는 그대로다', async () => {
    mockPurchase.mockResolvedValue({ success: false, error: '이용권 부족', errorType: 'NO_PASS', requiredUnits: 1 })
    render(<PassGateCta canOpen />)
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('이용권 1장 필요')
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('다른 실패는 서버 문구를 그대로 알린다', async () => {
    mockPurchase.mockResolvedValue({ success: false, error: '질문을 여는 중 문제가 생겼어요.' })
    render(<PassGateCta canOpen />)
    await userEvent.click(screen.getByRole('button', { name: OPEN_LABEL }))

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('질문을 여는 중 문제가 생겼어요.'))
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('★ 보유 이용권이 없으면 버튼 대신 이용권 탭 링크다 — 서버 액션을 부르지 않는다', () => {
    render(<PassGateCta canOpen={false} />)
    expect(screen.getByRole('link', { name: '이용권 구매' })).toHaveAttribute('href', '/protected/store?tab=pass')
    expect(screen.queryByRole('button')).toBeNull()
    expect(mockPurchase).not.toHaveBeenCalled()
  })

  it('문구에 금지어가 없고, 숫자는 단일 출처에서 온다', () => {
    const { container } = render(<PassGateCta canOpen />)
    expect(findBannedPassTerms(container.textContent ?? '')).toEqual([])
    const source = readFileSync(join(process.cwd(), 'components/ai/chat/pass-gate-cta.tsx'), 'utf8')
    expect(source).not.toMatch(/질문 \d+문|이용권 \d+장/)
  })

  it('★ 게이트 화면에 이 입장로가 걸려 있다 — 보유 이용권은 서버가 읽는다', () => {
    const page = readFileSync(join(process.cwd(), 'app/protected/ai-shaman/page.tsx'), 'utf8')
    expect(page).toContain('<PassGateCta canOpen={canOpenWithPass} />')
    expect(page).toContain('heldPassCount(passes) >= FEATURE_COST.shamanQuestions.display')
  })
})
