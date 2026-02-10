"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

interface FortuneCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  categoryLabel: string;
  fortuneGained: number;
  newPercentage: number;
  totalCompleted: number;
}

export function FortuneCompletionModal({
  isOpen,
  onClose,
  category,
  categoryLabel,
  fortuneGained,
  newPercentage,
  totalCompleted,
}: FortuneCompletionModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowContent(true), 300);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative bg-surface border border-primary/30 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(212,175,55,0.3)]"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-ink-light/50 hover:text-ink-light"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Rising Fortune Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-primary rounded-full"
                  initial={{
                    bottom: -20,
                    left: `${Math.random() * 100}%`,
                    opacity: 0,
                  }}
                  animate={{
                    bottom: "120%",
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Icon */}
                  <motion.div
                    className="w-20 h-20 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Sparkles className="w-10 h-10 text-primary" />
                  </motion.div>

                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-2xl font-serif font-bold text-primary mb-2">
                      대운이 들어왔습니다!
                    </h2>
                    <p className="text-ink-light/70 text-sm">
                      {categoryLabel} 분석을 완료하여
                    </p>
                  </motion.div>

                  {/* Fortune Increase */}
                  <motion.div
                    className="bg-primary/10 border border-primary/20 rounded-xl p-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="text-sm text-ink-light/60 mb-2">
                      이번 달 운세가 상승했어요
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                      <motion.span
                        className="text-4xl font-serif font-bold text-primary"
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ delay: 0.8, type: "spring" }}
                      >
                        +{(fortuneGained / 8).toFixed(1)}%
                      </motion.span>
                      <span className="text-xl text-primary/70">↑</span>
                    </div>
                    <div className="text-xs text-ink-light/50 mt-2">
                      현재 운세 상승도: {newPercentage}% ({totalCompleted}/8 완료)
                    </div>
                  </motion.div>

                  {/* CTA */}
                  <motion.button
                    onClick={onClose}
                    className="w-full bg-primary hover:bg-primary-dim text-background font-bold py-3 rounded-lg transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    다음 운 채우러 가기
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
