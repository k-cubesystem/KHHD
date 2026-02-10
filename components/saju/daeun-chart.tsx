"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
const Legend = dynamic(
  () => import("recharts").then((mod) => mod.Legend),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

type Element = "木" | "火" | "土" | "金" | "水";

const ELEMENT_COLORS: Record<Element, string> = {
  木: "#4A7C59",
  火: "#C07055",
  土: "#C5B358",
  金: "#E5E3DF",
  水: "#4A5D7C",
};

export interface DaeunData {
  age: string;
  fortune: number;
  element: Element;
  heavenly: string;
  earthly: string;
  description?: string;
}

interface DaeunChartProps {
  data: DaeunData[];
  currentAge?: number;
  title?: string;
  description?: string;
}

export function DaeunChart({
  data,
  currentAge,
  title = "대운(大運) 흐름 분석",
  description = "10년 단위로 변화하는 당신의 인생 운세를 확인하세요",
}: DaeunChartProps) {
  const currentDaeun = currentAge
    ? data.find((item) => {
        const [start, end] = item.age.split("-").map(Number);
        return currentAge >= start && currentAge <= end;
      })
    : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as DaeunData;
      return (
        <Card className="bg-surface/95 backdrop-blur-md border-primary/30 p-4">
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="font-serif text-lg font-bold text-ink-light">{data.age}세</span>
              <span className="text-2xl font-bold" style={{ color: ELEMENT_COLORS[data.element] }}>
                {data.fortune}점
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-light/60">대운:</span>
              <span className="font-serif font-bold text-ink-light">{data.heavenly}{data.earthly}</span>
              <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: ELEMENT_COLORS[data.element] + "40", color: ELEMENT_COLORS[data.element] }}>
                {data.element}
              </span>
            </div>
            {data.description && <p className="text-xs text-ink-light/70 pt-2">{data.description}</p>}
          </div>
        </Card>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const data = payload as DaeunData;
    const isCurrent = currentAge
      ? parseInt(data.age.split("-")[0]) <= currentAge && parseInt(data.age.split("-")[1]) >= currentAge
      : false;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isCurrent ? 8 : 5}
        fill={ELEMENT_COLORS[data.element]}
        stroke={isCurrent ? "#E2D5B5" : "transparent"}
        strokeWidth={isCurrent ? 3 : 0}
        className={isCurrent ? "animate-pulse" : ""}
      />
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="bg-surface/50 backdrop-blur-md border border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-serif font-bold text-ink-light flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                {title}
              </CardTitle>
              <p className="text-sm text-ink-light/60 font-light">{description}</p>
            </div>
            {currentDaeun && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg px-4 py-2 text-center">
                <div className="text-xs text-primary/70">Current</div>
                <div className="text-xl font-serif font-bold text-primary">{currentDaeun.age}세</div>
                <div className="text-sm text-ink-light/60">{currentDaeun.heavenly}{currentDaeun.earthly}</div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2D5B5" opacity={0.1} />
              <XAxis dataKey="age" stroke="#E2D5B5" opacity={0.7} tick={{ fill: "#E2D5B5" }} />
              <YAxis stroke="#E2D5B5" opacity={0.7} tick={{ fill: "#E2D5B5" }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: "#E2D5B5" }} />
              <Line type="monotone" dataKey="fortune" stroke="#E2D5B5" strokeWidth={3} dot={<CustomDot />} name="대운 점수" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-6 pt-6 border-t border-primary/10">
            <div className="text-sm text-ink-light/60 font-bold mb-3">오행(五行) 색상 범례</div>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(ELEMENT_COLORS) as Element[]).map((el) => (
                <div key={el} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ELEMENT_COLORS[el] }} />
                  <span className="text-sm font-serif text-ink-light">
                    {el} ({el === "木" ? "나무" : el === "火" ? "불" : el === "土" ? "흙" : el === "金" ? "쇠" : "물"})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function generateSampleDaeunData(): DaeunData[] {
  return [
    { age: "0-9", fortune: 60, element: "木", heavenly: "甲", earthly: "子", description: "초년운" },
    { age: "10-19", fortune: 75, element: "火", heavenly: "丙", earthly: "寅", description: "학업운 상승" },
    { age: "20-29", fortune: 85, element: "土", heavenly: "戊", earthly: "辰", description: "안정적 기반" },
    { age: "30-39", fortune: 90, element: "金", heavenly: "庚", earthly: "午", description: "전성기" },
    { age: "40-49", fortune: 80, element: "水", heavenly: "壬", earthly: "申", description: "안정기" },
    { age: "50-59", fortune: 70, element: "木", heavenly: "甲", earthly: "戌", description: "안정 유지" },
    { age: "60-69", fortune: 65, element: "火", heavenly: "丙", earthly: "子", description: "평온한 시기" },
    { age: "70-79", fortune: 55, element: "土", heavenly: "戊", earthly: "寅", description: "가족 중심" },
  ];
}
