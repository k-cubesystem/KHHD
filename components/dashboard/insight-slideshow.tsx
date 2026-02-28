'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Sparkles, ScrollText, Crown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const SLIDES = [
  {
    id: 1,
    title: '오늘의 평안',
    message: '"마음의 평화가 곧 운명의 시작입니다."',
    subtext: '오늘도 당신의 하루를 응원합니다.',
    icon: Sun,
    color: 'text-primary-dark',
    bg: 'bg-primary-dark/10',
    link: '/protected/saju/today',
  },
  {
    id: 2,
    title: '운명 개척',
    message: '"사주는 정해진 것이 아니라 흐름을 타는 것."',
    subtext: '나의 운대를 알고 미리 준비하세요.',
    icon: ScrollText,
    color: 'text-primary',
    bg: 'bg-primary/10',
    link: '/protected/profile',
  },
  {
    id: 3,
    title: '프리미엄 분석',
    message: '"2026년, 당신에게 다가올 기회는?"',
    subtext: '남들보다 앞서가는 운세 전략.',
    icon: Crown,
    color: 'text-primary',
    bg: 'bg-primary/10',
    link: '/protected/studio',
  },
]

export function InsightSlideshow() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-surface/30 border border-white/5 backdrop-blur-sm">
      <div className="relative min-h-[140px] p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-full ${SLIDES[current].bg}`}>
                {(() => {
                  const Icon = SLIDES[current].icon
                  return <Icon className={`w-3 h-3 ${SLIDES[current].color}`} />
                })()}
              </div>
              <span className={`text-[10px] font-bold tracking-wider uppercase ${SLIDES[current].color}`}>
                {SLIDES[current].title}
              </span>
            </div>

            <h3 className="text-lg font-serif font-bold text-ink-light leading-snug">{SLIDES[current].message}</h3>

            <p className="text-xs text-ink-light/60 font-sans">{SLIDES[current].subtext}</p>
          </motion.div>
        </AnimatePresence>

        {/* Link / Action Area */}
        <Link
          href={SLIDES[current].link}
          className="absolute bottom-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors group"
        >
          <ChevronRight className="w-4 h-4 text-ink-light/50 group-hover:text-primary transition-colors" />
        </Link>

        {/* Indicators */}
        <div className="absolute bottom-6 left-6 flex gap-1.5">
          {SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                idx === current ? 'bg-primary w-4' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
    </div>
  )
}
