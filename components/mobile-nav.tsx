'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sparkles, History, User, Users, MessageCircle, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  const activeLink = (path: string) => pathname === path

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="주요 메뉴"
        className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/10 pb-safe-area md:hidden"
      >
        <div className="flex justify-around items-center h-16">
          <Link
            href="/protected"
            aria-label="홈"
            aria-current={activeLink('/protected') ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg',
              activeLink('/protected') ? 'text-[#D4AF37]' : 'text-muted-foreground hover:text-white'
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
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg',
              activeLink('/protected/saju/today') ? 'text-[#D4AF37]' : 'text-muted-foreground hover:text-white'
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
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg',
              activeLink('/protected/analysis') ? 'text-[#D4AF37]' : 'text-muted-foreground hover:text-white'
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
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg',
              activeLink('/protected/history') ? 'text-[#D4AF37]' : 'text-muted-foreground hover:text-white'
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
              'flex flex-col items-center gap-1 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg',
              activeLink('/protected/profile') ? 'text-[#D4AF37]' : 'text-muted-foreground hover:text-white'
            )}
          >
            <User className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">프로필</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Kakao Floating Button */}
      <a
        href="http://pf.kakao.com/_xmtQgn"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-50 md:hidden w-12 h-12 rounded-full bg-[#FEE500] shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
      >
        <MessageCircle className="w-5 h-5 text-[#3C1E1E]" />
      </a>

      {/* Desktop Floating Bottom Bar */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          <Link
            href="/protected"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              activeLink('/protected') ? 'bg-[#D4AF37] text-black' : 'hover:bg-white/10 text-white'
            )}
          >
            <Home className="w-4 h-4" />
            <span className="font-bold text-sm">홈</span>
          </Link>
          <Link
            href="/protected/saju/today"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              activeLink('/protected/saju/today') ? 'bg-[#D4AF37] text-black' : 'hover:bg-white/10 text-primary'
            )}
          >
            <Sun className="w-4 h-4" />
            <span className="font-bold text-sm">오늘운세</span>
          </Link>
          <Link
            href="/protected/analysis"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              activeLink('/protected/analysis') ? 'bg-[#D4AF37] text-black' : 'hover:bg-white/10 text-[#D4AF37]'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-bold text-sm">분석</span>
          </Link>
          <Link
            href="/protected/family"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              activeLink('/protected/family') ? 'bg-[#D4AF37] text-black' : 'hover:bg-white/10 text-white'
            )}
          >
            <Users className="w-4 h-4" />
            <span className="font-bold text-sm">가족</span>
          </Link>
          <Link
            href="/protected/history"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              activeLink('/protected/history') ? 'bg-[#D4AF37] text-black' : 'hover:bg-white/10 text-white'
            )}
          >
            <History className="w-4 h-4" />
            <span className="font-bold text-sm">비록</span>
          </Link>
          <Link
            href="/protected/profile"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              activeLink('/protected/profile') ? 'bg-[#D4AF37] text-black' : 'hover:bg-white/10 text-white'
            )}
          >
            <User className="w-4 h-4" />
            <span className="font-bold text-sm">프로필</span>
          </Link>

          <div className="w-px h-8 bg-white/10 mx-2" />

          {/* Kakao Channel Button */}
          <a
            href="http://pf.kakao.com/_xmtQgn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#3C1E1E]" />
            <span className="font-bold text-sm text-[#3C1E1E]">카카오톡</span>
          </a>
        </div>
      </div>
    </>
  )
}
