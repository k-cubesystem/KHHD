"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function Particles() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; left: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    setMounted(true);
    setParticles(
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: i * 0.5,
      }))
    );
  }, []);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 bg-primary rounded-full"
          initial={{
            bottom: -10,
            left: `${p.left}%`,
            opacity: 0,
          }}
          animate={{
            bottom: "110%",
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
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
      {/* Background Fortune Energy Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent"
        initial={{ y: "100%" }}
        animate={{ y: `${100 - percentage}%` }}
        transition={{ duration: 2, ease: "easeOut" }}
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
          <motion.span
            className="text-4xl font-serif font-bold text-primary"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {percentage}%
          </motion.span>
          <span className="text-lg text-primary/70">↑</span>
        </div>

        <p className="text-sm text-ink-light/70 mb-4">
          {getEncouragement()}
        </p>

        <div className="flex items-center justify-between text-xs text-ink-light/50">
          <span>현재 운세</span>
          <span>{currentFortune} / {totalPossible}</span>
        </div>

        {/* Fortune Flow Bar */}
        <div className="mt-3 h-2 bg-surface/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
