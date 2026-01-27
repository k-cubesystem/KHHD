import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { User, ScrollText, Users, CreditCard, ChevronRight, Settings } from "lucide-react";

export default async function MyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    // Fetch real profile data
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const displayName = profile?.name || user.email?.split("@")[0] || "Guest";
    const membershipLevel = profile?.membership_tier || "Standard";
    // If 'membership_tier' doesn't exist, it might default to undefined, handle gracefully.

    // Mock Archives (Replace with real data if 'consultations' table exists)
    const archives = [
        { date: "2026.01.15", title: "을사년 신년 운세 (Year of Snake)", type: "Annual" },
        { date: "2025.10.02", title: "사업 확장 시기 분석", type: "Specific" },
    ];

    const menuItems = [
        { label: "내 정보 수정", href: "/protected/profile/edit", icon: User, desc: "사주 정보 및 계정 설정" },
        { label: "정통 만세력", href: "/protected/profile/manse", icon: ScrollText, desc: "전문가용 만세력 분석" },
        { label: "인연 관리", href: "/protected/relationships", icon: Users, desc: "가족 및 지인 정보 등록" },
        { label: "멤버십 관리", href: "/protected/membership", icon: CreditCard, desc: "구독 및 결제 내역" },
    ];

    return (
        <div className="min-h-screen w-full bg-hanji text-ink font-serif flex flex-col items-center py-12 px-6 relative overflow-x-hidden">

            {/* Background Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

            {/* Header / Nav (Minimal) */}
            <header className="w-full max-w-2xl flex justify-between items-center mb-16 z-10">
                <Link href="/protected" className="font-gungseo text-ink/80 text-lg hover:text-cinnabar transition-colors">海花堂</Link>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] tracking-widest text-ink/40 uppercase">{user.email}</span>
                    <LogoutButton />
                </div>
            </header>

            {/* 1. Profile Seal Section (Organic Modernism Design) */}
            <section className="flex flex-col items-center gap-6 mb-16 z-10 animate-in fade-in zoom-in duration-700">
                <div className="relative group cursor-default">
                    {/* Seal Container */}
                    <div className="w-28 h-28 bg-cinnabar/10 rounded-full flex items-center justify-center border border-cinnabar/20 group-hover:bg-cinnabar group-hover:text-hanji transition-all duration-500 shadow-lg">
                        <span className="font-gungseo text-4xl font-bold text-cinnabar group-hover:text-hanji transition-colors">
                            {displayName[0]}
                        </span>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h1 className="font-gungseo text-2xl text-ink font-bold">{displayName}</h1>
                    <span className="inline-block px-3 py-1 rounded-full border border-gold-400/30 bg-gold-500/5 text-[10px] uppercase tracking-[0.2em] text-gold-600 font-sans">
                        {membershipLevel} Member
                    </span>
                </div>
            </section>

            {/* 2. Menu Configuration (Restored Structure) */}
            <section className="w-full max-w-xl mb-12 z-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuItems.map((item) => (
                        <Link key={item.label} href={item.href} className="group relative bg-white/40 border border-ink/5 p-6 rounded-sm hover:border-gold-500/50 hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center text-ink/60 group-hover:bg-gold-500/10 group-hover:text-gold-600 transition-colors">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <ChevronRight className="w-4 h-4 text-ink/20 group-hover:text-gold-500 transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-gungseo text-lg font-bold text-ink mb-1 group-hover:text-gold-700 transition-colors">{item.label}</h3>
                                <p className="font-sans text-xs text-ink/50 font-light">{item.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* 3. Consultation Archive (New Design Element) */}
            <section className="w-full max-w-xl space-y-6 z-10 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-ink/10" />
                    <span className="text-[10px] font-sans tracking-[0.2em] text-ink/40 uppercase">Archive</span>
                    <div className="h-px flex-1 bg-ink/10" />
                </div>

                <div className="space-y-3">
                    {archives.map((item, idx) => (
                        <Link key={idx} href={`/protected/analysis/result`} className="block group">
                            <div className="relative bg-white border border-ink/5 p-5 shadow-sm hover:shadow-md hover:border-ink/20 transition-all duration-300 rounded-[2px] flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-sans text-ink/30 tracking-widest">{item.date}</span>
                                    <h4 className="font-gungseo text-sm text-ink/80 group-hover:text-ink">{item.title}</h4>
                                </div>
                                <div className="w-8 h-8 flex items-center justify-center border border-ink/10 rounded-full text-ink/20 group-hover:bg-ink group-hover:text-hanji transition-all">
                                    <ScrollText className="w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

        </div>
    );
}
