"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Gift } from "lucide-react";
import { spinRoulette, getRouletteRewards } from "@/app/actions/roulette-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LuckyRouletteProps {
  canSpin: boolean;
  nextAvailableTime?: string;
}

export function LuckyRoulette({ canSpin: initialCanSpin, nextAvailableTime }: LuckyRouletteProps) {
  const [canSpin, setCanSpin] = useState(initialCanSpin);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSpin = async () => {
    setIsSpinning(true);
    setShowResult(false);
    setResult(null);

    // 회전 애니메이션 시뮬레이션
    setTimeout(async () => {
      const spinResult = await spinRoulette();

      setIsSpinning(false);

      if (spinResult.success) {
        setResult(spinResult.reward);
        setShowResult(true);
        setCanSpin(false);

        const rewardText = spinResult.reward.type === 'talisman'
          ? `부적 ${spinResult.reward.value}장`
          : spinResult.reward.label;

        toast.success(`🎉 축하합니다! ${rewardText} 획득!`, {
          duration: 5000,
        });

        // 2초 후 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(spinResult.error || "룰렛 회전에 실패했습니다.");
      }
    }, 2000); // 2초간 회전 애니메이션
  };

  return (
    <Card className="bg-surface/30 border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-ink-light">행운의 룰렛</h3>
          </div>

          <div className="px-2 py-1 bg-seal-500/20 border border-seal-500/30 rounded-full">
            <span className="text-xs font-bold text-seal-400">1일 1회 무료</span>
          </div>
        </div>

        {/* Roulette Visual (Simplified) */}
        <div className="relative mb-4">
          <motion.div
            animate={isSpinning ? { rotate: 360 } : {}}
            transition={isSpinning ? { duration: 2, ease: "easeOut", repeat: 0 } : {}}
            className="w-full aspect-square rounded-full border-4 border-primary relative flex items-center justify-center"
            style={{
              background: `conic-gradient(
                from 0deg,
                #ef4444 0deg 72deg,
                #f59e0b 72deg 144deg,
                #10b981 144deg 216deg,
                #3b82f6 216deg 288deg,
                #8b5cf6 288deg 360deg
              )`
            }}
          >
            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-background rounded-full border-4 border-primary flex items-center justify-center">
                {isSpinning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>
                ) : (
                  <Gift className="w-8 h-8 text-primary" />
                )}
              </div>
            </div>

            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-white" />
            </div>
          </motion.div>

          {/* Result Animation */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-full"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-lg font-bold text-primary">{result.label}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={!canSpin || isSpinning}
          className={cn(
            "w-full h-10 font-bold transition-all",
            !canSpin || isSpinning
              ? "bg-surface border border-primary/30 text-ink-light/50 cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 text-ink-900"
          )}
        >
          {isSpinning ? (
            "회전 중..."
          ) : canSpin ? (
            "룰렛 돌리기"
          ) : (
            "내일 다시 도전"
          )}
        </Button>

        {/* Next Available Time */}
        {!canSpin && nextAvailableTime && !isSpinning && (
          <p className="text-[10px] text-ink-light/50 text-center mt-2">
            다음 도전: {new Date(nextAvailableTime).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}

        {/* Rewards Info */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[10px] text-ink-light/60 text-center">
            🎁 부적 50~1000장 또는 프리미엄 30일 당첨 가능
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
