import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Users,
  History,
  Zap,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Compass,
  Hexagon,
  Scan
} from "lucide-react";
import Link from "next/link";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { EnergyChart } from "@/components/dashboard/energy-chart";
import { SkyEarthHumanStatus } from "@/components/dashboard/sky-earth-human-status";
import { cn } from "@/lib/utils";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const members = await getFamilyMembers();

  // 최근 분석 내역 (최대 5개)
  const { data: recentRecords } = await supabase
    .from("saju_records")
    .select(`
      *,
      family_members (name)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  // Mock-up data for EnergyChart
  const energyData = {
    wood: 75,
    fire: 40,
    earth: 60,
    metal: 30,
    water: 85
  };

  const masterName = user.email?.split('@')[0] || "마스터";

  return (
    <div className="relative flex flex-col gap-12 w-full max-w-7xl mx-auto py-16 px-6 overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════════════
          TOP DECORATIVE BEAM - Golden Fractal Line
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-pulse opacity-50" />
        {/* Fractal shimmer effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          HEADER SECTION - With Holographic Badge
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-6 max-w-2xl">
          {/* Holographic Security Badge */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              {/* Hologram outer glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/30 via-[#F4E4BA]/40 to-[#D4AF37]/30 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37]/20 via-[#F4E4BA]/30 to-[#D4AF37]/20 rounded-full animate-pulse" />

              {/* Badge container */}
              <div className="relative flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/50 bg-[#0A0A0A]/90 backdrop-blur-xl overflow-hidden">
                {/* Scanning line effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/10 to-transparent animate-scan" />

                {/* Holographic shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

                <div className="relative flex items-center gap-2">
                  <div className="relative">
                    <Hexagon className="w-4 h-4 text-[#D4AF37]" strokeWidth={1.5} />
                    <Scan className="w-2.5 h-2.5 text-[#D4AF37] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#D4AF37]">
                    Omni-Logic Authenticated
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <Calendar className="w-3 h-3" />
              <span className="font-medium">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            전해오는 기운이 <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                길(吉)함을 향해 있습니다.
              </span>
              {/* Underline glow */}
              <span className="absolute -bottom-2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
            </span>
          </h1>

          {/* Welcome Message */}
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            환영합니다, <span className="text-[#D4AF37] font-bold">{masterName}</span> 마스터님. <br />
            해화당 AI가 당신의 천지인(天地人) 데이터를 동기화했습니다.
          </p>
        </div>

        {/* Stats Card */}
        <div className="hidden md:flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="relative group">
            {/* Card glow on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/0 to-[#D4AF37]/0 rounded-[2rem] opacity-0 group-hover:opacity-100 group-hover:from-[#D4AF37]/20 group-hover:via-[#D4AF37]/10 group-hover:to-[#D4AF37]/20 blur-xl transition-all duration-500" />

            <div className="relative glass px-8 py-6 rounded-[2rem] border-[#D4AF37]/10 flex items-center gap-5 group-hover:border-[#D4AF37]/30 group-hover:scale-[1.02] transition-all duration-500 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center border border-[#D4AF37]/20 group-hover:border-[#D4AF37]/40 transition-colors">
                <Users className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] mb-1.5">등록된 소중한 인연</p>
                <p className="text-3xl font-black tabular-nums text-white">{members.length}<span className="text-sm font-medium ml-1 text-muted-foreground">명</span></p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN GRID SECTION - CSS Grid Layout
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 relative z-10">

        {/* ─────────────────────────────────────────────────────────────────
            LEFT COLUMN: Energy & Quick Actions
        ───────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-8 order-2 lg:order-1">

          {/* Energy Balance Card - Floating Glass Effect */}
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
              <Zap className="w-4 h-4 text-[#D4AF37]" />
              오행 에너지 균형
            </h3>

            {/* Floating Glass Container */}
            <div className="relative group">
              {/* Outer glow layer */}
              <div className="absolute -inset-1 bg-gradient-to-b from-[#D4AF37]/10 to-transparent rounded-[3rem] blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />

              {/* Glass card */}
              <div className="relative rounded-[3rem] p-8 border border-[#D4AF37]/10 bg-[#0A0A0A]/60 backdrop-blur-2xl overflow-hidden group-hover:border-[#D4AF37]/25 group-hover:translate-y-[-2px] transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]">
                {/* Inner gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent pointer-events-none" />

                {/* Chart */}
                <div className="relative">
                  <EnergyChart data={energyData} />
                </div>

                {/* Mini bars */}
                <div className="mt-8 grid grid-cols-5 gap-3">
                  {Object.entries(energyData).map(([key, value]) => (
                    <div key={key} className="text-center space-y-2">
                      <div className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-wider">{key}</div>
                      <div className="h-14 w-full bg-white/5 rounded-full relative overflow-hidden border border-white/5">
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#D4AF37]/60 to-[#D4AF37]/20 transition-all duration-1000 ease-out"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quote */}
                <div className="mt-6 text-center text-[10px] text-muted-foreground/50 leading-relaxed italic px-4">
                  "수(水)의 기운이 충만하니 지혜가 깊어지는 날입니다."
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions Card */}
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
              <Compass className="w-4 h-4 text-[#D4AF37]" />
              핵심 인텔리전스
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "인연 관리", sub: "가족/지인 프로필 관리", icon: Users, href: "/protected/family", color: "text-blue-400" },
                { label: "운명 분석", sub: "프리미엄 리포트 생성", icon: Sparkles, href: "/protected/analysis", color: "text-[#D4AF37]" },
                { label: "분석 비록", sub: "과거 로그 재열람", icon: History, href: "/protected/history", color: "text-purple-400" },
              ].map((action, idx) => (
                <Link key={action.label} href={action.href}>
                  <div
                    className="relative group animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${700 + idx * 100}ms` }}
                  >
                    {/* Hover glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37]/0 to-[#D4AF37]/0 rounded-2xl opacity-0 group-hover:opacity-100 group-hover:from-[#D4AF37]/20 group-hover:to-[#D4AF37]/10 blur-lg transition-all duration-300" />

                    <div className="relative glass p-5 rounded-2xl border-white/5 group-hover:border-[#D4AF37]/30 transition-all duration-300 flex items-center justify-between group-hover:translate-x-1">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-white/10",
                          action.color
                        )}>
                          <action.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight group-hover:text-[#D4AF37] transition-colors">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.sub}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            RIGHT COLUMN: Status & Records
        ───────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-8 order-1 lg:order-2">

          {/* Sky-Earth-Human Status */}
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              천지인(天地人) 통합 상태
            </h3>
            <SkyEarthHumanStatus />
          </section>

          {/* Recent Records Section - Premium Cards */}
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
            <div className="flex justify-between items-end px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-[#D4AF37]" />
                최근 생성된 마스터 비록
              </h3>
              <Link href="/protected/history" className="text-[10px] text-[#D4AF37] hover:text-[#F4E4BA] font-bold uppercase tracking-widest transition-colors">
                View All
              </Link>
            </div>

            {/* Premium Glass Container */}
            <div className="relative group/container">
              {/* Container glow */}
              <div className="absolute -inset-1 bg-gradient-to-b from-[#D4AF37]/5 to-transparent rounded-[3rem] blur-xl opacity-50" />

              <div className="relative rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden bg-[#0A0A0A]/70 backdrop-blur-3xl">
                {recentRecords && recentRecords.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {recentRecords.map((record, idx) => (
                      <div
                        key={record.id}
                        className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group/item transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${500 + idx * 100}ms` }}
                      >
                        {/* Row hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/0 to-[#D4AF37]/0 opacity-0 group-hover/item:opacity-100 group-hover/item:from-[#D4AF37]/5 group-hover/item:via-[#D4AF37]/10 group-hover/item:to-[#D4AF37]/5 transition-all duration-500" />

                        <div className="relative flex items-center gap-5">
                          {/* Avatar with glow */}
                          <div className="relative">
                            <div className="absolute -inset-1 bg-[#D4AF37]/0 rounded-2xl blur-md group-hover/item:bg-[#D4AF37]/30 transition-all duration-500" />
                            <div className="relative w-14 h-14 rounded-2xl border border-[#D4AF37]/20 flex items-center justify-center font-black text-xl text-[#D4AF37] bg-[#D4AF37]/5 group-hover/item:bg-[#D4AF37]/15 group-hover/item:border-[#D4AF37]/40 transition-all duration-300">
                              {record.family_members.name.charAt(0)}
                            </div>
                            <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-green-500 rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="font-black text-base sm:text-lg group-hover/item:text-[#D4AF37] transition-colors duration-300">{record.family_members.name}님의 비록</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                              <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2.5 py-1 rounded-full border border-[#D4AF37]/20 uppercase tracking-tight font-bold text-[10px]">
                                Prob. {record.success_probability}%
                              </span>
                              <span className="opacity-40">·</span>
                              <span className="text-muted-foreground/60">{new Date(record.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <Link href={`/protected/history?id=${record.id}`} className="relative w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto rounded-full border-[#D4AF37]/20 text-xs px-6 hover:bg-[#D4AF37] hover:text-[#0A0A0A] hover:border-[#D4AF37] transition-all duration-300 group-hover/item:border-[#D4AF37]/40"
                          >
                            데이터 열람
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 sm:py-24 text-center space-y-6 px-6 animate-in fade-in duration-700 delay-500">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-full h-full bg-[#D4AF37]/5 rounded-full flex items-center justify-center border border-[#D4AF37]/10">
                        <Sparkles className="w-8 h-8 text-[#D4AF37]/60" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-bold">아직 생성된 비록이 없습니다.</p>
                      <p className="text-xs text-muted-foreground">당신의 첫 번째 운명을 분석할 준비가 되었나요?</p>
                    </div>
                    <Link href="/protected/analysis">
                      <Button className="rounded-full bg-[#D4AF37] text-[#0A0A0A] px-10 hover:bg-[#F4E4BA] transition-all font-bold">
                        분석 시작하기
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BACKGROUND AMBIENCE - Dynamic Breathing
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Primary orb - top left */}
        <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[180px] animate-breathe" />

        {/* Secondary orb - bottom right */}
        <div
          className="absolute bottom-[5%] right-[-5%] w-[700px] h-[700px] bg-[#D4AF37]/8 rounded-full blur-[200px] animate-breathe"
          style={{ animationDelay: '2s' }}
        />

        {/* Tertiary orb - center */}
        <div
          className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[150px] animate-breathe"
          style={{ animationDelay: '4s' }}
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>
    </div>
  );
}
