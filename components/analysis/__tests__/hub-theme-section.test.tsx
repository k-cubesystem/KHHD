/**
 * 사주·궁합 허브 본문(런처 + 인기테마운세)이 화면에서 실제로 성립하는지.
 *
 * 이 테스트가 지키는 것은 두 가지다.
 * ① **잃지 않았는가** — 궁합·관상·손금·풍수는 이 화면이 유일한 허브 진입 경로다. 구 ② 카드
 *    4장이 아이콘 런처로 «흡수»된 것이지 지워진 게 아님을 링크·아이콘으로 못 박는다.
 * ② **죽은 카드가 없는가** — 인기테마운세 카드는 목록 페이지의 «그 카드 자리»로 가야 한다.
 *    구 목업 라우트(`/analysis/theme/{slug}`)로 가면 맵에 없어 허브로 튕긴다.
 *
 * 허브 전체 구성(무엇이 없어졌는가 · 런처가 맨 위인가 · 여정이 맨 아래인가)은
 * hub-layout.test.tsx 가, 런처 표 자체의 계약은 lib/domain/analysis 쪽 테스트가 본다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { AnalysisDashboard } from '@/components/analysis/AnalysisDashboard'
import { HUB_LAUNCHER } from '@/lib/domain/analysis/hub-home'
import { HUB_SECTIONS } from '@/lib/domain/analysis/hub-sections'
import {
  HUB_THEME_COUNT,
  hubThemePicks,
  THEME_CATEGORIES,
  THEME_LIST_PATH,
  themeFallbackImage,
  themeListHref,
  themeThumbnailPath,
} from '@/lib/domain/theme-fortune/themes'

jest.mock('@/components/shared/AmbientVideo', () => ({
  AmbientVideo: () => null,
}))

/** 대시보드가 품게 된 여정 카드의 서버 액션 — jsdom 에서 next/cache 체인을 끊는다. */
jest.mock('@/app/actions/analysis/reading-insights', () => ({
  getJourneyStatus: jest.fn(async () => ({ categories: [], records: {} })),
}))
jest.mock('@/app/actions/analysis/journey-reward', () => ({
  getJourneyRewardStatus: jest.fn(async () => null),
}))

/** 사주 유도 카드(`MasterpieceSection`)가 `useRouter` 를 쓴다 — 렌더가 서려면 필요하다. */
const push = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push, replace: jest.fn(), refresh: jest.fn() })
})

async function renderDashboard() {
  const view = render(<AnalysisDashboard />)
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  return view
}

function sectionOf(container: HTMLElement, id: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`#${id}`)
  if (!element) throw new Error(`섹션 없음: ${id}`)
  return element
}

describe('① 인기테마운세 — 리스트 10줄', () => {
  it('열 줄이 걸린다 (CEO 2026-08-13 「3개 말고 … 10개까지」)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    const picks = hubThemePicks()
    const cards = within(section).getAllByRole('link', { name: /.+/ })

    expect(picks).toHaveLength(HUB_THEME_COUNT)
    // 열 줄 + 「테마 전체 보기」
    expect(cards).toHaveLength(HUB_THEME_COUNT + 1)
    for (const theme of picks) {
      expect(within(section).getByRole('link', { name: theme.title })).not.toBeNull()
    }
  })

  it('행 전체가 하나의 링크다 (그림·제목·서브카피가 한 탭 타깃 안에 있다)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    for (const theme of hubThemePicks()) {
      const row = within(section).getByRole('link', { name: theme.title })

      expect(row.tagName).toBe('A')
      expect(row.textContent).toContain(theme.title)
      expect(row.textContent).toContain(theme.subcopy)
      expect(row.textContent).toContain(THEME_CATEGORIES[theme.category].label)
      expect(row.querySelector('img')).not.toBeNull()
    }
  })

  it('순번 숫자를 붙이지 않는다 («인기»가 아직 수동 순위다)', async () => {
    // 계측(v2)이 서기 전의 순위 숫자는 실측 주장이 된다 — 「1위」는 금지어이기도 하다.
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    for (const theme of hubThemePicks()) {
      const row = within(section).getByRole('link', { name: theme.title })

      expect(row.textContent).not.toMatch(/\d+\s*위/)
    }
  })

  it('카드는 목록 페이지의 그 카드 자리로 간다 (목업 라우트로 가지 않는다)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    for (const theme of hubThemePicks()) {
      const link = within(section).getByRole('link', { name: theme.title })

      expect(link.getAttribute('href')).toBe(themeListHref(theme))
      expect(link.getAttribute('href')).not.toMatch(/\/analysis\/theme\/[a-z]/)
    }
  })

  it('「테마 전체 보기」가 목록 페이지로 간다', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    expect(
      within(section)
        .getByRole('link', { name: /테마 전체 보기/ })
        .getAttribute('href')
    ).toBe(THEME_LIST_PATH)
  })

  it('제목·서브카피는 표의 문자열을 그대로 쓴다', async () => {
    await renderDashboard()

    for (const theme of hubThemePicks()) {
      expect(screen.getByText(theme.title)).not.toBeNull()
      expect(screen.getByText(theme.subcopy)).not.toBeNull()
    }
  })
})

