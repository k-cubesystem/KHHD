import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/layout/bottom-nav'

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const setPath = (path: string) => (usePathname as jest.Mock).mockReturnValue(path)

describe('BottomNav — 어디서 서는가', () => {
  it('보호 화면에서 다섯 칸이 선다', () => {
    setPath('/protected/analysis')
    render(<BottomNav />)
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(5)
  })

  it('🔴 웹툰(공개 라우트)에서도 선다 — CEO 2026-09-13 「웹툰에 들어가면 상단·하단 메뉴가 안 나와」', () => {
    setPath('/webtoon/7')
    render(<BottomNav />)
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'webtoon' })).toHaveAttribute('aria-current', 'page')
  })

  it('그 밖의 공개 화면(랜딩·가이드)에서는 서지 않는다', () => {
    setPath('/guide/ilgan')
    const { container } = render(<BottomNav />)
    expect(container.firstChild).toBeNull()
  })
})
