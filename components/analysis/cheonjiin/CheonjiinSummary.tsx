'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { Sparkles, Compass, Palette, Hash, Star } from 'lucide-react'

interface CheonjiinSummaryProps {
  data: any
  target: DestinyTarget
}

function MiniScoreRing({
  label,
  value,
  color,
  delay,
}: {
  label: string
  value: number
  color: string
  delay: number
}) {
  const r = 18
  const circ = 2 * Math.PI * r
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-1"
    >
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
          <motion.circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (circ * value) / 100 }}
            transition={{ duration: 1.4, delay: delay + 0.3, ease: 'easeOut' }}
          />
        </svg>
        <span className="text-[11px] font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-ink-light/40 font-serif tracking-wide">{label}</span>
    </motion.div>
  )
}

export function CheonjiinSummary({ data, target }: CheonjiinSummaryProps) {
  if (!data) return null

  const score = data.score || 85
  const summary = data.summary || '천지인의 기운이 조화롭게 흐르는 시기입니다.'
  const lucky = data.lucky || {}

  const cheonScore = data.cheonScore || Math.min(100, score + 5)
  const jiScore = data.jiScore || Math.max(60, score - 5)
  const inScore = data.inScore || score

  const circ = 2 * Math.PI * 52

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
            <span className="font-bold text-primary text-3xl">천지인(天地人)</span> 조화
          </h1>
        </div>

        {/* 2. Score Section (Centerpiece) */}
        <div className="relative flex flex-col items-center justify-center mb-8">
          {/* Main Score Circle */}
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border border-dashed border-primary/10 rounded-full"
            />

            {/* SVG Ring */}
            <svg
              className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(236,182,19,0.2)]"
              viewBox="0 0 144 144"
            >
              <circle
                cx="72"
                cy="72"
                r="52"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1.5"
              />
              <motion.circle
                cx="72"
                cy="72"
                r="52"
                fill="none"
                stroke="#ECB613" // Primary Color
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-primary/60 font-serif tracking-[0.2em] uppercase mb-1">
                Total Integrity
              </span>
              <span className="text-5xl font-serif font-bold text-ink-light leading-none tracking-tighter shadow-black">
                {score}
              </span>
              <span className="text-[10px] text-primary/60 font-serif tracking-widest mt-1">
                Point
              </span>
            </div>
          </div>

          {/* Sub Scores (Pill Design) */}
          <div className="flex items-center gap-6 bg-surface/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5 shadow-xl">
            <MiniScoreRing label="天 (천)" value={cheonScore} color="#93c5fd" delay={0.2} />
            <div className="w-px h-8 bg-white/10" />
            <MiniScoreRing label="地 (지)" value={jiScore} color="#6ee7b7" delay={0.3} />
            <div className="w-px h-8 bg-white/10" />
            <MiniScoreRing label="人 (인)" value={inScore} color="#fca5a5" delay={0.4} />
          </div>
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
              { icon: Palette, label: 'Lucky Color', value: lucky.color },
              { icon: Compass, label: 'Direction', value: lucky.direction },
              { icon: Hash, label: 'Lucky Number', value: lucky.number },
              { icon: Star, label: 'Keyword', value: lucky.keyword || '조화' },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-surface/40 rounded-xl p-4 border border-white/5 flex flex-col items-start gap-2 relative overflow-hidden group"
              >
                <div className="absolute right-2 top-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon className="w-8 h-8" />
                </div>
                <span className="text-[10px] text-ink-light/40 uppercase tracking-wide font-bold">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary/70" />
                  <span className="text-sm font-bold text-ink-light leading-tight">
                    {value || '-'}
                  </span>
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
