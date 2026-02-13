'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarRange,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Wallet,
  Heart,
  Activity,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'
import type { FortuneResult } from '@/app/actions/fortune-analysis-action'

const AREA_ICONS = {
  재물운: Wallet,
  애정운: Heart,
  건강운: Activity,
  직업운: Briefcase,
}

const AREA_COLORS = {
  재물운: 'text-yellow-400',
  애정운: 'text-pink-400',
  건강운: 'text-green-400',
  직업운: 'text-blue-400',
}

interface Props {
  data: FortuneResult | null
  cached?: boolean
}

export function MonthlyFortuneClient({ data, cached }: Props) {
  const now = new Date()
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      {/* Header */}
      <header className="px-3 pt-12 pb-6">
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-ink-light/60 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1} />
          <span className="text-sm font-light">돌아가기</span>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-6 h-6 text-primary" strokeWidth={1} />
          <h1 className="text-2xl font-serif font-light text-ink-light">월간 운세</h1>
        </div>
        <BrandQuote variant="section" className="mb-3">
          {BRAND_QUOTES.fortune.monthly}
        </BrandQuote>
        <p className="text-sm text-ink-light/60 font-light">
          {monthLabel}
          {cached && <span className="ml-2 text-xs text-primary/60">(캐시됨)</span>}
        </p>
      </header>

      {/* 사주 정보 없음 */}
      {!data && (
        <section className="px-3">
          <Card className="bg-surface/30 border-primary/20">
            <CardContent className="p-12 text-center space-y-3">
              <CalendarRange className="w-12 h-12 text-primary/50 mx-auto" strokeWidth={1} />
              <h3 className="text-lg font-serif font-light text-ink-light">
                사주 정보가 필요합니다
              </h3>
              <p className="text-sm text-ink-light/60 font-light">
                프로필에서 생년월일을 먼저 입력해주세요.
              </p>
              <Link
                href="/protected/profile/edit"
                className="inline-block mt-2 text-sm text-primary underline underline-offset-2"
              >
                프로필 설정하기
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {data && (
        <div className="px-3 space-y-4">
          {/* 종합 점수 + 요약 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-surface/30 border-primary/20">
              <CardContent className="p-6 text-center space-y-3">
                <div className="relative inline-block">
                  <svg width="100" height="100" className="mx-auto -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - data.score / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-light text-primary">{data.score}</span>
                    <span className="text-[10px] text-ink-light/40 font-light">점</span>
                  </div>
                </div>
                <div>
                  <p className="text-base font-serif font-light text-ink-light">{data.summary}</p>
                  <p className="text-xs text-ink-light/50 font-light mt-1">{data.period}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 이달의 흐름 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" strokeWidth={1} />
                  <h3 className="text-sm font-serif font-light text-primary">이달의 흐름</h3>
                </div>
                <p className="text-sm text-ink-light/80 font-light leading-relaxed">
                  {data.overall}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* 영역별 운세 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xs font-light text-ink-light/50 uppercase tracking-widest mb-3">
              영역별 분석
            </h3>
            <div className="space-y-3">
              {data.areas.map((area, idx) => {
                const Icon = AREA_ICONS[area.name as keyof typeof AREA_ICONS] ?? Sparkles
                const color = AREA_COLORS[area.name as keyof typeof AREA_COLORS] ?? 'text-primary'
                return (
                  <motion.div
                    key={area.name}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.08 }}
                  >
                    <Card className="bg-surface/20 border-white/5">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${color}`} strokeWidth={1} />
                          <span className="text-sm font-serif font-light text-ink-light">
                            {area.name}
                          </span>
                          <span className={`ml-auto text-sm font-light ${color}`}>
                            {area.score}점
                          </span>
                        </div>
                        {/* 점수 바 */}
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${area.score}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + idx * 0.08 }}
                            className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
                          />
                        </div>
                        <p className="text-xs text-ink-light/60 font-light leading-relaxed">
                          {area.content}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* 행운 키워드 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-surface/20 border-white/5">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-xs font-light text-ink-light/50 uppercase tracking-widest">
                  이달의 행운 키워드
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 font-light">
                    행운의 색 {data.lucky.color}
                  </Badge>
                  <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/20 font-light">
                    길한 방향 {data.lucky.direction}
                  </Badge>
                  <Badge className="bg-purple-400/10 text-purple-400 border-purple-400/20 font-light">
                    행운의 숫자 {data.lucky.number}
                  </Badge>
                </div>
                {data.lucky.advice && (
                  <p className="text-xs text-ink-light/60 font-light italic leading-relaxed">
                    &quot;{data.lucky.advice}&quot;
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* 주의사항 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-yellow-400/5 border-yellow-400/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle
                  className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5"
                  strokeWidth={1}
                />
                <p className="text-xs text-ink-light/70 font-light leading-relaxed">
                  {data.caution}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  )
}
