"use client";

import Link from "next/link";
import { User, Crown, CloudMoon, Star, Settings, Bell, Zap, BookOpen, Sparkles, LogOut, LayoutDashboard, Database, ScrollText, Users, Compass, Fingerprint, Coins } from "lucide-react";
import Image from "next/image";
import { LogoutButton } from "@/components/logout-button";

interface DesktopViewProps {
    isGuest: boolean;
    masterName: string;
}

export function DesktopView({ isGuest, masterName }: DesktopViewProps) {
    const individualTools = [
        { label: "사주풀이", icon: BookOpen, href: "/protected/analysis", desc: "정통 명리학 분석" },
        { label: "관상", icon: User, href: "/protected/saju/face", desc: "얼굴에 담긴 운명" },
        { label: "손금", icon: Fingerprint, href: "/protected/saju/palm", desc: "손안의 인생 지도" },
        { label: "풍수", icon: Compass, href: "/protected/saju/fengshui", desc: "공간 에너지 조화" },
        { label: "궁합", icon: Sparkles, href: "/protected/relationships", desc: "인연의 깊이 확인" },
        { label: "재물운", icon: Coins, href: "/protected/saju/wealth", desc: "부의 흐름 파악" },
    ];

    return (
        <div className="min-h-screen bg-background text-ink-light font-sans overflow-x-hidden relative flex flex-col">
            <div className="hanji-overlay" />

            {/* Header */}
            <header className="fixed top-0 w-full z-40 border-b border-primary/10 bg-background/90 backdrop-blur-md h-16 transition-all duration-300">
                <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-6">
                    <Link href="/protected" className="flex items-center gap-3 group">
                        <Crown className="text-primary w-6 h-6" strokeWidth={0.7} />
                        <h2 className="text-ink-light text-lg font-bold tracking-widest uppercase font-serif group-hover:text-primary transition-colors">
                            Cheongdam <span className="text-primary">Haehwadang</span>
                        </h2>
                    </Link>
                    <nav className="flex items-center gap-6">
                        <Link href="/protected/services" className="text-xs font-bold uppercase tracking-widest text-ink-light/60 hover:text-primary transition-colors">Service Intro</Link>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-ink-light/60 hover:text-primary transition-colors cursor-pointer" strokeWidth={1} />
                            <Link href="/protected/settings">
                                <Settings className="w-5 h-5 text-ink-light/60 hover:text-primary transition-colors cursor-pointer" strokeWidth={1} />
                            </Link>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 pt-24 pb-12 px-6">
                <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-8">

                    {/* Left Sidebar (Profile & Nav) */}
                    <aside className="col-span-12 lg:col-span-3 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-surface/50 border border-primary/20 rounded-2xl p-6 relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-surface border-2 border-primary/30 flex items-center justify-center relative">
                                    <User className="w-8 h-8 text-ink-light/70" strokeWidth={1} />
                                    <div className="absolute -bottom-1 -right-1 bg-primary text-background p-1 rounded-full border border-background">
                                        <Star className="w-3 h-3 fill-current" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-primary font-bold tracking-widest uppercase mb-1">VVIP Member</p>
                                    <h3 className="text-xl font-serif font-bold text-ink-light">{masterName}님</h3>
                                </div>
                            </div>
                            <div className="space-y-3 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-ink-light/50">보유 크레딧</span>
                                    <span className="text-primary font-bold">1,200 C</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-ink-light/50">나의 등급</span>
                                    <span className="text-ink-light/90">Gold Class</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Menu */}
                        <div className="bg-surface/30 border border-white/5 rounded-2xl p-4 space-y-2">
                            <SidebarLink href="/protected" icon={LayoutDashboard} label="대시보드" active />
                            <SidebarLink href="/protected/profile" icon={User} label="내 사주 정보 (MY)" />
                            <SidebarLink href="/protected/history" icon={Database} label="분석 기록 보관함" />
                            <div className="my-2 h-px bg-white/5" />
                            <LogoutButton className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/10 transition-colors">
                                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                                로그아웃
                            </LogoutButton>
                        </div>
                    </aside>

                    {/* Center & Right Content */}
                    <main className="col-span-12 lg:col-span-9 space-y-8">

                        {/* 1. Marketing Banner (Slim) */}
                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-primary/20 group cursor-pointer">
                            <Image
                                src="/images/intro-wealth-v2.jpg"
                                alt="Banner"
                                fill
                                className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
                            <div className="absolute inset-0 flex flex-col justify-center px-10">
                                <span className="inline-block px-3 py-1 rounded-full border border-primary/40 bg-background/30 backdrop-blur-md text-primary text-[10px] font-bold tracking-widest mb-3 w-fit">
                                    SEASONAL SPECIAL
                                </span>
                                <h2 className="text-3xl font-serif text-ink-light mb-2">당신의 귀인을 찾아서</h2>
                                <p className="text-ink-light/70 font-light">인연관리 비법서 오픈 기념 프리미엄 분석 혜택</p>
                            </div>
                        </div>

                        {/* 2. Main Features (Split) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Cheonjiin */}
                            <Link href={isGuest ? "/auth/sign-up" : "/protected/cheonjiin"} className="group relative h-64 bg-surface/40 border border-primary/20 rounded-2xl p-8 overflow-hidden hover:border-primary/60 transition-all hover:shadow-[0_0_30px_rgba(236,182,19,0.1)]">
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
                            <Link href={isGuest ? "/auth/sign-up" : "/protected/relationships"} className="group relative h-64 bg-surface/40 border border-primary/20 rounded-2xl p-8 overflow-hidden hover:border-seal/60 transition-all hover:shadow-[0_0_30px_rgba(154,42,42,0.1)]">
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

                                <Link href={isGuest ? "/auth/sign-up" : "/protected/daily"} className="block bg-gradient-to-br from-surface to-background border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-colors group">
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

function SidebarLink({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary border border-primary/20" : "text-ink-light/60 hover:text-ink-light hover:bg-white/5"}`}
        >
            <Icon className="w-4 h-4" strokeWidth={1} />
            {label}
        </Link>
    )
}
