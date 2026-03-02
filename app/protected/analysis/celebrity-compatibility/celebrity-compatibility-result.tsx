'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Star, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Celebrity } from '@/lib/data/celebrities'
import type { CompatibilityEngineResult } from '@/lib/saju-engine/compatibility-engine'

interface ResultProps {
  result: {
    score: number
    categories: CompatibilityEngineResult
    celebrity: Celebrity
    userInfo: { name: string; birthDate: string }
  }
  celebrity: Celebrity
  onReset: () => void
}

function getScoreLabel(score: number) {
  if (score >= 85) return { label: '천생연분', color: 'text-pink-400', bg: 'bg-pink-500' }
  if (score >= 70) return { label: '좋은 인연', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]' }
  if (score >= 55) return { label: '보통 궁합', color: 'text-orange-400', bg: 'bg-orange-400' }
  return { label: '어려운 인연', color: 'text-muted-foreground', bg: 'bg-muted-foreground' }
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
}

export function CelebrityCompatibilityResult({ result, celebrity, onReset }: ResultProps) {
  const score = result.score ?? 0
  const engineResult = result.categories
  const scoreInfo = getScoreLabel(score)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a00] via-[#2d1200] to-[#1a0a00] pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[#1a0a00]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={onReset}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-[#D4AF37]">스타 궁합 결과</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* 점수 카드 */}
        <motion.div {...fadeUp} transition={{ delay: 0 }}>
          <Card className="bg-gradient-to-br from-[#2d1200] to-[#1a0a00] border-[#D4AF37]/30 text-center overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl" />
            </div>
            <CardContent className="pt-8 pb-6 relative">
              {/* 두 사람 */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/40 flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">👤</span>
                  </div>
                  <p className="text-[#D4AF37] font-medium text-sm">{result.userInfo?.name ?? '나'}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Heart className="w-5 h-5 text-pink-400 animate-pulse" />
                  <div className="w-8 h-px bg-[#D4AF37]/30" />
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/40 flex items-center justify-center mx-auto mb-2">
                    <Star className="w-7 h-7 text-[#D4AF37]" />
                  </div>
                  <p className="text-[#D4AF37] font-medium text-sm">{celebrity.name}</p>
                </div>
              </div>

              {/* 점수 */}
              <div className="mb-4">
                <motion.div
                  className={`text-6xl font-black ${scoreInfo.color}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  {score}
                  <span className="text-2xl ml-1 font-normal text-[#D4AF37]/60">점</span>
                </motion.div>
                <Badge variant="outline" className={`mt-2 text-sm px-4 py-1 ${scoreInfo.color} border-current`}>
                  {scoreInfo.label}
                </Badge>
              </div>

              {/* 점수 바 */}
              <div className="w-full max-w-xs mx-auto bg-[#D4AF37]/10 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full ${scoreInfo.bg} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 카테고리 분석 */}
        {engineResult?.categories && engineResult.categories.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card className="bg-[#2d1200]/60 border-[#D4AF37]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#D4AF37] text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  8대 궁합 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {engineResult.categories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-[#D4AF37]/80">{cat.label}</span>
                      <span
                        className={`text-sm font-bold ${
                          cat.score >= 70
                            ? 'text-[#D4AF37]'
                            : cat.score >= 50
                              ? 'text-orange-400'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {cat.score}점
                      </span>
                    </div>
                    <div className="w-full bg-[#D4AF37]/10 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          cat.score >= 70 ? 'bg-[#D4AF37]' : cat.score >= 50 ? 'bg-orange-400' : 'bg-muted-foreground'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.score}%` }}
                        transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    {cat.details && cat.details.length > 0 && (
                      <p className="text-[10px] text-[#D4AF37]/40 mt-0.5">{cat.details[0]}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 오행 서사 */}
        {engineResult?.mulsangNarrative && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <Card className="bg-[#2d1200]/60 border-[#D4AF37]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#D4AF37] text-base">오행 서사</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#D4AF37]/70 text-sm leading-relaxed whitespace-pre-wrap">
                  {engineResult.mulsangNarrative}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 행운의 행동 */}
        {engineResult?.luckyActions && engineResult.luckyActions.length > 0 && (
          <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
            <Card className="bg-[#2d1200]/60 border-[#D4AF37]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#D4AF37] text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  행운의 행동 지침
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {engineResult.luckyActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#D4AF37]/70">
                      <span className="text-[#D4AF37] font-bold mt-0.5">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 주의 안내 */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80">
              본 궁합은 사주 오행 이론 기반의 참고용 분석입니다. 실제 관계는 개인의 노력과 이해에 달려있습니다.
            </p>
          </div>
        </motion.div>

        {/* 다시하기 */}
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <Button
            className="w-full bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 border border-[#D4AF37]/30"
            onClick={onReset}
          >
            다른 스타 궁합 보기
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
