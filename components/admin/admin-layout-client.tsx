'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  ArrowLeft,
  Sparkles,
  Menu,
  X,
  Shield,
  Power,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  Sparkles,
  Power,
  Activity,
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

export function AdminLayoutClient({ children, menuItems }: AdminLayoutClientProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 text-stone-100 font-sans relative flex flex-col w-full max-w-[480px] mx-auto shadow-2xl overflow-hidden selection:bg-gold-500/30">
      {/* Background Texture & Noise */}
      <div className="hanji-overlay opacity-40" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-ink-950/95 backdrop-blur-xl border-b border-gold-500/10 shadow-lg">
        {/* Branding Row */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center font-serif font-black text-ink-950 shadow-lg shadow-gold-500/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
              <span className="relative">海</span>
            </div>
            <div>
              <div className="font-serif font-bold text-stone-100 flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-gold-500" />
                해화당 Admin
              </div>
              <div className="text-[9px] md:text-[10px] text-stone-500 tracking-[0.2em] font-sans font-bold">
                SYSTEM CONTROL
              </div>
            </div>
          </div>

          <Link href="/protected">
            <button className="p-1.5 md:p-2 -mr-2 text-stone-500 hover:text-gold-400 transition-colors">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </Link>
        </div>

        {/* Horizontal Scrollable Menu */}
        <div className="w-full overflow-x-auto no-scrollbar border-b border-gold-500/10 bg-ink-900/50">
          <div className="flex px-3 md:px-4 min-w-max pb-0.5 items-end">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div key={`divider-${item.label}`} className="flex items-center self-stretch px-1 md:px-1.5">
                    <div className="h-8 border-l border-stone-700/40" />
                    <span className="text-[8px] md:text-[9px] text-stone-600 font-bold uppercase tracking-wider whitespace-nowrap pl-1.5 pr-0.5 self-end pb-2.5 md:pb-3">
                      {item.label}
                    </span>
                  </div>
                )
              }

              const Icon = ICON_MAP[item.icon] || Sparkles
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 md:gap-1.5 px-3 md:px-4 py-2.5 md:py-3 min-w-[64px] md:min-w-[72px] relative group transition-all',
                    isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 md:p-2 rounded-lg transition-all duration-300 relative overflow-hidden',
                      isActive
                        ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-ink-950 shadow-lg shadow-gold-500/30 scale-105'
                        : 'text-stone-400 bg-transparent group-hover:bg-stone-800/50'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                    )}
                    <Icon
                      className={cn('w-4 h-4 md:w-5 md:h-5 relative', isActive && 'drop-shadow-sm')}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[9px] md:text-[10px] font-sans font-bold whitespace-nowrap transition-colors',
                      isActive ? 'text-gold-400' : 'text-stone-500'
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent rounded-t-full" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 p-4 md:p-6 pb-20 md:pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
      </main>
    </div>
  )
}
