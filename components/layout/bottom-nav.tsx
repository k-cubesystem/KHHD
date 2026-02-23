'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Users, Sparkles, BookOpen, MessageCircleHeart, UserCircle, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  type NavItem = {
    label: string
    icon: typeof Home
    href: string
    isMain?: boolean
  }

  const NAV_ITEMS: NavItem[] = [
    { label: '사주/궁합', icon: Home, href: '/protected/analysis' },
    { label: '가족관리', icon: Users, href: '/protected/family' },
    { label: '해화지기', icon: MessageCircleHeart, href: '/protected/ai-shaman', isMain: true },
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
                'flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-all text-white/30 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-lg',
                isActive && 'text-[#D4AF37]',
                item.isMain && 'pb-1' // Subtle lift
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-300 relative',
                  isActive && !item.isMain && 'bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]',
                  // Premium Style for Haehwajigi: Glassy Gold, Subtle Glow, continuous border
                  item.isMain &&
                    'p-2.5 rounded-full bg-gradient-to-b from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/50 shadow-[0_0_15px_rgba(212,175,55,0.15)] mb-1'
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'stroke-[1.5] transition-all',
                    item.isMain ? 'w-5 h-5 text-[#D4AF37]' : 'w-5 h-5',
                    isActive && !item.isMain && 'stroke-[#D4AF37] fill-[#D4AF37]/20',
                    isActive &&
                      item.isMain &&
                      'stroke-[#D4AF37] fill-[#D4AF37]/10 drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium tracking-tight transition-all',
                  isActive ? 'text-[#D4AF37] font-bold' : 'font-sans',
                  item.isMain && 'font-serif text-[#D4AF37]/90 font-medium tracking-wide text-[11px]'
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
