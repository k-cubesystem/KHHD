"use client";

import { motion } from "framer-motion";

import { useState, useEffect } from "react";

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-12 items-center text-center px-4 pt-20 pb-10 min-h-[400px]">
        <div className="w-64 h-10 bg-white/5 animate-pulse rounded-lg" />
        <div className="w-96 h-20 bg-white/5 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 items-center text-center px-4 pt-20 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col gap-4"
      >
        <span className="text-primary font-medium tracking-widest text-sm uppercase">
          Premium Fate Engineering SaaS
        </span>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
          海華堂 : 해화당 AI
        </h1>
        <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          KAIST 데이터 사이언스의 논리와 4대 전통 명리학의 직관이 만났습니다.<br />
          당신의 운명을 공학적으로 분석하여 완벽한 성공과 행복의 방정식을 제안합니다.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12"
      >
        {[
          { title: "天 (운명)", desc: "정교한 만세력 기반 사주 분석" },
          { title: "人 (의지)", desc: "멀티모달 AI 관상 및 손금 판독" },
          { title: "地 (환경)", desc: "공간의 흐름을 읽는 풍수 솔루션" },
        ].map((item, i) => (
          <div
            key={i}
            className="glass p-6 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors duration-500"
          >
            <h3 className="text-primary font-bold text-xl">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
