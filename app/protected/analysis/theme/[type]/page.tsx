'use client'

import { use } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Wallet,
  Heart,
  Building2,
  GraduationCap,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { fadeInUp, staggerContainer } from '@/lib/animations'

const THEME_CONFIG: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  wealth: {
    label: '재물운',
    icon: Wallet,
    color: 'text-yellow-400',
    desc: '당신의 재물 흐름과 투자 적기를 분석합니다.',
  },
  love: {
    label: '애정운',
    icon: Heart,
    color: 'text-pink-400',
    desc: '사랑의 기운과 인연의 시기를 알아봅니다.',
  },
  career: {
    label: '직장운',
    icon: Building2,
    color: 'text-blue-400',
    desc: '승진, 이직, 그리고 커리어의 확장을 위한 조언.',
  },
  exam: {
    label: '학업운',
    icon: GraduationCap,
    color: 'text-green-400',
    desc: '합격의 기운과 학업 성취를 위한 전략.',
  },
  estate: {
    label: '부동산운',
    icon: TrendingUp,
    color: 'text-purple-400',
    desc: '이사, 매매, 부동산 투자의 길흉을 살핍니다.',
  },
}

export default function ThemeAnalysisPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const config = THEME_CONFIG[type as string] || THEME_CONFIG.wealth // Default to wealth if not found
  const Icon = config.icon

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-20">
      {/* Background Texture */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      {/* Header */}
      <header className="relative z-10 p-4 flex items-center gap-4 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0">
        <Link href="/protected/analysis">
          <Button variant="ghost" size="icon" className="hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-ink-light" />
          </Button>
        </Link>
        <span className="text-sm font-serif text-ink-light/80">테마별 상세 분석</span>
      </header>

      <main className="relative z-10 max-w-md mx-auto p-6 space-y-8">
        {/* Intro */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          className="text-center space-y-3"
        >
          <div
            className={`w-16 h-16 mx-auto rounded-full bg-surface/50 border border-white/10 flex items-center justify-center mb-4`}
          >
            <Icon className={`w-8 h-8 ${config.color}`} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-serif text-ink-light">
            <span className={config.color}>{config.label}</span> 심층 분석
          </h1>
          <p className="text-sm text-ink-light/60 font-light leading-relaxed">{config.desc}</p>
        </motion.div>

        {/* Mock Analysis Card */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          <motion.div variants={fadeInUp}>
            <Card className="bg-surface/20 border-primary/20 card-glass-manse">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">
                    CURRENT STATUS
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-ink-light/70">현재 기운 지수</span>
                    <span className="text-3xl font-serif text-ink-light">
                      85<span className="text-sm text-ink-light/40 ml-1">점</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full ${config.color.replace('text-', 'bg-')}`}
                    />
                  </div>
                </div>
                <p className="text-sm font-light text-ink-light/80 leading-relaxed pt-2 border-t border-white/5">
                  현재 {config.label}의 기운이 매우 좋습니다. 적극적으로 기회를 탐색할 시기입니다.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Advice Placeholder */}
          <motion.div variants={fadeInUp}>
            <Card className="bg-surface/20 border-white/5 card-glass-manse">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-ink-light">AI 정밀 상담</h3>
                  <p className="text-xs text-ink-light/50">궁금한 점을 AI 무당에게 물어보세요</p>
                </div>
                <Link href="/protected/ai-shaman">
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
