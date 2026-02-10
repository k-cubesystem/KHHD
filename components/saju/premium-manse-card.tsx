"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManseResult, SajuPillar } from "@/lib/domain/saju/manse";

interface PremiumManseCardProps {
    manse: ManseResult;
    className?: string;
}

// 오행별 배경 효과를 위한 SVG 패턴
const ElementBackground = ({ element }: { element: string }) => {
    const patterns = {
        Wood: (
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="wood-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M20 0 L20 40 M0 20 L40 20" stroke="currentColor" strokeWidth="0.5" className="text-green-600" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#wood-pattern)" />
                </svg>
            </div>
        ),
        Fire: (
            <div className="absolute inset-0 opacity-10">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-transparent to-transparent"
                    animate={{
                        opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>
        ),
        Earth: (
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="earth-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="10" cy="10" r="1" fill="currentColor" className="text-yellow-600" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#earth-pattern)" />
                </svg>
            </div>
        ),
        Metal: (
            <div className="absolute inset-0 opacity-10">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-gray-400/20 via-transparent to-gray-400/20"
                    animate={{
                        backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            </div>
        ),
        Water: (
            <div className="absolute inset-0 opacity-10">
                <motion.div
                    className="absolute inset-0"
                    animate={{
                        backgroundImage: [
                            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                            "radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
                        ],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>
        ),
    };

    return patterns[element as keyof typeof patterns] || null;
};

// 개별 기둥 컴포넌트
const PillarCell = ({ pillar, label, isDay }: { pillar: SajuPillar; label: string; isDay?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // 오행 추출 (color class에서)
    const getElement = (colorClass: string): string => {
        if (colorClass.includes("green")) return "Wood";
        if (colorClass.includes("red")) return "Fire";
        if (colorClass.includes("yellow")) return "Earth";
        if (colorClass.includes("gray")) return "Metal";
        if (colorClass.includes("blue")) return "Water";
        return "Unknown";
    };

    const element = getElement(pillar.color);

    return (
        <motion.div
            className="relative"
            initial={false}
            animate={{ height: isExpanded ? "auto" : "auto" }}
        >
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-full h-full relative overflow-hidden transition-all duration-300",
                    "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zen-gold/50",
                    isDay && "ring-2 ring-inset ring-zen-gold/30"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                {/* 배경 효과 */}
                <ElementBackground element={element} />

                {/* 기본 배경색 */}
                <div className={cn("absolute inset-0", pillar.color)} />

                {/* 천간 (상단) */}
                <div className="relative h-32 flex flex-col items-center justify-center p-2 border-b border-zen-border/30">
                    <motion.span
                        className="text-4xl font-serif font-bold relative text-gray-900 z-10 drop-shadow-sm"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        {pillar.gan}
                        {isDay && (
                            <motion.div
                                className="absolute -top-1 -right-1"
                                animate={{
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.2, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <Sparkles className="w-3 h-3 text-zen-gold" />
                            </motion.div>
                        )}
                    </motion.span>
                    <span className="text-[10px] text-gray-600 font-bold mt-1 z-10">천간</span>
                    {isDay && (
                        <span className="text-[10px] font-bold text-zen-wood mt-0.5 z-10">나(我)</span>
                    )}
                </div>

                {/* 지지 (하단) */}
                <div className="relative h-32 flex flex-col items-center justify-center p-2">
                    <motion.span
                        className="text-4xl font-serif font-bold text-gray-900 z-10 drop-shadow-sm"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        {pillar.ji}
                    </motion.span>
                    <span className="text-[10px] text-gray-600 font-bold mt-1 z-10">{pillar.label}</span>
                </div>

                {/* 확장 인디케이터 */}
                <motion.div
                    className="absolute bottom-1 right-1"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown className="w-3 h-3 opacity-40" />
                </motion.div>
            </motion.button>

            {/* 확장된 상세 정보 */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-zen-bg/50 backdrop-blur-sm p-4 space-y-2 border-t border-zen-border">
                            <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-zen-muted">한글:</span>
                                    <span className="font-bold text-zen-text">{pillar.korean}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zen-muted">오행:</span>
                                    <span className="font-bold text-zen-text">{element}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zen-muted">기운:</span>
                                    <span className="font-bold text-zen-text">{pillar.label}</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-zen-border/50">
                                <p className="text-[10px] text-zen-muted italic">
                                    심화 분석 기능이 준비 중입니다
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export function PremiumManseCard({ manse, className }: PremiumManseCardProps) {
    return (
        <Card className={cn("border-zen-border shadow-xl overflow-hidden bg-white relative", className)}>
            {/* 상단 장식 라인 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zen-gold to-transparent" />

            <CardContent className="p-0">
                {/* 헤더 */}
                <div className="grid grid-cols-4 divide-x divide-zen-border border-b border-zen-border bg-zen-bg/30">
                    {["시주(時)", "일주(日)", "월주(月)", "년주(年)"].map((label, idx) => (
                        <motion.div
                            key={label}
                            className="text-center py-3 text-xs font-bold text-zen-muted"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            {label}
                        </motion.div>
                    ))}
                </div>

                {/* 사주 기둥들 */}
                <div className="grid grid-cols-4 divide-x divide-zen-border">
                    <PillarCell pillar={manse.time} label="시주" />
                    <PillarCell pillar={manse.day} label="일주" isDay />
                    <PillarCell pillar={manse.month} label="월주" />
                    <PillarCell pillar={manse.year} label="년주" />
                </div>

                {/* 하단 설명 */}
                <motion.div
                    className="bg-gray-50 p-6 text-center border-t border-zen-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <p className="text-sm text-gray-900 leading-relaxed font-serif">
                        당신은{" "}
                        <span className="font-bold text-zen-wood">
                            {manse.day.label.split(" ")[0]} {manse.day.ji}({manse.day.label.split(" ")[1]})
                        </span>
                        의 날에 태어났으며,
                        <br />
                        <span className="font-bold text-zen-wood">
                            {manse.month.label.split(" ")[0]} {manse.month.ji}({manse.month.label.split(" ")[1]})
                        </span>
                        의 계절을 품고 있습니다.
                    </p>
                    <p className="text-xs text-gray-500 mt-3 italic">
                        각 기둥을 클릭하여 상세 정보를 확인하세요
                    </p>
                </motion.div>
            </CardContent>
        </Card>
    );
}
