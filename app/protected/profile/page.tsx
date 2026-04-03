import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { AVATAR_BLUR_DATA_URL } from '@/lib/utils/image'
import { logger } from '@/lib/utils/logger'
import { LogoutButton } from '@/components/logout-button'
import { getMonthlyAttendance } from '@/app/actions/payment/attendance'
import { DailyCheckIn } from '@/components/events/daily-check-in'
import {
  ChevronLeft,
  Settings,
  Star,
  ArrowRight,
  Calendar,
  Crown,
  LayoutDashboard,
  Shield,
  Headphones,
  User as UserIcon,
  Coins,
  BookOpen,
  Sparkles,
  Users,
  ScrollText,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { getCurrentUserRole } from '@/app/actions/payment/products'
import { getUserLimitsSummary } from '@/app/actions/payment/membership'
import { Button } from '@/components/ui/button'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'
import { LocaleSwitcher } from '@/components/shared/locale-switcher'
import { getTranslations } from 'next-intl/server'

export default async function MyPage() {
  const t = await getTranslations('settings')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isGuest = !user

  // Guest Preview
  if (isGuest) {
    return (
      <div className="min-h-screen w-full max-w-[480px] mx-auto bg-background text-ink-light font-sans selection:bg-primary/30 pb-24 overflow-x-hidden relative">
        <div className="hanji-overlay" />

        {/* Header */}
        <header className="flex items-center justify-between px-3 py-5 sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/20">
          <Link href="/protected" className="p-1 -ml-1 hover:bg-surface/10 transition-colors">
            <ChevronLeft className="w-6 h-6 text-ink-light/90" />
          </Link>
          <h1 className="text-sm font-serif tracking-[0.2em] text-ink-light/90 uppercase">My Page</h1>
          <div className="w-6 h-6" />
        </header>

        {/* Guest Profile Preview */}
        <section className="flex flex-col items-center pt-10 pb-8 relative z-10 opacity-60">
          <div className="w-28 h-28 border-2 border-primary/20 overflow-hidden bg-surface flex items-center justify-center shadow-lg">
            <span className="font-serif text-4xl text-primary">G</span>
          </div>
          <div className="absolute bottom-8 right-1/2 translate-x-14 translate-y-4 bg-primary text-background p-1.5 shadow-lg border-2 border-background">
            <Star className="w-3.5 h-3.5 fill-current" />
          </div>
        </section>

        {/* Sample Stats (Blurred) */}
        <section className="px-3 mb-10 relative z-10 blur-sm opacity-40">
          <div className="bg-surface/30 border border-primary/20 p-6 grid grid-cols-2 divide-x divide-primary/10">
            <div className="flex flex-col items-center gap-1.5">
              <Coins className="w-5 h-5 text-primary mb-1" strokeWidth={1} />
              <span className="text-xl font-serif text-ink-light font-medium">100</span>
              <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">Credits</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-ink-light/60 mb-1" strokeWidth={1} />
              <span className="text-xl font-serif text-ink-light font-medium">5</span>
              <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">History</span>
            </div>
          </div>
        </section>

        {/* CTA Card */}
        <section className="px-3 relative z-10">
          <div className="bg-surface/40 border border-primary/20 p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-5">
              <Sparkles className="w-32 h-32 text-primary" strokeWidth={0.5} />
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" strokeWidth={1} />
              </div>

              <h2 className="text-3xl font-serif text-ink-light mb-3">가입하고 프로필 만들기</h2>
              <p className="text-sm text-ink-light/70 font-light max-w-md mx-auto mb-8 leading-relaxed">
                청담 해화당에 가입하여 당신만의 운명 분석 기록을 관리하고,
                <br />
                무제한 AI 기능을 이용하세요
              </p>

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-primary hover:bg-primary-dim text-background font-serif px-8 py-6 text-base">
                    가입하고 시작하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/protected/membership">
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-ink-light hover:border-primary hover:bg-primary/10 font-serif px-8 py-6 text-base"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    멤버십 플랜 보기
                  </Button>
                </Link>
              </div>

              <div className="pt-6 border-t border-primary/10 mt-8">
                <p className="text-xs text-ink-light/50">
                  이미 계정이 있으신가요?{' '}
                  <Link href="/auth/login" className="text-primary hover:text-primary-dim underline underline-offset-4">
                    로그인
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // Safe Data Fetching with Error Handling
  interface ProfileRecord {
    id: string
    full_name: string | null
    avatar_url: string | null
    gender: string | null
    birth_date: string | null
    birth_time: string | null
    calendar_type: string | null
    home_address: string | null
    work_address: string | null
    email: string | null
    created_at: string | null
  }

  interface AnalysisRecord {
    id: string
    created_at: string
    score: number | null
    summary: string | null
    target_name: string
    target_relation: string | null
  }

  interface AttendanceStatus {
    success: boolean
    checkedDates: string[]
    monthTotal: number
    consecutiveStreak: number
    weekCount: number
    totalBokchae: number
    canCheckIn: boolean
  }

  let profile: ProfileRecord | null = null
  let walletBalance: number = 0
  let records: AnalysisRecord[] = []
  let userRoleData: { role: string; userId: string | null } = { role: 'user', userId: null }
  let attendanceStatus: AttendanceStatus | null = null

  try {
    const profileData = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = profileData.data
  } catch (error) {
    logger.error('Error fetching profile:', error)
  }

  try {
    walletBalance = await getWalletBalance()
  } catch (error) {
    logger.error('Error fetching wallet balance:', error)
    walletBalance = 0
  }

  try {
    attendanceStatus = (await getMonthlyAttendance()) as AttendanceStatus
  } catch (error) {
    logger.error('Error fetching attendance:', error)
  }

  try {
    // Fetched from new analysis_history table instead of saju_records
    const recordsData = await supabase
      .from('analysis_history')
      .select(
        `
                id,
                created_at,
                score,
                summary,
                target_name,
                target_relation
            `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
    records = recordsData.data || []
  } catch (error) {
    logger.error('Error fetching records:', error)
    records = []
  }

  try {
    userRoleData = await getCurrentUserRole()
  } catch (error) {
    logger.error('Error fetching user role:', error)
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest'
  const isAdmin = userRoleData?.role === 'admin'

  // Calculate Tier Limits
  const userLimits = await getUserLimitsSummary()
  const tier = isAdmin ? 'Administrator' : userLimits.tier || '무료 회원'
  const isSubscribed = userLimits.is_subscribed

  // Avatar: 소셜 이미지 또는 도깨비 아바타
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const isDokkaebiAvatar = avatarUrl?.startsWith('/avatars/dokkaebi-')

  // 복채 잔액 (1 복채 = 1만냥)
  const talismanBalance = typeof walletBalance === 'number' ? walletBalance : 0

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-background text-ink-light font-sans selection:bg-primary/30 pb-24 overflow-x-hidden relative">
      <div className="hanji-overlay" />

      {/* Profile Section (Compact & Horizontal) */}
      <section
        aria-label="프로필 정보"
        className="px-3 pt-6 pb-2 animate-in fade-in slide-in-from-bottom-5 duration-700 relative z-10"
      >
        <div className="flex items-center gap-4 bg-surface/30 border border-primary/20 rounded-xl p-4">
          <Link href="/protected/settings" className="relative group cursor-pointer flex-shrink-0">
            <div className="w-16 h-16 rounded-full border border-primary/20 overflow-hidden bg-surface flex items-center justify-center shadow-md group-hover:border-primary/50 transition-all group-hover:scale-105">
              {avatarUrl ? (
                isDokkaebiAvatar ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    placeholder="blur"
                    blurDataURL={AVATAR_BLUR_DATA_URL}
                    className="w-full h-full object-cover p-2"
                  />
                ) : (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={64}
                    height={64}
                    placeholder="blur"
                    blurDataURL={AVATAR_BLUR_DATA_URL}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <span className="font-serif text-2xl text-primary">{displayName[0]}</span>
              )}
            </div>
            {/* Tier Badge */}
            <div className="absolute -bottom-1 -right-1 bg-primary text-background p-1 rounded-full shadow-md border border-background group-hover:scale-110 transition-transform">
              {isAdmin ? (
                <Crown className="w-3 h-3 fill-current" strokeWidth={1} />
              ) : (
                <Star className="w-3 h-3 fill-current" strokeWidth={1} />
              )}
            </div>
          </Link>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif font-medium text-ink-light tracking-wide truncate">{displayName}</h2>
            </div>
            <p className="text-xs text-ink-light/50 font-light truncate mb-1.5 font-sans">{user.email}</p>
            <BrandQuote variant="inline" className="text-[10px] text-ink-light/60 line-clamp-1">
              {BRAND_QUOTES.profile.hero}
            </BrandQuote>
          </div>

          <Link href="/protected/settings">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-ink-light/30 hover:text-primary hover:bg-primary/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Section - 복채 & 멤버십 */}
      <section
        aria-label="복채 및 멤버십 현황"
        className="px-3 mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-75 relative z-10"
      >
        <div className="grid grid-cols-2 gap-2">
          {/* 복채 잔액 (Click to Charge) */}
          <Link
            href="/protected/membership"
            className="group relative overflow-hidden rounded-lg border border-primary/20 bg-surface/40 p-3 transition-all hover:border-primary/50 hover:bg-surface/60 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center justify-center gap-0.5">
              <div className="flex items-center gap-1.5 text-primary/80 mb-0.5">
                <Coins className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-medium tracking-wide text-ink-light/70 uppercase">보유 복채</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-lg font-medium text-ink-light transition-colors group-hover:text-primary leading-none">
                  {talismanBalance}
                </span>
                <span className="text-[9px] text-ink-light/40 font-light leading-none">만냥</span>
              </div>
              <span className="text-[9px] text-primary/50 underline decoration-primary/30 underline-offset-2 transition-colors group-hover:text-primary group-hover:decoration-primary/60 mt-0.5">
                복채 충전
              </span>
            </div>
          </Link>

          {/* 멤버십 등급 */}
          <Link
            href="/protected/membership"
            className="group relative overflow-hidden rounded-lg border border-primary/20 bg-surface/40 p-3 transition-all hover:border-primary/50 hover:bg-surface/60 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex flex-col items-center justify-center gap-0.5">
              <div className="flex items-center gap-1.5 text-primary/80 mb-0.5">
                <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[10px] font-medium tracking-wide text-ink-light/70 uppercase">멤버십</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-sm font-medium text-ink-light transition-colors group-hover:text-primary leading-none mt-0.5">
                  {tier}
                </span>
              </div>
              <span className="text-[9px] text-primary/50 transition-colors group-hover:text-primary mt-0.5">
                {isSubscribed ? '이용중' : '업그레이드'}
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Daily Check-In (Moved Down) */}
      <section className="px-3 mb-6 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-100 relative z-10">
        <DailyCheckIn
          canCheckIn={attendanceStatus?.canCheckIn ?? true}
          checkedDates={attendanceStatus?.checkedDates || []}
          weekCount={attendanceStatus?.weekCount || 0}
          totalBokchae={attendanceStatus?.totalBokchae || 0}
          consecutiveStreak={attendanceStatus?.consecutiveStreak || 0}
        />
      </section>

      {/* Dashboard Navigation Grid */}
      <section className="px-3 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 relative z-10">
        <h3 className="text-xs font-light tracking-widest text-ink-light/50 uppercase mb-6">Menu</h3>
        <div className="grid grid-cols-2 gap-4">
          {isAdmin && (
            <Link href="/admin" className="group col-span-2 mb-2">
              <div className="bg-gradient-to-r from-seal/20 via-seal/10 to-seal/20 border-2 border-seal/40 hover:border-seal hover:from-seal/30 hover:via-seal/20 hover:to-seal/30 p-6 flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden shadow-lg">
                {/* Background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-seal/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                {/* Content */}
                <Shield className="w-6 h-6 text-seal group-hover:scale-110 transition-transform stroke-[1] relative z-10" />
                <span className="text-base font-serif font-light text-seal tracking-widest relative z-10 uppercase">
                  관리자 대시보드
                </span>
                <ArrowRight
                  className="w-5 h-5 text-seal/60 group-hover:text-seal group-hover:translate-x-1 transition-all relative z-10"
                  strokeWidth={1}
                />
              </div>
            </Link>
          )}
          <Link href="/protected/profile/manse" className="group">
            <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
              <ScrollText
                className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm font-serif font-light text-ink-light group-hover:text-primary transition-colors">
                내 명식 보기
              </span>
            </div>
          </Link>

          <Link href="/protected/settings" className="group">
            <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
              <UserIcon
                className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm font-serif font-light text-ink-light group-hover:text-primary transition-colors">
                {t('title')}
              </span>
            </div>
          </Link>

          <Link href="/protected/family" className="group">
            <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
              <Users className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors" strokeWidth={1} />
              <span className="text-sm font-serif font-light text-ink-light group-hover:text-primary transition-colors">
                인연 관리
              </span>
            </div>
          </Link>

          <Link href="/protected/membership" className="group">
            <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
              <Crown className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors" strokeWidth={1} />
              <span className="text-sm font-serif font-light text-ink-light group-hover:text-primary transition-colors">
                멤버십 안내
              </span>
            </div>
          </Link>

          <Link href="/protected/history" className="group">
            <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
              <BookOpen
                className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm font-serif font-light text-ink-light group-hover:text-primary transition-colors">
                사주 기록
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Settings Menu */}
      <section className="px-3 mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 relative z-10">
        <div className="space-y-1">
          {isAdmin && (
            <div className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors group">
              <div className="flex items-center gap-4">
                <LayoutDashboard
                  className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors"
                  strokeWidth={1}
                />
                <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">Language</span>
              </div>
              <LocaleSwitcher />
            </div>
          )}

          <Link
            href="/protected/notifications"
            className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 flex items-center justify-center"></div>
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">
                {t('notifications')}
              </span>
            </div>
            <Switch id="notify" className="data-[state=checked]:bg-primary" />
          </Link>

          <Link
            href="/protected/policy/privacy"
            className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <Shield
                className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">개인정보 처리방침</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>

          <Link
            href="/protected/support"
            className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <Headphones
                className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">고객센터</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>
        </div>
      </section>

      {/* Logout */}
      <div className="text-center animate-in fade-in duration-1000 delay-500 relative z-10 pb-10">
        <LogoutButton
          variant="ghost"
          className="text-ink-light/30 text-[10px] tracking-[0.2em] hover:text-ink-light hover:bg-transparent transition-colors uppercase font-serif font-light"
        >
          Log Out
        </LogoutButton>
      </div>
    </div>
  )
}
