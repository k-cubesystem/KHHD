"use client";

import Link from "next/link";
import { Share2, Download, RotateCcw, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalysisResultPage() {
    // Static Placeholder Data for Presentation
    const saju = {
        year: { gan: "갑", ji: "진", element: "Wood", color: "text-green-400" },
        month: { gan: "병", ji: "인", element: "Fire", color: "text-seal" },
        day: { gan: "무", ji: "자", element: "Earth", color: "text-yellow-500" },
        time: { gan: "경", ji: "신", element: "Metal", color: "text-gray-300" },
    };

    const fiveElements = [
        { label: "목 (Wood)", level: 30, color: "bg-green-500", text: "text-green-400", icon: "木" },
        { label: "화 (Fire)", level: 45, color: "bg-seal", text: "text-seal", icon: "火" },
        { label: "토 (Earth)", level: 10, color: "bg-yellow-600", text: "text-yellow-500", icon: "土" },
        { label: "금 (Metal)", level: 15, color: "bg-gray-400", text: "text-gray-300", icon: "金" },
        { label: "수 (Water)", level: 5, color: "bg-blue-500", text: "text-blue-400", icon: "水" },
    ];

    return (
        <div className="min-h-screen w-full bg-background text-white font-sans flex flex-col relative overflow-hidden pb-24">
            {/* Texture Overlays */}
            <div className="hanji-overlay" />
            <div className="paper-grain" />

            {/* Header */}
            <header className="relative z-20 px-6 pt-12 pb-4 flex items-center justify-between">
                <Link href="/protected" className="p-2 -ml-2 text-white/60 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <span className="font-serif font-semibold text-primary tracking-widest gold-glow text-lg">
                    운명 분석
                </span>
                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-6 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Section 1: The Four Pillars (Saju) */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 justify-center">
                        <div className="h-px w-8 bg-primary/30" />
                        <h2 className="text-center text-xs font-serif font-bold tracking-[0.2em] text-primary/80 uppercase">사주 팔자</h2>
                        <div className="h-px w-8 bg-primary/30" />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {['시 (Time)', '일 (Day)', '월 (Month)', '년 (Year)'].map((col, idx) => {
                            const pillar = [saju.time, saju.day, saju.month, saju.year][idx];
                            return (
                                <div key={idx} className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] text-white/40 tracking-wider uppercase font-sans mb-1">{col}</span>
                                    <div className="w-full aspect-[1/2] border border-primary/20 bg-surface/40 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-4 relative overflow-hidden luxury-card-glow transition-transform active:scale-95 duration-300">
                                        <span className={`font-serif text-2xl font-bold ${pillar.color}`}>
                                            {pillar.gan}
                                        </span>
                                        <div className="w-4 h-px bg-white/10" />
                                        <span className={`font-serif text-2xl font-bold text-white/90`}>
                                            {pillar.ji}
                                        </span>

                                        {/* Elemental Aura */}
                                        <div className={`absolute -bottom-4 -right-4 w-16 h-16 blur-[40px] opacity-10 ${pillar.color.replace('text-', 'bg-')}`} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Section 2: Five Elements Balance */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4 justify-center">
                        <div className="h-px w-8 bg-primary/30" />
                        <h2 className="text-center text-xs font-serif font-bold tracking-[0.2em] text-primary/80 uppercase">오행 균형</h2>
                        <div className="h-px w-8 bg-primary/30" />
                    </div>

                    <div className="bg-surface/30 border border-primary/10 rounded-xl p-6 luxury-card-glow relative overflow-hidden">
                        <div className="flex justify-between items-end h-32 gap-3 px-2">
                            {fiveElements.map((el, i) => (
                                <div key={i} className="flex flex-col items-center justify-end h-full gap-2 w-full group">
                                    <div className="w-full relative flex items-end justify-center h-full rounded-t-sm overflow-hidden bg-white/5">
                                        <div
                                            className={`w-full transition-all duration-1000 ease-out ${el.color} opacity-80 group-hover:opacity-100`}
                                            style={{ height: `${el.level}%` }}
                                        />
                                    </div>
                                    <div className={`text-sm font-serif font-bold ${el.text}`}>{el.icon}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between px-2 mt-2">
                            {fiveElements.map((el, i) => (
                                <span key={i} className="text-[10px] text-white/30 tracking-wider w-full text-center">{el.label.split(' ')[0]}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Section 3: Analysis Summary */}
                <section className="space-y-4">
                    <div className="bg-surface/30 border-l-2 border-primary/50 p-6 rounded-r-xl luxury-card-glow">
                        <h3 className="text-primary font-serif font-bold text-lg mb-3 flex items-center gap-2">
                            <SparkleIcon className="w-4 h-4" />
                            핵심 요약
                        </h3>
                        <p className="font-sans text-base text-white/80 leading-relaxed font-light">
                            귀하의 사주는 <span className="text-seal font-medium gold-glow">화(火)</span>의 기운이 강하게 나타나며,
                            이는 폭발적인 추진력과 열정을 의미합니다.
                            다만 <span className="text-blue-400 font-medium">수(水)</span>가 부족하여
                            마무리가 약할 수 있으니 인내심을 기르는 것이 중요합니다.
                        </p>
                    </div>

                    <div className="bg-surface/30 border-l-2 border-seal/50 p-6 rounded-r-xl luxury-card-glow">
                        <h3 className="text-seal font-serif font-bold text-lg mb-3 flex items-center gap-2">
                            <WarningIcon className="w-4 h-4" />
                            조언
                        </h3>
                        <p className="font-sans text-base text-white/80 leading-relaxed font-light">
                            올해는 무리한 확장보다는 <span className="text-white font-medium border-b border-white/20 pb-0.5">내실을 다지는 것</span>이 유리합니다.
                            북쪽 방향이 길하며, 검은색 소품이 행운을 가져다 줄 것입니다.
                        </p>
                    </div>
                </section>

            </main>

            {/* Fixed Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-50">
                <div className="max-w-[480px] mx-auto grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 border-primary/30 text-primary hover:bg-primary/10 gap-2">
                        <Share2 className="w-4 h-4" />
                        공유하기
                    </Button>
                    <Button className="h-12 bg-primary text-background hover:bg-primary/90 gap-2 gold-border-glow">
                        <Download className="w-4 h-4" />
                        저장하기
                    </Button>
                </div>
                <div className="max-w-[480px] mx-auto mt-3 text-center">
                    <Link href="/protected/saju/new" className="text-xs text-white/40 hover:text-white flex items-center justify-center gap-1.5 transition-colors py-2">
                        <RotateCcw className="w-3 h-3" />
                        다시 분석하기
                    </Link>
                </div>
            </div>
        </div>
    );
}

function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}

function WarningIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M3.315 19.315a1.2 1.2 0 0 1-.29-1.39l7.087-14.175a1.2 1.2 0 0 1 2.176 0l7.087 14.175a1.2 1.2 0 0 1-.29 1.39 1.2 1.2 0 0 1-1.385.165H4.7a1.2 1.2 0 0 1-1.385-.165Z" />
        </svg>
    )
}
