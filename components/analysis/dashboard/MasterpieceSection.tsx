'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/* V4-LUXURY-PREMIUM-STABLE */
export function MasterpieceSection() {
  const router = useRouter()

  const handleAnalyze = () => {
    router.push('/protected/analysis/cheonjiin')
  }

  return (
    <Card className="relative overflow-hidden card-glass-manse min-h-[220px] flex flex-col justify-center border-[#D4AF37]/10">
      {/* Background Texture & Decor */}
      <div className="absolute inset-0 bg-[url('/texture/hanji_pattern.png')] bg-repeat opacity-[0.03] mix-blend-overlay" />
      <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 px-8 py-10 flex flex-col justify-between h-full gap-10">
        {/* Text Content */}
        <div className="space-y-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-primary/20 rounded-full bg-primary/5 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary/80" strokeWidth={1.5} />
            <span className="text-[10px] font-medium text-primary/90 tracking-[0.3em] uppercase">
              The Masterpiece
            </span>
          </motion.div>

          <div className="w-full space-y-5">
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-serif font-bold leading-[1.2] tracking-tight"
              style={{ wordBreak: 'keep-all' }}
            >
              <span className="bg-gradient-to-b from-[#F4E4BA] via-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent italic mr-2">
                인생
              </span>
              <span className="text-white">사주풀이</span>
            </motion.h2>
            <p className="text-base md:text-lg text-white/70 font-sans font-light leading-relaxed break-keep w-full max-w-2xl">
              사주·관상·풍수·손금을 아우르는{' '}
              <span className="text-white/90 underline underline-offset-4 decoration-primary/30">
                천지인 통합 분석
              </span>
              입니다. 관상과 손금은 변해도{' '}
              <strong className="text-primary/90 font-medium">
                태어난 시간(사주)은 절대 변하지 않기에
              </strong>
              , 나를 설명하는 가장 완벽한 해답을 만나보세요.
            </p>
          </div>
        </div>

        {/* Action Area - Premium Button */}
        <div className="w-full">
          <Button
            onClick={handleAnalyze}
            className={cn(
              'group relative overflow-hidden w-full h-16 rounded-2xl transition-all duration-500',
              'bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border border-[#D4AF37]/30',
              'hover:border-[#D4AF37] hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]',
              'active:scale-[0.98]'
            )}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/0 via-[#D4AF37]/5 to-[#D4AF37]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-lg font-serif font-medium tracking-wider text-[#D4AF37] group-hover:text-[#F4E4BA] transition-colors">
                분석 시작하기
              </span>
              <ArrowRight className="w-5 h-5 text-[#D4AF37] group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Subtle Shine Reflection */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
