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
    <Card className="relative overflow-hidden card-glass-manse min-h-[220px] flex flex-col justify-center">
      {/* Background Texture & Decor */}
      <div className="absolute inset-0 bg-[url('/texture/hanji_pattern.png')] bg-repeat opacity-[0.03] mix-blend-overlay" />
      <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Text Content */}
        <div className="space-y-3 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-primary/30 rounded-full w-fit bg-primary/5">
            <Sparkles className="w-3 h-3 text-primary" strokeWidth={1} />
            <span className="text-[10px] font-light text-primary tracking-widest uppercase">
              The Masterpiece
            </span>
          </div>

          <div>
            <h2
              className="text-xl md:text-2xl font-serif font-normal text-white leading-tight mb-1"
              style={{ wordBreak: 'keep-all' }}
            >
              <span className="text-[#D4AF37]">천지인(天地人)</span> 통합 분석
            </h2>
            <p className="text-sm md:text-sm text-white/70 font-sans font-light leading-relaxed text-balance">
              하늘의 명, 땅의 기운, 의지의 조화를 하나의 서사로 엮어낸 시그니처 리포트
            </p>
          </div>
        </div>

        {/* Action Area */}
        <div className="flex-shrink-0">
          <Button
            onClick={handleAnalyze}
            className={cn(
              'w-full md:w-auto bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F4E4BA] h-12 px-6 rounded-lg font-serif text-sm shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all active:scale-[0.98] font-medium'
            )}
          >
            천지인 분석 시작
          </Button>
        </div>
      </div>
    </Card>
  )
}
