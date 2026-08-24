/**
 * 고정 상단 바 — **모든 화면이 같은 머리글을 쓴다** (CEO 2026-08-24 "상단헤더를 전부 이렇게").
 *
 * 🔴 이 테스트의 핵심 두 가지:
 *    ① 바가 둘이 되지 않는 것 — 페이지 안에 헤더를 또 그리면 같은 상호가 세로로 두 번 뜬다.
 *    ② 경로에 따라 머리글이 갈라지지 않는 것 — 종전에는 허브만 「앱 헤더」였고 그 밖에서는
 *       «뒤로가기 + 상호 + 홈» 이라 같은 앱에서 머리글이 두 벌이었다. 뒤로가기는 내려갔다.
 */
import { render, screen, within } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MobileHeader } from '@/components/mobile-header'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({ 'brand.name': '청담해화당', 'nav.back': '뒤로', 'nav.home': '홈' })[key] ?? key,
}))

// 종은 서버 액션으로 공지·진행률을 읽는다 — 여기선 «자리에 있는가»만 본다.
jest.mock('@/components/guide/GuideBell', () => ({
  GuideBell: () => <button aria-label="해화지기의 안내 펼치기" />,
}))

const setPath = (path: string) => (usePathname as jest.Mock).mockReturnValue(path)

/** 허브(앱 홈) · 허브 하위 · 완전히 다른 계열 — 어디서든 같은 바여야 한다. */
const PATHS = ['/protected/analysis', '/protected/analysis/compatibility', '/protected/studio/face']

describe('상단 바 — 전 화면 동일', () => {
  beforeEach(() => setPath('/protected/analysis'))

  it.each(PATHS)('%s 에서도 아이콘·상호·종·홈이 한 줄에 선다', (path) => {
    setPath(path)
    const { container } = render(<MobileHeader />)
    const header = container.querySelector('header')
    if (!header) throw new Error('헤더가 없다')

    expect(within(header).getByText('청담해화당')).not.toBeNull()
    expect(header.querySelector('img')?.getAttribute('src')).toBe('/logo-new.png')
    expect(within(header).getByLabelText('해화지기의 안내 펼치기')).not.toBeNull()
    expect(within(header).getByLabelText('홈')).not.toBeNull()
  })

  it.each(PATHS)('%s 에 뒤로가기는 없다 (하단 메뉴·기기 뒤로가기가 진다)', (path) => {
    setPath(path)
    render(<MobileHeader />)

    expect(screen.queryByLabelText('뒤로')).toBeNull()
  })

  it('상호는 한 번만 난다 (바가 둘이면 여기서 깨진다)', () => {
    render(<MobileHeader />)

    expect(screen.getAllByText('청담해화당')).toHaveLength(1)
  })

  it('로고·상호를 누르면 홈으로 간다', () => {
    render(<MobileHeader />)

    expect(screen.getByText('청담해화당').closest('a')?.getAttribute('href')).toBe('/protected/analysis')
    expect(screen.getByLabelText('홈').getAttribute('href')).toBe('/protected/analysis')
  })

  it('상호 말고 다른 글자는 없다 (인사 한 줄은 CEO 지시로 뺐다)', () => {
    const { container } = render(<MobileHeader />)

    const texts = Array.from(container.querySelectorAll('span'))
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
    expect(texts).toEqual(['청담해화당'])
  })

  it('바는 하나뿐이고 높이는 그대로다 (레이아웃 pt-14 가 이 높이를 전제한다)', () => {
    const { container } = render(<MobileHeader />)

    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelector('header')?.className).toContain('h-14')
  })

  it('패널이 바 바로 아래로 펼쳐지도록 헤더가 위치 기준점이 된다', () => {
    const { container } = render(<MobileHeader />)

    // GuideBell 의 패널은 absolute top-full — 기준이 될 positioned 조상이 없으면 엉뚱한 데 뜬다.
    expect(container.querySelector('header')?.className).toContain('relative')
  })
})
