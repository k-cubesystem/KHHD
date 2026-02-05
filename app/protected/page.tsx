import { createClient } from "@/lib/supabase/server";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { getUserTierLimits } from "@/app/actions/membership-limits";
import { getDashboardContext } from "@/app/actions/dashboard-actions";
import { getFamilyWithAnalysisSummary } from "@/app/actions/family-analysis-actions";
import { Hero2026 } from "@/components/dashboard/hero-2026";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ticket, Bell, Zap, CloudMoon, Users, ArrowRight } from "lucide-react";
import { FeatureGuard } from "@/components/feature-guard";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Data Fetching (Parallel)
  const [walletBalance, limits, dashboardContext, familyMembers] = await Promise.all([
    getWalletBalance(),
    getUserTierLimits(),
    getDashboardContext(),
    getFamilyWithAnalysisSummary(),
  ]);

  const isGuest = !user;
  const masterName = dashboardContext?.profile?.full_name || user?.email?.split('@')[0] || "Guest";
  const tierLabel = limits?.tier === "FAMILY" ? "패밀리" : limits?.tier === "BUSINESS" ? "비즈니스" : limits?.tier === "SINGLE" ? "싱글" : "무료 회원";

  // 2. Personalized Welcome Logic
  const welcomeMessage = dashboardContext?.welcomeMessage || "오늘도 평안한 하루 되세요.";

  // 3. Family Carousel Data (Filtering those with recent analysis)
  const recentFamily = familyMembers.filter(m => m.last_analysis_date).slice(0, 5); // Top 5 recent

  return (
    <div className="min-h-screen bg-background text-ink-light pb-28 font-sans relative overflow-hidden">

      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between relative z-20">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs font-serif font-bold text-primary tracking-widest uppercase">Cheongdam Haehwadang</span>
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
            <AvatarFallback className="bg-surface text-primary font-bold text-xs">{masterName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
      </header>

      {/* Wallet & Status Bar */}
      <div className="px-6 mb-6 relative z-20">
        <div className="bg-surface/30 backdrop-blur-sm border border-white/5 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-ink-light/50 font-medium">보유 부적</span>
              <span className="text-sm font-bold text-ink-light">{Number(walletBalance).toLocaleString()}장</span>
            </div>
          </div>
          <Link href="/protected/membership" className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full font-bold hover:bg-primary/20 transition-colors">
            충전하기
          </Link>
        </div>
      </div>

      {/* Personalized Welcome Message */}
      <section className="px-6 mb-8 relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="relative">
          <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-transparent rounded-full opacity-50" />
          <div className="pl-4">
            <p className="text-sm text-ink-light/80 font-serif leading-relaxed italic">
              "{welcomeMessage}"
            </p>
          </div>
        </div>
      </section>

      {/* Hero Banner (2026 Year Logic) */}
      <section className="px-6 mb-8 relative z-20">
        <Hero2026 isGuest={isGuest} masterName={masterName} />
      </section>

      <main className="px-6 space-y-8 relative z-20">

        {/* 1. Main Feature CTA */}
        <section className="space-y-4">
          <Link href="/protected/analysis" className="block">
            <div className="bg-gradient-to-br from-surface/80 to-surface/40 border border-primary/20 rounded-2xl p-6 relative overflow-hidden group hover:border-primary/50 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CloudMoon className="w-32 h-32 text-primary" strokeWidth={0.5} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded">BEST</span>
                </div>
                <h3 className="text-xl font-serif font-bold text-ink-light mb-1">천지인(天地人) 통합분석</h3>
                <p className="text-sm text-ink-light/60 mb-6 leading-relaxed">
                  사주와 관상, 풍수를 엮어<br />
                  당신의 운명을 입체적으로 조명합니다.
                </p>
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <span>분석 시작하기</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 2. Recent Family Status (Horizontal Scroll) */}
        {recentFamily.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-ink-light/20 rounded-full" />
                <h2 className="text-xs font-bold text-ink-light/50 tracking-wide uppercase">Family Updates</h2>
              </div>
              <Link href="/protected/family" className="text-[10px] text-primary hover:underline">
                전체보기
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 snap-x -mx-6 px-6 scrollbar-hide">
              {recentFamily.map((member) => (
                <Link key={member.id} href={`/protected/history`} className="snap-center shrink-0 w-[200px]">
                  <div className="bg-surface/30 border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-colors h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-serif font-bold text-ink-light">{member.name}</h4>
                        <span className="text-[10px] text-ink-light/50">{member.relationship}</span>
                      </div>
                      {member.last_analysis_score && (
                        <span className="text-lg font-serif font-bold text-primary">{member.last_analysis_score}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-primary mb-1 uppercase tracking-wider font-bold opacity-70">
                        {member.last_analysis_category || "최근 분석"}
                      </div>
                      <p className="text-xs text-ink-light/80 line-clamp-2 leading-relaxed">
                        {member.last_analysis_summary}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 3. Dashboard Grid Tools */}
        <DashboardGrid />

        {/* 4. Sub Features */}
        <section className="grid grid-cols-2 gap-3 pb-8">
          <Link href="/protected/ai-shaman" className="bg-surface border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-colors group flex flex-col justify-between h-28">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Zap className="w-4 h-4 text-primary" strokeWidth={1} />
            </div>
            <div>
              <h4 className="font-serif text-sm text-ink-light mb-1">해화당 AI</h4>
              <p className="text-[9px] text-ink-light/50">무엇이든 물어보세요</p>
            </div>
          </Link>

          <FeatureGuard feature="feat_saju_today">
            <Link href="/protected/saju/today" className="bg-surface border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-colors group flex flex-col justify-between h-28 h-full w-full block">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Bell className="w-4 h-4 text-primary" strokeWidth={1} />
              </div>
              <div>
                <h4 className="font-serif text-sm text-ink-light mb-1">오늘의 운세</h4>
                <p className="text-[9px] text-ink-light/50">매일 아침 알림받기</p>
              </div>
            </Link>
          </FeatureGuard>
        </section>

      </main>


    </div>
  );
}