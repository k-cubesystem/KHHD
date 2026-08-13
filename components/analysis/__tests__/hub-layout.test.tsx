/**
 * 사주·궁합 허브의 «앱 홈» 구성 — 화면에 무엇이 남았고 무엇이 없는지.
 *
 * CEO 지시(2026-08-13)로 허브는 세 자리만 남았다.
 * 아이콘 런처 → ① 인기테마운세 → 종합사주풀이 여정(맨 하단).
 *
 * 이 테스트가 지키는 것은 셋이다.
 * ① **되살아나지 않았는가** — 오늘의 정성·절기 이벤트·더 깊이·하단 오늘의 운세·상단 바로가기,
 *    그리고 런처가 흡수한 ② 「무엇으로 볼까요」 카드 섹션.
 * ② **런처가 맨 위인가 · 여정이 맨 아래인가** — 순서는 compareDocumentPosition 으로 실제
 *    문서에서 잰다.
 * ③ **런처 여덟 칸이 다 걸렸는가** — 표(`HUB_LAUNCHER`)와 화면이 갈라지지 않는지.
 */
import { act, render, screen, within } from '@testing-library/react'
import { AnalysisHubClient } from '@/app/protected/analysis/analysis-hub-client'
import { HUB_LAUNCHER } from '@/lib/domain/analysis/hub-home'
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

  it('아이콘 런처가 맨 위, 종합사주풀이 여정이 맨 아래다', async () => {
    const { container } = await renderHub()

    const launcher = container.querySelector(`#${HUB_SECTIONS.launcher.id}`)
    const theme = container.querySelector(`#${HUB_SECTIONS.themeFortune.id}`)
    const journey = container.querySelector(`#${HUB_SECTIONS.journey.id}`)
    if (!launcher || !theme || !journey) throw new Error('허브 섹션이 없다')

    for (const later of [theme, journey]) {
      expect(launcher.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(theme.compareDocumentPosition(journey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('런처가 사주 유도 카드보다 위다 (아이콘이 화면의 첫 줄)', async () => {
    const { container } = await renderHub()

    const launcher = container.querySelector(`#${HUB_SECTIONS.launcher.id}`)
    const masterpiece = screen.getByRole('button', { name: /나의 사주 · 운명 풀어보기/ })
    if (!launcher) throw new Error('런처가 없다')

    expect(launcher.compareDocumentPosition(masterpiece) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('런처 여덟 칸이 표 그대로 걸린다', async () => {
    const { container } = await renderHub()

    const launcher = container.querySelector<HTMLElement>(`#${HUB_SECTIONS.launcher.id}`)
    if (!launcher) throw new Error('런처가 없다')

    const links = within(launcher).getAllByRole('link')
    expect(links).toHaveLength(HUB_LAUNCHER.length)

    for (const entry of HUB_LAUNCHER) {
      expect(within(launcher).getByRole('link', { name: entry.label }).getAttribute('href')).toBe(entry.href)
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

  it('② 「무엇으로 볼까요」 카드 섹션이 없다 (런처가 흡수했다)', async () => {
    // 링크를 지운 게 아니라 카드를 아이콘으로 바꾼 것이다 — 궁합·관상·손금·풍수는
    // 위 「런처 여덟 칸」 테스트가 여전히 실존을 확인한다. 카드 섹션만 돌아오면 중복이다.
    const { container } = await renderHub()

    expect(screen.queryByText('무엇으로 볼까요')).toBeNull()
    expect(container.querySelector('#hub-studio')).toBeNull()
    expect(screen.queryByRole('navigation', { name: '통합분석 메뉴' })).toBeNull()
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
