/**
 * 고정 상단 바 — 허브에서만 「앱 헤더」로 바뀐다 (CEO 2026-08-13).
 *
 * 🔴 이 테스트의 핵심은 **바가 둘이 되지 않는 것**이다. 페이지 안에 헤더를 또 그리면 같은
 *    상호가 세로로 두 번 뜬다. 그래서 앱 헤더는 여기(고정 바) 한 곳에서만 난다.
 *
 * 나머지 화면은 종전 그대로 — 뒤로가기·상호·홈. 최상위 탭인 허브에서만 그 셋이 내려간다.
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

describe('허브(앱 홈)의 상단 바 = 앱 헤더', () => {
  beforeEach(() => setPath('/protected/analysis'))

  it('아이콘과 상호가 한 줄에 선다', () => {
    const { container } = render(<MobileHeader />)
    const header = container.querySelector('header')
    if (!header) throw new Error('헤더가 없다')

    expect(within(header).getByText('청담해화당')).not.toBeNull()
    expect(header.querySelector('img')?.getAttribute('src')).toBe('/logo-new.png')
  })

  it('상호는 한 번만 난다 (바가 둘이면 여기서 깨진다)', () => {
    render(<MobileHeader />)

    expect(screen.getAllByText('청담해화당')).toHaveLength(1)
  })

  it('인사 한 줄이 붙는다', () => {
    const { container } = render(<MobileHeader />)

    // 결정론이라 문장은 시각에 따라 갈린다 — 여기서는 «비어 있지 않다»만 본다.
    // 어떤 시각에 무슨 문장인지는 lib/domain/analysis/__tests__/hub-home.test.ts 가 본다.
    const texts = Array.from(container.querySelectorAll('span')).map((node) => node.textContent?.trim())
    expect(texts.filter((text) => text && text !== '청담해화당').length).toBeGreaterThan(0)
  })

  it('뒤로가기·홈 버튼이 없다 (최상위 탭에는 뒤로 갈 곳도 갈 홈도 없다)', () => {
    render(<MobileHeader />)

    expect(screen.queryByLabelText('뒤로')).toBeNull()
    expect(screen.queryByLabelText('홈')).toBeNull()
  })

  it('바는 하나뿐이고 높이는 그대로다 (레이아웃 pt-14 가 이 높이를 전제한다)', () => {
    const { container } = render(<MobileHeader />)

    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelector('header')?.className).toContain('h-14')
  })
})

describe('허브 밖 — 종전 뒤로가기 헤더 그대로', () => {
  it('뒤로가기·상호·홈 셋이 다 있다', () => {
    setPath('/protected/studio/face')
    render(<MobileHeader />)

    expect(screen.getByLabelText('뒤로')).not.toBeNull()
    expect(screen.getByLabelText('홈')).not.toBeNull()
    expect(screen.getByText('청담해화당')).not.toBeNull()
  })

  it('허브 하위 경로는 앱 홈이 아니다 (정확히 그 한 경로에서만 바뀐다)', () => {
    setPath('/protected/analysis/compatibility')
    render(<MobileHeader />)

    expect(screen.getByLabelText('뒤로')).not.toBeNull()
  })
})

describe('가이드 종 — 상단 바 붙박이 (하단 공지 바에서 올라옴, 2026-08-23)', () => {
  it('허브에서도 허브 밖에서도 종이 헤더 안에 선다', () => {
    for (const path of ['/protected/analysis', '/protected/studio/face']) {
      setPath(path)
      const { container, unmount } = render(<MobileHeader />)
      const header = container.querySelector('header')
      if (!header) throw new Error('헤더가 없다')

      expect(within(header).getByLabelText('해화지기의 안내 펼치기')).not.toBeNull()
      unmount()
    }
  })

  it('패널이 바 바로 아래로 펼쳐지도록 헤더가 위치 기준점이 된다', () => {
    setPath('/protected/analysis')
    const { container } = render(<MobileHeader />)

    // GuideBell 의 패널은 absolute top-full — 기준이 될 positioned 조상이 없으면 엉뚱한 데 뜬다.
    expect(container.querySelector('header')?.className).toContain('relative')
  })
})
