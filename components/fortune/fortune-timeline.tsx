"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { YearlyFortuneMonth } from "@/app/actions/fortune-actions";

// Dynamic imports for Recharts components to reduce initial bundle size
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import("recharts").then((mod) => mod.Line),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

interface FortuneTimelineProps {
  data: YearlyFortuneMonth[];
  year: number;
}

export function FortuneTimeline({ data, year }: FortuneTimelineProps) {
  // Fill missing months with 0
  const fullYearData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const existing = data.find(d => d.month === month);
    return {
      month: `${month}월`,
      fortune: existing?.fortune || 0,
      memberCount: existing?.memberCount || 0,
    };
  });

  const maxFortune = Math.max(...fullYearData.map(d => d.fortune), 100);
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="bg-surface/30 border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-serif font-bold text-ink-light">
          {year}년 운세 타임라인
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={fullYearData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
          <XAxis
            dataKey="month"
            stroke="#D4AF37"
            opacity={0.7}
            tick={{ fill: "#D4AF37", fontSize: 10 }}
          />
          <YAxis
            stroke="#D4AF37"
            opacity={0.7}
            tick={{ fill: "#D4AF37", fontSize: 10 }}
            domain={[0, maxFortune]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(26, 25, 23, 0.95)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#D4AF37" }}
          />
          <Line
            type="monotone"
            dataKey="fortune"
            stroke="#D4AF37"
            strokeWidth={3}
            dot={{ fill: "#D4AF37", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center">
        <p className="text-xs text-ink-light/60">
          {currentMonth}월까지의 운세 흐름을 확인하세요
        </p>
      </div>
    </div>
  );
}
