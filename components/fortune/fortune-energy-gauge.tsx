"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

/* 파티클 상수 (모듈 레벨 — hydration-safe) */
const PARTICLE_SEEDS = [
  { left: 10, dur: 3.2, delay: 0.0 },
  { left: 25, dur: 4.1, delay: 0.5 },
  { left: 40, dur: 3.5, delay: 1.0 },
  { left: 55, dur: 4.8, delay: 1.5 },
  { left: 70, dur: 3.0, delay: 2.0 },
  { left: 85, dur: 4.3, delay: 2.5 },
  { left: 15, dur: 3.7, delay: 3.0 },
  { left: 60, dur: 4.5, delay: 3.5 },
];

function Particles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {PARTICLE_SEEDS.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-primary rounded-full anim-particle-rise"
          style={{
            bottom: -10,
            left: `${p.left}%`,
            animation: `particle-rise-linear ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

interface FortuneEnergyGaugeProps {
  currentFortune: number;
  totalPossible: number;
  percentage: number;
  variant?: "monthly" | "yearly" | "family";
}

export function FortuneEnergyGauge({
  currentFortune,
  totalPossible,
  percentage,
  variant = "monthly",
}: FortuneEnergyGaugeProps) {
  const getLabel = () => {
    switch (variant) {
      case "monthly": return "이번 달 운세 상승도";
      case "yearly": return "올해 누적 운세";
      case "family": return "가족 총운";
    }
  };

  const getEncouragement = () => {
    if (percentage === 100) return "대운 완성! 최고의 기운입니다";
    if (percentage >= 75) return "강한 기운이 흐르고 있어요";
    if (percentage >= 50) return "운이 상승하는 중입니다";
    if (percentage >= 25) return "운을 더 채워보세요";
    if (percentage === 0) return "8가지 운세를 채워 운대를 올리세요";
    return "운세를 시작해보세요";
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-surface/80 to-surface/40 p-6">
      {/* Background Fortune Energy Effect — CSS transition으로 초기 슬라이드 */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent transition-transform duration-[2000ms] ease-out"
        style={{ transform: `translateY(${100 - percentage}%)` }}
      />

      {/* Rising Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Particles />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary/70 font-bold uppercase tracking-wider">
            {getLabel()}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span
            className="text-4xl font-serif font-bold text-primary anim-fade-in-up"
            style={{
              '--fade-y': '10px',
              animation: 'fade-in-up 0.5s ease-out both',
            } as React.CSSProperties}
          >
            {percentage}%
          </span>
          <span className="text-lg text-primary/70">↑</span>
        </div>

        <p className="text-sm text-ink-light/70 mb-4">
          {getEncouragement()}
        </p>

        <div className="flex items-center justify-between text-xs text-ink-light/50">
          <span>현재 운세</span>
          <span>{currentFortune} / {totalPossible}</span>
        </div>

        {/* Fortune Flow Bar — CSS transition */}
        <div className="mt-3 h-2 bg-surface/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-[1500ms] ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
