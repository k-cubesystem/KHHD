'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/destiny-targets'
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
    <div className="relative w-full overflow-hidden mb-6">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 px-4 pt-6 pb-8 border-b border-white/5">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-5"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary tracking-widest uppercase">
              The Masterpiece Analysis
            </span>
          </div>
        </motion.div>

        {/* Main layout: 모바일 세로, md 가로 */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* Score circle 섹션 */}
          <div className="flex flex-col items-center gap-4 flex-shrink-0">
            {/* Main circle */}
            <div className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border border-dashed border-primary/15 rounded-full"
              />
              <svg
                className="w-full h-full -rotate-90 drop-shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                viewBox="0 0 144 144"
              >
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1.5"
                />
                <motion.circle
                  cx="72"
                  cy="72"
                  r="52"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] text-primary/60 font-serif tracking-widest uppercase">
                  Total
                </span>
                <span className="text-4xl font-serif font-bold text-ink-light leading-none">
                  {score}
                </span>
                <span className="text-[9px] text-primary/60 font-serif tracking-widest">
                  Harmony
                </span>
              </div>
            </div>

            {/* Sub scores - 절대좌표 제거, 자연 흐름으로 */}
            <div className="flex items-center gap-3 md:gap-5 bg-surface/60 backdrop-blur-md px-4 md:px-5 py-2.5 rounded-full border border-white/8 shadow-lg">
              <MiniScoreRing label="天(천)" value={cheonScore} color="#93c5fd" delay={0.8} />
              <div className="w-px h-6 bg-white/10" />
              <MiniScoreRing label="地(지)" value={jiScore} color="#6ee7b7" delay={1.0} />
              <div className="w-px h-6 bg-white/10" />
              <MiniScoreRing label="人(인)" value={inScore} color="#fca5a5" delay={1.2} />
            </div>
          </div>

          {/* 텍스트 + Lucky 섹션 */}
          <div className="flex-1 w-full space-y-3 text-center md:text-left px-2 md:px-0">
            {/* Name & Summary */}
            <div className="space-y-2">
              <h1 className="text-lg md:text-3xl font-serif font-light text-ink-light leading-tight md:leading-snug">
                <span className="block md:inline">{target.name}님의&nbsp;</span>
                <span className="font-medium text-primary whitespace-nowrap">천지인(天地人)</span>
                <span className="hidden md:inline">&nbsp;조화</span>
                <span className="block md:hidden mt-1">조화</span>
              </h1>
              <p className="text-xs md:text-sm text-ink-light/65 font-light leading-relaxed break-keep px-2 md:px-0">
                {summary}
              </p>
            </div>

            {/* Lucky Grid - 모바일 2x2, md 4열 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
              {[
                { icon: Palette, label: 'Lucky Color', value: lucky.color },
                { icon: Compass, label: 'Direction', value: lucky.direction },
                { icon: Hash, label: 'Number', value: lucky.number },
                { icon: Star, label: 'Keyword', value: lucky.keyword || '조화' },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="bg-surface/30 rounded-lg md:rounded-xl p-2 md:p-2.5 border border-white/5 flex flex-col items-center justify-center gap-0.5 md:gap-1 min-h-[56px] md:min-h-[64px]"
                >
                  <Icon className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary/60" />
                  <span className="text-[8px] md:text-[9px] text-ink-light/35 leading-none">
                    {label}
                  </span>
                  <span className="text-[11px] md:text-xs font-medium text-ink-light text-center leading-tight px-1">
                    {value || '-'}
                  </span>
                </div>
              ))}
            </div>

            {/* Advice */}
            {lucky.advice && (
              <div className="relative px-4 py-3 bg-gradient-to-r from-surface/40 to-primary/5 rounded-xl border-l-2 border-primary/30">
                <p className="text-xs md:text-sm font-serif text-ink-light/75 italic leading-relaxed break-keep">
                  &ldquo;{lucky.advice}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
