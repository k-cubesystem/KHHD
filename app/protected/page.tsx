import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getFamilyMembers } from "@/app/actions/family-actions";
import { Sparkles, Cloud, Map, User, ChevronRight, Clock, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrbBackground } from "@/components/ui/orb-background";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // User Info (Handle Guest)
  const masterName = user?.email?.split('@')[0] || "예비 마스터";
  const members = user ? ((await getFamilyMembers()) || []) : [];

  // Recent Records (Mock for Guest)
  let records = [];
  if (user) {
    const { data: recentRecords } = await supabase
      .from("saju_records")
      .select(`*, family_members (name)`)
      .order("created_at", { ascending: false })
      .limit(3);
    records = recentRecords || [];
  }

  return (
    <div className="relative min-h-screen w-full bg-zen-bg text-zen-text selection:bg-zen-gold/30">
      {/* UX Pro Max: Orb Background */}
      <OrbBackground variant="subtle" />

      {/* Top Banner Area */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8 space-y-8">
        {/* Main Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight tracking-tight text-zen-text">
            전해오는 기운이<br />
            <span className="text-zen-gold border-b-4 border-zen-gold/30 pb-1">길(吉)함</span>을 향해 있습니다.
          </h1>
          <p className="text-zen-text/70 max-w-2xl text-lg font-sans leading-relaxed">
            환영합니다, <span className="text-zen-wood font-bold border-b border-zen-wood/30">{masterName}</span>님.<br />
            {!user ? "로그인하여 당신의 천지인(天地人) 데이터를 확인하세요." : "해화당 AI가 당신의 천지인(天地人) 데이터를 동기화했습니다."}
          </p>

          {!user && (
            <div className="pt-4">
              <Link href="/auth/login">
                <Button className="bg-zen-wood text-white hover:bg-[#7A604D] font-bold px-8 py-6 text-lg shadow-lg">
                  로그인하고 내 운명 분석하기
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: 5-Element Graph (Radar Chart Mock - Zen Style) */}
        <div className="lg:col-span-4 rounded-sm bg-white border border-zen-border p-8 relative overflow-hidden h-[500px] flex flex-col justify-between shadow-sm">
          {!user && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center text-center p-6">
              <div className="space-y-4">
                <p className="font-serif font-bold text-xl text-zen-text">로그인이 필요합니다</p>
                <p className="text-sm text-zen-muted">오행 분석 데이터를 보시려면 로그인하세요.</p>
              </div>
            </div>
          )}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-zen-gold/40 to-transparent" />

          <div className="flex items-center gap-2 text-zen-wood text-sm font-bold tracking-widest mb-4 uppercase">
            <Sparkles className="w-4 h-4" />
            Five Element Balance
          </div>

          {/* Radar Chart Visual (SVG Mock) */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* Background Grid */}
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-[300px] opacity-20 stroke-zen-muted fill-none" strokeWidth="0.5">
              <polygon points="100,20 176,76 147,163 53,163 24,76" />
              <polygon points="100,50 145,83 128,135 72,135 55,83" />
              <line x1="100" y1="100" x2="100" y2="20" />
              <line x1="100" y1="100" x2="176" y2="76" />
              <line x1="100" y1="100" x2="147" y2="163" />
              <line x1="100" y1="100" x2="53" y2="163" />
              <line x1="100" y1="100" x2="24" y2="76" />
            </svg>

            {/* Active Data Area (Gold) */}
            <svg viewBox="0 0 200 200" className="absolute w-full h-full max-w-[300px] overflow-visible">
              <polygon
                points="100,50 160,76 130,140 70,140 40,90"
                className="fill-zen-gold/20 stroke-zen-gold stroke-2"
              />
              {/* Points */}
              <circle cx="100" cy="50" r="3" fill="#10b981" /> {/* Mok (Green) */}
              <circle cx="160" cy="76" r="3" fill="#ef4444" /> {/* Hwa (Red) */}
              <circle cx="130" cy="140" r="3" fill="#ca8a04" /> {/* To (Yellow) */}
              <circle cx="70" cy="140" r="3" fill="#9ca3af" /> {/* Geum (Grey) */}
              <circle cx="40" cy="90" r="3" fill="#3b82f6" /> {/* Su (Blue) */}
            </svg>

            {/* Labels */}
            <div className="absolute inset-0 max-w-[300px] mx-auto pointer-events-none">
              <span className="absolute top-[5%] left-1/2 -translate-x-1/2 text-xs font-bold text-zen-text/80">목(Tree) 75%</span>
              <span className="absolute top-[35%] right-[5%] text-xs font-bold text-zen-text/80">화(Fire) 40%</span>
              <span className="absolute bottom-[25%] right-[10%] text-xs font-bold text-zen-text/80">토(Earth) 60%</span>
              <span className="absolute bottom-[25%] left-[10%] text-xs font-bold text-zen-text/80">금(Metal) 30%</span>
              <span className="absolute top-[40%] left-[2%] text-xs font-bold text-zen-text/80">수(Water) 85%</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-4">
            {['WOOD', 'FIRE', 'EARTH', 'METAL', 'WATER'].map((el) => (
              <div key={el} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-zen-muted font-bold">{el}</span>
                <div className="w-full h-1 bg-zen-border rounded-full overflow-hidden">
                  <div className="h-full bg-zen-gold" style={{ width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Cards & List */}
        <div className="lg:col-span-8 flex flex-col gap-8">

          {/* Top Cards: Heaven, Earth, Human - Zen Style */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 md:h-[200px]">
            {/* Heaven Card */}
            <Link href={user ? "/protected/analysis" : "/auth/login"} className="group h-full">
              <div className="h-full bg-white border border-zen-border rounded-sm p-4 md:p-6 relative overflow-hidden hover:border-zen-gold/50 hover:shadow-md transition-all flex flex-col justify-between group-hover:-translate-y-1 duration-300 gap-4 md:gap-0">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zen-bg flex items-center justify-center border border-zen-border group-hover:bg-zen-gold/10 transition-colors">
                    <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zen-muted group-hover:text-zen-gold" />
                  </div>
                  <div className="px-1.5 py-0.5 md:px-2 rounded-full bg-zen-bg text-[8px] md:text-[10px] font-bold text-zen-wood uppercase tracking-wider hidden md:block">
                    Fate
                  </div>
                </div>
                <div>
                  <h3 className="text-sm md:text-lg font-serif font-bold text-zen-text mb-0.5 md:mb-1">天 - 사주분석</h3>
                  <p className="text-[10px] md:text-xs text-zen-text/60 leading-relaxed font-sans line-clamp-2 md:line-clamp-none">인생의 설계도와 선천적 기운 분석 완료.</p>
                </div>
              </div>
            </Link>

            {/* Earth Card */}
            <Link href={user ? "/protected/saju/fengshui" : "/auth/login"} className="group h-full">
              <div className="h-full bg-white border border-zen-border rounded-sm p-4 md:p-6 relative overflow-hidden hover:border-zen-gold/50 hover:shadow-md transition-all flex flex-col justify-between group-hover:-translate-y-1 duration-300 gap-4 md:gap-0">
                <div className="flex justify-between items-start">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zen-bg flex items-center justify-center border border-zen-border group-hover:bg-zen-gold/10 transition-colors">
                    <Map className="w-4 h-4 md:w-5 md:h-5 text-zen-muted group-hover:text-zen-gold" />
                  </div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-zen-border group-hover:bg-zen-gold transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm md:text-lg font-serif font-bold text-zen-text mb-0.5 md:mb-1">地 - 풍수분석</h3>
                  <p className="text-[10px] md:text-xs text-zen-text/60 leading-relaxed font-sans line-clamp-2 md:line-clamp-none">거주지 및 공간의 기운 조율 대기 중.</p>
                </div>
              </div>
            </Link>

            {/* Human Card */}
            <Link href={user ? "/protected/saju/face" : "/auth/login"} className="group h-full col-span-2 md:col-span-1">
              <div className="h-full bg-white border border-zen-border rounded-sm p-4 md:p-6 relative overflow-hidden hover:border-zen-gold/50 hover:shadow-md transition-all flex flex-col justify-between group-hover:-translate-y-1 duration-300 gap-4 md:gap-0 flex-row md:flex-col items-center md:items-stretch">
                <div className="flex justify-between items-start md:w-full">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zen-bg flex items-center justify-center border border-zen-border group-hover:bg-zen-gold/10 transition-colors">
                    <User className="w-4 h-4 md:w-5 md:h-5 text-zen-muted group-hover:text-zen-gold" />
                  </div>
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-zen-border group-hover:bg-zen-gold transition-colors hidden md:block" />
                </div>
                <div className="text-right md:text-left flex-1 md:flex-none">
                  <h3 className="text-sm md:text-lg font-serif font-bold text-zen-text mb-0.5 md:mb-1">人 - 관상분석</h3>
                  <p className="text-[10px] md:text-xs text-zen-text/60 leading-relaxed font-sans md:line-clamp-none">손금/관상을 통한 후천적 변화 분석 전.</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Records List - Zen Style */}
          <div className="flex-1 bg-white border border-zen-border rounded-sm p-8 relative overflow-hidden min-h-[300px] shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-zen-border pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-zen-wood" />
                <h3 className="text-lg font-serif font-bold text-zen-text">최근 생성된 마스터 비록</h3>
              </div>
              <Link href={user ? "/protected/history" : "/auth/login"} className="text-xs font-bold text-zen-wood hover:underline hover:text-zen-gold uppercase tracking-wider">View All</Link>
            </div>

            <div className="grid gap-3">
              {records.map((record: any) => (
                <div key={record.id} className="group relative flex items-center justify-between bg-zen-bg border border-transparent rounded-sm p-4 hover:bg-white hover:border-zen-border hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-sm bg-white border border-zen-border flex items-center justify-center font-serif font-bold text-xl text-zen-text relative shadow-sm group-hover:border-zen-gold transition-colors">
                      {record.family_members?.name?.[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-zen-text group-hover:text-zen-wood transition-colors font-serif">{record.family_members?.name}님의 비록</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-zen-muted bg-white px-2 py-0.5 rounded border border-zen-border">PROB. 88%</span>
                        <span className="text-xs text-zen-muted font-sans">{new Date(record.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" className="text-zen-muted hover:text-zen-text hover:bg-zen-bg rounded-sm px-4 text-xs font-bold uppercase tracking-wider">
                    Read Report
                  </Button>
                </div>
              ))}

              {records.length === 0 && (
                <div className="text-center py-20 text-zen-muted flex flex-col items-center">
                  <Box className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-serif text-lg">{user ? "아직 생성된 비록이 없습니다." : "로그인하면 비록을 확인할 수 있습니다."}</p>
                  <span className="text-sm font-sans mt-2">{user ? "첫 번째 운명 분석을 시작하여 삶의 길을 확인하세요." : "지금 바로 시작해보세요."}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Family Badge - Zen Style (Guest: Hidden or Generic) */}
      {user && (
        <div className="fixed top-32 right-6 hidden xl:block">
          <Link href="/protected/family" className="flex items-center gap-4 bg-white border border-zen-border px-6 py-4 rounded-sm hover:border-zen-gold hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-sm bg-zen-bg flex items-center justify-center group-hover:bg-zen-gold/10 transition-colors border border-zen-border group-hover:border-zen-gold/30">
              <User className="w-5 h-5 text-zen-wood group-hover:text-zen-gold" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase text-zen-muted font-bold tracking-wider">인연 (Destiny Ties)</p>
              <p className="text-2xl font-serif font-bold text-zen-text">{members.length}<span className="text-sm font-sans font-normal text-zen-muted ml-1">명</span></p>
            </div>
          </Link>
        </div>
      )}

    </div>
  );
}
