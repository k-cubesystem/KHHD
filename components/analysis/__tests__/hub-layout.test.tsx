/**
 * 사주·궁합 허브의 «비운 뒤» 구성 — 화면에 무엇이 남았고 무엇이 없는지.
 *
 * CEO 지시(2026-08-13)로 허브는 세 자리만 남았다.
 * ① 인기테마운세 → ② 무엇으로 볼까요 → 종합사주풀이 여정(맨 하단).
 *
 * 이 테스트가 지키는 것은 둘이다.
 * ① **되살아나지 않았는가** — 오늘의 정성·절기 이벤트·더 깊이·하단 오늘의 운세·상단 바로가기.
 *    지운 것들이 슬쩍 돌아오면 CEO 가 비우라고 한 화면이 다시 채워진다.
 * ② **여정이 맨 아래인가** — 순서는 compareDocumentPosition 으로 실제 문서에서 잰다.
 */
import { act, render, screen } from '@testing-library/react'
import { AnalysisHubClient } from '@/app/protected/analysis/analysis-hub-client'
import { allHubSections, HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'

jest.mock('@/app/actions/analysis/reading-insights', () => ({
  getJourneyProgress: jest.fn(async (): Promise<string[]> => []),
}))

jest.mock('@/components/shared/AmbientVideo', () => ({
  AmbientVideo: () => null,
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn() },
}))

/** 마운트 직후의 서버액션 프라미스까지 흘려보낸다 — act 경고 없이 화면을 안정시킨다. */
async function renderHub() {
  const view = render(<AnalysisHubClient />)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return view
}

describe('허브 구성 — 세 자리만 남는다', () => {
  it('표에 있는 섹션이 전부 화면에 있고, 표에 없는 앵커는 화면에도 없다', async () => {
    const { container } = await renderHub()

    for (const section of allHubSections()) {
      expect(container.querySelector(`#${section.id}`)).not.toBeNull()
    }
    // 표가 곧 화면이다 — hub- 로 시작하는 앵커가 표보다 많으면 두 곳이 갈라진 것이다.
    expect(container.querySelectorAll('[id^="hub-"]:not([id$="-title"])')).toHaveLength(allHubSections().length)
  })

  it('종합사주풀이 여정이 문서의 맨 아래다', async () => {
    const { container } = await renderHub()

    const journey = container.querySelector(`#${HUB_SECTIONS.journey.id}`)
    const theme = container.querySelector(`#${HUB_SECTIONS.themeFortune.id}`)
    const studio = container.querySelector(`#${HUB_SECTIONS.studio.id}`)
    if (!journey || !theme || !studio) throw new Error('허브 섹션이 없다')

    for (const earlier of [theme, studio]) {
      expect(earlier.compareDocumentPosition(journey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('섹션마다 제목이 붙어 있고 aria-labelledby 가 그 제목을 가리킨다', async () => {
    const { container } = await renderHub()

    for (const section of allHubSections()) {
      const element = container.querySelector(`#${section.id}`)
      expect(element?.getAttribute('aria-labelledby')).toBe(hubHeadingId(section.id))

      const heading = container.querySelector(`#${hubHeadingId(section.id)}`)
      expect(heading?.tagName).toBe('H2')
      expect(heading?.textContent).toBe(section.title)
    }
  })
})

describe('허브 구성 — 걷어낸 것은 돌아오지 않는다', () => {
  it('상단 섹션 바로가기 칩이 없다', async () => {
    await renderHub()

    expect(screen.queryByRole('navigation', { name: '섹션 바로가기' })).toBeNull()
  })

  it('오늘의 정성·절기 특별 이벤트·더 깊이 들여다보기가 없다', async () => {
    await renderHub()

    expect(screen.queryByText('오늘의 정성')).toBeNull()
    expect(screen.queryByText('절기 특별 이벤트')).toBeNull()
    expect(screen.queryByText('더 깊이 들여다보기')).toBeNull()
  })

  it('하단 「오늘의 운세」 카드와 「2026 병오년」 카드가 없다', async () => {
    // 지운 게 아니라 옮겼다 — 두 화면으로 가는 길은 테마 목록이 진다(theme-list-page.test.tsx).
    const { container } = await renderHub()

    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) => anchor.getAttribute('href'))
    expect(hrefs).not.toContain('/protected/analysis/today')
    expect(hrefs).not.toContain('/protected/analysis/new-year')
    expect(screen.queryByLabelText('2026 병오년')).toBeNull()
    expect(screen.queryByLabelText('오늘의 운세')).toBeNull()
  })
})
