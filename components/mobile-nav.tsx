'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, History, User, MessageCircle, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  const activeLink = (path: string) => pathname === path

  return (
    <>
      {/* Bottom Navigation */}
      <nav
        aria-label="주요 메뉴"
        className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] bg-charcoal-deep/90 backdrop-blur-xl border-t border-white/10 pb-safe-area"
      >
        <div className="flex justify-around items-center h-16">
          <Link
            href="/protected"
            aria-label="홈"
            aria-current={activeLink('/protected') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg',
              activeLink('/protected') ? 'text-gold-500' : 'text-muted-foreground hover:text-white'
            )}
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">홈</span>
          </Link>
          <Link
            href="/protected/saju/today"
            aria-label="오늘운세"
            aria-current={activeLink('/protected/saju/today') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg',
              activeLink('/protected/saju/today') ? 'text-gold-500' : 'text-muted-foreground hover:text-white'
            )}
          >
            <Sun className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">오늘운세</span>
          </Link>
          <Link
            href="/protected/analysis"
            aria-label="분석"
            aria-current={activeLink('/protected/analysis') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg',
              activeLink('/protected/analysis') ? 'text-gold-500' : 'text-muted-foreground hover:text-white'
            )}
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">분석</span>
          </Link>
          <Link
            href="/protected/history"
            aria-label="비록"
            aria-current={activeLink('/protected/history') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg',
              activeLink('/protected/history') ? 'text-gold-500' : 'text-muted-foreground hover:text-white'
            )}
          >
            <History className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">비록</span>
          </Link>
          <Link
            href="/protected/profile"
            aria-label="프로필"
            aria-current={activeLink('/protected/profile') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-lg',
              activeLink('/protected/profile') ? 'text-gold-500' : 'text-muted-foreground hover:text-white'
            )}
          >
            <User className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">프로필</span>
          </Link>
        </div>
      </nav>

      {/* Kakao Floating Button */}
      <a
        href="http://pf.kakao.com/_xmtQgn"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#FEE500] shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
      >
        <MessageCircle className="w-5 h-5 text-[#3C1E1E]" />
      </a>
    </>
  )
}
