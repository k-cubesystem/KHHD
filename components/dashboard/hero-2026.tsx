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
    <div className="relative w-full min-h-[320px] md:min-h-[400px] overflow-hidden">
      {/* Background: Dark Premium with Gold Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#0A192F] to-[#0A0A0A]">
        {/* Animated Gold Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {mounted && [...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              initial={{
                x: Math.random() * 100 + "%",
                y: "100%",
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{
                y: "-20%",
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "linear"
              }}
            />
          ))}
        </div>

        {/* Central Gold Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 backdrop-blur-sm mb-4 rounded-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Shield className="w-3 h-3 text-primary" strokeWidth={2} />
              <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
                Cheongdam Haehwadang
              </span>
            </motion.div>

            {/* Main Headline - Power Statement */}
            <motion.h1
              className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-4 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="text-white">남들이 안 하는 걸 해라.</span>
              <br />
              <span className="text-primary relative inline-block">
                내 운명은 내가 지킨다
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary/30 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                />
              </span>
            </motion.h1>

            {/* Sub-headline - Value Proposition */}
            <motion.p
              className="text-sm md:text-base text-white/70 font-sans leading-relaxed mb-3 max-w-xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              매일, 매주, 매달 나의 운대를 알고 살아간다면
              <br />
              <span className="text-primary font-semibold">좋은 일은 더 좋게, 나쁜 일은 피하면서</span> 내 인생을 관리할 수 있습니다.
            </motion.p>

            {/* Personal Touch */}
            {!isGuest && (
              <motion.p
                className="text-xs text-white/50 font-sans mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <span className="text-primary font-serif font-semibold">{masterName}님</span>과 가족의 운세를 지금 관리하세요
              </motion.p>
            )}

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Link href={isGuest ? "/auth/sign-up" : "/protected/studio"}>
                <motion.button
                  className="group flex items-center gap-2 px-6 py-3 bg-primary text-[#0A0A0A] font-serif font-bold text-sm rounded-lg shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>나의 운대 올리기 시작</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>

              {isGuest && (
                <Link href="/auth/login">
                  <motion.button
                    className="px-6 py-3 border border-primary/30 text-white font-sans text-xs rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    이미 회원이신가요?
                  </motion.button>
                </Link>
              )}
            </motion.div>

            {/* Social Proof / Trust Badge */}
            <motion.div
              className="flex items-center justify-center gap-4 mt-6 text-[10px] text-white/40 font-sans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary/60" />
                <span>운세 전문가 검증</span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-primary/60" />
                <span>개인정보 안전 보호</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}
