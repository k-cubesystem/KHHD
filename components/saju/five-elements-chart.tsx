"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManseResult } from "@/lib/domain/saju/manse";

// Dynamic imports for Recharts components to reduce initial bundle size
const RadarChart = dynamic(
  () => import("recharts").then((mod) => mod.RadarChart),
  { ssr: false }
);
const PolarGrid = dynamic(
  () => import("recharts").then((mod) => mod.PolarGrid),
  { ssr: false }
);
const PolarAngleAxis = dynamic(
  () => import("recharts").then((mod) => mod.PolarAngleAxis),
  { ssr: false }
);
const PolarRadiusAxis = dynamic(
  () => import("recharts").then((mod) => mod.PolarRadiusAxis),
  { ssr: false }
);
const Radar = dynamic(
  () => import("recharts").then((mod) => mod.Radar),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);

interface FiveElementsChartProps {
    manse: ManseResult;
    className?: string;
}

// 오행 정보
// 오행 정보 (Updated for better visibility)
const ELEMENTS = {
    Wood: { name: "목(木)", color: "#22c55e", bgColor: "bg-green-500/10", textColor: "text-green-500" }, // Green-500
    Fire: { name: "화(火)", color: "#ef4444", bgColor: "bg-red-500/10", textColor: "text-red-500" },     // Red-500
    Earth: { name: "토(土)", color: "#eab308", bgColor: "bg-yellow-500/10", textColor: "text-yellow-500" }, // Yellow-500
    Metal: { name: "금(金)", color: "#94a3b8", bgColor: "bg-slate-400/10", textColor: "text-slate-400" },  // Slate-400 (Metal)
    Water: { name: "수(水)", color: "#3b82f6", bgColor: "bg-blue-500/10", textColor: "text-blue-500" },   // Blue-500
};

// 오행 분포 계산 (천간과 지지를 분리하여 정확하게 계산)
const calculateElementDistribution = (manse: ManseResult) => {
    const counts: Record<string, number> = {
        Wood: 0,
        Fire: 0,
        Earth: 0,
        Metal: 0,
        Water: 0,
    };

    // 천간과 지지를 각각 카운트 (총 8개: 년월일시 각각 천간+지지)
    [manse.year, manse.month, manse.day, manse.time].forEach((pillar) => {
        // 천간의 오행
        if (pillar.ganElement && counts[pillar.ganElement] !== undefined) {
            counts[pillar.ganElement] += 1;
        }
        // 지지의 오행
        if (pillar.jiElement && counts[pillar.jiElement] !== undefined) {
            counts[pillar.jiElement] += 1;
        }
    });

    // 백분율로 변환 (총 8개 중)
    const total = 8;
    return Object.entries(counts).map(([element, count]) => ({
        element: ELEMENTS[element as keyof typeof ELEMENTS].name,
        value: (count / total) * 100,
        count,
        fullMark: 100,
        color: ELEMENTS[element as keyof typeof ELEMENTS].color,
    }));
};

// 용신 추천 (가장 부족한 오행)
const getRecommendedElement = (distribution: ReturnType<typeof calculateElementDistribution>) => {
    const sorted = [...distribution].sort((a, b) => a.count - b.count);
    return sorted[0];
};

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border border-zen-border rounded-sm shadow-lg p-3">
                <p className="font-serif font-bold text-zen-text">{data.element}</p>
                <p className="text-sm text-zen-muted">
                    {data.count}개 / 8개 ({data.value.toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

export function FiveElementsChart({ manse, className }: FiveElementsChartProps) {
    const distribution = useMemo(() => calculateElementDistribution(manse), [manse]);
    const recommendedElement = useMemo(() => getRecommendedElement(distribution), [distribution]);

    return (
        <Card className={cn("border-zen-border shadow-xl overflow-hidden bg-white relative", className)}>
            {/* 상단 장식 라인 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zen-gold to-transparent" />

            <CardHeader className="border-b border-zen-border bg-zen-bg/30">
                <CardTitle className="flex items-center gap-2 text-zen-text font-serif">
                    <Sparkles className="w-5 h-5 text-zen-gold" />
                    오행 균형 분석 (Five Elements Balance)
                </CardTitle>
                <p className="text-xs text-zen-muted mt-2">
                    사주 팔자(八字)에서 오행의 분포를 시각화합니다
                </p>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* 레이더 차트 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-[400px]"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={distribution}>
                            <PolarGrid stroke="#E5E7EB" strokeWidth={1} />
                            <PolarAngleAxis
                                dataKey="element"
                                tick={{ fill: "#6B7280", fontSize: 14, fontFamily: "Noto Serif KR" }}
                            />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                            />
                            <Radar
                                name="오행 분포"
                                dataKey="value"
                                stroke="#D4AF37"
                                fill="#D4AF37"
                                fillOpacity={0.6}
                                strokeWidth={3}
                            />
                            <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* 오행 범례 */}
                <div className="grid grid-cols-5 gap-2">
                    {distribution.map((item, idx) => (
                        <motion.div
                            key={item.element}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex flex-col items-center gap-1 p-3 rounded-sm border border-zen-border hover:shadow-md transition-shadow"
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs font-bold text-zen-text">{item.element}</span>
                            <span className="text-[10px] text-zen-muted">{item.count}/8</span>
                        </motion.div>
                    ))}
                </div>

                {/* 용신 추천 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-zen-gold/10 border border-zen-gold/30 rounded-sm p-4"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-zen-gold/20 flex items-center justify-center flex-shrink-0">
                            <Info className="w-4 h-4 text-zen-gold" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-serif font-bold text-zen-text mb-1">
                                용신(用神) 추천
                            </h4>
                            <p className="text-sm text-zen-muted leading-relaxed">
                                당신의 사주에서 <span className="font-bold text-zen-wood">{recommendedElement.element}</span>의 기운이 가장 부족합니다 ({recommendedElement.count}/8).
                                이 기운을 보완하면 운세의 균형을 맞출 수 있습니다.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="text-xs px-2 py-1 bg-white rounded-sm border border-zen-border">
                                    색상: {recommendedElement.element === "목(木)" ? "청색, 녹색" :
                                        recommendedElement.element === "화(火)" ? "적색, 주황" :
                                            recommendedElement.element === "토(土)" ? "황색, 갈색" :
                                                recommendedElement.element === "금(金)" ? "백색, 금색" :
                                                    "흑색, 청색"}
                                </span>
                                <span className="text-xs px-2 py-1 bg-white rounded-sm border border-zen-border">
                                    방위: {recommendedElement.element === "목(木)" ? "동쪽" :
                                        recommendedElement.element === "화(火)" ? "남쪽" :
                                            recommendedElement.element === "토(土)" ? "중앙" :
                                                recommendedElement.element === "금(金)" ? "서쪽" :
                                                    "북쪽"}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 설명 */}
                <div className="text-center pt-4 border-t border-zen-border">
                    <p className="text-xs text-zen-muted italic">
                        * 오행 균형은 사주 팔자(년월일시 천간지지 8글자)를 기준으로 계산됩니다
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
