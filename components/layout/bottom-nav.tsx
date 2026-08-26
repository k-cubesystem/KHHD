'use client'

import { memo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  type NavItem = {
    label: string
    /** 「설빛 온기」 일러스트 아이콘 (public/icons/nav) */
    icon: string
    href: string
  }

  /**
   * 순서 = 화면에서의 자리다. 신당이 가운데(3번째), 고민상담이 그 오른쪽 —
   * 종전의 두 자리를 맞바꿨다 (CEO 6차 지시 2026-07-30: "신당을 가운데로, 고민상담을 신당자리로").
   * 다섯 칸 중 가운데가 엄지에 가장 가까운 자리라, 매일 들르는 신당을 그 자리에 둔다.
   */
  const NAV_ITEMS: NavItem[] = [
    { label: t('analysis'), icon: '/icons/nav/analysis.webp', href: '/protected/analysis' },
    // 가족관리는 신당 상단(가족 탭 옆)으로 옮겼다 — 대상 탭과 같은 축이라 그 자리가 제자리다.
    // 비운 칸은 웹툰 연재가 잇는다(CEO 2026-08-01).
    { label: t('webtoon'), icon: '/icons/nav/webtoon.webp', href: '/protected/webtoon' },
    { label: t('shrine'), icon: '/icons/nav/shrine.webp', href: '/protected/shrine' },
    { label: t('chat'), icon: '/icons/nav/chat.webp', href: '/protected/ai-shaman' },
    { label: t('profile'), icon: '/icons/nav/profile.webp', href: '/protected/profile' },
  ]

  // Hidden on non-protected pages
  if (!pathname.startsWith('/protected')) return null

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] z-50 bg-charcoal-deep/80 backdrop-blur-xl border-t border-white/10 pb-safe-area-bottom"
    >
      <div className="flex justify-around items-center h-[60px] px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-all text-stone-500 hover:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-lg',
                isActive && 'text-gold-500'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-xl transition-all duration-300',
                  isActive && 'bg-gold-500/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                )}
              >
                <Image
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                  width={26}
                  height={26}
                  className={cn(
                    'w-[26px] h-[26px] object-contain transition-all duration-300',
                    isActive
                      ? 'opacity-100 scale-110 drop-shadow-[0_0_6px_rgba(212,175,55,0.45)]'
                      : 'opacity-55 grayscale-[35%]'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium tracking-tight transition-all',
                  isActive ? 'text-gold-500 font-bold' : 'font-sans'
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
})
