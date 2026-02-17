'use client'

import { motion } from 'framer-motion'
import { Compass, MapPin, Wind, Mountain } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface JiSectionProps {
  data: any
}

export function JiSection({ data }: JiSectionProps) {
  if (!data) return null

  const { title, content, daewoon_phase, lucky_direction } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-4xl mx-auto mb-4 px-4"
    >
      <Card className="relative overflow-hidden card-glass-manse p-6 md:p-8 border-emerald-900/40 bg-[#0A0A0A]">
        {/* Background Decor - Earth/Nature Theme */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-900/10 rounded-full blur-[60px] pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0c1a15] to-[#0A0A0A] border border-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <span className="text-2xl font-serif text-emerald-400">地</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-serif font-medium text-ink-light flex items-center gap-2">
                지(地){' '}
                <span className="text-sm font-sans text-ink-light/40 font-light">• 풍수지리</span>
              </h2>
              <p className="text-xs text-emerald-400/60 font-light tracking-wide">
                당신이 머무는 공간과 환경의 에너지 흐름
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-ink-light">{title || '현실적 기반과 환경'}</h3>
            <div className="flex flex-col md:flex-row gap-6">
              <p className="flex-1 text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>

              {/* Right Side Cards */}
              <div className="flex flex-col gap-3 w-full md:w-[200px] md:flex-shrink-0">
                {daewoon_phase && (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Mountain className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400/60 uppercase tracking-widest block">
                        Current Phase
                      </span>
                      <span className="text-sm font-serif text-emerald-100">{daewoon_phase}</span>
                    </div>
                  </div>
                )}

                {lucky_direction && (
                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Compass className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400/60 uppercase tracking-widest block">
                        Lucky Direction
                      </span>
                      <span className="text-sm font-serif text-amber-100">{lucky_direction}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
