'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  Users,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Target,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import {
  getBusinessPartnerCandidates,
  calculateBusinessCompatibilityAction,
} from '@/app/actions/ai/celebrity-compatibility'
import type { CompatibilityEngineResult } from '@/lib/saju-engine/compatibility-engine'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'

interface PartnerInfo {
  id: string
  name: string
  birth_date: string
  birth_time: string | null
  gender: string
  relationship: string
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

function getScoreLabel(score: number) {
  if (score >= 85) return { label: '최고의 파트너', color: 'text-emerald-400', bg: 'bg-emerald-500', emoji: '🏆' }
  if (score >= 70) return { label: '좋은 파트너십', color: 'text-gold-500', bg: 'bg-gold-500', emoji: '🤝' }
  if (score >= 55) return { label: '보완 필요', color: 'text-orange-400', bg: 'bg-orange-400', emoji: '⚠️' }
  return { label: '신중한 검토 필요', color: 'text-red-400', bg: 'bg-red-400', emoji: '🔍' }
}

export function BusinessCompatibilityClient() {
  const router = useRouter()
  const [partners, setPartners] = useState<PartnerInfo[]>([])
  const [myName, setMyName] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<PartnerInfo | null>(null)
  const [result, setResult] = useState<{
    score: number
    categories: CompatibilityEngineResult
    aiAnalysis: string
    partnerName: string
    myName: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculating, startCalculating] = useTransition()

  useEffect(() => {
    getBusinessPartnerCandidates().then((res) => {
      setIsLoading(false)
      if (res.success && res.partners && res.me) {
        setPartners(res.partners)
        setMyName(res.me.name)
      } else {
        toast.error(res.error ?? '데이터를 불러올 수 없습니다.')
      }
    })
  }, [])

  const handleCalculate = (partner: PartnerInfo) => {
    setSelectedPartner(partner)
    startCalculating(async () => {
      const res = await calculateBusinessCompatibilityAction(partner.id)
      if (res.success && res.categories) {
        setResult({
          score: res.score!,
          categories: res.categories,
          aiAnalysis: res.aiAnalysis ?? '',
          partnerName: res.partnerName ?? partner.name,
          myName: res.myName ?? '나',
        })
      } else {
        toast.error(res.error ?? '사업 궁합 분석에 실패했습니다.')
      }
    })
  }

  const handleReset = () => {
    setResult(null)
    setSelectedPartner(null)
  }

  // 결과 화면
  if (result && selectedPartner) {
    const scoreInfo = getScoreLabel(result.score)
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1d32] to-[#0a1628] pb-20">
        <div id="business-compat-result-capture">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-[#0a1628]/90 backdrop-blur-sm border-b border-gold-500/20 px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-gold-500 hover:bg-gold-500/10" onClick={handleReset}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-gold-500">사업 궁합 분석 결과</h1>
          </div>

          <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
            {/* 점수 카드 */}
            <motion.div {...fadeUp}>
              <Card className="bg-gradient-to-br from-[#0f1d32] to-[#0a1628] border-gold-500/30 text-center overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />
                </div>
                <CardContent className="pt-8 pb-6 relative">
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-blue-500/20 border-2 border-blue-400/40 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">👤</span>
                      </div>
                      <p className="text-gold-500 font-medium text-sm">{result.myName}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Briefcase className="w-5 h-5 text-gold-500 animate-pulse" />
                      <div className="w-8 h-px bg-gold-500/30" />
                    </div>
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">👤</span>
                      </div>
                      <p className="text-gold-500 font-medium text-sm">{result.partnerName}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <motion.div
                      className={`text-6xl font-black ${scoreInfo.color}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                      {result.score}
                      <span className="text-2xl ml-1 font-normal text-gold-500/60">점</span>
                    </motion.div>
                    <Badge variant="outline" className={`mt-2 text-sm px-4 py-1 ${scoreInfo.color} border-current`}>
                      {scoreInfo.emoji} {scoreInfo.label}
                    </Badge>
                  </div>

                  <div className="w-full max-w-xs mx-auto bg-gold-500/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-full ${scoreInfo.bg} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${result.score}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 카테고리 분석 */}
            {result.categories?.categories && result.categories.categories.length > 0 && (
              <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                <Card className="bg-[#0f1d32]/80 border-gold-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gold-500 text-base flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      8대 사업 궁합 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.categories.categories.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gold-500/80">{cat.label}</span>
                          <span
                            className={`text-sm font-bold ${
                              cat.score >= 70
                                ? 'text-emerald-400'
                                : cat.score >= 50
                                  ? 'text-orange-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {cat.score}점
                          </span>
                        </div>
                        <div className="w-full bg-gold-500/10 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              cat.score >= 70 ? 'bg-emerald-400' : cat.score >= 50 ? 'bg-orange-400' : 'bg-red-400'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.score}%` }}
                            transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                        {cat.details && cat.details.length > 0 && (
                          <p className="text-[10px] text-gold-500/40 mt-0.5">{cat.details[0]}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* 오행 서사 */}
            {result.categories?.mulsangNarrative && (
              <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                <Card className="bg-[#0f1d32]/80 border-gold-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gold-500 text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      오행 시너지 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gold-500/70 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.categories.mulsangNarrative}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* AI 심층 분석 */}
            {result.aiAnalysis && (
              <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                <Card className="bg-[#0f1d32]/80 border-gold-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-gold-500 text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      AI 사업 궁합 심층 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm prose-invert max-w-none [&_h3]:text-gold-500 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-white/70 [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-white/70 [&_li]:text-sm [&_strong]:text-gold-500/90 [&_ul]:space-y-1">
                    <ReactMarkdown>{result.aiAnalysis}</ReactMarkdown>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* 주의 */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/80">
                  본 분석은 사주 오행 이론 기반의 참고용입니다. 실제 사업 결정은 시장 조사, 재무 분석 등 종합적 판단이
                  필요합니다.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
        {/* end capture */}

        <div className="max-w-lg mx-auto px-4 mt-6 space-y-4">
          <ShareSaveButtons
            resultContainerId="business-compat-result-capture"
            analysisTitle="사업 궁합 분석"
            memberName={`${result.myName} & ${result.partnerName}`}
          />

          <Button
            className="w-full bg-gold-500/20 text-gold-500 hover:bg-gold-500/30 border border-gold-500/30"
            onClick={handleReset}
          >
            다른 파트너 궁합 보기
          </Button>
        </div>
      </div>
    )
  }

  // 파트너 선택 화면
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0f1d32] to-[#0a1628] pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[#0a1628]/90 backdrop-blur-sm border-b border-gold-500/20 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-gold-500 hover:bg-gold-500/10"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gold-500">사업 궁합</h1>
          <p className="text-xs text-gold-500/60">사업 파트너와의 사주 궁합 분석</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* 로딩 */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          </div>
        )}

        {/* 안내 */}
        {!isLoading && partners.length === 0 && (
          <motion.div {...fadeUp} className="text-center py-12 space-y-4">
            <div className="text-5xl">💼</div>
            <p className="text-gold-500/80 font-medium">사업 파트너를 먼저 등록해주세요</p>
            <p className="text-gold-500/40 text-sm">
              인연 관리에서 사업 파트너의 생년월일을 등록하면
              <br />
              사업 궁합을 분석할 수 있습니다.
            </p>
            <Button
              variant="outline"
              className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10"
              onClick={() => router.push('/protected/family')}
            >
              <Users className="w-4 h-4 mr-2" />
              인연 관리로 이동
            </Button>
          </motion.div>
        )}

        {/* 분석 중 */}
        {isCalculating && (
          <motion.div {...fadeUp} className="text-center py-16 space-y-4">
            <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto" />
            <p className="text-gold-500/80 font-medium">사업 궁합을 분석하고 있습니다...</p>
            <p className="text-gold-500/40 text-xs">만세력, 오행, 십성, 대운을 종합 분석 중</p>
          </motion.div>
        )}

        {/* 파트너 목록 */}
        {!isLoading && !isCalculating && partners.length > 0 && (
          <>
            <div className="text-center space-y-2 pb-2">
              <p className="text-gold-500/60 text-sm">{myName}님의 사업 파트너 궁합을 확인하세요</p>
            </div>

            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
            >
              {partners.map((partner) => (
                <motion.div key={partner.id} variants={fadeUp}>
                  <button
                    className="w-full text-left transition-all rounded-xl border border-gold-500/15 bg-[#0f1d32]/50 hover:border-gold-500/40 hover:bg-[#0f1d32]/80"
                    onClick={() => handleCalculate(partner)}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-gold-500/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-gold-500/80">{partner.name}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 text-gold-500/50 border-gold-500/20"
                          >
                            {partner.relationship}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-gold-500/40">{partner.birth_date}</p>
                      </div>
                      <TrendingUp className="w-4 h-4 flex-shrink-0 text-gold-500/30" />
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>

            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                className="border-gold-500/20 text-gold-500/60 hover:bg-gold-500/10 text-xs"
                onClick={() => router.push('/protected/family')}
              >
                + 새 파트너 등록하기
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
