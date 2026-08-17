'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  Sparkles,
  X,
  Shield,
  Power,
  Activity,
  BookOpen,
  ScrollText,
  Menu,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  Sparkles,
  Power,
  Activity,
  Shield,
  BookOpen,
  ScrollText,
}

interface MenuLink {
  type?: undefined
  href: string
  label: string
  icon: string
}

interface MenuDivider {
  type: 'divider'
  label: string
}

type MenuItem = MenuLink | MenuDivider

interface AdminLayoutClientProps {
  children: React.ReactNode
  menuItems: MenuItem[]
}

/**
 * 어드민 셸 — 모바일 우선(480px 프레임).
 * 메뉴는 상단 가로 스크롤 아이콘 바 대신 **햄버거 → 좌측 드로어**(섹션별 세로 목록).
 * 상단 바는 브랜드·현재 페이지명·햄버거만 남겨 콘텐츠 영역을 넓힌다.
 * 드로어는 라우트가 바뀌면 자동으로 닫힌다.
 */
export function AdminLayoutClient({ children, menuItems }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(href))

  // 현재 페이지명 — 상단 바 타이틀. 가장 긴 매칭 href 가 이긴다(/admin 과 /admin/users 충돌 방지).
  const current = useMemo(() => {
    let best: MenuLink | null = null
    for (const it of menuItems) {
      if (it.type === 'divider') continue
      if (isActive(it.href) && (!best || it.href.length > best.href.length)) best = it
    }
    return best
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, menuItems])

  // 섹션 묶기 — divider 가 섹션 헤더
  const sections = useMemo(() => {
    const out: Array<{ label: string | null; links: MenuLink[] }> = []
    let cur: { label: string | null; links: MenuLink[] } = { label: null, links: [] }
    for (const it of menuItems) {
      if (it.type === 'divider') {
        if (cur.links.length) out.push(cur)
        cur = { label: it.label, links: [] }
      } else {
        cur.links.push(it)
      }
    }
    if (cur.links.length) out.push(cur)
    return out
  }, [menuItems])

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 text-stone-100 font-sans relative flex flex-col w-full max-w-[480px] mx-auto shadow-2xl overflow-hidden selection:bg-gold-500/30">
      <div className="hanji-overlay opacity-40" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

      {/* Top bar — 햄버거 · 현재 페이지 · 닫기 */}
      <header className="sticky top-0 z-40 bg-ink-950/95 backdrop-blur-xl border-b border-gold-500/10 shadow-lg">
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="메뉴 열기"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-300 hover:bg-stone-800/60 hover:text-gold-400 active:scale-95 transition"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-[82%] max-w-[340px] border-r border-gold-500/15 bg-ink-950 p-0 text-stone-100"
            >
              <SheetTitle className="sr-only">관리자 메뉴</SheetTitle>
              <div className="flex h-full flex-col">
                {/* Drawer header */}
                <div
                  className="flex items-center gap-2.5 border-b border-gold-500/10 px-4 py-4"
                  style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
                >
                  <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden bg-gradient-to-br from-gold-500 to-gold-600 font-serif font-black text-ink-950 shadow-lg shadow-gold-500/20">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                    <span className="relative">海</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-serif text-sm font-bold text-stone-100">
                      <Shield className="h-3.5 w-3.5 text-gold-500" />
                      해화당 Admin
                    </div>
                    <div className="text-[9px] font-bold tracking-[0.2em] text-stone-500">SYSTEM CONTROL</div>
                  </div>
                  <button
                    type="button"
                    aria-label="메뉴 닫기"
                    onClick={() => setOpen(false)}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-800/60 hover:text-gold-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Sections */}
                <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-2" aria-label="관리자 메뉴">
                  {sections.map((sec, si) => (
                    <div key={sec.label ?? `top-${si}`} className={cn(si > 0 && 'mt-3')}>
                      {sec.label ? (
                        <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-600">
                          {sec.label}
                        </div>
                      ) : null}
                      <ul className="space-y-0.5">
                        {sec.links.map((item) => {
                          const Icon = ICON_MAP[item.icon] || Sparkles
                          const active = isActive(item.href)
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                  'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors',
                                  active
                                    ? 'bg-gold-500/15 text-gold-300'
                                    : 'text-stone-300 hover:bg-stone-800/60 hover:text-stone-100'
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                                    active
                                      ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-ink-950 shadow-md shadow-gold-500/30'
                                      : 'bg-stone-800/50 text-stone-400'
                                  )}
                                >
                                  <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                                </span>
                                <span className="flex-1 truncate">{item.label}</span>
                                {active ? <ChevronRight className="h-4 w-4 text-gold-500/70" /> : null}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </nav>

                <div
                  className="border-t border-gold-500/10 px-4 py-3"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                >
                  <Link
                    href="/protected"
                    className="flex min-h-[44px] items-center gap-2 text-[13px] text-stone-400 hover:text-gold-400"
                  >
                    <X className="h-4 w-4" />
                    앱으로 나가기
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-[15px] font-bold text-stone-100">{current?.label ?? '관리자'}</div>
            <div className="text-[9px] font-bold tracking-[0.2em] text-stone-500">해화당 ADMIN</div>
          </div>

          <Link
            href="/protected"
            aria-label="앱으로 나가기"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-800/60 hover:text-gold-400"
          >
            <X className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 pb-24"
        style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}
      >
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
      </main>
    </div>
  )
}
