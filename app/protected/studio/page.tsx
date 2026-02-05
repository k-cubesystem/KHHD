"use client";

import { useState } from "react";
import { BookOpen, User, Compass, Database, Fingerprint, Camera, Upload, ArrowRight, Share2, Download, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Types
type StudioStep = "category" | "target" | "input" | "analyzing" | "result";
type AnalysisType = "saju" | "face" | "palm" | "fengshui";
type TargetType = "family" | "guest";

// Unused constants removed or kept if planning to reuse later

export default function StudioPage() {
    return (
        <div className="min-h-screen bg-background text-ink-light font-sans relative pb-24 overflow-x-hidden">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 relative z-10 flex items-center justify-between">
                <h1 className="text-xl font-serif font-bold font-manse-title">
                    <span className="text-manse-gold">해화당 스튜디오</span>
                </h1>
            </header>

            <main className="px-6 relative z-10 space-y-4">
                <h2 className="text-sm text-ink-light/60 font-medium mb-2">무엇을 분석하시겠습니까?</h2>

                {/* Saju Category */}
                <Link href="/protected/studio/saju/new" className="block">
                    <div className="flex items-center gap-4 card-glass-manse rounded-xl p-6 hover:bg-[#D4AF37]/5 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                            <BookOpen className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-serif font-bold text-ink-light mb-1">사주명리 (Four Pillars)</h3>
                            <p className="text-xs text-ink-light/50">생년월일로 보는 운명의 지도</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-ink-light/20 ml-auto group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                </Link>

                {/* Face/Palm/Fengshui (Placeholders or Future Routes) */}
                {CATEGORIES.map((cat) => (
                    <div key={cat.id} className="relative opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <div className="flex items-center gap-4 card-glass-manse rounded-xl p-6 group">
                            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                                <cat.icon className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-serif font-bold text-ink-light mb-1">{cat.label}</h3>
                                <p className="text-xs text-ink-light/50">{cat.desc}</p>
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-white/50">준비중</span>
                            </div>
                        </div>
                    </div>
                ))}
            </main>
        </div>
    );
}

const CATEGORIES = [
    // { id: "saju", label: "사주명리", icon: BookOpen, desc: "생년월일로 보는 운명의 지도" }, // Handled separately
    { id: "face", label: "관상학", icon: User, desc: "얼굴에 담긴 인생의 길흉" },
    { id: "palm", label: "손금", icon: Fingerprint, desc: "손바닥에 새겨진 생명 정보" },
    { id: "fengshui", label: "공간풍수", icon: Compass, desc: "당신을 둘러싼 기의 흐름" },
] as const;
