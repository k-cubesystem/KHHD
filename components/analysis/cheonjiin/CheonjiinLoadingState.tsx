'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { DestinyTarget } from '@/app/actions/user/destiny'

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
    <div className="min-h-screen bg-charcoal-deep flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Noise & Gradient */}
      <div className="absolute inset-0 bg-[url('/texture/hanji_noise.png')] opacity-10 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />

      <div
        className="relative z-10 flex flex-col items-center gap-12 anim-fade-in-up"
        style={{ animation: 'fade-in-up 0.5s ease-out both' } as React.CSSProperties}
      >
        {/* Sacred Geometry Loader */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer Rings — CSS rotate */}
          <div
            className="absolute inset-0 border border-dashed border-primary/20 rounded-full anim-rotate-cw"
            style={{ animation: 'cheonjiin-rotate-cw 20s linear infinite' }}
          />
          <div
            className="absolute inset-4 border border-dotted border-primary/10 rounded-full anim-rotate-ccw"
            style={{ animation: 'cheonjiin-rotate-ccw 15s linear infinite' }}
          />

          {/* Triad Pulsing */}
          <div className="relative w-full h-full">
            {/* Heaven Node */}
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(212,175,55,0.8)] anim-node-pulse"
              style={{
                animation: stage === 0 ? 'node-pulse 2s ease-in-out infinite' : undefined,
                opacity: stage === 0 ? 1 : 0.5,
              }}
            />

            {/* Earth Node */}
            <div
              className="absolute bottom-10 left-10 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(212,175,55,0.8)] anim-node-pulse"
              style={{
                animation: stage === 1 ? 'node-pulse 2s ease-in-out infinite' : undefined,
                opacity: stage === 1 ? 1 : 0.5,
              }}
            />

            {/* Human Node */}
            <div
              className="absolute bottom-10 right-10 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_rgba(212,175,55,0.8)] anim-node-pulse"
              style={{
                animation: stage === 2 ? 'node-pulse 2s ease-in-out infinite' : undefined,
                opacity: stage === 2 ? 1 : 0.5,
              }}
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

            {/* Core Essence — CSS pulse */}
            <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
              <div
                className="w-20 h-20 bg-primary/10 rounded-full blur-xl absolute anim-core-pulse"
                style={{ animation: 'cheonjiin-core-pulse 3s ease-in-out infinite' }}
              />
              <span className="font-serif text-3xl text-primary font-bold z-10">
                {stage === 0 ? '天' : stage === 1 ? '地' : stage === 2 ? '人' : '合'}
              </span>
            </div>
          </div>
        </div>

        {/* Text Area — AnimatePresence for stage transitions (one-shot per stage) */}
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
              <p className="text-sm font-sans text-ink-light/70 font-light">
                {target.name}님의 {loadingStages[stage].sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
