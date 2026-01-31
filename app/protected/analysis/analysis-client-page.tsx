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
            className="flex flex-col gap-8 w-full max-w-5xl mx-auto py-12 px-6 pb-32 font-sans"
        >
            {/* Header */}
            <motion.section variants={fadeInUp} className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary tracking-[0.2em] font-sans uppercase">Heaven Earth Man Analysis</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-ink-light italic leading-tight">
                        천지인(天地人) <br />
                        <span className="text-primary-dim">심층 분석실</span>
                    </h1>
                </div>
            </motion.section>

            <motion.div variants={fadeInUp}>
                <Card className="relative bg-surface/30 backdrop-blur-md p-1 shadow-2xl border border-primary/20 rounded-none overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 -m-1 pointer-events-none rounded-none" />
                    <AnalysisForm members={members} />
                </Card>
            </motion.div>

            {/* Footer */}
            <motion.section variants={fadeInUp} className="text-center space-y-4 opacity-50 font-serif italic text-sm text-ink-light/40 mt-8">
                <p>※ 모든 분석은 명리학적 전통 가이드라인과 최신 데이터 알고리즘을 준수합니다.</p>
                <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
                    <span>Authentic</span>
                    <span className="w-1 h-1 bg-primary" />
                    <span>Precise</span>
                    <span className="w-1 h-1 bg-primary" />
                    <span>Haehwadang Master Identity</span>
                </div>
            </motion.section>
        </motion.div>
    );
}
