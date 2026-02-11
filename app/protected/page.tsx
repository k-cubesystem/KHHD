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
import { FortuneEnergyGauge } from '@/components/fortune/fortune-energy-gauge'
import { MonthlyFortuneCycle } from '@/components/fortune/monthly-fortune-cycle'
import { FamilyFortuneStatus } from '@/components/fortune/family-fortune-status'
import { FortuneTimeline } from '@/components/fortune/fortune-timeline'
import { EventBanners } from '@/components/events/event-banners'
import { DailyCheckIn } from '@/components/events/daily-check-in'
import { LuckyRouletteButton } from '@/components/events/lucky-roulette-button'
import { OnboardingTourWrapper } from '@/components/onboarding/onboarding-tour-wrapper'

import Link from 'next/link'
import { Ticket, Bell, MessagesSquare, CalendarDays, Calendar, CalendarRange, Home } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-background text-ink-light pb-28 font-sans relative overflow-hidden">
      {/* Header - Minimalist */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between relative z-20">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs font-serif font-light text-primary tracking-widest uppercase">
            Cheongdam Haehwadang
          </span>
          <h1 className="text-xl font-serif font-light text-ink-light leading-none tracking-wide">
            해화당
          </h1>
        </div>

        <Link href="/protected" className="flex items-center gap-3">
          <Home
            className="w-5 h-5 text-ink-light/50 hover:text-primary transition-colors"
            strokeWidth={1}
          />
        </Link>
      </header>

      {/* Wallet Bar */}
      <div className="px-6 mb-8 relative z-20">
        <div className="wallet-section bg-surface/30 backdrop-blur-sm border border-white/5 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Ticket className="w-4 h-4 text-primary" strokeWidth={1} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-light/50 font-light">보유 부적</span>
              <span className="text-lg font-serif font-light text-ink-light tracking-tight">
                {Number(walletBalance).toLocaleString()}장
              </span>
            </div>
          </div>
          <Link
            href="/protected/membership"
            className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full font-normal hover:bg-primary/20 transition-colors"
          >
            충전하기
          </Link>
        </div>
      </div>

      <main className="px-6 space-y-8 relative z-20">
        {/* 1. Daily Check-In - Priority #1 */}
        <section className="daily-checkin-card">
          <DailyCheckIn
            initialChecked={attendanceStatus?.checked || false}
            initialConsecutiveDays={attendanceStatus?.consecutiveDays || 0}
          />
        </section>

        {/* 2. Fortune Energy Gauge - Priority #2 */}
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

        {/* 3. 8 Fortune Missions Grid - Priority #3 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-primary/20 rounded-full" />
            <h2 className="text-sm font-serif font-light text-ink-light tracking-wide">
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
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-surface/20 border-white/5 hover:border-primary/10'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 mb-2',
                      isCompleted ? 'text-primary' : 'text-ink-light/40'
                    )}
                    strokeWidth={1}
                  />
                  <span
                    className={cn(
                      'text-[10px] text-center leading-tight font-light',
                      isCompleted ? 'text-primary' : 'text-ink-light/60'
                    )}
                  >
                    {mission.label}
                  </span>
                  {isCompleted && (
                    <span className="text-[8px] text-primary/70 mt-1 font-light">✓</span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>

        {/* 4. Monthly Cycle */}
        <section>
          <MonthlyFortuneCycle
            currentMonth={new Date().getMonth() + 1}
            completedMissions={monthlyFortune.completedCategories.length}
            totalMissions={8}
          />
        </section>

        {/* 5. Family Fortune Status */}
        {familyBreakdown.length > 0 && (
          <section>
            <FamilyFortuneStatus members={familyBreakdown} />
          </section>
        )}

        {/* 6. Quick Actions Grid (2x2) */}
        <section className="grid grid-cols-2 gap-3">
          {/* 고민상담 (AI Shaman Chat) */}
          <Link
            href="/protected/ai-shaman"
            className="ai-shaman-button flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/10 transition-all p-4"
          >
            <MessagesSquare className="w-7 h-7 text-primary mb-2" strokeWidth={1} />
            <span className="text-sm font-serif font-normal text-ink-light mb-1">고민상담</span>
            <span className="text-[10px] text-ink-light/50 text-center font-light">
              AI 무당에게 물어보세요
            </span>
          </Link>

          {/* 오늘의 운세 */}
          <FeatureGuard feature="feat_saju_today">
            <Link
              href="/protected/saju/today"
              className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/10 transition-all p-4"
            >
              <CalendarDays className="w-7 h-7 text-primary mb-2" strokeWidth={1} />
              <span className="text-sm font-serif font-normal text-ink-light mb-1">
                오늘의 운세
              </span>
              <span className="text-[10px] text-ink-light/50 text-center font-light">
                매일 아침 알림받기
              </span>
            </Link>
          </FeatureGuard>

          {/* 한주의 운세 */}
          <Link
            href="/protected/fortune/weekly"
            className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/10 transition-all p-4"
          >
            <Calendar className="w-7 h-7 text-primary mb-2" strokeWidth={1} />
            <span className="text-sm font-serif font-normal text-ink-light mb-1">한주의 운세</span>
            <span className="text-[10px] text-ink-light/50 text-center font-light">
              주간 운세 확인
            </span>
          </Link>

          {/* 매월 운세 */}
          <Link
            href="/protected/fortune/monthly"
            className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/10 transition-all p-4"
          >
            <CalendarRange className="w-7 h-7 text-primary mb-2" strokeWidth={1} />
            <span className="text-sm font-serif font-normal text-ink-light mb-1">매월 운세</span>
            <span className="text-[10px] text-ink-light/50 text-center font-light">
              월간 운세 확인
            </span>
          </Link>
          {/* Lucky Roulette - Grid Item */}
          <LuckyRouletteButton
            canSpin={rouletteStatus?.canSpin || false}
            nextAvailableTime={rouletteStatus?.nextAvailableTime}
          />
        </section>

        {/* 7. Fortune Timeline (Yearly Trend) */}
        <section>
          <FortuneTimeline data={yearlyTrend} year={new Date().getFullYear()} />
        </section>

        {/* 8. Event Banners - Lower Priority */}
        {eventBanners && eventBanners.length > 0 && (
          <section>
            <EventBanners banners={eventBanners} />
          </section>
        )}

        {/* Bottom Spacer */}
        <div className="pb-8" />
      </main>

      {/* Onboarding Tour */}
      <OnboardingTourWrapper />
    </div>
  )
}
