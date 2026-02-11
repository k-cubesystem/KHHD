import { createClient } from '@/lib/supabase/server'
import { getWalletBalance } from '@/app/actions/wallet-actions'
import { getUserTierLimits } from '@/app/actions/membership-limits'
import { getDashboardContext } from '@/app/actions/dashboard-actions'
import { getFamilyWithAnalysisSummary } from '@/app/actions/family-analysis-actions'
import {
  getMonthlyFamilyFortune,
  getYearlyFortuneTrend,
  getFamilyFortuneBreakdown,
} from '@/app/actions/fortune-actions'
import { checkDailyAttendance } from '@/app/actions/daily-check-actions'
import { checkRouletteAvailability } from '@/app/actions/roulette-actions'
import { InsightSlideshow } from '@/components/dashboard/insight-slideshow'
import { Hero2026 } from '@/components/dashboard/hero-2026'
import { DashboardGrid } from '@/components/dashboard/dashboard-grid'
import { FortuneEnergyGauge } from '@/components/fortune/fortune-energy-gauge'
import { MonthlyFortuneCycle } from '@/components/fortune/monthly-fortune-cycle'
import { FamilyFortuneStatus } from '@/components/fortune/family-fortune-status'
import { FortuneTimeline } from '@/components/fortune/fortune-timeline'
import { EventBanners } from '@/components/events/event-banners'
import { DailyCheckIn } from '@/components/events/daily-check-in'
import { LuckyRoulette } from '@/components/events/lucky-roulette'
import { OnboardingTourWrapper } from '@/components/onboarding/onboarding-tour-wrapper'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Ticket,
  Bell,
  Zap,
  CloudMoon,
  Users,
  ArrowRight,
  MessagesSquare,
  CalendarDays,
  Calendar,
  CalendarRange,
} from 'lucide-react'
import { FeatureGuard } from '@/components/feature-guard'
import { FORTUNE_MISSIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Data Fetching (Parallel)
  const [
    walletBalance,
    limits,
    dashboardContext,
    familyMembers,
    monthlyFortune,
    yearlyTrend,
    familyBreakdown,
    attendanceStatus,
    rouletteStatus,
  ] = await Promise.all([
    getWalletBalance(),
    getUserTierLimits(),
    getDashboardContext(),
    getFamilyWithAnalysisSummary(),
    getMonthlyFamilyFortune(),
    getYearlyFortuneTrend(),
    getFamilyFortuneBreakdown(),
    checkDailyAttendance(),
    checkRouletteAvailability(),
  ])

  // 2. 이벤트 배너 가져오기
  const { data: eventBanners } = await supabase
    .from('event_banners')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(3)

  const isGuest = !user
  const masterName = dashboardContext?.profile?.full_name || user?.email?.split('@')[0] || 'Guest'
  const tierLabel =
    limits?.tier === 'FAMILY'
      ? '패밀리'
      : limits?.tier === 'BUSINESS'
        ? '비즈니스'
        : limits?.tier === 'SINGLE'
          ? '싱글'
          : '무료 회원'

  // 3. Personalized Welcome Logic
  const welcomeMessage = dashboardContext?.welcomeMessage || '오늘도 평안한 하루 되세요.'

  // 3. Family Carousel Data (Filtering those with recent analysis)
  const recentFamily = familyMembers.filter((m) => m.last_analysis_date).slice(0, 5) // Top 5 recent

  return (
    <div className="min-h-screen bg-background text-ink-light pb-28 font-sans relative overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between relative z-20">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs font-serif font-bold text-primary tracking-widest uppercase">
            Cheongdam Haehwadang
          </span>
          <h1 className="text-xl font-serif font-bold text-ink-light leading-none">
            안녕하세요, {masterName}님
          </h1>
        </div>

        <Link href="/protected/profile" className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-1">
            <span className="text-[10px] text-ink-light/50 bg-surface/40 px-1.5 py-0.5 rounded border border-white/5">
              {tierLabel}
            </span>
          </div>
          <Avatar className="h-10 w-10 border border-primary/30 shadow-[0_0_15px_rgba(236,182,19,0.1)]">
            <AvatarImage src={user?.user_metadata?.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-surface text-primary font-bold text-xs">
              {masterName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </header>

      {/* Wallet & Status Bar */}
      <div className="px-6 mb-6 relative z-20">
        <div className="wallet-section bg-surface/30 backdrop-blur-sm border border-white/5 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-light/50 font-medium">보유 부적</span>
              <span className="text-sm font-bold text-ink-light">
                {Number(walletBalance).toLocaleString()}장
              </span>
            </div>
          </div>
          <Link
            href="/protected/membership"
            className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full font-bold hover:bg-primary/20 transition-colors"
          >
            충전하기
          </Link>
        </div>
      </div>

      {/* Insight Slideshow (Replaces simple static text) */}
      <section className="px-6 mb-6 relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <InsightSlideshow />
      </section>

      {/* Hero Banner (2026 Year Logic) */}
      <section className="px-6 mb-6 relative z-20">
        <Hero2026 isGuest={isGuest} masterName={masterName} />
      </section>

      {/* Event Banners */}
      {eventBanners && eventBanners.length > 0 && (
        <section className="px-6 mb-6 relative z-20">
          <EventBanners banners={eventBanners} />
        </section>
      )}

      <main className="px-6 space-y-6 relative z-20">
        {/* 이벤트 섹션: 출석 체크 & 행운의 룰렛 */}
        <section className="grid grid-cols-1 gap-4">
          <div className="daily-checkin-card">
            <DailyCheckIn
              initialChecked={attendanceStatus?.checked || false}
              initialConsecutiveDays={attendanceStatus?.consecutiveDays || 0}
            />
          </div>
          <LuckyRoulette
            canSpin={rouletteStatus?.canSpin || false}
            nextAvailableTime={rouletteStatus?.nextAvailableTime}
          />
        </section>

        {/* 1. Fortune Flow Hub */}
        <section className="space-y-4">
          <div className="fortune-energy-gauge">
            <FortuneEnergyGauge
              currentFortune={monthlyFortune.currentFortune}
              totalPossible={monthlyFortune.totalPossible}
              percentage={monthlyFortune.percentage}
              variant="monthly"
            />
          </div>
        </section>

        {/* 2. Monthly Cycle */}
        <section>
          <MonthlyFortuneCycle
            currentMonth={new Date().getMonth() + 1}
            completedMissions={monthlyFortune.completedCategories.length}
            totalMissions={8}
          />
        </section>

        {/* 3. 8 Fortune Missions Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-ink-light/20 rounded-full" />
            <h2 className="text-xs font-bold text-ink-light/50 tracking-wide uppercase">
              8가지 운세 채우기
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {FORTUNE_MISSIONS.map((mission, idx) => {
              const isCompleted = monthlyFortune.completedCategories.includes(mission.category)
              const Icon = mission.icon
              return (
                <Link
                  key={idx}
                  href={mission.path}
                  className={cn(
                    'flex flex-col items-center justify-center aspect-square rounded-lg border transition-all p-2',
                    isCompleted
                      ? 'bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                      : 'bg-surface/20 border-white/5 hover:border-primary/20'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 mb-2',
                      isCompleted ? 'text-primary' : 'text-ink-light/40'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] text-center leading-tight',
                      isCompleted ? 'text-primary font-bold' : 'text-ink-light/60'
                    )}
                  >
                    {mission.label}
                  </span>
                  {isCompleted && (
                    <span className="text-[8px] text-primary/70 mt-1">운 상승 ↑</span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>

        {/* 4. Family Fortune Status */}
        {familyBreakdown.length > 0 && (
          <section>
            <FamilyFortuneStatus members={familyBreakdown} />
          </section>
        )}

        {/* 5. Fortune Timeline (Yearly Trend) */}
        <section>
          <FortuneTimeline data={yearlyTrend} year={new Date().getFullYear()} />
        </section>

        {/* 6. Quick Actions Grid (4 columns unified) */}
        <section className="grid grid-cols-2 gap-3 pb-4">
          {/* 고민상담 (AI Shaman Chat) */}
          <Link
            href="/protected/ai-shaman"
            className="ai-shaman-button flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/30 transition-all p-4"
          >
            <MessagesSquare className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
            <span className="text-sm font-serif font-bold text-ink-light mb-1">고민상담</span>
            <span className="text-[10px] text-ink-light/50 text-center">
              AI 무당에게 물어보세요
            </span>
          </Link>

          {/* 오늘의 운세 */}
          <FeatureGuard feature="feat_saju_today">
            <Link
              href="/protected/saju/today"
              className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/30 transition-all p-4"
            >
              <CalendarDays className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
              <span className="text-sm font-serif font-bold text-ink-light mb-1">오늘의 운세</span>
              <span className="text-[10px] text-ink-light/50 text-center">매일 아침 알림받기</span>
            </Link>
          </FeatureGuard>

          {/* 한주의 운세 */}
          <Link
            href="/protected/fortune/weekly"
            className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/30 transition-all p-4"
          >
            <Calendar className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
            <span className="text-sm font-serif font-bold text-ink-light mb-1">한주의 운세</span>
            <span className="text-[10px] text-ink-light/50 text-center">주간 운세 확인</span>
          </Link>

          {/* 매월 운세 */}
          <Link
            href="/protected/fortune/monthly"
            className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/30 transition-all p-4"
          >
            <CalendarRange className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
            <span className="text-sm font-serif font-bold text-ink-light mb-1">매월 운세</span>
            <span className="text-[10px] text-ink-light/50 text-center">월간 운세 확인</span>
          </Link>
        </section>

        {/* Bottom Spacer */}
        <div className="pb-8" />
      </main>

      {/* Onboarding Tour */}
      <OnboardingTourWrapper />
    </div>
  )
}
