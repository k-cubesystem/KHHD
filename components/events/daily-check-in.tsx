"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Zap, Sparkles } from "lucide-react";
import { recordDailyAttendance } from "@/app/actions/daily-check-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyCheckInProps {
  initialChecked: boolean;
  initialConsecutiveDays: number;
}

const REWARDS = [
  { day: 1, talisman: 50 },
  { day: 2, talisman: 50 },
  { day: 3, talisman: 150 }, // +100 보너스
  { day: 4, talisman: 50 },
  { day: 5, talisman: 50 },
  { day: 6, talisman: 50 },
  { day: 7, talisman: 550 }, // +500 보너스
];

export function DailyCheckIn({ initialChecked, initialConsecutiveDays }: DailyCheckInProps) {
  const [checked, setChecked] = useState(initialChecked);
  const [consecutiveDays, setConsecutiveDays] = useState(initialConsecutiveDays);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleCheckIn = async () => {
    setIsLoading(true);

    try {
      const result = await recordDailyAttendance();

      if (result.success) {
        setChecked(true);
        setConsecutiveDays(result.consecutiveDays || 0);
        setShowConfetti(true);

        toast.success(`🎉 출석 완료! 부적 ${result.reward}장 획득!`, {
          duration: 5000,
        });

        setTimeout(() => setShowConfetti(false), 3000);

        // 페이지 새로고침하여 부적 지갑 업데이트
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(result.error || "출석 체크에 실패했습니다.");
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error("예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-ink-light">일일 출석 체크</h3>
          </div>

          {consecutiveDays > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">{consecutiveDays}일 연속</span>
            </div>
          )}
        </div>

        {/* Reward Calendar */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {REWARDS.map((reward, idx) => {
            const isCompleted = consecutiveDays > idx;
            const isCurrent = consecutiveDays === idx && !checked;
            const isToday = consecutiveDays === idx && checked;

            return (
              <motion.div
                key={idx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "aspect-square rounded-lg border-2 flex flex-col items-center justify-center relative",
                  isCompleted && "bg-primary/20 border-primary",
                  isToday && "bg-primary/30 border-primary ring-2 ring-primary/50",
                  isCurrent && "border-primary/50 border-dashed animate-pulse",
                  !isCompleted && !isCurrent && !isToday && "bg-surface/20 border-white/10"
                )}
              >
                <span className="text-[10px] text-ink-light/60 mb-0.5">Day {reward.day}</span>
                <Gift className={cn(
                  "w-3 h-3",
                  isCompleted || isToday ? "text-primary" : "text-ink-light/30"
                )} />
                <span className={cn(
                  "text-[9px] font-bold mt-0.5",
                  isCompleted || isToday ? "text-primary" : "text-ink-light/40"
                )}>
                  {reward.talisman}
                </span>

                {/* Confetti effect on today's completed */}
                <AnimatePresence>
                  {isToday && showConfetti && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 text-gold-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Check-In Button */}
        <Button
          onClick={handleCheckIn}
          disabled={checked || isLoading}
          className={cn(
            "w-full h-10 font-bold transition-all",
            checked
              ? "bg-surface border border-primary/30 text-ink-light/50 cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 text-ink-900"
          )}
        >
          {isLoading ? (
            "처리 중..."
          ) : checked ? (
            "✓ 오늘 출석 완료"
          ) : (
            "출석 체크하기"
          )}
        </Button>

        {/* Hint */}
        {!checked && (
          <p className="text-[10px] text-ink-light/50 text-center mt-2">
            매일 출석하면 부적이 쌓여요! 7일 연속 시 특별 보너스 🎁
          </p>
        )}
      </CardContent>
    </Card>
  );
}
