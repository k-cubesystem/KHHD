"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

// Dynamic imports for heavy dashboard sections to improve initial load
const MasterpieceSection = dynamic(
  () => import("./dashboard/MasterpieceSection").then((mod) => ({ default: mod.MasterpieceSection })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-white/5 rounded-lg" /> }
);
const RelationshipSection = dynamic(
  () => import("./dashboard/RelationshipSection").then((mod) => ({ default: mod.RelationshipSection })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-white/5 rounded-lg" /> }
);
const PeriodSection = dynamic(
  () => import("./dashboard/PeriodSection").then((mod) => ({ default: mod.PeriodSection })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-white/5 rounded-lg" /> }
);
const Year2026Section = dynamic(
  () => import("./dashboard/Year2026Section").then((mod) => ({ default: mod.Year2026Section })),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-white/5 rounded-lg" /> }
);
const TrendSection = dynamic(
  () => import("./dashboard/TrendSection").then((mod) => ({ default: mod.TrendSection })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-lg" /> }
);

interface AnalysisDashboardProps {
    userName?: string;
}

export function AnalysisDashboard({ userName }: AnalysisDashboardProps) {
    return (
        <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="max-w-screen-sm mx-auto pb-40 px-4 space-y-8"
        >
            {/* Compact Hero */}
            <motion.section variants={fadeInUp} className="text-left space-y-2 pt-6">
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-white leading-snug">
                    <span className="text-[#D4AF37]">Analysis Center</span>
                    <span className="block text-sm font-sans font-light text-white/80 mt-1">
                        {userName ? `${userName}님, 오늘의 운명 리포트입니다.` : "당신의 운명을 분석합니다."}
                    </span>
                </h1>
            </motion.section>

            {/* Main Grid: Bento Layout */}
            <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-3">

                {/* Row 1: Masterpiece (Full Width) */}
                <motion.div variants={fadeInUp} className="col-span-2">
                    <MasterpieceSection />
                </motion.div>

                {/* Row 2: Relationship & Period (Split) */}
                <motion.div variants={fadeInUp} className="col-span-1">
                    <RelationshipSection />
                </motion.div>

                <motion.div variants={fadeInUp} className="col-span-1">
                    <PeriodSection />
                </motion.div>

                {/* Row 3: Special Banner (Full Width) */}
                <motion.div variants={fadeInUp} className="col-span-2">
                    <Year2026Section />
                </motion.div>

            </motion.div>

            {/* Row 4: Trends (Carousel - Outside grid for full swipe) */}
            <motion.section variants={fadeInUp} className="-mx-4 px-4">
                <TrendSection />
            </motion.section>

        </motion.div>
    );
}
