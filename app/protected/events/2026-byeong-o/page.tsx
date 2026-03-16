'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Flame, Sparkles, TrendingUp, Heart, Wallet, MoveRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ByeongOYearEventPage() {
  return (
    <div className="min-h-screen bg-charcoal-deep text-white overflow-x-hidden pb-24 relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 center w-full h-[500px] bg-gradient-to-b from-[#E53935]/20 to-transparent blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="px-3 pt-12 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E53935]/20 border border-[#E53935]/40 mb-4"
        >
          <Flame className="w-3 h-3 text-[#E53935]" />
          <span className="text-[10px] font-bold text-[#FF5252] tracking-widest uppercase">
            2026 SPECIAL EVENT
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-[#FFF8E1] mb-2 drop-shadow-md"
        >
          병오년(丙午年)
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-light text-white/80"
        >
          붉은 말의 해, 당신의 질주가 시작됩니다
        </motion.p>
      </header>

      {/* Main Content */}
      <main className="px-3 mt-12 space-y-16 relative z-10 max-w-md mx-auto">
        {/* Intro Section with Moving Horse Concept */}
        <section className="relative h-64 flex items-center justify-center">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 50, delay: 0.6 }}
            className="w-full text-center"
          >
            {/* Placeholder for Horse Animation / Image */}
            <div className="w-48 h-48 mx-auto bg-gradient-to-tr from-[#E53935] to-gold-500 rounded-full blur-3xl opacity-40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10">
              <span className="text-9xl">🐎</span>
            </div>
          </motion.div>
        </section>

        {/* Saju Matching Section */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-serif text-gold-500">당신과 병오년의 궁합</h2>
            <p className="text-sm text-white/60 font-light">
              뜨거운 불의 기운(丙午)이 당신에게 미칠 영향은?
            </p>
          </div>

          <div className="bg-white/5 border border-[#E53935]/30 rounded-2xl p-6 relative overflow-hidden group hover:border-[#E53935]/60 transition-colors">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E53935] via-gold-500 to-[#E53935]" />

            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <span className="block text-xs text-white/40 mb-1">나 (User)</span>
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-2xl">
                  👤
                </div>
              </div>
              <div className="flex-1 px-4 text-center">
                <MoveRight className="w-6 h-6 text-[#E53935] mx-auto opacity-50" />
              </div>
              <div className="text-center">
                <span className="block text-xs text-white/40 mb-1">2026 병오년</span>
                <div className="w-12 h-12 rounded-full bg-[#E53935]/20 border border-[#E53935]/40 flex items-center justify-center mx-auto text-2xl">
                  🔥
                </div>
              </div>
            </div>

            <div className="space-y-4 text-center">
              <h3 className="text-lg font-bold text-white">
                <span className="text-[#E53935]">&quot;폭발적인 성장&quot;</span>의 기운
              </h3>
              <p className="text-sm text-white/70 leading-relaxed font-light">
                당신의 사주에 부족했던 <span className="text-[#E53935] font-medium">화(火)</span>{' '}
                기운이 병오년에 채워지면서, 그동안 정체되었던 일들이 불처럼 일어날 것입니다.
              </p>
            </div>
          </div>
        </section>

        {/* Keywords Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-serif text-white/90 px-2">🔑 2026년 핵심 키워드</h2>
          <div className="grid grid-cols-2 gap-3">
            <KeywordCard
              icon={TrendingUp}
              label="이직/승진"
              color="text-blue-400"
              bg="bg-blue-400/10"
            />
            <KeywordCard
              icon={Wallet}
              label="재물 급상승"
              color="text-gold-500"
              bg="bg-gold-500/10"
            />
            <KeywordCard
              icon={Heart}
              label="열정적 사랑"
              color="text-[#E53935]"
              bg="bg-[#E53935]/10"
            />
            <KeywordCard
              icon={Sparkles}
              label="새로운 도전"
              color="text-purple-400"
              bg="bg-purple-400/10"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="pt-8">
          <Button
            asChild
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#E53935] to-[#B71C1C] hover:from-[#FF5252] hover:to-[#D32F2F] text-white border-0 shadow-lg shadow-[#E53935]/30"
          >
            <Link href="/protected/analysis/new-year">
              2026년 상세 운세 확인하기 <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </Button>
          <p className="text-center text-xs text-white/40 mt-4 font-light">
            * 상세 운세 확인 시 1 크레딧이 소모됩니다.
          </p>
        </section>
      </main>
    </div>
  )
}

function KeywordCard({
  icon: Icon,
  label,
  color,
  bg,
}: {
  icon: any
  label: string
  color: string
  bg: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 ${bg} backdrop-blur-sm`}
    >
      <Icon className={`w-6 h-6 mb-2 ${color}`} />
      <span className="text-sm font-medium text-white/90">{label}</span>
    </div>
  )
}
