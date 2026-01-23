"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Sparkles, Scroll } from "lucide-react";
import { cn } from "@/lib/utils";

interface DigitalTalismanProps {
    type?: "fortune" | "protection" | "wealth" | "health" | "love";
    isRevealed?: boolean;
    onReveal?: () => void;
    className?: string;
}

// 부적 타입별 설정
const TALISMAN_CONFIG = {
    fortune: {
        title: "길운부(吉運符)",
        color: "#D4AF37",
        bgGradient: "from-amber-50 via-yellow-50 to-amber-50",
        symbol: "吉",
        description: "행운과 길한 기운을 불러오는 부적",
    },
    protection: {
        title: "호신부(護身符)",
        color: "#EF4444",
        bgGradient: "from-red-50 via-orange-50 to-red-50",
        symbol: "護",
        description: "액운을 막고 몸을 보호하는 부적",
    },
    wealth: {
        title: "재물부(財物符)",
        color: "#10B981",
        bgGradient: "from-emerald-50 via-green-50 to-emerald-50",
        symbol: "財",
        description: "재물운과 사업운을 높이는 부적",
    },
    health: {
        title: "건강부(健康符)",
        color: "#3B82F6",
        bgGradient: "from-blue-50 via-cyan-50 to-blue-50",
        symbol: "健",
        description: "건강과 장수를 기원하는 부적",
    },
    love: {
        title: "인연부(因緣符)",
        color: "#EC4899",
        bgGradient: "from-pink-50 via-rose-50 to-pink-50",
        symbol: "緣",
        description: "좋은 인연을 맺게 하는 부적",
    },
};

export function DigitalTalisman({
    type = "fortune",
    isRevealed = false,
    onReveal,
    className,
}: DigitalTalismanProps) {
    const [revealed, setRevealed] = useState(isRevealed);
    const [showShimmer, setShowShimmer] = useState(false);
    const config = TALISMAN_CONFIG[type];

    const handleReveal = () => {
        if (revealed) return;

        setRevealed(true);
        setShowShimmer(true);

        // 도장 찍는 애니메이션과 함께 confetti
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: [config.color, "#FFD700", "#FFA500"],
            });
        }, 500);

        // Shimmer 효과 지속 시간
        setTimeout(() => {
            setShowShimmer(false);
        }, 3000);

        onReveal?.();
    };

    return (
        <motion.div
            className={cn("relative", className)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Card
                className={cn(
                    "relative overflow-hidden border-2 cursor-pointer transition-all duration-300",
                    revealed
                        ? "border-zen-gold shadow-2xl"
                        : "border-zen-border hover:border-zen-gold/50 hover:shadow-lg"
                )}
                onClick={handleReveal}
            >
                {/* 종이 질감 배경 */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <filter id="paper-texture">
                            <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.9"
                                numOctaves="4"
                                result="noise"
                            />
                            <feDiffuseLighting
                                in="noise"
                                lightingColor="white"
                                surfaceScale="1"
                            >
                                <feDistantLight azimuth="45" elevation="60" />
                            </feDiffuseLighting>
                        </filter>
                        <rect
                            width="100%"
                            height="100%"
                            filter="url(#paper-texture)"
                            opacity="0.5"
                        />
                    </svg>
                </div>

                {/* Shimmer 효과 */}
                <AnimatePresence>
                    {showShimmer && (
                        <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ x: "-100%" }}
                            animate={{ x: "200%" }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                        >
                            <div
                                className="h-full w-1/3 rotate-12"
                                style={{
                                    background: `linear-gradient(90deg, transparent, ${config.color}40, transparent)`,
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 내용 */}
                <div
                    className={cn(
                        "relative p-8 min-h-[400px] flex flex-col items-center justify-center bg-gradient-to-br",
                        config.bgGradient
                    )}
                >
                    {!revealed ? (
                        // 미공개 상태
                        <motion.div
                            className="text-center space-y-4"
                            whileHover={{ scale: 1.05 }}
                        >
                            <Scroll className="w-16 h-16 mx-auto text-zen-muted" />
                            <p className="text-zen-muted font-serif">
                                클릭하여 부적을 펼치세요
                            </p>
                        </motion.div>
                    ) : (
                        // 공개 상태
                        <motion.div
                            className="text-center space-y-6 w-full"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* 제목 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2">
                                    <Sparkles
                                        className="w-5 h-5"
                                        style={{ color: config.color }}
                                    />
                                    <h3
                                        className="text-2xl font-serif font-bold"
                                        style={{ color: config.color }}
                                    >
                                        {config.title}
                                    </h3>
                                    <Sparkles
                                        className="w-5 h-5"
                                        style={{ color: config.color }}
                                    />
                                </div>
                                <p className="text-sm text-zen-muted">
                                    {config.description}
                                </p>
                            </div>

                            {/* 중앙 한자 */}
                            <motion.div
                                className="relative"
                                animate={{
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <div
                                    className="text-9xl font-serif font-black relative"
                                    style={{ color: config.color }}
                                >
                                    {config.symbol}
                                    {/* 금빛 후광 */}
                                    <div
                                        className="absolute inset-0 blur-2xl opacity-30"
                                        style={{ color: config.color }}
                                    >
                                        {config.symbol}
                                    </div>
                                </div>
                            </motion.div>

                            {/* 도장 (낙관) */}
                            <motion.div
                                className="inline-block"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    delay: 0.3,
                                    type: "spring",
                                    stiffness: 200,
                                }}
                            >
                                <div
                                    className="w-16 h-16 rounded-sm flex items-center justify-center text-white font-serif font-bold text-xl border-2"
                                    style={{
                                        backgroundColor: config.color,
                                        borderColor: config.color,
                                        transform: "rotate(5deg)",
                                    }}
                                >
                                    印
                                </div>
                            </motion.div>

                            {/* 하단 문구 */}
                            <div className="pt-4 border-t border-zen-border">
                                <p className="text-xs text-zen-muted font-serif italic">
                                    해화당 AI가 당신을 위해 발급한 디지털 부적입니다
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}
