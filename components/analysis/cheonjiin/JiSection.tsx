'use client'

import { motion } from 'framer-motion'
import { Compass, Mountain } from 'lucide-react'

interface JiSectionProps {
  data: {
    title?: string
    content?: string
    daewoon_phase?: string
    lucky_direction?: string
  } | null
}

export function JiSection({ data }: JiSectionProps) {
  if (!data) return null

  const { title, content, daewoon_phase, lucky_direction } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full px-0 py-2 mb-2"
    >
      <div className="relative overflow-hidden bg-surface/20 backdrop-blur-sm border-t border-b border-white/5 py-8 md:py-10">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="px-5 md:px-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <span className="font-serif text-lg text-emerald-400">地</span>
              </div>
              <h2 className="text-xl font-bold text-ink-light tracking-tight">
                지리적 환경과 흐름{' '}
                <span className="text-emerald-400/60 text-sm font-normal ml-1">Earthing Flow</span>
              </h2>
            </div>
            <p className="text-sm text-ink-light/50 font-light pl-13">
              당신이 머무는 공간과 환경의 에너지 흐름입니다.
            </p>
          </div>

          {/* Core Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-emerald-100 mb-3 leading-snug">
                {title || '현실적 기반과 환경'}
              </h3>
              <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>
            </div>

            {/* Lucky Items Grid (Vertical Stack on Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {daewoon_phase && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Mountain className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-bold block mb-1">
                      Current Phase
                    </span>
                    <span className="text-base font-serif font-medium text-emerald-100">
                      {daewoon_phase}
                    </span>
                  </div>
                </div>
              )}

              {lucky_direction && (
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400/60 uppercase tracking-widest font-bold block mb-1">
                      Lucky Direction
                    </span>
                    <span className="text-base font-serif font-medium text-amber-100">
                      {lucky_direction}
                    </span>
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
