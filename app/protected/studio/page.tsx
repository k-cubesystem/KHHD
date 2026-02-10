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

                {/* Palm Reading - ACTIVE */}
                <Link href="/protected/studio/palm" className="block">
                    <div className="flex items-center gap-4 card-glass-manse rounded-xl p-6 hover:bg-[#D4AF37]/5 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                            <Fingerprint className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-serif font-bold text-ink-light mb-1">손금</h3>
                            <p className="text-xs text-ink-light/50">손바닥에 새겨진 생명 정보</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-ink-light/20 ml-auto group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                </Link>

                {/* Face Reading - ACTIVE */}
                <Link href="/protected/studio/face" className="block">
                    <div className="flex items-center gap-4 card-glass-manse rounded-xl p-6 hover:bg-[#D4AF37]/5 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                            <User className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-serif font-bold text-ink-light mb-1">관상학</h3>
                            <p className="text-xs text-ink-light/50">얼굴에 담긴 인생의 길흉</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-ink-light/20 ml-auto group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                </Link>

                {/* Feng Shui - ACTIVE */}
                <Link href="/protected/studio/fengshui" className="block">
                    <div className="flex items-center gap-4 card-glass-manse rounded-xl p-6 hover:bg-[#D4AF37]/5 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center group-hover:bg-[#D4AF37]/20 transition-colors">
                            <Compass className="w-6 h-6 text-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h3 className="text-lg font-serif font-bold text-ink-light mb-1">공간풍수</h3>
                            <p className="text-xs text-ink-light/50">당신을 둘러싼 기의 흐름</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-ink-light/20 ml-auto group-hover:text-[#D4AF37] transition-colors" />
                    </div>
                </Link>
            </main>
        </div>
    );
}

const CATEGORIES = [
    // All analysis types are now active and handled separately above
] as const;
