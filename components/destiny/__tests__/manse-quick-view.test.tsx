import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ManseQuickView } from '@/components/destiny/manse-quick-view'
import { getManseSummary, type ManseSummary } from '@/app/actions/user/manse-summary'
import type { PassSummary } from '@/lib/domain/entitlement/pass'

jest.mock('@/app/actions/user/manse-summary', () => ({ getManseSummary: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))

const mockSummary = jest.mocked(getManseSummary)

const held = (remaining: number): PassSummary => ({
  unlimited: false,
  membership: null,
  holdings: [{ id: 'g1', source: 'purchase', remaining, expiresAt: '2026-12-18T00:00:00.000Z' }],
})

const summary = (passes: PassSummary): ManseSummary => ({
  targets: [],
  passes,
  planName: '무료 회원',
  isSubscribed: false,
  deityName: null,
  deityPortraitUrl: null,
})

const open = () => fireEvent.click(screen.getByLabelText('내 명식 바로보기'))

describe('상단 바 「내 명식 바로보기」 — 계정 요약', () => {
  beforeEach(() => mockSummary.mockReset())

  it('누르기 전에는 읽지 않는다', () => {
    render(<ManseQuickView />)
    expect(mockSummary).not.toHaveBeenCalled()
  })

  it('🔴 열 때마다 다시 읽는다 — 굳혀 두면 바로 옆 「내 이용권」 팝업과 다른 장 수를 보인다', async () => {
    mockSummary.mockResolvedValueOnce(summary(held(3)))
    mockSummary.mockResolvedValueOnce(summary(held(2)))
    render(<ManseQuickView />)

    open()
    expect(await screen.findByText('이용권 3장')).not.toBeNull()
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('이용권 3장')).toBeNull())

    open()
    expect(await screen.findByText('이용권 2장')).not.toBeNull()
    expect(mockSummary).toHaveBeenCalledTimes(2)
  })

  it('비로그인이면 로그인 안내', async () => {
    mockSummary.mockResolvedValue(null)
    render(<ManseQuickView />)
    open()
    expect(await screen.findByText('로그인이 필요합니다.')).not.toBeNull()
  })
})