describe('① 썸네일 — 파일이 아직 없어도 화면이 멀쩡하다', () => {
  /** 한 행의 그림 두 층 — [0] 폴백(늘 있다) · [1] 실사 사진(파일이 없을 수 있다). */
  function imagesOf(section: HTMLElement, title: string): HTMLImageElement[] {
    return Array.from(within(section).getByRole('link', { name: title }).querySelectorAll('img'))
  }

  it('행마다 실사 썸네일이 규약 경로로 걸린다', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    for (const theme of hubThemePicks()) {
      const sources = imagesOf(section, theme.title).map((image) => image.getAttribute('src'))

      expect(sources).toContain(themeThumbnailPath(theme.id))
    }
  })

  it('🔴 실사 사진 밑에 폴백 그림이 늘 깔려 있다 (자산 도착 전에도 빈 네모가 아니다)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    for (const theme of hubThemePicks()) {
      const sources = imagesOf(section, theme.title).map((image) => image.getAttribute('src'))

      expect(sources).toContain(themeFallbackImage(theme))
    }
  })

  it('🔴 사진을 못 불러오면 그 층만 내려가고 폴백이 남는다 (깨진 그림 금지)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)
    const [first] = hubThemePicks()

    const photo = imagesOf(section, first.title).find(
      (image) => image.getAttribute('src') === themeThumbnailPath(first.id)
    )
    if (!photo) throw new Error('실사 사진 층이 없다')

    await act(async () => {
      fireEvent.error(photo)
    })

    const after = imagesOf(section, first.title).map((image) => image.getAttribute('src'))
    expect(after).not.toContain(themeThumbnailPath(first.id))
    expect(after).toContain(themeFallbackImage(first))
  })

  it('위 세 줄만 즉시 받고 나머지는 lazy 다 (열 줄이 한꺼번에 내려오지 않는다)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    hubThemePicks().forEach((theme, index) => {
      const loadings = imagesOf(section, theme.title).map((image) => image.getAttribute('loading'))

      expect({ id: theme.id, loadings }).toEqual({
        id: theme.id,
        loadings: loadings.map(() => (index < 3 ? 'eager' : 'lazy')),
      })
    })
  })

  it('그림은 장식이다 (제목을 두 번 읽지 않는다)', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.themeFortune.id)

    for (const theme of hubThemePicks()) {
      for (const image of imagesOf(section, theme.title)) {
        expect(image.getAttribute('alt')).toBe('')
        expect(image.getAttribute('aria-hidden')).toBe('true')
      }
    }
  })
})

