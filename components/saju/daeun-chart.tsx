"use client";

import { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

// 오행 색상 매핑 (Gemini 지시 기준)
export const WUXING_COLORS: Record<string, string> = {
    木: "#4A7C59", // Green (Wood)
    火: "#C07055", // Red (Fire)
    土: "#C5B358", // Gold (Earth)
    金: "#E5E3DF", // Silver (Metal)
    水: "#4A5D7C", // Blue (Water)
};

// 오행 한글명
export const WUXING_NAMES: Record<string, string> = {
    木: "목(木)",
    火: "화(火)",
    土: "토(土)",
    金: "금(金)",
    水: "수(水)",
};

export interface DaeunData {
    age: number; // 시작 나이 (0, 10, 20...)
    ganji: string; // 간지 (e.g., "甲子")
    score: number; // 운세 점수 (0-100)
    element: string; // 오행 (木, 火, 土, 金, 水)
    description?: string; // 대운 설명
}

interface DaeunChartProps {
    data: DaeunData[];
    currentAge?: number;
    showArea?: boolean;
    className?: string;
}

// 커스텀 툴팁
function CustomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload: DaeunData }>;
}) {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0].payload;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zen-border p-4 rounded-sm shadow-xl z-50"
        >
            <p className="font-serif font-bold text-zen-text text-lg mb-1">
                {item.age}세 ~ {item.age + 9}세
            </p>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-serif text-zen-wood">
                    {item.ganji}
                </span>
                <span
                    className="text-xs px-2 py-1 rounded-full text-white font-bold"
                    style={{
                        backgroundColor: WUXING_COLORS[item.element] || "#888",
                    }}
                >
                    {WUXING_NAMES[item.element] || item.element}
                </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-zen-muted">운세 지수:</span>
                <span
                    className={cn(
                        "font-bold text-lg",
                        item.score >= 80
                            ? "text-green-600"
                            : item.score >= 60
                              ? "text-zen-gold"
                              : item.score >= 40
                                ? "text-yellow-600"
                                : "text-red-600"
                    )}
                >
                    {item.score}점
                </span>
            </div>
            {item.description && (
                <p className="text-xs text-zen-muted mt-2 pt-2 border-t border-zen-border">
                    {item.description}
                </p>
            )}
        </motion.div>
    );
}

// 커스텀 도트 (현재 대운 강조)
function CustomDot({
    cx,
    cy,
    payload,
    currentAge,
}: {
    cx?: number;
    cy?: number;
    payload?: DaeunData;
    currentAge?: number;
}) {
    if (!cx || !cy || !payload) return null;

    const isCurrentPeriod =
        currentAge !== undefined &&
        currentAge >= payload.age &&
        currentAge < payload.age + 10;

    const elementColor = WUXING_COLORS[payload.element] || "#D4AF37";

    return (
        <g>
            {/* 현재 대운 강조 원 */}
            {isCurrentPeriod && (
                <>
                    <circle
                        cx={cx}
                        cy={cy}
                        r={20}
                        fill={elementColor}
                        opacity={0.15}
                    />
                    <circle
                        cx={cx}
                        cy={cy}
                        r={14}
                        fill={elementColor}
                        opacity={0.25}
                    />
                </>
            )}
            {/* 메인 도트 */}
            <circle
                cx={cx}
                cy={cy}
                r={isCurrentPeriod ? 8 : 5}
                fill={elementColor}
                stroke="#FFF"
                strokeWidth={2}
            />
            {/* 간지 라벨 */}
            <text
                x={cx}
                y={cy - (isCurrentPeriod ? 24 : 16)}
                textAnchor="middle"
                fill="#5C4A3D"
                fontSize={isCurrentPeriod ? 13 : 11}
                fontWeight={isCurrentPeriod ? "bold" : "normal"}
                fontFamily="serif"
            >
                {payload.ganji}
            </text>
        </g>
    );
}

