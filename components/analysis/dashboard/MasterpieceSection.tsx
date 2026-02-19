/* V10-EMOTIONAL-PREMIUM */
'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function MasterpieceSection() {
  const router = useRouter()

  const handleAnalyze = () => {
    router.push('/protected/analysis/cheonjiin')
  }

  return (
    <div className="w-full max-w-[480px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-gradient-to-b from-[#0C0A07] via-[#131109] to-[#0C0A07]',
          'border border-[#D4AF37]/15',
          'shadow-[0_8px_48px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(212,175,55,0.08)]'
        )}
      >
        {/* Watermark 命 character */}
        <div
          aria-hidden="true"
          className="absolute right-[-0.5rem] top-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            fontSize: '22rem',
            lineHeight: 1,
            opacity: 0.03,
            color: '#D4AF37',
            fontFamily: 'serif',
            fontWeight: 700,
            letterSpacing: '-0.05em',
          }}
        >
          命
        </div>

        {/* Ambient glow — top right */}
        <div
          aria-hidden="true"
          className="absolute top-[-30%] right-[-15%] w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Ambient glow — bottom left */}
        <div
          aria-hidden="true"
          className="absolute bottom-[-20%] left-[-10%] w-[260px] h-[260px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Ambient glow — center subtle */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(244,228,186,0.05) 0%, transparent 100%)',
          }}
        />

        {/* Hanji texture overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-7 py-9 flex flex-col gap-7">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/08"
            style={{ background: 'rgba(212,175,55,0.08)' }}
          >
            <Sparkles className="w-3 h-3 text-[#F4E4BA]" strokeWidth={1.5} />
            <span
              className="text-[9px] font-semibold tracking-[0.28em] text-[#F4E4BA]/90"
              style={{ fontVariant: 'small-caps', textTransform: 'uppercase' }}
            >
              The Masterpiece
            </span>
          </motion.div>

          {/* Headline group */}
          <div className="space-y-3">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl font-serif font-medium leading-[1.35] text-white tracking-tight"
              style={{ wordBreak: 'keep-all' }}
            >
              지금 이 순간도 <br />
              <span className="bg-gradient-to-r from-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                당신의 대운
              </span>
              은 <br />
              흐르고 있습니다
            </motion.h2>

            {/* Accent quote */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-[11px] italic text-[#D4AF37]/55 tracking-wide font-serif"
            >
              &ldquo;태어난 시간은 절대 거짓말하지 않는다&rdquo;
            </motion.p>
          </div>

          {/* Gold divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

          {/* Sub copy */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="text-[13.5px] leading-[1.7] text-white/55 font-light tracking-wide"
            style={{ wordBreak: 'keep-all' }}
          >
            사주·관상·풍수·손금.{' '}
            <span className="text-white/75">네 가지 진실이 하나의 운명을 그립니다.</span>
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.975 }}
            whileHover={{ scale: 1.015 }}
          >
            <Button
              onClick={handleAnalyze}
              className={cn(
                'group relative overflow-hidden w-full h-14 rounded-xl',
                'bg-gradient-to-r from-[#C9A227] via-[#E2C96A] to-[#B8860B]',
                'hover:from-[#D4AF37] hover:via-[#F0D97A] hover:to-[#C9A227]',
                'border border-[#F4E4BA]/20',
                'shadow-[0_4px_24px_rgba(212,175,55,0.28)] hover:shadow-[0_6px_36px_rgba(212,175,55,0.46)]',
                'transition-all duration-400',
                'text-[#0C0A07]'
              )}
            >
              {/* Shimmer sweep */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
                style={{
                  background:
                    'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)',
                }}
              />

              <span className="relative z-10 flex items-center justify-center gap-2.5">
                <span className="text-[15px] font-serif font-bold tracking-[0.12em] text-[#0C0A07]">
                  나의 운명 풀어보기
                </span>
                <ArrowRight
                  className="w-4 h-4 text-[#0C0A07] group-hover:translate-x-0.5 transition-transform duration-300"
                  strokeWidth={2.5}
                />
              </span>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
