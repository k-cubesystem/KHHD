'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { Sparkles, Compass, Palette, Hash, Star } from 'lucide-react'
import { CheonjiinAnalysisResult } from '@/types/cheonjiin'

interface CheonjiinSummaryProps {
  data: CheonjiinAnalysisResult | null
  target: DestinyTarget
}

export function CheonjiinSummary({ data, target }: CheonjiinSummaryProps) {
  if (!data) return null

  const summary = data.summary || '청담해화당 통합분석이 완료되었습니다.'
  const lucky = data.lucky ?? {}

  return (
    <div className="relative w-full overflow-hidden mb-8">
      {/* Ambient glow */}
      <div className="absolute top-0 center w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none left-1/2 -translate-x-1/2" />

      <div className="relative z-10 px-0 pt-2 pb-6">
        {/* 1. Header Section */}
        <div className="text-center mb-6 space-y-2 px-4">
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-2"
          >
            <Sparkles className="w-2.5 h-2.5 text-primary" />
            <span className="text-[9px] font-bold text-primary tracking-widest uppercase">
              The Masterpiece Analysis
            </span>
          </motion.div>

          <h1 className="text-2xl font-serif font-light text-ink-light leading-tight">
            <span className="block text-ink-light/80 text-lg mb-1">{target.name}님의</span>
            <span className="font-bold text-primary text-3xl">청담해화당</span> 통합분석
          </h1>
        </div>

        {/* 2. Analysis Complete Badge */}
        <div className="relative flex flex-col items-center justify-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex items-center gap-6 bg-surface/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/5 shadow-xl"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-primary/60 font-serif tracking-widest">天 (천)</span>
              <span className="text-lg font-serif font-bold" style={{ color: '#93c5fd' }}>
                사주
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-primary/60 font-serif tracking-widest">地 (지)</span>
              <span className="text-lg font-serif font-bold" style={{ color: '#6ee7b7' }}>
                환경
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-primary/60 font-serif tracking-widest">人 (인)</span>
              <span className="text-lg font-serif font-bold" style={{ color: '#fca5a5' }}>
                인연
              </span>
            </div>
          </motion.div>
        </div>

        {/* 3. Content Section */}
        <div className="px-4 space-y-5">
          {/* Summary Text */}
          <div className="bg-surface/30 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
            <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep text-center">
              {summary}
            </p>
          </div>

          {/* Lucky Grid (2x2 but wide on mobile) */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Palette, label: '행운의 색', value: lucky.color },
              { icon: Compass, label: '길한 방위', value: lucky.direction },
              { icon: Hash, label: '행운의 숫자', value: lucky.number },
              { icon: Star, label: '핵심 키워드', value: lucky.keyword || '조화' },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-surface/40 rounded-xl p-4 border border-white/5 flex flex-col items-start gap-2 relative overflow-hidden group"
              >
                <div
                  className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity"
                  aria-hidden="true"
                >
                  <Icon className="w-8 h-8" />
                </div>
                <span className="text-[10px] text-ink-light/40 tracking-wide font-bold">{label}</span>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary/70" aria-hidden="true" />
                  <span className="text-sm font-bold text-ink-light leading-tight">{value || '-'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Advice Quote */}
          {lucky.advice && (
            <div className="text-center py-4">
              <p className="text-xs text-ink-light/50 font-serif italic mb-2">오늘의 조언</p>
              <p className="text-sm font-serif text-ink-light/90 leading-relaxed break-keep">
                &ldquo;{lucky.advice}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
