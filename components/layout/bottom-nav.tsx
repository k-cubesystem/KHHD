'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Users, BookOpen, MessageCircle, UserCircle, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  type NavItem = {
    label: string
    icon: typeof Home
    href: string
  }

  const NAV_ITEMS: NavItem[] = [
    { label: '사주/궁합', icon: Home, href: '/protected/analysis' },
    { label: '가족관리', icon: Users, href: '/protected/family' },
    { label: '고민상담', icon: MessageCircle, href: '/protected/ai-shaman' },
    { label: '사주팔자', icon: BookOpen, href: '/protected/profile/manse' },
    { label: '프로필', icon: UserCircle, href: '/protected/profile' },
  ]

  // Hidden on non-protected pages
  if (!pathname.startsWith('/protected')) return null

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/10 pb-safe-area-bottom"
    >
      <div className="flex justify-around items-center h-[60px] px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-all text-stone-500 hover:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-lg',
                isActive && 'text-[#D4AF37]'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-300',
                  isActive && 'bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'w-5 h-5 stroke-[1.5] transition-all',
                    isActive && 'stroke-[#D4AF37] fill-[#D4AF37]/20'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium tracking-tight transition-all',
                  isActive ? 'text-[#D4AF37] font-bold' : 'font-sans'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
