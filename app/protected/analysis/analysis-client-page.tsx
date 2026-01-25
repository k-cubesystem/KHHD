"use client";

import { AnalysisForm } from "@/components/analysis/analysis-form";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    birth_date: string;
}

interface AnalysisClientPageProps {
    members: FamilyMember[];
}

export function AnalysisClientPage({ members }: AnalysisClientPageProps) {
    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-16 px-6 pb-32 font-sans"
        >
            {/* Header */}
            <motion.section variants={fadeInUp} className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zen-border shadow-sm mb-2">
                        <BookOpen className="w-4 h-4 text-zen-gold" />
                        <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em] font-sans">Heaven Earth Man Analysis</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-zen-text italic leading-tight">
                        천지인(天地人) <br />
                        <span className="text-zen-wood">심층 분석실</span>
                    </h1>
                    <div className="w-24 h-1 bg-zen-gold/30 mx-auto rounded-full" />
                    <p className="text-zen-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-serif italic">
                        "하늘이 준 기운, 땅의 흐름, 그리고 당신의 의지." <br />
                        <span className="text-zen-text not-italic font-bold font-sans text-base">해화당의 통찰과 AI 엔진이 결합된 가장 정교한 숙명 시뮬레이션입니다.</span>
                    </p>
                </div>
            </motion.section>

            {/* Main Form in a Card */}
            <motion.div variants={fadeInUp}>
                <Card depth="medium" className="relative bg-white p-1 shadow-2xl shadow-zen-wood/10">
                    <div className="absolute inset-0 bg-zen-wood/5 rounded-sm -m-1 pointer-events-none border border-zen-border shadow-inner" />
                    <AnalysisForm members={members} />
                </Card>
            </motion.div>

            {/* Footer */}
            <motion.section variants={fadeInUp} className="text-center space-y-4 opacity-50 font-serif italic text-sm text-zen-muted">
                <p>※ 모든 분석은 명리학적 전통 가이드라인과 최신 데이터 알고리즘을 준수합니다.</p>
                <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
                    <span>Authentic</span>
                    <span className="w-1 h-1 rounded-full bg-zen-gold" />
                    <span>Precise</span>
                    <span className="w-1 h-1 rounded-full bg-zen-gold" />
                    <span>Haehwadang Master Identity</span>
                </div>
            </motion.section>
        </motion.div>
    );
}
