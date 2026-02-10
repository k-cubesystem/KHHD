"use client";

import type { FamilyMemberWithMissions } from "@/app/actions/family-missions";
import { MISSION_CATEGORIES } from "@/lib/constants";
import { motion } from "framer-motion";

interface StudioAnalysisLayoutProps {
    category: "FACE" | "HAND" | "FENGSHUI" | "SAJU";
    targetMember?: FamilyMemberWithMissions | null;
    children: React.ReactNode;
}

export function StudioAnalysisLayout({
    category,
    targetMember,
    children,
}: StudioAnalysisLayoutProps) {
    const categoryInfo = MISSION_CATEGORIES.find((c) => c.value === category);

    return (
        <div className="min-h-screen bg-[#0A192F] text-white relative overflow-hidden">
            {/* Manse Golden Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 
            w-[600px] h-[400px] 
            bg-[#D4AF37]/3 rounded-full blur-[150px]"
                />
            </div>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-8 border-b border-[#D4AF37]/10"
            >
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#D4AF37]">
                            {categoryInfo?.label}
                        </h1>
                        {targetMember && (
                            <p className="text-sm text-white/60 mt-1 font-sans">
                                {targetMember.name}님의 분석
                            </p>
                        )}
                    </div>

                    {categoryInfo && (
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                                <categoryInfo.icon className="w-6 h-6 text-[#D4AF37]" />
                            </div>
                            {categoryInfo.cost > 0 && (
                                <div className="text-right">
                                    <p className="text-xs text-white/40">소요 부적</p>
                                    <p className="text-lg font-bold text-[#D4AF37]">
                                        {categoryInfo.cost}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.header>

            {/* Main Content */}
            <main className="px-6 py-8 max-w-4xl mx-auto pb-24">{children}</main>
        </div>
    );
}
