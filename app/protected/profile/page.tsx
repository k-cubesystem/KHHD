import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
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
    BookOpen
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getWalletBalance } from "@/app/actions/wallet-actions";

export default async function MyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    // Parallel Data Fetching
    const [profileData, walletBalance, recordsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        getWalletBalance(),
        supabase.from('saju_records')
            .select(`
                id,
                created_at,
                luck_score,
                family_members!inner (
                    name,
                    relationship
                )
            `)
            .eq('family_members.user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3)
    ]);

    const profile = profileData.data;
    const records = recordsData.data || [];
    const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Guest";
    const isAdmin = profile?.role === 'admin';

    // Calculate Tier (Simple logic for display)
    const tier = isAdmin ? "Administrator" : (profile?.is_subscribed ? "Gold Member" : "Silver Member");

    return (
        <div className="min-h-screen w-full bg-background text-ink-light font-sans selection:bg-primary/30 pb-20 overflow-x-hidden relative">
            <div className="hanji-overlay" />

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/20">
                <Link href="/protected" className="p-1 -ml-1 hover:bg-surface/10 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-ink-light/90" />
                </Link>
                <h1 className="text-sm font-serif tracking-[0.2em] text-ink-light/90 uppercase">My Page</h1>
                <Link href="/protected/settings" className="p-1 -mr-1 hover:bg-surface/10 rounded-full transition-colors">
                    <Settings className="w-5 h-5 text-ink-light/60" />
                </Link>
            </header>

            {/* Profile Section */}
            <section className="flex flex-col items-center pt-10 pb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 relative z-10">
                {/* Avatar */}
                <div className="relative mb-6 group cursor-pointer">
                    <div className="w-28 h-28 rounded-full border-2 border-primary/20 overflow-hidden bg-surface flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-colors">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-serif text-4xl text-primary">{displayName[0]}</span>
                        )}
                    </div>
                    {/* Tier Badge */}
                    <div className="absolute bottom-1 right-1 bg-primary text-background rounded-full p-1.5 shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                        {isAdmin ? <Crown className="w-3.5 h-3.5 fill-current" /> : <Star className="w-3.5 h-3.5 fill-current" />}
                    </div>
                </div>

                {/* Name & Tier */}
                <h2 className="text-2xl font-serif text-ink-light mb-3 tracking-wide">{displayName}</h2>
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-px w-8 bg-primary/30" />
                    <span className="text-primary text-[10px] tracking-[0.3em] uppercase font-bold">{tier}</span>
                    <div className="h-px w-8 bg-primary/30" />
                </div>

                {/* Admin Button */}
                {isAdmin && (
                    <Link href="/admin" className="mb-4">
                        <button className="flex items-center gap-2 px-5 py-2 bg-seal/10 border border-seal/30 rounded-full hover:bg-seal/20 hover:border-seal transition-colors group">
                            <LayoutDashboard className="w-4 h-4 text-seal group-hover:text-ink-light transition-colors" />
                            <span className="text-xs font-bold text-seal group-hover:text-ink-light transition-colors">관리자 페이지 접속</span>
                        </button>
                    </Link>
                )}
            </section>

            {/* Stats Row */}
            <section className="px-6 mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 relative z-10">
                <div className="bg-surface/30 border border-primary/20 rounded-2xl p-6 grid grid-cols-2 divide-x divide-primary/10 backdrop-blur-sm shadow-xl">
                    {/* Wallet Balance */}
                    <div className="flex flex-col items-center gap-1.5 hover:bg-surface/10 transition-colors rounded-lg py-1">
                        <Coins className="w-5 h-5 text-primary mb-1" strokeWidth={1} />
                        <span className="text-xl font-serif text-ink-light font-medium">{walletBalance > 900 ? "∞" : walletBalance}</span>
                        <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">Credits</span>
                    </div>
                    {/* Readings Count */}
                    <div className="flex flex-col items-center gap-1.5 hover:bg-surface/10 transition-colors rounded-lg py-1">
                        <BookOpen className="w-5 h-5 text-ink-light/60 mb-1" strokeWidth={1} />
                        <span className="text-xl font-serif text-ink-light font-medium">{recordsData.data?.length || 0}</span>
                        <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">History</span>
                    </div>
                </div>
            </section>

            {/* Recent Analysis */}
            <section className="px-6 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold tracking-widest text-ink-light/50 uppercase">Recent Analysis</h3>
                    <Link href="/protected/history" className="text-[10px] text-primary tracking-wider font-bold hover:text-ink-light transition-colors">VIEW ALL</Link>
                </div>

                <div className="space-y-4">
                    {records.length > 0 ? (
                        records.map((record: any) => (
                            <Link href={`/protected/result/${record.id}`} key={record.id} className="block group">
                                <div className="bg-surface/5 border border-primary/10 rounded-xl p-5 flex items-center justify-between hover:bg-surface/10 hover:border-primary/20 transition-all duration-300">
                                    <div>
                                        <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-sm mb-2 uppercase tracking-wide">
                                            {record.family_members?.relationship || "Self"}
                                        </span>
                                        <h4 className="text-base font-serif text-ink-light/90 mb-1 group-hover:text-primary transition-colors">
                                            {record.family_members?.name}의 사주 분석
                                        </h4>
                                        <p className="text-[10px] text-ink-light/40">
                                            {new Date(record.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-background text-ink-light/50 transition-all">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="text-center py-8 bg-surface/5 rounded-xl border border-white/5">
                            <p className="text-xs text-ink-light/40 mb-3">아직 분석 기록이 없습니다.</p>
                            <Link href="/protected/cheonjiin">
                                <span className="text-xs text-primary underline underline-offset-4">첫 분석 시작하기</span>
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Settings Menu */}
            <section className="px-6 mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 relative z-10">
                <div className="space-y-1">
                    <Link href="/protected/notifications" className="flex items-center justify-between p-4 hover:bg-surface/10 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-5 h-5 flex items-center justify-center">
                                {/* Using Lucide icons directly */}
                            </div>
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">알림 설정</span>
                        </div>
                        <Switch id="notify" className="data-[state=checked]:bg-primary" />
                    </Link>

                    <Link href="/protected/policy/privacy" className="flex items-center justify-between p-4 hover:bg-surface/10 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors" strokeWidth={1} />
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">개인정보 처리방침</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
                    </Link>

                    <Link href="/protected/support" className="flex items-center justify-between p-4 hover:bg-surface/10 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <Headphones className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors" strokeWidth={1} />
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
                    className="text-ink-light/30 text-[10px] tracking-[0.2em] hover:text-ink-light hover:bg-transparent transition-colors uppercase font-serif"
                >
                    Log Out
                </LogoutButton>
            </div>

        </div>
    );
}
