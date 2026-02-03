"use client";

import Link from "next/link";
import { User, CloudMoon, Settings, Bell, Zap, BookOpen, Sparkles, LayoutDashboard, ScrollText, Users, Compass, Fingerprint, Coins, Flower2, Ticket } from "lucide-react";
import { Hero2026 } from "./hero-2026";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DesktopViewProps {
    isGuest: boolean;
    masterName: string;
    userData: {
        avatarUrl?: string;
        email?: string;
        balance: number;
        tier: string | null;
    };
}

export function DesktopView({ isGuest, masterName, userData }: DesktopViewProps) {
    const individualTools = [
        { label: "사주풀이", icon: BookOpen, href: "/protected/analysis", desc: "정통 명리학 분석" },
        { label: "관상", icon: User, href: "/protected/saju/face", desc: "얼굴에 담긴 운명" },
        { label: "손금", icon: Fingerprint, href: "/protected/saju/palm", desc: "손안의 인생 지도" },
        { label: "풍수", icon: Compass, href: "/protected/saju/fengshui", desc: "공간 에너지 조화" },
        { label: "궁합", icon: Sparkles, href: "/protected/family", desc: "인연의 깊이 확인" },
        { label: "재물운", icon: Coins, href: "/protected/saju/wealth", desc: "부의 흐름 파악" },
    ];

    const getTierLabel = (tier: string | null) => {
        if (isGuest) return "비회원";
        if (!tier) return "무료 회원";
        if (tier === "SINGLE") return "싱글 멤버십";
        if (tier === "FAMILY") return "패밀리 멤버십";
        if (tier === "BUSINESS") return "비즈니스";
        return tier;
    };

    return (
        <div className="min-h-screen bg-background text-ink-light font-sans overflow-x-hidden relative flex flex-col">
            <div className="hanji-overlay" />

            {/* Main Content Area */}
            <div className="flex-1 pt-24 pb-12 px-6">
                <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-8">

                    {/* Center & Right Content (Full Width No Sidebar) */}
                    <main className="col-span-12 space-y-8">

                        {/* 1. 2026 병오년 Hero Section */}
                        <Hero2026 isGuest={isGuest} masterName={masterName} />

                        {/* 2. Main Features (Split) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cheonjiin */}
                            <Link href={isGuest ? "/auth/sign-up" : "/protected/analysis"} className="group relative h-64 bg-surface/40 border border-primary/20 rounded-2xl p-8 overflow-hidden hover:border-primary/60 transition-all hover:shadow-[0_0_30px_rgba(236,182,19,0.1)]">
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                                <CloudMoon className="w-6 h-6" strokeWidth={1} />
                                            </div>
                                            <h3 className="text-2xl font-serif font-bold text-ink-light">천지인(天地人) 사주풀이</h3>
                                        </div>
                                        <p className="text-ink-light/60 font-light leading-relaxed">
                                            하늘의 명(天), 땅의 기운(地), 사람의 상(人)을<br />
                                            통합하여 운명의 결을 읽어냅니다.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm group-hover:gap-4 transition-all">
                                        <span>지금 분석하기</span>
                                        <LayoutDashboard className="w-4 h-4 rotate-90" strokeWidth={1} />
                                    </div>
                                </div>
                                <CloudMoon className="absolute -bottom-4 -right-4 w-48 h-48 text-primary/5 group-hover:text-primary/10 transition-colors rotate-12" strokeWidth={0.5} />
                            </Link>

                            {/* Relationship */}
                            <Link href={isGuest ? "/auth/sign-up" : "/protected/family"} className="group relative h-64 bg-surface/40 border border-primary/20 rounded-2xl p-8 overflow-hidden hover:border-seal/60 transition-all hover:shadow-[0_0_30px_rgba(154,42,42,0.1)]">
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-3 rounded-lg bg-seal/10 text-seal">
                                                <Users className="w-6 h-6" strokeWidth={1} />
                                            </div>
                                            <h3 className="text-2xl font-serif font-bold text-ink-light">인연관리 비법서</h3>
                                        </div>
                                        <p className="text-ink-light/60 font-light leading-relaxed">
                                            가족, 연인, 직장 상사와의 관계를 분석하고<br />
                                            나에게 맞는 처세술을 제안합니다.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-seal font-bold text-sm group-hover:gap-4 transition-all">
                                        <span>인연 관리하기</span>
                                        <LayoutDashboard className="w-4 h-4 rotate-90" strokeWidth={1} />
                                    </div>
                                </div>
                                <Users className="absolute -bottom-4 -right-4 w-48 h-48 text-seal/5 group-hover:text-seal/10 transition-colors -rotate-12" strokeWidth={0.5} />
                            </Link>
                        </div>

                        {/* 3. Sub Features & Grid Combo */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Sub Features (Vertical Stack or Side by Side) */}
                            <div className="col-span-12 md:col-span-4 space-y-4">
                                <Link href={isGuest ? "/auth/sign-up" : "/protected/ai-shaman"} className="block bg-gradient-to-br from-surface to-background border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 rounded-full bg-primary/20 text-primary">
                                            <Zap className="w-5 h-5" strokeWidth={1} />
                                        </div>
                                        <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded font-bold">AI CHAT</span>
                                    </div>
                                    <h4 className="font-serif text-lg text-ink-light mb-1 group-hover:text-primary transition-colors">해화당 AI</h4>
                                    <p className="text-xs text-ink-light/50">즉각적인 운세 Q&A</p>
                                </Link>

                                <Link href={isGuest ? "/auth/sign-up" : "/protected/saju/today"} className="block bg-gradient-to-br from-surface to-background border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 rounded-full bg-primary/20 text-primary">
                                            <ScrollText className="w-5 h-5" strokeWidth={1} />
                                        </div>
                                        <Bell className="w-4 h-4 text-ink-light/30 group-hover:text-primary transition-colors" strokeWidth={1} />
                                    </div>
                                    <h4 className="font-serif text-lg text-ink-light mb-1 group-hover:text-primary transition-colors">오늘의 운세</h4>
                                    <p className="text-xs text-ink-light/50">매일 아침 카카오톡 알림</p>
                                </Link>
                            </div>

                            {/* Individual Grid */}
                            <div className="col-span-12 md:col-span-8">
                                <div className="bg-surface/10 border border-white/5 rounded-2xl p-6 h-full">
                                    <h3 className="text-xs font-bold text-ink-light/40 uppercase tracking-widest mb-6">Discovery Tools</h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {individualTools.map((tool, idx) => (
                                            <Link
                                                key={idx}
                                                href={isGuest ? "/auth/sign-up" : tool.href}
                                                className="bg-background/50 border border-white/5 rounded-xl p-4 hover:bg-surface hover:border-primary/30 transition-all group"
                                            >
                                                <tool.icon className="w-6 h-6 text-ink-light/40 mb-3 group-hover:text-primary transition-colors" strokeWidth={0.8} />
                                                <h5 className="font-bold text-ink-light text-sm mb-1">{tool.label}</h5>
                                                <p className="text-[10px] text-ink-light/40">{tool.desc}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </main>
                </div>
            </div>
        </div>
    );
}


