'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Sun,
  BookOpen,
  ScanFace,
  Hand,
  Compass,
  CreditCard,
  Ticket,
  Users,
  Clock,
  Crown,
  Activity,
  Sparkles,
} from 'lucide-react'
import { getCurrentUserRole } from '@/app/actions/payment/products'
import { getSubscriptionStatus } from '@/app/actions/payment/subscription'
import { UserRole } from '@/types/auth'
import { TalismanBalance } from '@/components/talisman-balance'
import { SubscriptionBadge } from '@/components/membership/subscription-badge'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, mobileMenuVariants } from '@/lib/animations'

export function ProtectedHeader({ user }: { user: any }) {
  const [isMounted, setIsMounted] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [planName, setPlanName] = useState<string>('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    getCurrentUserRole().then((res) => setUserRole(res.role))
    getSubscriptionStatus().then((res) => {
      if (res.isSubscribed && res.plan) {
        // Determine display name based on tier if possible, or use name logic
        // Plan names are "싱글 멤버십", "패밀리 멤버십", etc.
        // We can just show the tier or name. User asked for "Plan Grade" (플랜등급).
        // Let's use the plan name but maybe simplified.
        // Actually, let's just use plan.name (e.g. "싱글 멤버십").
        setPlanName(res.plan.name)
      } else {
        setPlanName('무료 회원')
      }
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!isMounted) return null

  const userEmail = user?.email || ''
  const userName = userEmail.split('@')[0] || 'User'
  const userInitial = userName[0]?.toUpperCase() || 'U'
  const avatarUrl = user?.user_metadata?.avatar_url

  return (
    <header className="fixed top-0 left-0 w-full z-[40] bg-hanji/90 backdrop-blur-md border-b border-ink/5 transition-all duration-300">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-12">
          {/* Logo: Oriental Style */}
          <Link href="/protected" className="flex items-center gap-3 group">
            <div className="w-8 h-8 flex items-center justify-center border border-cinnabar/30 rounded-full bg-white shadow-sm relative overflow-hidden group-hover:border-cinnabar transition-colors duration-300">
              <span className="font-gungseo font-bold text-cinnabar z-10">海</span>
            </div>
            <h1 className="font-gungseo text-xl font-bold text-ink tracking-tight group-hover:text-cinnabar transition-colors">
              청담해화당
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 font-gungseo">
            {/* 해화사주 Dropdown */}
            <div className="relative group h-16 flex items-center">
              <Link
                href="/protected"
                className="flex items-center gap-1.5 text-sm font-bold text-ink/70 hover:text-cinnabar transition-colors"
              >
                해화사주 <ChevronDown className="w-3 h-3 opacity-50" />
              </Link>

              {/* Dropdown Panel */}
              <div className="absolute top-16 left-0 w-48 bg-white border border-ink/10 rounded-sm shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
                <Link
                  href="/protected/ai-shaman"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-ink/5 text-ink/80 hover:text-cinnabar transition-colors border-b border-ink/5 mb-1"
                >
                  <Sparkles className="w-4 h-4 text-gold-500" />
                  <span className="text-sm font-bold">AI 신당</span>
                  <Crown className="w-3 h-3 text-gold-500 ml-auto" />
                </Link>
                <Link
                  href="/protected/saju/today"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-ink/5 text-ink/80 hover:text-cinnabar transition-colors"
                >
                  <Sun className="w-4 h-4 text-ink/40" />
                  <span className="text-sm">오늘의 운세</span>
                </Link>
                <Link
                  href="/protected/analysis"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-ink/5 text-ink/80 hover:text-cinnabar transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-ink/40" />
                  <span className="text-sm">사주 풀이</span>
                </Link>
                <Link
                  href="/protected/saju/face"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-ink/5 text-ink/80 hover:text-cinnabar transition-colors"
                >
                  <ScanFace className="w-4 h-4 text-ink/40" />
                  <span className="text-sm">관상</span>
                </Link>
                <Link
                  href="/protected/saju/hand"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-ink/5 text-ink/80 hover:text-cinnabar transition-colors"
                >
                  <Hand className="w-4 h-4 text-ink/40" />
                  <span className="text-sm">손금</span>
                </Link>
                <Link
                  href="/protected/saju/fengshui"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-ink/5 text-ink/80 hover:text-cinnabar transition-colors"
                >
                  <Compass className="w-4 h-4 text-ink/40" />
                  <span className="text-sm">풍수</span>
                </Link>
              </div>
            </div>

            <Link
              href="/protected/analysis"
              className="text-sm font-bold text-ink/70 hover:text-cinnabar transition-colors"
            >
              천지인 분석
            </Link>
            <Link
              href="/protected/family"
              className="text-sm font-bold text-ink/70 hover:text-cinnabar transition-colors"
            >
              인연 관리
            </Link>
            <Link
              href="/protected/history"
              className="text-sm font-bold text-ink/70 hover:text-cinnabar transition-colors"
            >
              비록함
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Talisman Balance (Premium Badge) */}
          <TalismanBalance />

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-0.5 h-9 w-9 rounded-full border border-ink/10 hover:border-gold-400 transition-colors overflow-hidden bg-white shadow-sm outline-none">
                <Avatar className="h-full w-full">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-ink/5 text-ink font-bold text-xs font-gungseo">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-64 bg-white border-ink/10 text-ink p-2 shadow-2xl rounded-sm mt-3 font-sans"
              align="end"
            >
              <div className="px-3 py-4 border-b border-ink/5 mb-1 bg-hanji/50">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="font-gungseo font-bold text-ink text-base">{userName}</div>
                  {planName && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full border border-gold-200">
                      {planName}
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink/40 font-mono">{userEmail}</div>
              </div>

              {userRole === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin"
                    className="cursor-pointer group flex items-center gap-3 p-3 rounded-sm text-ink hover:bg-ink/5 mb-1 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="font-bold text-sm text-ink">관리자 페이지</span>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link
                  href="/protected/profile"
                  className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-ink/5 transition-colors"
                >
                  <User className="w-4 h-4 text-gold-500" />
                  <span className="text-sm">프로필 관리</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/protected/profile/manse"
                  className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-ink/5 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-gold-500" />
                  <span className="text-sm">내 사주 (만세력)</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/protected/membership/manage?tab=store"
                  className="cursor-pointer flex items-center gap-3 p-3 rounded-sm hover:bg-ink/5 transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-gold-500" />
                  <span className="text-sm font-bold">멤버십 결제</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-ink/5 my-1" />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer flex items-center gap-3 p-3 rounded-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-bold">로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Hamburger Removed for Bottom Nav */}
        </div>
      </div>
    </header>
  )
}
