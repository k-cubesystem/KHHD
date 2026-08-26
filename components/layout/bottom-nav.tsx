'use client'

import { memo, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { getUnreadReplyCount } from '@/app/actions/support/tickets'
import { logger } from '@/lib/utils/logger'

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [unread, setUnread] = useState(0)

  /**
   * 1:1 문의 답변 알림 점.
   *
   * 🔴 경로가 바뀔 때마다 다시 센다 — 문의함을 열고 나오면 점이 즉시 꺼져야 하고, 다른 화면을
   *    오가는 사이 답이 달렸으면 그때 켜져야 한다. 폴링(setInterval)은 두지 않는다: 하단 바는
   *    전 화면에 상주하므로 주기 조회를 걸면 앱 전체가 쉬지 않고 서버를 두드린다.
   * 🔴 실패는 삼킨다 — 문의 알림 하나 때문에 하단 내비가 사라지면 앱 전체를 잃는다.
   */
  useEffect(() => {
    if (!pathname.startsWith('/protected')) return
    let active = true
    getUnreadReplyCount()
      .then((n) => {
        if (active) setUnread(n)
      })
      .catch((e) => logger.warn('[nav] 문의 답변 수 조회 실패(비치명):', e))
    return () => {
      active = false
    }
  }, [pathname])

  type NavItem = {
    label: string
    /** 「설빛 온기」 일러스트 아이콘 (public/icons/nav) */
    icon: string
    href: string
    /** 안 읽은 것이 있으면 붉은 점을 얹는다(개수는 안 쓴다 — 6칸에 숫자는 읽히지 않는다) */
    dot?: boolean
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
    // 1:1 문의 — 기능(문의 등록·답변·읽음)은 2026-08 에 이미 완성돼 있었고 **문만 없었다**.
    // 프로필 안쪽·푸터 링크로만 닿아서 「답이 왔는지」를 보려면 두 번 들어가야 했다(CEO 2026-08-26).
    { label: t('support'), icon: '/icons/nav/support.webp', href: '/protected/support', dot: unread > 0 },
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
              aria-label={item.dot ? `${item.label} · 새 답변 있음` : item.label}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-0.5 active:scale-95 transition-all text-stone-500 hover:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-lg',
                isActive && 'text-gold-500'
              )}
            >
              <div
                className={cn(
                  'relative p-1 rounded-xl transition-all duration-300',
                  isActive && 'bg-gold-500/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                )}
              >
                {/* 답변 알림 점 — 숫자 대신 점 하나. 여섯 칸에 숫자를 넣으면 아이콘을 가린다 */}
                {item.dot && (
                  <span
                    aria-hidden
                    className="absolute right-0 top-0 h-2 w-2 rounded-full bg-seal ring-1 ring-charcoal-deep"
                  />
                )}
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
              {/* 여섯 칸이 된 뒤로 좁은 폰(360px)에서 한 칸이 57px 다 — 「1:1문의」 다섯 글자가
                  87% 를 먹는다. 줄바꿈·말줄임을 막아 두 줄로 흐르거나 잘리지 않게 한다. */}
              <span
                className={cn(
                  'max-w-full truncate whitespace-nowrap text-[10px] font-medium tracking-tight transition-all',
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
