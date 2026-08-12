/**
 * 허브 상단 「섹션 바로가기」 — 칩과 앵커가 실제로 맞물리는지.
 *
 * 이 테스트의 핵심은 «죽은 칩» 을 막는 것이다. 칩은 링크라서 눌러도 에러가 나지 않는다 —
 * 앵커 id 하나만 오타 나도 아무 일도 일어나지 않고, 화면상으로는 «가끔 안 눌리는 버튼» 이 된다.
 * 그래서 허브 화면을 통째로 그린 뒤, 모든 칩의 href 가 가리키는 요소가 실재하는지 본다.
 */
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalysisHubClient } from '@/app/protected/analysis/analysis-hub-client'
import { HUB_SECTIONS, hubHeadingId, visibleHubSections } from '@/lib/domain/analysis/hub-sections'

jest.mock('@/app/actions/analysis/reading-insights', () => ({
  getJourneyProgress: jest.fn(async (): Promise<string[]> => []),
}))

jest.mock('@/app/actions/fortune/daily-ritual', () => ({
  getDailyRitualStatus: jest.fn(async () => ({
    attendanceDone: false,
    fortuneViewed: false,
    unseenOracleCount: 0,
  })),
}))

jest.mock('@/app/actions/fortune/daily', () => ({
  generateDailyFortune: jest.fn(),
}))

jest.mock('@/app/actions/payment/attendance', () => ({
  checkAttendanceAvailability: jest.fn(),
}))

jest.mock('@/components/shared/AmbientVideo', () => ({
  AmbientVideo: () => null,
}))

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn() },
}))

const scrollIntoView = jest.fn()

/** 마운트 직후의 서버액션 프라미스까지 흘려보낸다 — act 경고 없이 화면을 안정시킨다. */
async function renderHub(userName?: string) {
  const view = render(<AnalysisHubClient userName={userName} />)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return view
}

function quickNav() {
  return screen.getByRole('navigation', { name: '섹션 바로가기' })
}

beforeAll(() => {
  // jsdom 에는 scrollIntoView 가 없다 — 호출 인자를 보기 위해서라도 심어 둔다.
  Element.prototype.scrollIntoView = scrollIntoView
})

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  })
})

describe('섹션 바로가기 — 칩 ↔ 앵커', () => {
  it('모든 칩이 실재하는 섹션을 가리킨다', async () => {
    const { container } = await renderHub('해화')

    const links = within(quickNav()).getAllByRole('link')
    expect(links).toHaveLength(visibleHubSections({ hasDailyFortune: true }).length)

    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      expect(href.startsWith('#')).toBe(true)
      // 앵커가 없으면 여기서 죽는다 — «눌러도 아무 일 없는 칩» 의 유일한 방지선.
      expect(container.querySelector(`#${href.slice(1)}`)).not.toBeNull()
    }
  })

  it('칩 순서가 섹션의 문서 순서와 같다', async () => {
    const { container } = await renderHub('해화')

    const ids = within(quickNav())
      .getAllByRole('link')
      .map((link) => (link.getAttribute('href') ?? '').slice(1))

    const positions = ids.map((id) => {
      const element = container.querySelector(`#${id}`)
      if (!element) throw new Error(`섹션 없음: ${id}`)
      return element
    })

    for (let i = 1; i < positions.length; i += 1) {
      const relation = positions[i - 1].compareDocumentPosition(positions[i])
      // 앞 섹션이 뒤 섹션보다 문서상 먼저여야 한다. 아니면 바로가기가 순서를 속인다.
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('오늘의 운세가 없는 화면에서는 그 칩도 섹션도 없다', async () => {
    const { container } = await renderHub(undefined)

    const ids = within(quickNav())
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))

    expect(ids).not.toContain(`#${HUB_SECTIONS.dailyFortune.id}`)
    expect(container.querySelector(`#${HUB_SECTIONS.dailyFortune.id}`)).toBeNull()
  })

  it('섹션마다 제목이 붙어 있고 aria-labelledby 가 그 제목을 가리킨다', async () => {
    const { container } = await renderHub('해화')

    for (const section of visibleHubSections({ hasDailyFortune: true })) {
      const element = container.querySelector(`#${section.id}`)
      expect(element).not.toBeNull()
      expect(element?.getAttribute('aria-labelledby')).toBe(hubHeadingId(section.id))

      const heading = container.querySelector(`#${hubHeadingId(section.id)}`)
      expect(heading?.tagName).toBe('H2')
      expect(heading?.textContent).toBe(section.title)
    }
  })

  it('섹션 제목은 표를 그대로 쓴다 — 라벨 교체가 한 곳에서 끝난다', async () => {
    await renderHub('해화')

    // 화면에 보이는 두 제목이 표의 문자열과 같은지. 다르면 문구가 두 곳으로 갈라진 것이다.
    expect(screen.getByText(HUB_SECTIONS.studio.title).id).toBe(hubHeadingId(HUB_SECTIONS.studio.id))
    expect(screen.getByText(HUB_SECTIONS.theme.title).id).toBe(hubHeadingId(HUB_SECTIONS.theme.id))
  })
})

describe('섹션 바로가기 — 이동 거동', () => {
  it('누르면 해당 섹션으로 부드럽게 내려가고 초점도 따라간다', async () => {
    const user = userEvent.setup()
    const { container } = await renderHub('해화')

    await user.click(within(quickNav()).getByRole('link', { name: HUB_SECTIONS.theme.label }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(document.activeElement).toBe(container.querySelector(`#${HUB_SECTIONS.theme.id}`))
  })

  it('감속을 선호하면 즉시 이동한다 (부드러운 스크롤 끔)', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })

    const user = userEvent.setup()
    await renderHub('해화')

    await user.click(within(quickNav()).getByRole('link', { name: HUB_SECTIONS.studio.label }))

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('보조키를 누른 클릭은 가로채지 않는다 (새 탭은 브라우저 것)', async () => {
    const user = userEvent.setup()
    await renderHub('해화')

    await user.keyboard('{Meta>}')
    await user.click(within(quickNav()).getByRole('link', { name: HUB_SECTIONS.studio.label }))
    await user.keyboard('{/Meta}')

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('JS 없이도 동작하도록 평범한 앵커로 만든다', async () => {
    await renderHub('해화')

    for (const link of within(quickNav()).getAllByRole('link')) {
      expect(link.tagName).toBe('A')
      expect(link.getAttribute('href')).toMatch(/^#hub-/)
    }
  })
})
