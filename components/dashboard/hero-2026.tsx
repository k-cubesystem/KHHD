"use client";

import { motion } from "framer-motion";
import { Shield, Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Hero2026Props {
  isGuest: boolean;
  masterName: string;
}

export function Hero2026({ isGuest, masterName }: Hero2026Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full min-h-[320px] overflow-hidden rounded-2xl bg-surface/50 border border-white/5 backdrop-blur-sm">
      {/* Background Elements (Absolute) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#1A1917] to-[#0A0A0A] z-0">
        {/* Animated Particles */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {mounted && [...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/40 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: "100%",
              }}
              animate={{
                y: "-20%",
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear"
              }}
            />
          ))}
        </div>

        {/* Gold Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px]" />
      </div>

      {/* Content (Relative to push height) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-12 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 backdrop-blur-xl mb-6 rounded-full"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Shield className="w-3 h-3 text-primary" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase">
              Haehwadang Premium
            </span>
          </motion.div>

          {/* Headline - Smaller on Mobile */}
          <h1 className="text-xl md:text-3xl font-serif font-bold mb-4 leading-relaxed text-ink-light">
            <span className="opacity-90">남들이 안 하는 걸 해라.</span>
            <br />
            <span className="text-primary relative inline-block mt-1">
              내 운명은 내가 지킨다
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary/40 rounded-full" />
            </span>
          </h1>

          {/* Description */}
          <p className="text-xs md:text-sm text-ink-light/60 font-sans leading-relaxed mb-6 max-w-sm mx-auto">
            매일, 매주, 매달 나의 운대를 알고 살아간다면
            <br className="hidden md:block" />
            <span className="text-primary/80"> 좋은 일은 더 좋게, 나쁜 일은 피하면서</span>
            <br />
            내 인생을 주체적으로 관리할 수 있습니다.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full">
            <Link href={isGuest ? "/auth/sign-up" : "/protected/studio"} className="w-full sm:w-auto">
              <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-primary text-[#0A0A0A] font-serif font-bold text-sm rounded-lg shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.3)] transition-all active:scale-95"
              >
                <TrendingUp className="w-4 h-4" />
                <span>나의 운대 확인하기</span>
              </button>
            </Link>

            {isGuest && (
              <Link href="/auth/login" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto px-6 py-3 border border-white/10 text-ink-light/70 font-sans text-xs rounded-lg hover:bg-white/5 transition-all"
                >
                  로그인하기
                </button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
