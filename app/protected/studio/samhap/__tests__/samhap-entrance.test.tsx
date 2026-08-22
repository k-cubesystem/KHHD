/**
 * 종합사주풀이 화면이 **통합 입구**로서 성립하는가 (CEO 2026-08-22).
 *
 * 허브 런처의 한 칸도, 대작 카드의 CTA 도 전부 이 화면으로 온다. 그래서 이 화면은
 * 재료 상태에 따라 **주 행동이 갈라져야** 한다 — 갈라지지 않으면 재료가 없는 사람에게
 * 이 화면은 막다른 길이 되고, 사주풀이로 가는 길이 통합과 함께 사라진다.
 *
 * 🔴 가격·차감은 이 테스트의 관심사가 아니다. 통합은 «입구와 카피»에서 끝났고
 *    `FEATURE_COST.saju`/`.samhap` 은 여전히 별개 상품이다.
 */
import { act, render, screen } from '@testing-library/react'
import SamhapPage from '@/app/protected/studio/samhap/page'
import { getSamhapReadiness } from '@/app/actions/ai/samhap'

jest.mock('@/components/shared/AmbientVideo', () => ({ AmbientVideo: () => null }))
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

jest.mock('@/app/actions/payment/wallet', () => ({
  getWalletBalance: jest.fn(async () => 100),
}))
jest.mock('@/app/actions/ai/samhap', () => ({
  getSamhapReadiness: jest.fn(),
  generateSamhapReport: jest.fn(),
}))
jest.mock('@/components/studio/analyzing-animation', () => ({ AnalyzingAnimation: () => null }))
jest.mock('@/components/studio/share-save-buttons', () => ({ ShareSaveButtons: () => null }))
jest.mock('@/components/studio/samhap-result', () => ({ SamhapResultView: () => null }))

const readiness = getSamhapReadiness as jest.Mock

async function renderPage() {
  const view = render(<SamhapPage />)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return view
}

beforeEach(() => jest.clearAllMocks())

describe('재료가 부족할 때 — 「사주풀이부터 시작하기」가 주 행동', () => {
  beforeEach(() => {
    readiness.mockResolvedValue({ ready: false, hasFace: false, hasHand: false, hasFengshui: false, hasBirth: true })
  })

  it('🔴 사주풀이로 가는 링크가 있고, 그 목적지가 여정 첫 주머니와 같다', async () => {
    await renderPage()

    const start = screen.getByRole('link', { name: /사주풀이부터 시작하기/ })
    expect(start.getAttribute('href')).toBe('/protected/analysis/cheonjiin')
  })

  it('열람 버튼은 나오지 않는다 (준비 단계에서 복채를 부르지 않는다)', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: /종합사주풀이 열람/ })).toBeNull()
    expect(screen.getByText(/복채가 차감되지 않습니다/)).not.toBeNull()
  })

  it('채워야 할 복주머니 목록은 그대로 남는다 (길을 하나로 줄이지 않았다)', async () => {
    await renderPage()

    expect(screen.getByText('채워야 할 복주머니')).not.toBeNull()
    for (const label of ['관상 분석', '손금 분석', '풍수 분석']) {
      expect(screen.getByText(label)).not.toBeNull()
    }
  })
})

describe('재료가 완비됐을 때 — 「종합사주풀이 열람」이 주 행동', () => {
  beforeEach(() => {
    readiness.mockResolvedValue({ ready: true, hasFace: true, hasHand: true, hasFengshui: true, hasBirth: true })
  })

  it('열람 버튼이 서고 사주풀이 유도는 물러난다', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: /종합사주풀이 열람/ })).not.toBeNull()
    expect(screen.queryByRole('link', { name: /사주풀이부터 시작하기/ })).toBeNull()
  })
})

describe('통합 입구의 규율', () => {
  beforeEach(() => {
    readiness.mockResolvedValue({ ready: false, hasFace: false, hasHand: false, hasFengshui: false, hasBirth: false })
  })

  it('화면에 한자를 쓰지 않는다', async () => {
    const { container } = await renderPage()

    expect(container.textContent ?? '').not.toMatch(/[一-鿿]/)
  })

  it('표시광고법 금지어를 쓰지 않는다', async () => {
    const { container } = await renderPage()

    for (const word of ['매일', '무제한', '평생', '모두 이용', '정액']) {
      expect(container.textContent ?? '').not.toContain(word)
    }
  })
})