export function DaeunChart({
    data,
    currentAge,
    showArea = false,
    className,
}: DaeunChartProps) {
    // 현재 대운 찾기
    const currentDaeun = useMemo(() => {
        if (currentAge === undefined) return null;
        return data.find((d) => currentAge >= d.age && currentAge < d.age + 10);
    }, [data, currentAge]);

    return (
        <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className={className}
        >
            <Card className="zen-card overflow-hidden">
                <CardHeader className="border-b border-zen-border bg-zen-bg/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-zen-title flex items-center gap-2">
                            <span className="w-1 h-6 bg-zen-gold rounded-full" />
                            대운(大運) 흐름
                        </CardTitle>
                        {currentDaeun && currentAge !== undefined && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zen-surface rounded-sm">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        backgroundColor:
                                            WUXING_COLORS[currentDaeun.element],
                                    }}
                                />
                                <span className="text-sm text-zen-muted">
                                    현재 ({currentAge}세):
                                </span>
                                <span className="font-serif font-bold text-zen-wood">
                                    {currentDaeun.ganji}
                                </span>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    {/* 오행 범례 */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        {Object.entries(WUXING_COLORS).map(([element, color]) => (
                            <div
                                key={element}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-xs text-zen-muted">
                                    {WUXING_NAMES[element]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 차트 */}
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {showArea ? (
                                <AreaChart
                                    data={data}
                                    margin={{
                                        top: 35,
                                        right: 20,
                                        left: 0,
                                        bottom: 5,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="fortuneAreaGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#D4AF37"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#D4AF37"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#E5E3DF"
                                    />
                                    <XAxis
                                        dataKey="age"
                                        tick={{
                                            fill: "#595450",
                                            fontSize: 12,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}세`}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{
                                            fill: "#9B8B7A",
                                            fontSize: 11,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}점`}
                                        width={40}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <ReferenceLine
                                        y={70}
                                        stroke="#9B8B7A"
                                        strokeDasharray="3 3"
                                        label={{
                                            value: "평균",
                                            fill: "#9B8B7A",
                                            fontSize: 10,
                                            position: "right",
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#D4AF37"
                                        strokeWidth={3}
                                        fill="url(#fortuneAreaGradient)"
                                        dot={(props) => (
                                            <CustomDot
                                                {...props}
                                                currentAge={currentAge}
                                            />
                                        )}
                                        activeDot={{
                                            r: 8,
                                            stroke: "#D4AF37",
                                            strokeWidth: 2,
                                            fill: "#fff",
                                        }}
                                    />
                                </AreaChart>
                            ) : (
                                <LineChart
                                    data={data}
                                    margin={{
                                        top: 35,
                                        right: 20,
                                        left: 0,
                                        bottom: 5,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="goldGradient"
                                            x1="0"
                                            y1="0"
                                            x2="1"
                                            y2="0"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#C5B358"
                                                stopOpacity={0.8}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#D4AF37"
                                                stopOpacity={1}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#E5E3DF"
                                    />
                                    <XAxis
                                        dataKey="age"
                                        tick={{
                                            fill: "#595450",
                                            fontSize: 12,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}세`}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{
                                            fill: "#9B8B7A",
                                            fontSize: 11,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val}점`}
                                        width={40}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <ReferenceLine
                                        y={70}
                                        stroke="#9B8B7A"
                                        strokeDasharray="3 3"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="url(#goldGradient)"
                                        strokeWidth={3}
                                        dot={(props) => (
                                            <CustomDot
                                                {...props}
                                                currentAge={currentAge}
                                            />
                                        )}
                                        activeDot={{
                                            r: 8,
                                            stroke: "#D4AF37",
                                            strokeWidth: 2,
                                            fill: "#fff",
                                        }}
                                    />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* 하단 설명 */}
                    <div className="mt-4 p-3 bg-zen-surface rounded-sm">
                        <p className="text-xs text-zen-muted leading-relaxed">
                            <span className="font-medium text-zen-text">
                                대운(大運)
                            </span>
                            이란 사주에서 10년 단위로 변화하는 큰 운의 흐름입니다.
                            각 대운은 오행의 기운을 담고 있으며, 본인의 사주와
                            상생·상극 관계에 따라 길흉이 결정됩니다.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// 대운 데이터 생성 유틸리티 (실제 사주 계산에서 사용)
export function generateDaeunDescription(score: number): string {
    if (score >= 90) return "최상의 운기! 모든 일이 순조롭게 풀립니다.";
    if (score >= 80) return "좋은 운기입니다. 적극적으로 도전하세요.";
    if (score >= 70) return "평균 이상의 운기. 꾸준히 노력하면 성과가 있습니다.";
    if (score >= 60) return "보통의 운기. 무리하지 않는 것이 좋습니다.";
    if (score >= 50) return "조심이 필요한 시기. 건강과 인간관계에 주의하세요.";
    return "어려운 시기. 인내하며 때를 기다리세요.";
}

export default DaeunChart;
