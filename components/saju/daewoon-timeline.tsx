"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DaewoonPeriod } from "@/lib/saju/manse";

interface DaewoonTimelineProps {
    periods: DaewoonPeriod[];
    className?: string;
}

// 오행 추출 함수
const getElement = (colorClass: string): string => {
    if (colorClass.includes("green")) return "Wood";
    if (colorClass.includes("red")) return "Fire";
    if (colorClass.includes("yellow")) return "Earth";
    if (colorClass.includes("gray")) return "Metal";
    if (colorClass.includes("blue")) return "Water";
    return "Unknown";
};

// 오행별 색상
const ELEMENT_COLORS: Record<string, string> = {
    Wood: "#10b981",
    Fire: "#ef4444",
    Earth: "#eab308",
    Metal: "#6b7280",
    Water: "#3b82f6",
};

export function DaewoonTimeline({ periods, className }: DaewoonTimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { scrollXProgress } = useScroll({ container: scrollRef });
    const currentPeriod = periods.find(p => p.isCurrent);

    return (
        <Card className={cn("border-zen-border shadow-xl overflow-hidden bg-white relative", className)}>
            {/* 상단 장식 라인 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zen-gold to-transparent" />

            <CardHeader className="border-b border-zen-border bg-zen-bg/30">
                <CardTitle className="flex items-center gap-2 text-zen-text font-serif">
                    <Clock className="w-5 h-5 text-zen-gold" />
                    대운(大運) 타임라인 - 10년 주기 운세
                </CardTitle>
                <p className="text-xs text-zen-muted mt-2">
                    {currentPeriod ? (
                        <>
                            현재 <span className="font-bold text-zen-wood">{currentPeriod.startAge}~{currentPeriod.endAge}세</span> 대운 중입니다
                        </>
                    ) : (
                        "인생의 10년 주기 운세 흐름을 확인하세요"
                    )}
                </p>
            </CardHeader>

            <CardContent className="p-0">
                {/* 가로 스크롤 타임라인 */}
                <div
                    ref={scrollRef}
                    className="overflow-x-auto scrollbar-thin scrollbar-thumb-zen-gold/30 scrollbar-track-zen-bg"
                >
                    <div className="flex gap-4 p-6 min-w-max">
                        {periods.map((period, idx) => {
                            const element = getElement(period.pillar.color);
                            const elementColor = ELEMENT_COLORS[element];

                            return (
                                <motion.div
                                    key={`${period.startAge}-${period.endAge}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative"
                                >
                                    {/* 연결선 */}
                                    {idx < periods.length - 1 && (
                                        <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-zen-border z-0" />
                                    )}

                                    {/* 대운 카드 */}
                                    <motion.div
                                        className={cn(
                                            "relative w-48 rounded-sm border-2 transition-all duration-300 cursor-pointer",
                                            period.isCurrent
                                                ? "border-zen-gold shadow-lg scale-105 ring-4 ring-zen-gold/20"
                                                : "border-zen-border hover:border-zen-gold/50 hover:shadow-md"
                                        )}
                                        whileHover={{ scale: period.isCurrent ? 1.05 : 1.02 }}
                                        style={{
                                            backgroundColor: period.isCurrent ? "#FFFBEB" : "white",
                                        }}
                                    >
                                        {/* 현재 대운 표시 */}
                                        {period.isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-zen-gold text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-md">
                                                <Sparkles className="w-3 h-3" />
                                                현재
                                            </div>
                                        )}

                                        {/* 오행 색상 바 */}
                                        <div
                                            className="h-2 w-full rounded-t-sm"
                                            style={{ backgroundColor: elementColor }}
                                        />

                                        {/* 내용 */}
                                        <div className="p-4 space-y-3">
                                            {/* 천간지지 */}
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <span className="text-3xl font-serif font-bold text-zen-text">
                                                        {period.pillar.gan}
                                                    </span>
                                                    <span className="text-3xl font-serif font-bold text-zen-text">
                                                        {period.pillar.ji}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zen-muted">
                                                    {period.pillar.korean} ({period.pillar.label})
                                                </p>
                                            </div>

                                            {/* 나이 범위 */}
                                            <div className="text-center pt-2 border-t border-zen-border">
                                                <p className="text-sm font-bold text-zen-text">
                                                    {period.startAge}세 ~ {period.endAge}세
                                                </p>
                                                <p className="text-xs text-zen-muted mt-1">
                                                    {period.startYear}년 ~ {period.endYear}년
                                                </p>
                                            </div>

                                            {/* 오행 표시 */}
                                            <div className="flex items-center justify-center gap-1">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: elementColor }}
                                                />
                                                <span className="text-xs text-zen-muted">
                                                    {element === "Wood" ? "목(木)" :
                                                        element === "Fire" ? "화(火)" :
                                                            element === "Earth" ? "토(土)" :
                                                                element === "Metal" ? "금(金)" :
                                                                    "수(水)"}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* 스크롤 인디케이터 */}
                <div className="px-6 pb-4">
                    <div className="flex items-center gap-2 text-xs text-zen-muted">
                        <ChevronRight className="w-3 h-3" />
                        <span>좌우로 스크롤하여 전체 대운을 확인하세요</span>
                    </div>
                </div>

                {/* 설명 */}
                <div className="text-center px-6 pb-6 pt-2 border-t border-zen-border bg-zen-bg/30">
                    <p className="text-xs text-zen-muted italic leading-relaxed">
                        * 대운은 10년 단위로 변화하는 인생의 큰 흐름입니다.<br />
                        각 대운마다 오행의 기운이 달라지며, 이에 따라 운세의 방향성이 결정됩니다.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
