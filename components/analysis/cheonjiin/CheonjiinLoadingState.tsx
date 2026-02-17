'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { cn } from '@/lib/utils'

interface CheonjiinLoadingStateProps {
  target: DestinyTarget
}

export function CheonjiinLoadingState({ target }: CheonjiinLoadingStateProps) {
  const [stage, setStage] = useState(0)

  const loadingStages = [
    { text: '천(天)의 기운을 읽고 있습니다...', sub: '사주와 천문 데이터를 분석 중' },
    { text: '지(地)의 흐름을 살피고 있습니다...', sub: '거주 환경과 방위 에너지 계산 중' },
    { text: '인(人)의 흔적을 쫓고 있습니다...', sub: '관상과 손금의 패턴 해석 중' },
    { text: '천지인(天地人)을 통합하고 있습니다...', sub: '세 가지 차원의 운명을 하나로 연결 중' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev < loadingStages.length - 1 ? prev + 1 : prev))
    }, 4000)
    return () => clearInterval(interval)
  }, [loadingStages.length])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Noise & Gradient */}
      <div className="absolute inset-0 bg-[url('/texture/hanji_noise.png')] opacity-10 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 flex flex-col items-center gap-12"
      >
        {/* Sacred Geometry Loader */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border border-dashed border-primary/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 border border-dotted border-primary/10 rounded-full"
          />

          {/* Triad Pulsing */}
          <div className="relative w-full h-full">
            {/* Heaven Node */}
            <motion.div
              animate={{
                scale: stage === 0 ? [1, 1.2, 1] : 1,
                opacity: stage === 0 ? 1 : 0.5,
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(212,175,55,0.8)]"
            />

            {/* Earth Node */}
            <motion.div
              animate={{
                scale: stage === 1 ? [1, 1.2, 1] : 1,
                opacity: stage === 1 ? 1 : 0.5,
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-10 left-10 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(212,175,55,0.8)]"
            />

            {/* Human Node */}
            <motion.div
              animate={{
                scale: stage === 2 ? [1, 1.2, 1] : 1,
                opacity: stage === 2 ? 1 : 0.5,
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute bottom-10 right-10 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(212,175,55,0.8)]"
            />

            {/* Connecting Lights */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <motion.path
                d="M128 20 L40 216 L216 216 Z"
                fill="none"
                stroke="rgba(212,175,55,0.3)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2 }}
              />
            </svg>

            {/* Core Essence */}
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 bg-primary/10 rounded-full blur-xl absolute"
              />
              <span className="font-serif text-3xl text-primary font-bold z-10">
                {stage === 0 ? '天' : stage === 1 ? '地' : stage === 2 ? '人' : '合'}
              </span>
            </div>
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center space-y-3 h-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <h2 className="text-xl md:text-2xl font-serif text-ink-light font-medium tracking-wide">
                {loadingStages[stage].text}
              </h2>
              <p className="text-sm font-sans text-ink-light/50 font-light">
                {target.name}님의 {loadingStages[stage].sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
