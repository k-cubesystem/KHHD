/**
 * 인기테마운세 목록 페이지.
 *
 * 서버 컴포넌트라 함수로 직접 불러 결과 JSX 를 그린다 — 이 화면은 서버 액션을 하나도 부르지
 * 않으므로(§허브 자동 호출 금지) 모킹할 것도 없다. 그 사실 자체가 계약이다.
 */
import { render, screen, within } from '@testing-library/react'
import ThemeFortuneListPage from '@/app/protected/analysis/theme/page'
import {
  openRoutes,
  STANDALONE_ROUTES,
  THEME_TABS,
  themeAnchorId,
  themeCostLabel,
  themeDestination,
  themesByTab,
} from '@/lib/domain/theme-fortune/themes'

async function renderPage(tab?: string) {
  const ui = await ThemeFortuneListPage({ searchParams: Promise.resolve({ tab }) })
  return render(ui)
}

describe('테마 목록 — 탭', () => {
  it('탭 네 개가 표의 라벨 그대로 걸린다', async () => {
    await renderPage()
    const tabs = screen.getByRole('navigation', { name: '테마 갈래' })

    for (const tab of THEME_TABS) {
      expect(within(tabs).getByRole('link', { name: tab.label }).getAttribute('href')).toBe(
        `/protected/analysis/theme?tab=${tab.key}`
      )
    }
  })

  it('모르는 탭으로 들어와도 화면이 선다 (기본 탭)', async () => {
    await renderPage('없는탭')

    for (const theme of themesByTab('work')) {
      expect(screen.getByText(theme.title)).not.toBeNull()
    }
  })

  it('탭을 지정하면 그 갈래의 테마만 보인다', async () => {
    const { container } = await renderPage('love')

    for (const theme of themesByTab('love')) {
      expect(container.querySelector(`#${themeAnchorId(theme.id)}`)).not.toBeNull()
    }
    for (const theme of themesByTab('work')) {
      expect(container.querySelector(`#${themeAnchorId(theme.id)}`)).toBeNull()
    }
  })
})

describe('테마 목록 — 카드', () => {
  it('카드마다 제목·서브카피·복채가 함께 나온다', async () => {
    await renderPage('work')

    for (const theme of themesByTab('work')) {
      expect(screen.getByText(theme.title)).not.toBeNull()
      expect(screen.getByText(theme.subcopy)).not.toBeNull()
      expect(screen.getAllByText(themeCostLabel(theme)).length).toBeGreaterThan(0)
    }
  })

  it('카드는 실존 화면으로 가고, 어디로 가는지 카드에 적혀 있다', async () => {
    const { container } = await renderPage('work')

    for (const theme of themesByTab('work')) {
      const card = container.querySelector(`#${themeAnchorId(theme.id)}`)
      const destination = themeDestination(theme)
      if (!destination) throw new Error(`출하 테마인데 갈 곳이 없다: ${theme.id}`)

      expect(card?.getAttribute('href')).toBe(destination.href)
      // 제목이 약속하는 개별 풀이는 아직 없다 — 그래서 도착지를 카드에 밝힌다.
      expect(card?.textContent).toContain(destination.label)
    }
  })

  it('출하하지 않은 테마는 아예 그리지 않는다', async () => {
    const { container } = await renderPage('work')

    expect(container.querySelector(`#${themeAnchorId('work-friction')}`)).toBeNull()
    expect(screen.queryByText('직원복이 없는 건지, 보는 눈이 없는 건지')).toBeNull()
  })
})

describe('테마 목록 — 기존 진입 경로를 잃지 않는다', () => {
  it('지금 돌아가는 풀이 화면 전량으로 가는 길이 이 화면에 있다', async () => {
    // 허브 ③ 에서 내려온 재물·애정·직장·학업·부동산이 여기서 살아 있어야 한다.
    // 특히 학업운·부동산은 테마 카드가 직접 가리키지 않아 이 목록이 유일한 길이다.
    const { container } = await renderPage()
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) => anchor.getAttribute('href'))

    for (const route of openRoutes()) {
      expect(hrefs).toContain(route.href)
    }
  })

  it('🔴 오늘의 운세·2026 병오년 — 이 화면이 유일한 입구다 (허브에서 내려왔다)', async () => {
    // 2026-08-13 허브 비우기로 두 화면은 링크가 한 곳도 남지 않았다. 이 두 줄이 지워지면
    // 기능이 접근 불가가 된다 — 그때는 라우트도 함께 지워야 한다.
    const { container } = await renderPage()

    for (const route of Object.values(STANDALONE_ROUTES)) {
      const link = Array.from(container.querySelectorAll('a')).find(
        (anchor) => anchor.getAttribute('href') === route.href
      )

      expect(link).toBeDefined()
      expect(link?.textContent).toContain(route.label)
    }
  })

  it('오늘의 운세는 무료로 표기한다 (유료로 보이게 하지 않는다)', async () => {
    const { container } = await renderPage()

    const link = Array.from(container.querySelectorAll('a')).find(
      (anchor) => anchor.getAttribute('href') === STANDALONE_ROUTES.today.href
    )

    expect(link?.textContent).toContain('무료')
    expect(link?.textContent).not.toMatch(/복채/)
  })

  it('허브로 돌아가는 길이 있다', async () => {
    const { container } = await renderPage()
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) => anchor.getAttribute('href'))

    expect(hrefs).toContain('/protected/analysis')
  })
})

describe('테마 목록 — 고지', () => {
  it('면책 고지가 붙어 있다', async () => {
    await renderPage()

    expect(screen.getByText(/참고용입니다/)).not.toBeNull()
  })
})
