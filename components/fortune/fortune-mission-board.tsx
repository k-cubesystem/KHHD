"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight } from "lucide-react";
import { FORTUNE_MISSIONS } from "@/lib/constants";

interface FortuneMissionBoardProps {
  currentFortune: number;
  totalPossible: number;
  percentage: number;
  completedCategories: string[];
}



export function FortuneMissionBoard({
  currentFortune,
  totalPossible,
  percentage,
  completedCategories,
}: FortuneMissionBoardProps) {
  const completedCount = completedCategories.length;
  const totalCount = FORTUNE_MISSIONS.length;

  const getStatusText = () => {
    if (percentage === 100) return { text: "대운 완성! 최고의 기운", color: "text-gold-400" };
    if (percentage >= 75) return { text: "강한 기운이 흐르고 있어요", color: "text-primary" };
    if (percentage >= 50) return { text: "운이 상승하는 중입니다", color: "text-primary/80" };
    if (percentage >= 25) return { text: "운을 더 채워보세요", color: "text-ink-light/60" };
    return { text: "미션을 완료해 운대를 올리세요", color: "text-ink-light/50" };
  };

  const status = getStatusText();

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface/80 to-surface/40 overflow-hidden">
      {/* 헤더 - 운세 게이지 */}
      <div className="relative px-4 pt-4 pb-3 overflow-hidden">
        {/* 배경 에너지 */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-primary/8 via-primary/3 to-transparent"
          initial={{ y: "100%" }}
          animate={{ y: `${100 - percentage}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        <div className="relative z-10">
          {/* 상단 라벨 + % */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">
                이번 달 운세 미션
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <motion.span
                className="text-2xl font-serif font-bold text-primary"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {percentage}%
              </motion.span>
              <span className="text-sm text-primary/60">↑</span>
            </div>
          </div>

          {/* 프로그레스 바 */}
          <div className="h-1.5 bg-surface/60 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>

          {/* 상태 텍스트 + 완료 카운트 */}
          <div className="flex items-center justify-between">
            <p className={cn("text-[10px] font-light", status.color)}>
              {status.text}
            </p>
            <span className="text-[10px] text-ink-light/40">
              {completedCount}/{totalCount} 완료
            </span>
          </div>
        </div>
      </div>

      {/* 구분선 */}
      <div className="h-px bg-primary/10 mx-4" />

      {/* 미션 그리드 */}
      <div className="p-3 grid grid-cols-4 gap-2">
        {FORTUNE_MISSIONS.map((mission) => {
          const isCompleted = completedCategories.includes(mission.category);
          const Icon = mission.icon;

          return (
            <Link
              key={mission.category}
              href={mission.path}
              className={cn(
                "group flex flex-col items-center justify-center rounded-xl border py-4 px-2 transition-all duration-300",
                isCompleted
                  ? "bg-primary/5 border-primary/20 shadow-[0_0_10px_rgba(212,175,55,0.05)]"
                  : "bg-black/40 border-white/5 hover:border-primary/20 hover:bg-black/60 active:scale-95"
              )}
            >
              {/* 아이콘 */}
              <div className="relative mb-2">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-all group-hover:scale-110",
                    isCompleted ? "text-primary" : "text-ink-light/50 group-hover:text-ink-light/80"
                  )}
                  strokeWidth={1.5}
                />
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center shadow-sm"
                  >
                    <span className="text-[8px] text-background font-bold">✓</span>
                  </motion.div>
                )}
              </div>

              {/* 라벨 */}
              <span
                className={cn(
                  "text-xs text-center leading-tight font-medium",
                  isCompleted ? "text-primary/90" : "text-ink-light/70 group-hover:text-ink-light"
                )}
              >
                {mission.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-[9px] text-ink-light/30">
          <span>미션 완료 시 운대가 올라갑니다</span>
          <span>{currentFortune} / {totalPossible}점</span>
        </div>
      </div>
    </div>
  );
}
