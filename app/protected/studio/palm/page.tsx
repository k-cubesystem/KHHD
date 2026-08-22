'use client'

import { StudioAnalysisLayout } from '@/components/studio/studio-analysis-layout'
import { ImageCapture } from '@/components/studio/image-capture'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { logger } from '@/lib/utils/logger'
import { analyzePalmReading, type PalmAnalysisResult, type PalmReadingGoal } from '@/app/actions/ai/image'
import { deductTalisman, getWalletBalance, refundStudioCost } from '@/app/actions/payment/wallet'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { GOLD_500, GOLD_300 } from '@/lib/config/design-tokens'
import { toast } from 'sonner'
import {
  ArrowRight,
  Coins,
  Hand,
  TrendingUp,
  Activity,
  Heart,
  Briefcase,
  Sparkles,
  Clock,
  GitCompare,
  Fingerprint,
  Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { ReadingResultHero } from '@/components/studio/reading-result-hero'
import { RemedyPanel } from '@/components/analysis/RemedyPanel'
import { SajuSynergyCard } from '@/components/studio/saju-synergy-card'
import { PalmDiagram } from '@/components/studio/palm-diagram'
import { JourneyCard } from '@/components/analysis/journey-card'
import { DetailAnalysisAccordion } from '@/components/studio/detail-analysis-accordion'
import { getAnalysisTitle } from '@/lib/domain/analysis/titles'
import { GA } from '@/lib/analytics/ga4'

const PALM_GOAL_OPTIONS: { value: PalmReadingGoal; label: string; desc: string; icon: string }[] = [
  { value: 'general', label: '종합 손금', desc: '전체 운세 흐름', icon: '🖐' },
  { value: 'wealth', label: '재물운', desc: '재물·사업운', icon: '💰' },
  { value: 'love', label: '애정운', desc: '연애·결혼운', icon: '💕' },
  { value: 'authority', label: '직업운', desc: '직업·성취운', icon: '📈' },
]

type StepType = 'upload' | 'analyzing' | 'result'

const PALM_COST = FEATURE_COST.palm.display // 단일 소스 — 표시 = 실차감

function PalmAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
  const [selectedGoal, setSelectedGoal] = useState<PalmReadingGoal>('general')
  const [targetMember, setTargetMember] = useState<FamilyMemberWithMissions | null>(null)
  const [imageBase64, setImageBase64] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<PalmAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const { bokchaeModal, closeBokchaeModal, handleDeductResult } = useInsufficientBokchae()
  const { checkQuota, paywallProps } = useAnalysisQuota()

  useEffect(() => {
    getWalletBalance().then(setBalance)
    if (!targetId) return
    const loadMember = async () => {
      const members = await getFamilyWithMissions()
      const member = members.find((m) => m.id === targetId)
      if (member) setTargetMember(member)
    }
    loadMember()
  }, [targetId])

  const handleImageCapture = (base64: string) => setImageBase64(base64)

  const handleStartAnalysis = async () => {
    if (!imageBase64) {
      toast.error('손바닥 사진을 먼저 업로드해주세요.')
      return
    }

    const canProceed = await checkQuota()
    if (!canProceed) return

    setLoading(true)
    setStep('analyzing')
    GA.analysisStart(`palm:${selectedGoal}`)

    try {
      const deductResult = await deductTalisman('HAND', PALM_COST)
      if (!deductResult.success) {
        setLoading(false)
        setStep('upload')
        const handled = handleDeductResult(deductResult, {
          currentBalance: balance ?? 0,
          requiredAmount: PALM_COST,
          featureLabel: '손금 분석',
        })
        if (!handled) toast.error(deductResult.error || '풀이를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }

      const result = await analyzePalmReading(
        imageBase64,
        selectedGoal,
        undefined,
        targetMember ? { id: targetMember.id, name: targetMember.name, relation: targetMember.relationship } : undefined
      )

      if (!result.success) {
        const refund = await refundStudioCost('HAND')
        setLoading(false)
        setStep('upload')
        toast.error(
          refund.refunded
            ? '복채는 돌려드렸습니다. 잠시 후 다시 시도해주세요.'
            : result.error || '분석 중 오류가 발생했습니다.'
        )
        return
      }

      setAnalysisResult(result)
      if (deductResult.remainingBalance !== undefined) setBalance(deductResult.remainingBalance)

      if (targetId) {
        await saveAnalysisSession({
          targetMemberId: targetId,
          category: 'HAND',
          inputData: { imageUrl: `data:image/jpeg;base64,${imageBase64}` },
          resultData: {
            analysis: result.currentAnalysis,
            palmLines: result.palmLines,
            fortuneOverview: result.fortuneOverview,
          },
          creditsUsed: PALM_COST,
        })
      }

      setStep('result')
      GA.analysisComplete(`palm:${selectedGoal}`)
    } catch (error) {
      logger.error('Palm analysis error:', error)
      const refund = await refundStudioCost('HAND').catch(() => ({ refunded: false }))
      toast.error(
        refund.refunded
          ? '복채는 돌려드렸습니다. 잠시 후 다시 시도해주세요.'
          : '분석 중 예상치 못한 오류가 발생했습니다.'
      )
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  const palmScore = analysisResult?.score ?? 0
  const palmTitle = getAnalysisTitle('palm', selectedGoal, palmScore)

  return (
    <StudioAnalysisLayout category="HAND" targetMember={targetMember}>
      <InsufficientBokchaeModal {...bokchaeModal} onClose={closeBokchaeModal} />
      <PaywallModal {...paywallProps} />
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* 히어로 — 대작 카드 문법(玄 그라디언트·한글 트래킹 라벨·세리프 헤드라인) */}
            <div
              className="relative overflow-hidden rounded-2xl border border-gold-500/25"
              style={{
                background: 'linear-gradient(160deg, #0e0b07 0%, #17130d 55%, #0a0807 100%)',
                boxShadow: '0 10px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(212,175,55,0.08)',
              }}
            >
              <div
                aria-hidden
                className="absolute pointer-events-none"
                style={{
                  top: '-40%',
                  right: '-20%',
                  width: '260px',
                  height: '260px',
                  background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 65%)',
                  filter: 'blur(36px)',
                }}
              />
              <div className="relative z-10 px-5 py-8 text-center space-y-2.5">
                <p className="text-[10px] tracking-[0.55em] text-gold-500/60 font-serif">손 금</p>
                <h2
                  className="text-[1.35rem] font-serif font-bold text-white leading-snug"
                  style={{ wordBreak: 'keep-all' }}
                >
                  손바닥에 새겨진 <span className="text-gold-500">세 갈래 길</span>을 읽습니다
                </h2>
                <p className="text-[11.5px] text-white/45 font-light leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                  생명선·지능선·감정선 — 손금은 지금도 자라나는 오늘의 기록입니다
                </p>
              </div>
            </div>

            {/* 복채 잔액 + 비용 배너 */}
            <div className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-[#001A0F]/80 to-[#0A192F]/80 p-4 backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_60%)]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-gold-500" />
                  <span className="text-xs text-white/50 font-sans">보유 복채</span>
                  <span className="text-sm font-bold text-gold-500 font-serif">
                    {balance !== null ? `${balance}만냥` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-gold-500/10 border border-gold-500/20 rounded-full px-3 py-1">
                  <span className="text-xs text-gold-500 font-medium">손금 분석</span>
                  <span className="text-xs text-white/50">·</span>
                  <span className="text-sm font-bold text-gold-500 font-serif">{PALM_COST}만냥</span>
                </div>
              </div>
            </div>

            {/* 목적 선택 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <p className="text-xs text-gold-500/70 font-medium tracking-widest mb-3 uppercase">분석 목적 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {PALM_GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setSelectedGoal(g.value)}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 border ${
                      selectedGoal === g.value
                        ? 'border-gold-500/60 bg-gold-500/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                        : 'border-white/5 bg-white/[0.03] hover:border-white/15'
                    }`}
                  >
                    <div className="text-lg mb-1">{g.icon}</div>
                    <p
                      className={`text-sm font-serif font-bold ${selectedGoal === g.value ? 'text-gold-500' : 'text-white/80'}`}
                    >
                      {g.label}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">{g.desc}</p>
                    {selectedGoal === g.value && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gold-500 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* 안내 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Hand className="w-4 h-4 text-gold-500" />
                <p className="text-xs text-gold-500/70 font-medium tracking-widest uppercase">촬영 안내</p>
              </div>
              <ul className="space-y-2">
                {[
                  '손바닥이 펼쳐진 상태로 촬영해주세요',
                  '조명이 밝은 곳에서 촬영하면 더 정확합니다',
                  '손금이 잘 보이도록 손을 편하게 펼쳐주세요',
                  '왼손 또는 오른손 중 편한 손을 선택하세요',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/50 font-sans font-light">
                    <span className="text-gold-500/60 mt-0.5 shrink-0">·</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <ImageCapture onImageCapture={handleImageCapture} maxSizeMB={10} />

            <button
              onClick={handleStartAnalysis}
              disabled={!imageBase64 || loading}
              className="w-full h-14 rounded-2xl font-serif font-bold text-base tracking-wide transition-all duration-300 relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed group"
              style={{
                background: imageBase64
                  ? 'linear-gradient(135deg, #E8D5A0 0%, #C9A84C 45%, #A8903F 100%)'
                  : 'rgba(212,175,55,0.3)',
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center justify-center gap-2 text-[#0A192F]">
                {loading ? (
                  '분석 준비 중...'
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    손금 분석 시작 · {PALM_COST}만냥
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </span>
            </button>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingAnimation type="palmReading" />
          </motion.div>
        )}

        {step === 'result' && analysisResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            <div id="palm-result-container" className="space-y-5">
              {/* 결과 히어로 — 종합 점수 링 + 상(相) 칭호 */}
              <ReadingResultHero category="palm" score={palmScore} title={palmTitle} subtitleLabel="손금 분석 결과" />

              {/* 손금 진단도 — 히어로 바로 아래(캡처 포함) */}
              <PalmDiagram
                lines={{
                  lifeLine: analysisResult.palmLines?.lifeLine?.assessment,
                  intelligenceLine: analysisResult.palmLines?.intelligenceLine?.assessment,
                  emotionLine: analysisResult.palmLines?.emotionLine?.assessment,
                  fateLine: analysisResult.palmLines?.fateLine?.assessment,
                  sunLine: analysisResult.palmLines?.sunLine?.assessment,
                  marriageLine: analysisResult.palmLines?.marriageLine?.assessment,
                }}
              />

              {/* 사주 교차분석 — "사주가 같은 말을 합니다" */}
              {analysisResult.sajuSynergy && <SajuSynergyCard text={analysisResult.sajuSynergy} category="palm" />}

              {/* 개운 처방 — 🔴 엔진 결정론 값이라 AI 를 다시 부르지 않는다(토큰 0). */}
              {analysisResult.remedy && <RemedyPanel remedy={analysisResult.remedy} />}

              {/* 4대 운세 (텍스트 분석) — 빈 항목은 렌더 제외(유령 문구 방지) */}
              {analysisResult.fortuneOverview &&
                (() => {
                  const fortunes = [
                    {
                      icon: TrendingUp,
                      label: '재물운',
                      value: analysisResult.fortuneOverview.wealth,
                      color: '#4ade80',
                    },
                    { icon: Activity, label: '건강운', value: analysisResult.fortuneOverview.health, color: '#60a5fa' },
                    { icon: Heart, label: '애정운', value: analysisResult.fortuneOverview.love, color: '#fb7185' },
                    {
                      icon: Briefcase,
                      label: '직업운',
                      value: analysisResult.fortuneOverview.career,
                      color: '#c084fc',
                    },
                  ].filter((f) => f.value && f.value.trim().length > 0)
                  if (fortunes.length === 0) return null
                  return (
                    <Card className="card-glass-manse p-5 border-white/5">
                      <h3 className="text-sm font-serif font-bold text-gold-500 mb-4 tracking-wide">
                        사대운세(四大運勢)
                      </h3>
                      <div className="space-y-3">
                        {fortunes.map((item, i) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-xl p-4 border border-white/5 bg-white/[0.03]"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                              <span className="text-xs font-sans font-bold" style={{ color: item.color }}>
                                {item.label}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 font-sans font-light leading-relaxed">{item.value}</p>
                          </motion.div>
                        ))}
                      </div>
                    </Card>
                  )
                })()}

              {/* 삼대 주선 — 셋 다 파싱 실패면 섹션 숨김(유령 카드 방지) */}
              {analysisResult.palmLines &&
                (analysisResult.palmLines.lifeLine ||
                  analysisResult.palmLines.intelligenceLine ||
                  analysisResult.palmLines.emotionLine) && (
                  <Card className="card-glass-manse p-5 border-white/5">
                    <h3 className="text-sm font-serif font-bold text-gold-500 mb-4 tracking-wide">
                      삼대 주선(主線) 분석
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: '생명선 (生命線)', data: analysisResult.palmLines.lifeLine },
                        { label: '지능선 (知能線)', data: analysisResult.palmLines.intelligenceLine },
                        { label: '감정선 (感情線)', data: analysisResult.palmLines.emotionLine },
                      ]
                        .filter((l) => l.data)
                        .map((line, i) => (
                          <PalmLineCard
                            key={line.label}
                            label={line.label}
                            assessment={line.data!.assessment}
                            description={line.data!.description}
                            meaning={line.data!.meaning}
                            index={i}
                          />
                        ))}
                    </div>
                  </Card>
                )}

              {/* 특수선 — 운명선·태양선·결혼선 */}
              {analysisResult.palmLines &&
                (analysisResult.palmLines.fateLine ||
                  analysisResult.palmLines.sunLine ||
                  analysisResult.palmLines.marriageLine) && (
                  <Card className="card-glass-manse p-5 border-white/5">
                    <h3 className="text-sm font-serif font-bold text-gold-500 mb-4 tracking-wide">
                      특수선(特殊線) 분석
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: '운명선 (運命線)', data: analysisResult.palmLines.fateLine },
                        { label: '태양선 (太陽線)', data: analysisResult.palmLines.sunLine },
                        { label: '결혼선 (結婚線)', data: analysisResult.palmLines.marriageLine },
                      ]
                        .filter((l) => l.data)
                        .map((line, i) => (
                          <PalmLineCard
                            key={line.label}
                            label={line.label}
                            assessment={line.data!.assessment}
                            description={line.data!.description}
                            meaning={line.data!.meaning}
                            index={i}
                          />
                        ))}
                    </div>
                  </Card>
                )}

              {/* 손 형태 · 적성 */}
              {analysisResult.handShape && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">손 형태 · 적성</h3>
                  </div>
                  <p className="text-sm font-serif font-bold text-gold-300 mb-1">{analysisResult.handShape.type}</p>
                  <p className="text-xs text-white/55 font-sans font-light leading-relaxed mb-3">
                    {analysisResult.handShape.personality}
                  </p>
                  {analysisResult.handShape.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {analysisResult.handShape.strengths.map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {analysisResult.handShape.bestCareers.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gold-500/60 font-sans tracking-widest uppercase mb-1.5">
                        적성 직업
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisResult.handShape.bestCareers.map((c) => (
                          <span
                            key={c}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500/90"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* 시기(時期) 예측 */}
              {analysisResult.timingPredictions && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">시기(時期) 예측</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: '1년 내', text: analysisResult.timingPredictions.next1Year },
                      { label: '3년 내', text: analysisResult.timingPredictions.next3Years },
                      { label: '10년 내', text: analysisResult.timingPredictions.next10Years },
                    ].map((t, i) => (
                      <motion.div
                        key={t.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="rounded-xl p-4 border border-white/5 bg-white/[0.03]"
                      >
                        <span className="text-xs font-serif font-bold text-gold-500">{t.label}</span>
                        <p className="text-xs text-white/55 font-sans font-light leading-relaxed mt-1.5">{t.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 나이별 흐름 */}
              {analysisResult.ageTimeline && analysisResult.ageTimeline.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">나이별 흐름</h3>
                  </div>
                  <div className="space-y-4">
                    {analysisResult.ageTimeline.map((a, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="relative pl-4 border-l-2 border-gold-500/25"
                      >
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gold-500" />
                        <span className="text-sm font-serif font-bold text-gold-500">{a.age}</span>
                        <p className="text-xs text-white/55 leading-relaxed font-sans font-light mt-1">
                          {a.description}
                        </p>
                        <p className="text-xs text-gold-500/70 leading-relaxed font-sans font-light mt-1">
                          → {a.advice}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 왼손/오른손 — 타고난 운 vs 만들어가는 운 */}
              {analysisResult.dualHandCompare && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <GitCompare className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">
                      타고난 운 vs 만들어가는 운
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="rounded-xl p-3.5 border border-white/5 bg-white/[0.03]">
                      <p className="text-[10px] text-gold-500/60 font-sans tracking-widest uppercase mb-1.5">
                        왼손 · 타고난 운
                      </p>
                      <p className="text-xs text-white/60 font-sans font-light leading-relaxed">
                        {analysisResult.dualHandCompare.leftHand}
                      </p>
                    </div>
                    <div className="rounded-xl p-3.5 border border-white/5 bg-white/[0.03]">
                      <p className="text-[10px] text-gold-500/60 font-sans tracking-widest uppercase mb-1.5">
                        오른손 · 만들어가는 운
                      </p>
                      <p className="text-xs text-white/60 font-sans font-light leading-relaxed">
                        {analysisResult.dualHandCompare.rightHand}
                      </p>
                    </div>
                  </div>
                  {analysisResult.dualHandCompare.comparison && (
                    <div className="rounded-xl p-3.5 border border-gold-500/20 bg-gold-500/5">
                      <p className="text-xs text-gold-500/80 font-sans font-light leading-relaxed">
                        {analysisResult.dualHandCompare.comparison}
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* 생활 조언 */}
              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500">생활 조언</h3>
                  </div>
                  <ul className="space-y-2">
                    {analysisResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-white/60 font-sans font-light">
                        <span className="text-gold-500/60 mt-0.5 shrink-0">·</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* 상세 분석 — 전문 보기(접힘) */}
              <DetailAnalysisAccordion raw={analysisResult.currentAnalysis} />

              {/* AI기본법 §31② — 캡처 컨테이너 «안» 이라야 이미지에 함께 박힌다 */}
              <ServiceDisclaimer tone="photo" />
            </div>

            <ShareSaveButtons
              resultContainerId="palm-result-container"
              analysisTitle="손금 분석"
              memberName={targetMember?.name}
            />

            {/* 종합사주풀이 여정 (컴팩트) — 미완료 단계 CTA 또는 4상 완료 시 종합 CTA */}
            <JourneyCard variant="compact" targetId={targetId ?? undefined} />

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep('upload')
                  setImageBase64('')
                  setAnalysisResult(null)
                  setSelectedGoal('general')
                }}
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:bg-white/5 hover:text-gold-500 h-12"
              >
                다시 분석
              </Button>
              <Button
                onClick={() => router.push('/protected/family')}
                className="flex-1 h-12 font-serif font-bold text-[#0A192F]"
                style={{ background: 'linear-gradient(135deg, #E8D5A0 0%, #C9A84C 45%, #A8903F 100%)' }}
              >
                완료
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StudioAnalysisLayout>
  )
}

function PalmLineCard({
  label,
  assessment,
  description,
  meaning,
  index,
}: {
  label: string
  assessment: '좋음' | '보통' | '주의'
  description: string
  meaning: string
  index: number
}) {
  const color = assessment === '좋음' ? GOLD_500 : assessment === '보통' ? '#A8C5DA' : '#E8A0A0'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl p-4 border border-white/5 bg-white/[0.03]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-serif font-bold text-gold-500">{label}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
          {assessment}
        </span>
      </div>
      <p className="text-xs text-white/45 leading-relaxed font-sans font-light">{description}</p>
      {meaning && <p className="text-xs text-white/65 leading-relaxed font-sans font-light mt-1.5 italic">{meaning}</p>}
    </motion.div>
  )
}

export default function PalmAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto" />
            <p className="text-white/40 font-sans text-sm">손금 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <PalmAnalysisPageContent />
    </Suspense>
  )
}
