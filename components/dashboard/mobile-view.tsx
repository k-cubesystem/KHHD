"use client";

import Link from "next/link";
import { User, ScrollText, Compass, Sparkles, BookOpen, Crown, Zap, CloudMoon, Home, Users, Bell, Fingerprint, Coins } from "lucide-react";
import Image from "next/image";

interface MobileViewProps {
    isGuest: boolean;
    masterName: string;
}

export function MobileView({ isGuest, masterName }: MobileViewProps) {
    const individualTools = [
        { label: "사주풀이", icon: BookOpen, href: "/protected/analysis" },
        { label: "관상", icon: User, href: "/protected/saju/face" },
        { label: "손금", icon: Fingerprint, href: "/protected/saju/palm" },
        { label: "풍수", icon: Compass, href: "/protected/saju/fengshui" },
        { label: "궁합", icon: Sparkles, href: "/protected/family" },
        { label: "재물운", icon: Coins, href: "/protected/saju/wealth" },
    ];

    return (
        <div className="min-h-screen bg-background text-ink-light pb-28 font-sans relative overflow-hidden">
            {/* Background Texture */}
            <div className="hanji-overlay" />

            {/* Header */}
            <header className="px-6 pt-12 pb-4 flex items-center justify-between relative z-20">
                <div className="flex flex-col">
                    <span className="text-[10px] text-primary tracking-[0.2em] font-serif mb-1">CHEONGDAM HAEHWADANG</span>
                    <h1 className="text-xl font-serif text-ink-light">안녕하세요, <span className="text-primary">{masterName}</span>님</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface border border-primary/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" strokeWidth={0.7} />
                </div>
            </header>

            {/* Marketing Banner */}
            <section className="px-6 mb-8 relative z-20">
                <div className="relative w-full aspect-[2.5/1] rounded-xl overflow-hidden border border-primary/10 group">
                    <Image
                        src="/images/intro-wealth-v2.jpg"
                        alt="Banner"
                        fill
                        className="object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/50" />
                    <div className="absolute inset-0 flex flex-col justify-center px-6">
                        <span className="text-[9px] text-primary border border-primary/30 px-2 py-0.5 rounded-full w-fit mb-2 backdrop-blur-sm">PREMIUM EVENT</span>
                        <h3 className="font-serif text-lg text-ink-light mb-1">당신의 귀인을 찾아서</h3>
                        <p className="text-[10px] text-ink-light/70">지금 인연관리 비법서를 확인하세요</p>
                    </div>
                </div>
            </section>

            <main className="px-6 space-y-8 relative z-20">

                {/* 1. Main Features (CORE) */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h2 className="text-sm font-bold text-ink-light tracking-wide">메인 비법서</h2>
                    </div>

                    {/* Cheonjiin Card */}
                    <Link href={isGuest ? "/auth/sign-up" : "/protected/cheonjiin"} className="block">
                        <div className="bg-surface/40 border border-primary/20 rounded-xl p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CloudMoon className="w-24 h-24 text-primary" strokeWidth={0.5} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <CloudMoon className="w-5 h-5 text-primary" strokeWidth={1} />
                                    <h3 className="text-lg font-serif font-bold text-ink-light">천지인(天地人) 사주풀이</h3>
                                </div>
                                <p className="text-xs text-ink-light/60 mb-4 font-light">
                                    사주(天) + 풍수(地) + 관상/손금(人)<br />
                                    운명을 꿰뚫는 통합 분석 시스템
                                </p>
                                <span className="text-[10px] text-primary border-b border-primary/30 pb-0.5 group-hover:border-primary transition-colors">분석 시작하기 &rarr;</span>
                            </div>
                        </div>
                    </Link>

                    {/* Relationship Management Card */}
                    <Link href={isGuest ? "/auth/sign-up" : "/protected/family"} className="block">
                        <div className="bg-surface/40 border border-primary/20 rounded-xl p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users className="w-24 h-24 text-seal" strokeWidth={0.5} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-5 h-5 text-seal" strokeWidth={1} />
                                    <h3 className="text-lg font-serif font-bold text-ink-light">인연관리 비법서</h3>
                                </div>
                                <p className="text-xs text-ink-light/60 mb-4 font-light">
                                    가족, 친구, 직장상사와의 궁합 및<br />
                                    처세술 데이터를 체계적으로 관리합니다.
                                </p>
                                <span className="text-[10px] text-seal border-b border-seal/30 pb-0.5 group-hover:border-seal transition-colors">인연 관리하기 &rarr;</span>
                            </div>
                        </div>
                    </Link>
                </section>

                {/* 2. Sub Features */}
                <section className="grid grid-cols-2 gap-3">
                    <Link href={isGuest ? "/auth/sign-up" : "/protected/ai-shaman"} className="bg-surface border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-colors group flex flex-col justify-between h-28">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Zap className="w-4 h-4 text-primary" strokeWidth={1} />
                        </div>
                        <div>
                            <h4 className="font-serif text-sm text-ink-light mb-1">해화당 AI</h4>
                            <p className="text-[9px] text-ink-light/50">무엇이든 물어보세요</p>
                        </div>
                    </Link>
                    <Link href={isGuest ? "/auth/sign-up" : "/protected/daily"} className="bg-surface border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-colors group flex flex-col justify-between h-28">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <Bell className="w-4 h-4 text-primary" strokeWidth={1} />
                        </div>
                        <div>
                            <h4 className="font-serif text-sm text-ink-light mb-1">오늘의 운세</h4>
                            <p className="text-[9px] text-ink-light/50">매일 아침 알림받기</p>
                        </div>
                    </Link>
                </section>

                {/* 3. Individual Tools Grid */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-4 bg-ink-light/20 rounded-full" />
                        <h2 className="text-xs font-bold text-ink-light/50 tracking-wide uppercase">Individual Tools</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {individualTools.map((tool, idx) => (
                            <Link
                                key={idx}
                                href={isGuest ? "/auth/sign-up" : tool.href}
                                className="flex flex-col items-center justify-center aspect-square bg-surface/20 border border-white/5 rounded-lg hover:bg-surface/40 hover:border-primary/30 transition-all group"
                            >
                                <tool.icon className="w-6 h-6 text-ink-light/50 mb-2 group-hover:text-primary transition-colors stroke-[0.8]" />
                                <span className="text-[10px] text-ink-light/70 group-hover:text-ink-light transition-colors">{tool.label}</span>
                            </Link>
                        ))}
                    </div>
                </section>

            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-primary/15 pb-safe">
                <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
                    <NavButton icon={Home} label="홈" href={isGuest ? "/auth/sign-up" : "/protected"} active />
                    <NavButton icon={BookOpen} label="소개" href={isGuest ? "/auth/sign-up" : "/protected/services"} />
                    <NavButton icon={Users} label="인연관리" href={isGuest ? "/auth/sign-up" : "/protected/family"} />
                    <NavButton icon={CloudMoon} label="천지인" href={isGuest ? "/auth/sign-up" : "/protected/cheonjiin"} />
                    <NavButton icon={User} label="MY" href={isGuest ? "/auth/sign-up" : "/protected/profile"} />
                </div>
            </nav>
        </div>
    );
}

function NavButton({ icon: Icon, label, href, active }: { icon: any, label: string, href: string, active?: boolean }) {
    return (
        <Link href={href} className="flex flex-col items-center justify-center w-full gap-1 p-2 group">
            <Icon className={`w-5 h-5 stroke-[1] transition-transform group-hover:scale-110 ${active ? "text-primary" : "text-ink-light/40 group-hover:text-primary"}`} />
            <span className={`text-[9px] tracking-tight transition-colors font-serif ${active ? "text-primary" : "text-ink-light/40 group-hover:text-primary"}`}>
                {label}
            </span>
        </Link>
    )
}
