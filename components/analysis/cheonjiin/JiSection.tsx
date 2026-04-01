'use client'

import { motion } from 'framer-motion'
import { Compass, Mountain, Home, Briefcase, Lightbulb, Palette } from 'lucide-react'
import { FengshuiData } from '@/types/cheonjiin'

interface JiSectionProps {
  data: {
    title?: string
    content?: string
    daewoon_phase?: string
    lucky_direction?: string
    fengshui?: FengshuiData | null
  } | null
}

export function JiSection({ data }: JiSectionProps) {
  if (!data) return null

  const { title, content, daewoon_phase, lucky_direction, fengshui } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full px-0 py-2 mb-2"
    >
      <div className="relative overflow-hidden bg-surface/20 backdrop-blur-sm border-t border-b border-white/5 py-8 md:py-10">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="px-5 md:px-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="font-serif text-lg text-primary">地</span>
              </div>
              <h2 className="text-xl font-bold text-ink-light tracking-tight">
                지리적 환경과 흐름 <span className="text-primary/60 text-sm font-normal ml-1">땅의 기운</span>
              </h2>
            </div>
            <p className="text-sm text-ink-light/70 font-light pl-13">당신이 머무는 공간과 환경의 에너지 흐름입니다.</p>
          </div>

          {/* Core Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-ink-light mb-3 leading-snug">{title || '현실적 기반과 환경'}</h3>
              <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>
            </div>

            {/* Lucky Items Grid (Vertical Stack on Mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {daewoon_phase && (
                <div className="bg-surface/20 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mountain className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-[10px] text-primary/60 tracking-widest font-bold block mb-1">
                      현재 대운 흐름
                    </span>
                    <span className="text-base font-serif font-medium text-ink-light">{daewoon_phase}</span>
                  </div>
                </div>
              )}

              {lucky_direction && (
                <div className="bg-surface/20 border border-primary-dark/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-dark/10 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 text-primary-dark" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-[10px] text-primary-dark/60 tracking-widest font-bold block mb-1">
                      길한 방위
                    </span>
                    <span className="text-base font-serif font-medium text-ink-light">{lucky_direction}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 풍수(風水) 분석 섹션 */}
            {fengshui && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-primary/10" />
                  <span className="text-[11px] text-primary/60 font-bold tracking-widest px-2">風水 풍수 분석</span>
                  <div className="h-px flex-1 bg-primary/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fengshui.home_energy && (
                    <div className="bg-surface/20 border border-primary/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span className="text-[11px] text-primary/70 font-bold tracking-wide">집의 기운</span>
                      </div>
                      <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                        {fengshui.home_energy}
                      </p>
                    </div>
                  )}

                  {fengshui.work_energy && fengshui.work_energy.trim() && (
                    <div className="bg-surface/20 border border-primary/20 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span className="text-[11px] text-primary/70 font-bold tracking-wide">직장의 기운</span>
                      </div>
                      <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                        {fengshui.work_energy}
                      </p>
                    </div>
                  )}

                  {fengshui.advice && (
                    <div className="bg-surface/20 border border-primary-dark/20 rounded-xl p-4 space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-primary-dark" aria-hidden="true" />
                        <span className="text-[11px] text-primary-dark/70 font-bold tracking-wide">풍수 조언</span>
                      </div>
                      <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                        {fengshui.advice}
                      </p>
                    </div>
                  )}

                  {fengshui.lucky_color_for_home && (
                    <div className="bg-surface/30 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <Palette className="w-5 h-5 text-white/60" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 tracking-widest font-bold block mb-1">
                          집에 두면 좋은 색상
                        </span>
                        <span className="text-base font-serif font-medium text-ink-light">
                          {fengshui.lucky_color_for_home}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
