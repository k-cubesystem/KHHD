"use client";

import { motion } from "framer-motion";
import { Flame, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden border border-primary/20 group">
      {/* Background: Animated Red Horse Silhouette */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a0a] via-[#0a0a0a] to-[#1a0000]">
        {/* Noise Texture */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay">
          <div className="w-full h-full" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
          }} />
        </div>



        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-seal/20 border border-seal/40 backdrop-blur-sm mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Sparkles className="w-4 h-4 text-seal" strokeWidth={1.5} />
              <span className="text-xs font-bold tracking-[0.3em] text-seal uppercase">
                2026 丙午年 Special
              </span>
            </motion.div>

            {/* Main Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-ink-light mb-6 leading-tight">
              <span className="text-seal">병오년</span>,<br />
              가장 뜨거운 해가<br />
              떠올랐습니다
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-ink-light/70 font-light leading-relaxed mb-8 max-w-xl">
              적토마가 달리듯, 당신의 운명도 그만큼 뜨겁게 타오를 준비가 되었습니까?
              {!isGuest && (
                <>
                  <br />
                  <span className="text-primary font-medium">{masterName}님</span>의 2026년 불의 기운을 확인하세요.
                </>
              )}
            </p>

            {/* CTA */}
            <Link href={isGuest ? "/auth/sign-up" : "/protected/analysis"}>
              <motion.button
                className="group flex items-center gap-3 px-8 py-4 bg-background/50 hover:bg-background/80 text-ink-light font-serif font-medium text-sm border border-primary/30 hover:border-primary shadow-sm transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Flame className="w-5 h-5" />
                <span>나의 2026년 불의 운세 확인하기</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}
