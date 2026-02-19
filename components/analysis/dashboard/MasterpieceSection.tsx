'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/* V7-GLASS-GOLD-BUTTON */
export function MasterpieceSection() {
  const router = useRouter()

  const handleAnalyze = () => {
    router.push('/protected/analysis/cheonjiin')
  }

  return (
    <Card className="relative overflow-hidden min-h-[240px] flex flex-col justify-center border-[#D4AF37]/20 shadow-lg bg-[#181611]/80 backdrop-blur-md">
      {/* Background Texture & Decor */}
      <div className="absolute inset-0 bg-[url('/texture/hanji_pattern.png')] bg-repeat opacity-[0.05] mix-blend-overlay" />

      {/* Subtler Ambient Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-[#D4AF37]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[250px] h-[250px] bg-[#D4AF37]/5 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative z-10 px-8 py-10 flex flex-col justify-between h-full gap-8">
        {/* Top Badge & Title Group */}
        <div className="space-y-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#D4AF37]/30 rounded-full bg-[#D4AF37]/10 backdrop-blur-sm shadow-inner"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F4E4BA]" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold text-[#F4E4BA] tracking-[0.2em] uppercase font-serif">
              The Masterpiece
            </span>
          </motion.div>

          <div className="w-full space-y-4">
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-[2.5rem] font-serif font-medium leading-[1.2] tracking-tight text-white"
              style={{ wordBreak: 'keep-all' }}
            >
              <span className="italic font-serif bg-gradient-to-br from-[#F4E4BA] via-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent mr-2.5 drop-shadow-sm">
                인생
              </span>
              <span>사주풀이</span>
            </motion.h2>
            <p className="text-[16px] text-white/70 font-sans font-light leading-relaxed break-keep w-full max-w-xl">
              사주·관상·풍수·손금을 아우르는{' '}
              <span className="text-white/95 underline underline-offset-4 decoration-[#D4AF37]/50">
                천지인 통합 분석
              </span>
              입니다. 관상과 손금은 변해도{' '}
              <strong className="text-[#F4E4BA] font-medium">태어난 시간</strong>은 절대 변하지
              않기에, 당신을 설명하는 가장 완벽한 해답을 만나보세요.
            </p>
          </div>
        </div>

        {/* Action Area - High Emphasis Gold Button */}
        <div className="w-full pt-1">
          <Button
            onClick={handleAnalyze}
            className={cn(
              'group relative overflow-hidden w-full h-[64px] rounded-xl transition-all duration-500',
              'bg-gradient-to-r from-[#D4AF37] via-[#E2C768] to-[#B8860B]',
              'border border-[#F4E4BA]/30',
              'shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.5)]',
              'active:scale-[0.98]'
            )}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

            <div className="relative z-10 flex items-center justify-center gap-3">
              <span className="text-[17px] font-serif font-bold tracking-widest text-[#0A0A0A] group-hover:text-black transition-colors">
                분석 시작하기
              </span>
              <ArrowRight
                className="w-5 h-5 text-[#0A0A0A] group-hover:translate-x-1 group-hover:text-black transition-all"
                strokeWidth={2}
              />
            </div>
          </Button>
        </div>
      </div>
    </Card>
  )
}
