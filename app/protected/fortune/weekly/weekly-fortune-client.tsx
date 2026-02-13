'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'

const DAYS_KR = ['월', '화', '수', '목', '금', '토', '일']

interface DayFortune {
  date: string
  dayOfWeek: number
  score: number
  summary: string
  keyword: string
  advice: string
  areaLabel?: string
}

interface WeeklyFortuneData {
  weekStart: string
  weekEnd: string
  overallScore: number
  summary?: string
  overall?: string
  caution?: string
  lucky?: { color: string; direction: string; number: number; advice?: string }
  days: DayFortune[]
  cached?: boolean
}

export function WeeklyFortuneClient({ data }: { data: WeeklyFortuneData | null }) {
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1

  const getTrendIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-400" strokeWidth={1} />
    if (score >= 50) return <Minus className="w-4 h-4 text-yellow-400" strokeWidth={1} />
    return <TrendingDown className="w-4 h-4 text-red-400" strokeWidth={1} />
  }

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-ink-light/60 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1} />
          <span className="text-sm font-light">돌아가기</span>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-6 h-6 text-primary" strokeWidth={1} />
          <h1 className="text-2xl font-serif font-light text-ink-light">주간 운세</h1>
        </div>
        <BrandQuote variant="section" className="mb-3">
          {BRAND_QUOTES.fortune.weekly}
        </BrandQuote>
        {data && (
          <p className="text-sm text-ink-light/60 font-light">
            {data.weekStart} ~ {data.weekEnd}
            {data.cached && <span className="ml-2 text-xs text-primary/60">(캐시됨)</span>}
          </p>
        )}
      </header>

      {/* 사주 정보 없음 */}
      {!data && (
        <section className="px-6">
          <Card className="bg-surface/30 border-primary/20">
            <CardContent className="p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-primary/50 mx-auto" strokeWidth={1} />
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
        <>
          {/* 이번 주 요약 */}
          {data.summary && (
            <section className="px-6 mb-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1} />
                  <p className="text-sm font-serif font-light text-ink-light">{data.summary}</p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Overall Score */}
          <section className="px-6 mb-4">
            <Card className="bg-surface/30 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-serif font-light text-primary">
                    이번 주 평균 운세
                  </h3>
                  <span className="text-2xl font-light text-primary">{data.overallScore}점</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.overallScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary to-yellow-400 rounded-full"
                  />
                </div>
                {data.overall && (
                  <p className="text-xs text-ink-light/60 mt-3 font-light leading-relaxed">
                    {data.overall}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* 행운 키워드 */}
          {data.lucky && (
            <section className="px-6 mb-4">
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
            </section>
          )}

          {/* Daily Timeline */}
          <section className="px-6 space-y-3">
            {data.days.map((day, idx) => {
              const isToday = idx === todayIndex
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                >
                  <Card
                    className={cn(
                      'border transition-all',
                      isToday
                        ? 'bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                        : 'bg-surface/20 border-white/5'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center min-w-[50px]">
                          <span className="text-xs text-ink-light/50 font-light">
                            {DAYS_KR[day.dayOfWeek]}
                          </span>
                          <span className="text-lg font-light text-ink-light">
                            {day.date.split('-')[2]}
                          </span>
                          {isToday && (
                            <Badge className="mt-1 bg-primary/20 text-primary border-primary/30 text-[10px] font-light px-1">
                              오늘
                            </Badge>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge
                              className={cn(
                                'font-serif font-light text-[10px]',
                                day.keyword === '길(吉)'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : day.keyword === '주의'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              )}
                            >
                              {day.keyword}
                            </Badge>
                            {getTrendIcon(day.score)}
                            <span className="text-sm text-primary font-light">{day.score}점</span>
                            {day.areaLabel && (
                              <span className="text-[10px] text-ink-light/40 font-light">
                                {day.areaLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-ink-light/80 mb-1 font-light">{day.summary}</p>
                          <p className="text-xs text-ink-light/50 italic font-light">
                            &quot;{day.advice}&quot;
                          </p>
                        </div>

                        {/* 점수 바 */}
                        <div className="flex flex-col items-end gap-1 min-w-[40px]">
                          <div className="w-1 h-16 bg-white/5 rounded-full overflow-hidden flex flex-col-reverse">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${day.score}%` }}
                              transition={{ duration: 0.8, delay: idx * 0.07 }}
                              className={cn(
                                'w-full rounded-full',
                                day.score >= 75
                                  ? 'bg-green-400'
                                  : day.score >= 50
                                    ? 'bg-primary'
                                    : 'bg-red-400'
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </section>

          {/* 주의사항 */}
          {data.caution && (
            <section className="px-6 mt-4">
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
            </section>
          )}
        </>
      )}
    </div>
  )
}
