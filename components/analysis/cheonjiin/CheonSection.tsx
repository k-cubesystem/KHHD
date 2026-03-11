'use client'

import { motion } from 'framer-motion'
import { Crown, Star } from 'lucide-react'

interface CheonSectionProps {
  data: {
    title?: string
    content?: string
    strengths?: string[]
    weaknesses?: string[]
  } | null
}

export function CheonSection({ data }: CheonSectionProps) {
  if (!data) return null

  const { title, content } = data
  const strengths = Array.isArray(data.strengths) ? data.strengths.filter(Boolean) : []
  const weaknesses = Array.isArray(data.weaknesses) ? data.weaknesses.filter(Boolean) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full px-0 py-2 mb-2"
    >
      <div className="relative overflow-hidden bg-surface/20 backdrop-blur-sm border-t border-b border-white/5 py-8 md:py-10">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="px-5 md:px-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="font-serif text-lg text-primary">天</span>
              </div>
              <h2 className="text-xl font-bold text-ink-light tracking-tight">
                타고난 사주명리 <span className="text-primary/60 text-sm font-normal ml-1">하늘의 기운</span>
              </h2>
            </div>
            <p className="text-sm text-ink-light/50 font-light pl-13">
              하늘이 정해준 당신의 고유한 기질과 운명적 흐름입니다.
            </p>
          </div>

          {/* Core Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-ink-light mb-3 leading-snug">{title || '타고난 기운의 흐름'}</h3>
              <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>
            </div>

            {/* Analysis Points Grid */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              {/* Strengths */}
              {strengths && strengths.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Crown className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-bold tracking-wide">강점</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Using simple text tags instead of badges for cleaner look on mobile */}
                    {strengths.map((s: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-block px-3 py-1.5 rounded-lg bg-primary/10 text-primary/80 text-sm font-medium border border-primary/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {weaknesses && weaknesses.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-primary-dark/70">
                    <Star className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-bold tracking-wide">보완점</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {weaknesses.map((w: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-block px-3 py-1.5 rounded-lg bg-primary-dark/5 text-primary-dark/80 text-sm font-light border border-primary-dark/10"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
