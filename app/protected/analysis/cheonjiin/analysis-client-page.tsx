'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Card } from '@/components/ui/card'
import { BookOpen, User, Compass, Hand, Sparkles, ArrowRight } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { useRouter } from 'next/navigation'

interface AnalysisClientPageProps {
  targets: DestinyTarget[]
  initialTargetId?: string
}

function TriadVisual() {
  return (
    <div className="relative w-64 h-64 mx-auto my-6">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-primary/5 blur-[50px] rounded-full animate-pulse" />

      {/* Rotating Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 border border-dashed border-primary/20 rounded-full"
      />

      {/* Triangle Concept */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full h-full"
        >
          {/* Top: Heaven */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#1a0505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-primary text-base">天</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-ink-light font-bold block">사주</span>
              <span className="text-[9px] text-ink-light/50 block">타고난 운명</span>
            </div>
          </div>

          {/* Bottom Left: Earth */}
          <div className="absolute bottom-8 left-6 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#1a0505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-primary text-base">地</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-ink-light font-bold block">풍수</span>
              <span className="text-[9px] text-ink-light/50 block">공간의 기운</span>
            </div>
          </div>

          {/* Bottom Right: Human */}
          <div className="absolute bottom-8 right-6 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#1a0505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-primary text-base">人</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-ink-light font-bold block">관상</span>
              <span className="text-[9px] text-ink-light/50 block">삶의 의지</span>
            </div>
          </div>

          {/* Connecting Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: -1 }}
          >
            <motion.path
              d="M128 60 L60 180 L196 180 Z"
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.5 }}
            />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'rgba(212,175,55,0.1)', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: 'rgba(212,175,55,0.5)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgba(212,175,55,0.1)', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Core */}
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary/10 rounded-full blur-xl animate-pulse" />
        </motion.div>
      </div>
    </div>
  )
}

export function AnalysisClientPage({ targets, initialTargetId }: AnalysisClientPageProps) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId || null)

  const handleStartAnalysis = (id: string) => {
    // 천지인 분석 시작 - 추후 분석 페이지로 이동
    router.push(`/protected/analysis/cheonjiin/result?targetId=${id}`)
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-3xl mx-auto py-6 px-4 pb-20 overflow-x-hidden"
    >
      {/* 1. Header Area with Visual */}
      <motion.section variants={fadeInUp} className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-primary/10 border border-primary/20 rounded-full mb-2">
          <Sparkles className="w-3 h-3 text-primary" strokeWidth={1} />
          <span className="text-[9px] font-medium text-primary tracking-[0.2em] uppercase">
            The Masterpiece
          </span>
        </div>

        <h1 className="text-xl md:text-3xl font-serif font-medium text-ink-light tracking-tight">
          천지인(天地人) 통합 운명 분석
        </h1>

        <p className="text-xs text-ink-light/60 font-light max-w-sm mx-auto leading-normal break-keep">
          하늘의 시기(天), 땅의 기운(地), 사람의 흔적(人).
          <br />세 가지 차원을 통해 당신의 운명을 비춥니다.
        </p>

        <TriadVisual />
      </motion.section>

      {/* 2. Three Pillars Explanation (Consolidated Card) */}
      <motion.section variants={fadeInUp} className="mb-10 text-center md:text-left">
        <Card className="bg-surface/30 border border-white/5 p-4 rounded-xl">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10">
            {[
              { icon: BookOpen, title: '천(天): 사주', desc: '하늘의 섭리와 설계도' },
              { icon: Compass, title: '지(地): 풍수', desc: '공간과 환경의 에너지' },
              { icon: Hand, title: '인(人): 관상', desc: '삶의 궤적과 의지' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex-1 flex items-center md:flex-col md:items-center md:text-center gap-4 p-3 hover:bg-surface/50 transition-colors"
              >
                <div className="w-8 h-8 flex-shrink-0 bg-[#1a0505] border border-primary/20 rounded-full flex items-center justify-center">
                  <item.icon className="w-3.5 h-3.5 text-primary opacity-70" strokeWidth={1} />
                </div>
                <div className="flex flex-col md:gap-1 text-left md:text-center">
                  <h3 className="text-sm font-serif text-ink-light font-medium">{item.title}</h3>
                  <p className="text-xs text-ink-light/50">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.section>

      {/* 3. Target Selection */}
      <motion.section variants={fadeInUp} className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-primary/40 rounded-full" />
          <h3 className="text-lg font-serif text-ink-light">누구의 운명을 보시겠습니까?</h3>
        </div>

        {targets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {targets.map((target) => (
              <motion.div key={target.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Card
                  onClick={() => handleStartAnalysis(target.id)}
                  className="bg-surface/20 border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-lg font-serif text-primary/80 group-hover:text-primary transition-colors">
                      {target.name.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-base font-serif text-ink-light group-hover:text-primary transition-colors">
                        {target.name}
                      </h4>
                      <p className="text-xs text-ink-light/40 font-light">
                        {target.relation_type} • {target.birth_date}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                    <ArrowRight className="w-4 h-4 text-ink-light/30 group-hover:text-[#0A0A0A] transition-colors" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card
            onClick={() => router.push('/protected/family')}
            className="bg-surface/10 border-dashed border-primary/20 p-8 text-center cursor-pointer hover:bg-surface/20 transition-colors group"
          >
            <div className="flex flex-col items-center gap-3">
              <User className="w-8 h-8 text-ink-light/20 group-hover:text-primary/60 transition-colors" />
              <div className="space-y-1">
                <p className="text-sm text-ink-light/60 font-medium group-hover:text-primary transition-colors">
                  등록된 분석 대상이 없습니다
                </p>
                <p className="text-xs text-ink-light/40 group-hover:text-primary/70 transition-colors">
                  가족 관리에서 대상을 추가해주세요 <ArrowRight className="w-3 h-3 inline ml-1" />
                </p>
              </div>
            </div>
          </Card>
        )}
      </motion.section>
    </motion.div>
  )
}
