"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { GOLD_500 } from "@/lib/config/design-tokens";

interface EnergyChartProps {
    data: {
        wood: number; // 목 (木)
        fire: number; // 화 (火)
        earth: number; // 토 (土)
        metal: number; // 금 (金)
        water: number; // 수 (水)
    };
    className?: string;
}

// 오행 메타데이터
const ELEMENTS = [
    { key: "wood", label: "木", name: "목", color: "#22c55e", angle: -90 },
    { key: "fire", label: "火", name: "화", color: "#ef4444", angle: -18 },
    { key: "earth", label: "土", name: "토", color: "#eab308", angle: 54 },
    { key: "metal", label: "金", name: "금", color: "#a1a1aa", angle: 126 },
    { key: "water", label: "水", name: "수", color: "#3b82f6", angle: 198 },
] as const;

// 정오각형의 꼭지점 좌표 계산 (중심 기준)
function getPolygonPoints(centerX: number, centerY: number, radius: number, sides: number = 5): string {
    const points: string[] = [];
    for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2; // -90도부터 시작
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(`${x},${y}`);
    }
    return points.join(" ");
}

// 데이터 기반 폴리곤 좌표 계산
function getDataPolygonPoints(
    centerX: number,
    centerY: number,
    maxRadius: number,
    data: EnergyChartProps["data"]
): string {
    const keys = ["wood", "fire", "earth", "metal", "water"] as const;
    const points: string[] = [];

    keys.forEach((key, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const radius = (data[key] / 100) * maxRadius;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(`${x},${y}`);
    });

    return points.join(" ");
}

export function EnergyChart({ data, className }: EnergyChartProps) {
    const [isMounted, setIsMounted] = useState(false);
    const size = 280;
    const center = size / 2;
    const maxRadius = 100;
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const dataPoints = useMemo(() => getDataPolygonPoints(center, center, maxRadius, data), [data, center, maxRadius]);

    // 꼭지점 좌표 계산 (라벨 배치용)
    const labelPositions = useMemo(() => {
        return ELEMENTS.map((el, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const labelRadius = maxRadius + 28;
            return {
                ...el,
                x: center + labelRadius * Math.cos(angle),
                y: center + labelRadius * Math.sin(angle),
                value: data[el.key as keyof typeof data],
            };
        });
    }, [data, center, maxRadius]);

    if (!isMounted) {
        return (
            <div className={cn("relative w-full max-w-[300px] mx-auto aspect-square flex items-center justify-center", className)}>
                <div className="w-48 h-48 border-4 border-dashed border-white/5 rounded-full animate-pulse" />
            </div>
        );
    }

    return (
        <div className={cn("relative w-full max-w-[300px] mx-auto", className)}>
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full"
            >
                <defs>
                    {/* 골드 그라데이션 */}
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={GOLD_500} stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#F4E4BA" stopOpacity="0.4" />
                        <stop offset="100%" stopColor={GOLD_500} stopOpacity="0.6" />
                    </linearGradient>

                    {/* 데이터 영역 그라데이션 */}
                    <radialGradient id="dataGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={GOLD_500} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={GOLD_500} stopOpacity="0.2" />
                    </radialGradient>

                    {/* 글로우 필터 */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 배경 원형 글로우 */}
                <motion.circle
                    cx={center}
                    cy={center}
                    r={maxRadius + 10}
                    fill="none"
                    stroke="url(#goldGradient)"
                    strokeWidth="1"
                    opacity="0.3"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* 그리드 레벨 (동심 오각형) */}
                {gridLevels.map((level, idx) => (
                    <motion.polygon
                        key={level}
                        points={getPolygonPoints(center, center, maxRadius * level)}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-white/10"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                    />
                ))}

                {/* 축 선 (중심에서 꼭지점으로) */}
                {ELEMENTS.map((el, i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const endX = center + maxRadius * Math.cos(angle);
                    const endY = center + maxRadius * Math.sin(angle);
                    return (
                        <motion.line
                            key={el.key}
                            x1={center}
                            y1={center}
                            x2={endX}
                            y2={endY}
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="text-white/10"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                        />
                    );
                })}

                {/* 데이터 폴리곤 - 메인 차트 */}
                <motion.polygon
                    points={dataPoints}
                    fill="url(#dataGradient)"
                    stroke={GOLD_500}
                    strokeWidth="2"
                    filter="url(#glow)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                />

                {/* 데이터 폴리곤 - 맥동 효과 */}
                <motion.polygon
                    points={dataPoints}
                    fill="none"
                    stroke={GOLD_500}
                    strokeWidth="1"
                    opacity="0.5"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* 꼭지점 데이터 포인트 */}
                {labelPositions.map((pos, i) => {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const pointRadius = (pos.value / 100) * maxRadius;
                    const pointX = center + pointRadius * Math.cos(angle);
                    const pointY = center + pointRadius * Math.sin(angle);

                    return (
                        <motion.g key={pos.key}>
                            {/* 데이터 포인트 */}
                            <motion.circle
                                cx={pointX}
                                cy={pointY}
                                r="5"
                                fill={pos.color}
                                stroke="#0A0A0A"
                                strokeWidth="2"
                                filter="url(#glow)"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1 + i * 0.1, duration: 0.3 }}
                            />

                            {/* 맥동 링 */}
                            <motion.circle
                                cx={pointX}
                                cy={pointY}
                                r="5"
                                fill="none"
                                stroke={pos.color}
                                strokeWidth="1"
                                initial={{ scale: 1, opacity: 0.8 }}
                                animate={{ scale: [1, 2], opacity: [0.8, 0] }}
                                transition={{ delay: 1.5 + i * 0.2, duration: 1.5, repeat: Infinity }}
                            />
                        </motion.g>
                    );
                })}

                {/* 오행 라벨 */}
                {labelPositions.map((pos, i) => (
                    <motion.g
                        key={`label-${pos.key}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 + i * 0.1, duration: 0.4 }}
                    >
                        {/* 한자 라벨 */}
                        <text
                            x={pos.x}
                            y={pos.y - 6}
                            textAnchor="middle"
                            className="fill-current text-white font-bold text-sm"
                            style={{ fontSize: "14px" }}
                        >
                            {pos.label}
                        </text>
                        {/* 수치 */}
                        <text
                            x={pos.x}
                            y={pos.y + 10}
                            textAnchor="middle"
                            style={{ fill: pos.color, fontSize: "10px", fontWeight: "bold" }}
                        >
                            {pos.value}%
                        </text>
                    </motion.g>
                ))}

                {/* 중심 표시 */}
                <motion.circle
                    cx={center}
                    cy={center}
                    r="3"
                    fill={GOLD_500}
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
                />
            </svg>
        </div>
    );
}