describe('아이콘 런처 — 구 ② 카드 4장을 흡수한 자리', () => {
  const STUDIO = [
    { label: '궁합', href: '/protected/analysis/compatibility', icon: '/icons/hub/gunghap.webp' },
    { label: '관상', href: '/protected/studio/face', icon: '/icons/hub/gwansang.webp' },
    { label: '손금', href: '/protected/studio/palm', icon: '/icons/hub/songeum.webp' },
    { label: '풍수', href: '/protected/studio/fengshui', icon: '/icons/hub/pungsu.webp' },
  ]

  it('구 카드 4장의 링크·아이콘이 런처 칸으로 그대로 넘어왔다', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.launcher.id)

    for (const { label, href, icon } of STUDIO) {
      const link = within(section).getByRole('link', { name: label })

      expect(link.getAttribute('href')).toBe(href)
      expect(link.querySelector('img')?.getAttribute('src')).toBe(icon)
    }
  })

  it('여덟 칸이 표 순서대로 서고 아이콘은 전부 hub webp 다', async () => {
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.launcher.id)

    expect(within(section).getAllByRole('link')).toHaveLength(HUB_LAUNCHER.length)
    expect(Array.from(section.querySelectorAll('img')).map((image) => image.getAttribute('src'))).toEqual(
      HUB_LAUNCHER.map((entry) => entry.icon)
    )
  })

  it('칸은 router.push 가 아니라 진짜 <a> 다 (새 탭·미리보기가 살아 있다)', async () => {
    // 구 카드는 onClick={() => router.push(...)} 였다 — 링크가 아니라 클릭 핸들러였다.
    const { container } = await renderDashboard()
    const section = sectionOf(container, HUB_SECTIONS.launcher.id)

    for (const entry of HUB_LAUNCHER) {
      const link = within(section).getByRole('link', { name: entry.label })

      expect(link.tagName).toBe('A')
      expect(link.getAttribute('href')).toBeTruthy()
    }
  })

  it('제목은 화면에 글자로 서지 않는다 (아이콘마다 제 이름을 달고 있다)', async () => {
    const { container } = await renderDashboard()
    const heading = container.querySelector(`#${HUB_SECTIONS.launcher.id}-title`)

    expect(heading?.className).toContain('sr-only')
    expect(screen.queryByText('무엇으로 볼까요')).toBeNull()
    expect(screen.queryByText('청담해화당 통합분석')).toBeNull()
  })
})

describe('허브 본문은 런처 + 한 섹션뿐이다 (CEO 2026-08-13)', () => {
  it('오늘의 정성·절기 배너·더 깊이 들여다보기를 그리지 않는다', async () => {
    const { container } = await renderDashboard()

    expect(screen.queryByText('오늘의 정성')).toBeNull()
    expect(screen.queryByText('절기 특별 이벤트')).toBeNull()
    expect(screen.queryByText('더 깊이 들여다보기')).toBeNull()
    expect(container.querySelector('#hub-deeper')).toBeNull()
    expect(container.querySelector('#hub-ritual')).toBeNull()
    expect(container.querySelector('#hub-daily')).toBeNull()
    expect(container.querySelector('#hub-studio')).toBeNull()
  })

  it('서버 액션을 부르는 카드가 하나도 남지 않았다', async () => {
    // 오늘의 정성 카드가 마운트마다 부르던 getDailyRitualStatus 가 사라졌다 —
    // 이제 이 화면은 모킹 없이도 선다(위 테스트들이 액션 모킹 없이 도는 것이 증거).
    const source = readFileSync(join(process.cwd(), 'components/analysis/AnalysisDashboard.tsx'), 'utf8')

    expect(source).not.toMatch(/@\/app\/actions/)
  })
})

describe('허브는 AI 를 부르지 않는다', () => {
  it('테마 섹션은 서버 액션을 하나도 import 하지 않는다', () => {
    // 9차 사고(마운트마다 Gemini 생성) 재발 방지선. 카드는 제목·그림만 그린다.
    const source = readFileSync(join(process.cwd(), 'lib/domain/theme-fortune/themes.ts'), 'utf8')

    expect(source).not.toMatch(/use server|app\/actions/)
  })
})
