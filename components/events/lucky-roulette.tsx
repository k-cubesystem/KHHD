"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, X, Trophy } from "lucide-react";
import { toast } from "sonner";
import { spinRoulette } from "@/app/actions/roulette-actions";
import { cn } from "@/lib/utils";

interface LuckyRouletteProps {
  canSpin: boolean;
  nextAvailableTime?: string;
}

export function LuckyRoulette({ canSpin: initialCanSpin, nextAvailableTime }: LuckyRouletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canSpin, setCanSpin] = useState(initialCanSpin);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    if (!canSpin || isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // Start initial rapid rotation
    const spinDuration = 3000; // 3 seconds total
    const totalRotation = 360 * 5 + Math.random() * 360; // At least 5 full spins
    setRotation(totalRotation);

    try {
      // Create artificial delay for suspense
      await new Promise(resolve => setTimeout(resolve, 2000));

      const spinResult = await spinRoulette();

      if (spinResult.success && spinResult.reward) {
        // Calculate final position based on reward (mock calculation)
        // In a real scenario, you'd map reward IDs to angles
        const reward = spinResult.reward;

        setTimeout(() => {
          setResult(reward);
          setCanSpin(false);
          setIsSpinning(false);

          const rewardText = reward.type === 'talisman'
            ? `부적 ${reward.value}장`
            : reward.label;

          toast.success(`🎉 축하합니다! ${rewardText} 획득!`);
        }, 1000); // Wait for spin to slow down
      } else {
        throw new Error(spinResult.error || "룰렛 회전 실패");
      }
    } catch (error) {
      setResult({ error: true });
      setIsSpinning(false);
      toast.error("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="lucky-roulette-trigger cursor-pointer group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-4 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(236,182,19,0.15)]">
          {/* Background Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-ink-light text-base group-hover:text-primary transition-colors">
                  행운의 룰렛
                </h3>
              </div>
              <p className="text-[11px] text-ink-light/60 pl-1">
                {canSpin ? "✨ 오늘 무료 1회 가능!" : "내일 다시 도전하세요"}
              </p>
            </div>

            <div className="flex flex-col items-end">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold border transition-colors",
                canSpin
                  ? "bg-primary text-background border-primary hover:bg-white hover:text-primary"
                  : "bg-surface text-ink-light/40 border-white/5"
              )}>
                {canSpin ? "START" : "COMPLETED"}
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="border-none bg-transparent shadow-none p-0 max-w-[320px] mx-auto">
        <div className="relative bg-[#1a1a1a] rounded-[32px] border border-primary/30 p-1 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Hanji Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('/textures/hanji.png')] bg-cover mix-blend-overlay" />

          {/* Header */}
          <div className="relative z-10 text-center pt-8 pb-4">
            <h2 className="text-xl font-serif font-bold text-primary mb-1">행운의 룰렛</h2>
            <p className="text-[11px] text-ink-light/60">오늘 당신에게 찾아올 행운은?</p>
          </div>

          {/* Roulette Wheel Container */}
          <div className="relative w-full aspect-square p-4 mb-4">
            {/* Visual Indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-8 h-10 drop-shadow-lg">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
            </div>

            {/* The Wheel */}
            <motion.div
              className="w-full h-full rounded-full border-4 border-[#2a2a2a] relative overflow-hidden shadow-inner bg-[#1a1a1a]"
              animate={{ rotate: rotation }}
              transition={{ duration: 3, ease: "circOut" }}
            >
              {/* Wheel Segments (CSS Conic Gradient for simplicity) */}
              <div className="absolute inset-0 rounded-full opacity-80" style={{
                background: `conic-gradient(
                        from 0deg,
                        #FF6B6B 0deg 60deg,
                        #4ECDC4 60deg 120deg,
                        #FFD93D 120deg 180deg,
                        #95A5A6 180deg 240deg,
                        #FF8A5B 240deg 300deg,
                        #A8E6CF 300deg 360deg
                      )`
              }} />

              {/* Segment Lines */}
              {[0, 60, 120, 180, 240, 300].map(deg => (
                <div key={deg} className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${deg}deg)` }}>
                  <div className="w-0.5 h-1/2 bg-black/20" />
                </div>
              ))}

              {/* Center Decoration */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#2a2a2a] rounded-full border-2 border-primary/50 flex items-center justify-center shadow-lg z-10">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </motion.div>
          </div>

          {/* Result Overlay */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center"
              >
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-primary/10">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">당첨!</h3>
                <p className="text-lg text-primary font-bold mb-6">
                  {result?.type === 'talisman' ? `부적 ${result.value}장` : result.label}
                </p>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="bg-primary hover:bg-primary/90 text-black font-bold w-full rounded-full"
                >
                  확인
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <div className="px-6 pb-8">
            <Button
              onClick={handleSpin}
              disabled={!canSpin || isSpinning}
              className={cn(
                "w-full h-12 text-lg font-bold rounded-full shadow-lg transition-all",
                !canSpin || isSpinning
                  ? "bg-gray-700 text-gray-400 border-none"
                  : "bg-gradient-to-r from-primary via-yellow-400 to-primary text-black border-2 border-primary hover:scale-105 active:scale-95"
              )}
            >
              {isSpinning ? "행운을 비는 중..." : (canSpin ? "돌리기 (무료)" : "내일 또 오세요")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
