import { createClient } from "@/lib/supabase/server";
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
    BookOpen,
    Sparkles,
    Users
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { getCurrentUserRole } from "@/app/actions/products";
import { Button } from "@/components/ui/button";

export default async function MyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isGuest = !user;

    // Guest Preview
    if (isGuest) {
        return (
            <div className="min-h-screen w-full bg-background text-ink-light font-sans selection:bg-primary/30 pb-20 overflow-x-hidden relative">
                <div className="hanji-overlay" />

                {/* Header */}
                <header className="flex items-center justify-between px-6 py-5 sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/20">
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
                <section className="px-6 mb-10 relative z-10 blur-sm opacity-40">
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
                <section className="px-6 relative z-10">
                    <div className="bg-surface/40 border border-primary/20 p-8 text-center space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-5">
                            <Sparkles className="w-32 h-32 text-primary" strokeWidth={0.5} />
                        </div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                                <Sparkles className="w-8 h-8 text-primary" strokeWidth={1} />
                            </div>

                            <h2 className="text-3xl font-serif text-ink-light mb-3">
                                가입하고 프로필 만들기
                            </h2>
                            <p className="text-sm text-ink-light/70 font-light max-w-md mx-auto mb-8 leading-relaxed">
                                청담 해화당에 가입하여 당신만의 운명 분석 기록을 관리하고,<br />
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
                                    <Button variant="outline" className="w-full border-primary/30 text-ink-light hover:border-primary hover:bg-primary/10 font-serif px-8 py-6 text-base">
                                        <Crown className="w-5 h-5 mr-2" />
                                        멤버십 플랜 보기
                                    </Button>
                                </Link>
                            </div>

                            <div className="pt-6 border-t border-primary/10 mt-8">
                                <p className="text-xs text-ink-light/50">
                                    이미 계정이 있으신가요?{" "}
                                    <Link href="/auth/login" className="text-primary hover:text-primary-dim underline underline-offset-4">
                                        로그인
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    // Parallel Data Fetching
    const [profileData, walletBalance, recordsData, userRoleData] = await Promise.all([
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
            .limit(3),
        getCurrentUserRole()
    ]);

    const profile = profileData.data;
    const records = recordsData.data || [];
    const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Guest";
    const isAdmin = userRoleData.role === 'admin';

    // Calculate Tier (Simple logic for display)
    const tier = isAdmin ? "Administrator" : (profile?.is_subscribed ? "Gold Member" : "Silver Member");

    return (
        <div className="min-h-screen w-full bg-background text-ink-light font-sans selection:bg-primary/30 pb-20 overflow-x-hidden relative">
            <div className="hanji-overlay" />

            {/* Header - Transparent on Mobile for minimalist look, or sticky as preferred. User wanted "No Top Menu" on mobile in global layout.
                But `MyPage` often needs a title. Layout handles Global Nav. This is a local header. 
                I will style it strictly. */}


            {/* Profile Section */}
            <section className="flex flex-col items-center pt-10 pb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 relative z-10">
                {/* Avatar */}
                <div className="relative mb-6 group cursor-pointer">
                    <div className="w-28 h-28 border-2 border-primary/20 overflow-hidden bg-surface flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-colors">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-serif text-4xl text-primary">{displayName[0]}</span>
                        )}
                    </div>
                    {/* Tier Badge */}
                    <div className="absolute bottom-1 right-1 bg-primary text-background p-1.5 shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                        {isAdmin ? <Crown className="w-3.5 h-3.5 fill-current" /> : <Star className="w-3.5 h-3.5 fill-current" />}
                    </div>
                </div>

                {/* Name & Tier */}
                <h2 className="text-2xl font-serif text-ink-light mb-3 tracking-wide">{displayName}</h2>
                <Link href="/protected/membership" className="flex items-center gap-3 mb-6 group cursor-pointer">
                    <div className="h-px w-8 bg-primary/30 group-hover:w-12 transition-all" />
                    <span className="text-primary text-[10px] tracking-[0.3em] uppercase font-bold group-hover:text-primary-dim transition-colors">
                        {tier} <span className="ml-1 text-[8px] opacity-70">(UPGRADE)</span>
                    </span>
                    <div className="h-px w-8 bg-primary/30 group-hover:w-12 transition-all" />
                </Link>

                {/* Admin Button */}

            </section>



            {/* Dashboard Navigation Grid */}
            <section className="px-6 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 relative z-10">
                <h3 className="text-xs font-bold tracking-widest text-ink-light/50 uppercase mb-6">Menu</h3>
                <div className="grid grid-cols-2 gap-4">
                    {isAdmin && (
                        <Link href="/admin" className="group col-span-2 mb-2">
                            <div className="bg-gradient-to-r from-seal/20 via-seal/10 to-seal/20 border-2 border-seal/40 hover:border-seal hover:from-seal/30 hover:via-seal/20 hover:to-seal/30 p-6 flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden shadow-lg">
                                {/* Background shimmer */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-seal/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                {/* Content */}
                                <Shield className="w-6 h-6 text-seal group-hover:scale-110 transition-transform stroke-[1.5] relative z-10" />
                                <span className="text-base font-serif font-bold text-seal tracking-widest relative z-10 uppercase">
                                    관리자 대시보드
                                </span>
                                <ArrowRight className="w-5 h-5 text-seal/60 group-hover:text-seal group-hover:translate-x-1 transition-all relative z-10" />
                            </div>
                        </Link>
                    )}
                    <Link href="/protected/settings" className="group">
                        <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
                            <UserIcon className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors stroke-1" />
                            <span className="text-sm font-serif font-medium text-ink-light group-hover:text-primary transition-colors">내 정보 수정</span>
                        </div>
                    </Link>

                    <Link href="/protected/family" className="group">
                        <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
                            <Users className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors stroke-1" />
                            <span className="text-sm font-serif font-medium text-ink-light group-hover:text-primary transition-colors">인연 관리</span>
                        </div>
                    </Link>

                    <Link href="/protected/membership" className="group">
                        <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
                            <Crown className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors stroke-1" />
                            <span className="text-sm font-serif font-medium text-ink-light group-hover:text-primary transition-colors">멤버십 안내</span>
                        </div>
                    </Link>

                    <Link href="/protected/history" className="group">
                        <div className="bg-surface/30 border border-primary/20 hover:border-primary/50 hover:bg-surface/50 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-[4/3]">
                            <BookOpen className="w-8 h-8 text-ink-light/60 group-hover:text-primary transition-colors stroke-1" />
                            <span className="text-sm font-serif font-medium text-ink-light group-hover:text-primary transition-colors">사주 기록</span>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Settings Menu */}
            <section className="px-6 mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 relative z-10">
                <div className="space-y-1">
                    <Link href="/protected/notifications" className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-5 h-5 flex items-center justify-center">
                                {/* Using Lucide icons directly */}
                            </div>
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">알림 설정</span>
                        </div>
                        <Switch id="notify" className="data-[state=checked]:bg-primary" />
                    </Link>

                    <Link href="/protected/policy/privacy" className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors" strokeWidth={1} />
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">개인정보 처리방침</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
                    </Link>

                    <Link href="/protected/support" className="flex items-center justify-between p-4 hover:bg-surface/10 transition-colors cursor-pointer group">
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
