'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Card } from '@/components/ui/card'
import { BookOpen, User, Compass, Hand, Sparkles, ArrowRight } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/user/destiny'
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
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId || null)
  const [showAnalysisTypeSelection, setShowAnalysisTypeSelection] = useState(false)

  const handleTargetSelect = (id: string) => {
    setSelectedId(id)
    setShowAnalysisTypeSelection(true)
  }

  const handleAnalysisTypeSelect = (type: 'basic' | 'comprehensive') => {
    if (!selectedId) return

    // 두 옵션 모두 천지인종합사주분석 AI로 이동 (전달 데이터만 다름)
    if (type === 'basic') {
      // 해화당사주풀이: 사주 정보만 전달
      router.push(`/protected/analysis/cheonjiin/result?targetId=${selectedId}&type=basic`)
    } else {
      // 천지인종합사주풀이: 풍수, 관상, 손금 포함
      router.push(`/protected/analysis/cheonjiin/result?targetId=${selectedId}&type=comprehensive`)
    }
  }

  const selectedTarget = targets.find((t) => t.id === selectedId)

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

      {/* 3. Target Selection OR Analysis Type Selection */}
      {!showAnalysisTypeSelection ? (
        <motion.section variants={fadeInUp} className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-primary/40 rounded-full" />
            <h3 className="text-lg font-serif text-ink-light">누구의 운명을 보시겠습니까?</h3>
          </div>

          {targets.length > 0 ? (
            <div className="flex flex-col gap-3">
              {targets.map((target) => (
                <motion.div key={target.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Card
                    onClick={() => handleTargetSelect(target.id)}
                    className="bg-surface/20 border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group px-4 py-3 flex items-center justify-between min-h-[72px]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-base font-serif text-primary/80 group-hover:text-primary transition-colors flex-shrink-0">
                        {target.name.slice(0, 1)}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-serif text-ink-light group-hover:text-primary transition-colors font-medium">
                          {target.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-ink-light/40 font-light">
                          <span>{target.relation_type}</span>
                          <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                          <span>{target.birth_date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all ml-4 flex-shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-ink-light/30 group-hover:text-[#0A0A0A] transition-colors" />
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
      ) : (
        <motion.section variants={fadeInUp} className="space-y-6">
          {/* Selected Target Info */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowAnalysisTypeSelection(false)}
              className="text-ink-light/60 hover:text-primary transition-colors"
            >
              ← 뒤로
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-base font-serif text-primary">
                {selectedTarget?.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-lg font-serif text-ink-light">{selectedTarget?.name}</h3>
                <p className="text-xs text-ink-light/40">{selectedTarget?.birth_date}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-primary/40 rounded-full" />
            <h3 className="text-lg font-serif text-ink-light">분석 방식을 선택해주세요</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 해화당사주풀이 */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Card
                onClick={() => handleAnalysisTypeSelect('basic')}
                className="bg-surface/20 border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a0505] border border-primary/30 flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors">
                    <BookOpen className="w-6 h-6 text-primary" strokeWidth={1} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-serif text-ink-light group-hover:text-primary transition-colors mb-2">
                      해화당 사주풀이
                    </h4>
                    <p className="text-sm text-ink-light/60 font-light mb-3 break-keep">
                      사주 만세력 정보를 바탕으로 타고난 운명과 성격을 분석합니다
                    </p>
                    <div className="flex items-center gap-2 text-xs text-primary/70">
                      <span>✓ 사주 팔자 분석</span>
                      <span>•</span>
                      <span>✓ 오행 균형</span>
                      <span>•</span>
                      <span>✓ 대운 흐름</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-light/30 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </Card>
            </motion.div>

            {/* 천지인종합사주풀이 */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Card
                onClick={() => handleAnalysisTypeSelect('comprehensive')}
                className="bg-surface/20 border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group p-6 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-primary/20 text-primary text-[10px] font-medium rounded-full border border-primary/30">
                    종합분석
                  </span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/40 flex items-center justify-center flex-shrink-0 group-hover:border-primary group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                    <Sparkles className="w-6 h-6 text-primary" strokeWidth={1} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-serif text-ink-light group-hover:text-primary transition-colors mb-2">
                      천지인 종합 사주풀이
                    </h4>
                    <p className="text-sm text-ink-light/60 font-light mb-3 break-keep">
                      사주·풍수·관상·손금을 종합적으로 분석하여 입체적인 운명을 풀이합니다
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-primary/70">
                      <span>✓ 사주 만세력</span>
                      <span>✓ 풍수 (주소 분석)</span>
                      <span>✓ 관상 (얼굴)</span>
                      <span>✓ 손금 (손 모양)</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-light/30 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.section>
      )}
    </motion.div>
  )
}
