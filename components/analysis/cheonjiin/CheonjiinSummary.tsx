'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { Sparkles, Star, Compass, Palette, Hash, Quote } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface CheonjiinSummaryProps {
  data: any
  target: DestinyTarget
}

function ScoreItem({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <motion.circle
            cx="24" cy="24" r="22" fill="none" stroke="#D4AF37" strokeWidth="2"
            strokeDasharray={138}
            strokeDashoffset={138 - (138 * value) / 100}
            initial={{ strokeDashoffset: 138 }}
            animate={{ strokeDashoffset: 138 - (138 * value) / 100 }}
            transition={{ duration: 1.5, delay: delay + 0.5 }}
          />
        </svg>
        <span className="text-xs font-bold text-primary">{value}</span>
      </div>
      <span className="text-[10px] text-ink-light/50 font-serif">{label}</span>
    </motion.div>
  )
}

export function CheonjiinSummary({ data, target }: CheonjiinSummaryProps) {
  if (!data) return null

  // Default values or extracted from data
  const score = data.score || 85
  const summary = data.summary || '천지인의 기운이 조화롭게 흐르는 시기입니다.'
  const lucky = data.lucky || {}

  // Fake sub-scores if not present, for visualization balance
  const cheonScore = data.cheonScore || Math.min(100, score + 5)
  const jiScore = data.jiScore || Math.max(60, score - 5)
  const inScore = data.inScore || score

  return (
    <div className="relative w-full overflow-hidden mb-8">
      {/* Premium Background Card */}
      <Card className="relative overflow-hidden border-none text-ink-light bg-[#0A0A0A]">
        {/* Texture & Glow */}
        <div className="absolute inset-0 bg-[url('/texture/hanji_pattern.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-10">

          {/* Left: Main Score & Triad */}
          <div className="flex-shrink-0 relative">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Outer Decorative Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-dashed border-primary/20 rounded-full opacity-50"
              />

              {/* Main Score Circle */}
              <svg className="w-full h-full -rotate-90 transform drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <motion.circle
                  cx="96" cy="96" r="80" fill="none" stroke="#D4AF37" strokeWidth="4"
                  strokeDasharray={502}
                  strokeDashoffset={502}
                  animate={{ strokeDashoffset: 502 - (502 * score) / 100 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </svg>

              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-primary/70 font-serif tracking-widest uppercase mb-1">Total Harmony</span>
                <span className="text-5xl font-serif font-bold text-ink-light tracking-tighter shadow-black drop-shadow-lg">{score}</span>
              </div>
            </div>

            {/* Sub Scores (Triad) */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#0A0A0A]/80 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-xl">
              <ScoreItem label="天(천)" value={cheonScore} delay={1} />
              <div className="w-px h-8 bg-white/10" />
              <ScoreItem label="地(지)" value={jiScore} delay={1.2} />
              <div className="w-px h-8 bg-white/10" />
              <ScoreItem label="人(인)" value={inScore} delay={1.4} />
            </div>
          </div>

          {/* Right: Text Content */}
          <div className="flex-1 text-center md:text-left space-y-6 pt-8 md:pt-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-3">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-medium text-primary tracking-widest uppercase">The Masterpiece Analysis</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-serif font-light text-ink-light leading-tight mb-4">
                {target.name}님의 <span className="font-medium text-primary">천지인(天地人)</span> 조화
              </h1>
              <p className="text-sm md:text-base text-ink-light/70 font-light leading-relaxed break-keep">
                {summary}
              </p>
            </div>

            {/* Lucky Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface/30 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center gap-1">
                <Palette className="w-4 h-4 text-primary/70" />
                <span className="text-[10px] text-ink-light/40">Lucky Color</span>
                <span className="text-sm font-medium text-ink-light">{lucky.color || '-'}</span>
              </div>
              <div className="bg-surface/30 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center gap-1">
                <Compass className="w-4 h-4 text-primary/70" />
                <span className="text-[10px] text-ink-light/40">Direction</span>
                <span className="text-sm font-medium text-ink-light">{lucky.direction || '-'}</span>
              </div>
              <div className="bg-surface/30 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center gap-1">
                <Hash className="w-4 h-4 text-primary/70" />
                <span className="text-[10px] text-ink-light/40">Number</span>
                <span className="text-sm font-medium text-ink-light">{lucky.number || '-'}</span>
              </div>
              <div className="bg-surface/30 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center gap-1 col-span-2 md:col-span-1">
                <Star className="w-4 h-4 text-primary/70" />
                <span className="text-[10px] text-ink-light/40">Keyword</span>
                <span className="text-sm font-medium text-ink-light truncate w-full text-center px-1">{lucky.keyword || '조화'}</span>
              </div>
            </div>

            {/* Advice Quote */}
            <div className="relative p-6 bg-gradient-to-r from-surface/50 to-primary/5 rounded-xl border-l-2 border-primary/30">
              <Quote className="absolute top-4 left-4 w-4 h-4 text-primary/20 rotate-180" />
              <p className="text-sm font-serif font-light text-ink-light/80 italic text-center md:text-left pl-4">
                &quot;{lucky.advice || '운명의 흐름을 타고 진정한 나를 마주하세요.'}&quot;
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
