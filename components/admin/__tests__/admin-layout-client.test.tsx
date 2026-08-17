import { fireEvent, render, screen, within } from '@testing-library/react'
import { AdminLayoutClient } from '../admin-layout-client'

/**
 * 어드민 셸(햄버거 드로어)의 **구조 불변식**.
 *
 * 이 파일이 있는 이유: 상단 가로 스크롤 메뉴를 드로어로 바꿨는데, 로컬 dev·e2e 계정이 없어 눈으로 확인할
 * 경로가 막혔다. 눈 대신 DOM 으로 지킨다 — 상단 바에 메뉴 항목이 «없어야» 하고(가로 스크롤 회귀 방지),
 * 햄버거를 열면 섹션·항목이 전부 나오며, 현재 경로가 활성 표시되고 상단 타이틀이 된다.
 */

let mockPath = '/admin/analytics'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPath,
}))

const MENU = [
  { href: '/admin', label: '대시보드', icon: 'LayoutDashboard' },
  { type: 'divider' as const, label: '운영 관리' },
  { href: '/admin/users', label: '회원 관리', icon: 'Users' },
  { href: '/admin/payments', label: '결제 내역', icon: 'CreditCard' },
  { type: 'divider' as const, label: '분석' },
  { href: '/admin/analytics', label: '분석 대시보드', icon: 'Activity' },
  { type: 'divider' as const, label: '이벤트 & 마케팅' },
  { href: '/admin/threads', label: '스레드 이벤트', icon: 'ScrollText' },
]

/** 링크 접근 가능한 이름은 아이콘·쉐브론이 없어 라벨 텍스트와 정확히 같다 → 정확 매칭으로 잡는다. */
const linkNamed = (scope: ReturnType<typeof within>, label: string) =>
  scope.getByRole('link', { name: new RegExp(`^${label}$`) })

// Radix Sheet 는 jsdom 에 없는 API 를 쓴다
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false)
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {})
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {})
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})
})

describe('AdminLayoutClient — 햄버거 드로어', () => {
  beforeEach(() => {
    mockPath = '/admin/analytics'
  })

  it('상단 바에는 메뉴 항목이 없다(가로 스크롤 메뉴 회귀 방지) — 햄버거·현재 페이지명·나가기만', () => {
    render(<AdminLayoutClient menuItems={MENU}>본문</AdminLayoutClient>)
    const header = screen.getByRole('banner')
    expect(within(header).getByLabelText('메뉴 열기')).toBeInTheDocument()
    expect(within(header).getByText('분석 대시보드')).toBeInTheDocument()
    expect(within(header).getByLabelText('앱으로 나가기')).toBeInTheDocument()
    expect(within(header).queryByText('회원 관리')).toBeNull()
    expect(within(header).queryByText('스레드 이벤트')).toBeNull()
    expect(screen.queryByRole('navigation', { name: '관리자 메뉴' })).toBeNull()
  })

  it('햄버거를 누르면 섹션 헤더와 전 항목이 드로어에 나오고 현재 경로가 활성이다', () => {
    render(<AdminLayoutClient menuItems={MENU}>본문</AdminLayoutClient>)
    fireEvent.click(screen.getByLabelText('메뉴 열기'))
    const nav = within(screen.getByRole('navigation', { name: '관리자 메뉴' }))
    for (const label of ['운영 관리', '분석', '이벤트 & 마케팅']) expect(nav.getByText(label)).toBeInTheDocument()
    for (const label of ['대시보드', '회원 관리', '결제 내역', '분석 대시보드', '스레드 이벤트']) {
      expect(linkNamed(nav, label)).toBeInTheDocument()
    }
    expect(linkNamed(nav, '분석 대시보드')).toHaveAttribute('aria-current', 'page')
    expect(linkNamed(nav, '회원 관리')).not.toHaveAttribute('aria-current')
  })

  it('/admin 은 정확 매칭만 활성(하위 경로에서 대시보드가 같이 켜지지 않는다)', () => {
    mockPath = '/admin/users'
    render(<AdminLayoutClient menuItems={MENU}>본문</AdminLayoutClient>)
    expect(within(screen.getByRole('banner')).getByText('회원 관리')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('메뉴 열기'))
    const nav = within(screen.getByRole('navigation', { name: '관리자 메뉴' }))
    expect(linkNamed(nav, '회원 관리')).toHaveAttribute('aria-current', 'page')
    expect(linkNamed(nav, '대시보드')).not.toHaveAttribute('aria-current')
  })

  it('터치 타깃 — 햄버거·메뉴 항목이 44px 급 클래스를 가진다', () => {
    render(<AdminLayoutClient menuItems={MENU}>본문</AdminLayoutClient>)
    expect(screen.getByLabelText('메뉴 열기').className).toMatch(/h-10 w-10/)
    fireEvent.click(screen.getByLabelText('메뉴 열기'))
    const nav = within(screen.getByRole('navigation', { name: '관리자 메뉴' }))
    expect(linkNamed(nav, '회원 관리').className).toMatch(/min-h-\[44px\]/)
  })
})
