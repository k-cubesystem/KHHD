"use client";

import { motion } from "framer-motion";
import { Moon, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthlyFortuneCycleProps {
  currentMonth: number;
  completedMissions: number;
  totalMissions: number;
}

export function MonthlyFortuneCycle({
  currentMonth,
  completedMissions,
  totalMissions,
}: MonthlyFortuneCycleProps) {
  const remaining = totalMissions - completedMissions;
  const moonPhase = (completedMissions / totalMissions) * 100;

  const MONTH_NAMES = [
    "정월", "이월", "삼월", "사월", "오월", "육월",
    "칠월", "팔월", "구월", "시월", "십일월", "십이월"
  ];

  return (
    <div className="bg-surface/20 border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden">
          <Moon className="w-6 h-6 text-primary relative z-10" />
          {/* Moon phase fill */}
          <motion.div
            className="absolute inset-0 bg-primary/30"
            style={{ clipPath: `inset(${100 - moonPhase}% 0 0 0)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-ink-light/40" />
            <span className="text-xs text-ink-light/50">월운 (月運)</span>
          </div>
          <h4 className="text-lg font-serif font-bold text-ink-light">
            {MONTH_NAMES[currentMonth - 1]}
          </h4>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-light/70">이번 달 완료</span>
          <span className="text-sm font-bold text-primary">
            {completedMissions}/{totalMissions}
          </span>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-ink-light/60">
            {remaining}개 더 채우면 이번 달 대운 완성!
          </p>
        )}
        {remaining === 0 && (
          <p className="text-xs text-primary">
            ✨ 이번 달 대운 완성! 다음 달도 계속 이어가세요
          </p>
        )}
      </div>
    </div>
  );
}
