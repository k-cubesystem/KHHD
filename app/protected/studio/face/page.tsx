'use client'

import { StudioAnalysisLayout } from '@/components/studio/studio-analysis-layout'
import { ImageCapture } from '@/components/studio/image-capture'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { logger } from '@/lib/utils/logger'
import { analyzeFaceForDestiny, type FaceAnalysisResult, type FaceDestinyGoal } from '@/app/actions/ai/image'
import { deductTalisman, getWalletBalance } from '@/app/actions/payment/wallet'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { toast } from 'sonner'
import { ArrowRight, Coins, Eye, Sparkles, Crown, Star, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'

type StepType = 'upload' | 'analyzing' | 'result'

const FACE_COST = 2 // 2만냥

const GOAL_OPTIONS: { value: FaceDestinyGoal; label: string; desc: string; icon: string }[] = [
  { value: 'general', label: '종합 관상', desc: '전체 운세 흐름', icon: '👁' },
  { value: 'wealth', label: '재물운', desc: '재물·사업운', icon: '💰' },
  { value: 'love', label: '도화운', desc: '연애·인연운', icon: '🌸' },
  { value: 'authority', label: '권위운', desc: '직업·명예운', icon: '👑' },
]

function FaceAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
  const [selectedGoal, setSelectedGoal] = useState<FaceDestinyGoal>('general')
  const [targetMember, setTargetMember] = useState<FamilyMemberWithMissions | null>(null)
  const [imageBase64, setImageBase64] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<FaceAnalysisResult | null>(null)
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
      toast.error('얼굴 사진을 먼저 업로드해주세요.')
      return
    }

    const canProceed = await checkQuota()
    if (!canProceed) return

    setLoading(true)
    setStep('analyzing')

    try {
      const deductResult = await deductTalisman('FACE', FACE_COST)
      if (!deductResult.success) {
        setLoading(false)
        setStep('upload')
        const handled = handleDeductResult(deductResult, {
          currentBalance: balance ?? 0,
          requiredAmount: FACE_COST,
          featureLabel: '관상 분석',
        })
        if (!handled) toast.error(deductResult.error || '복채가 부족합니다.')
        return
      }

      const result = await analyzeFaceForDestiny(imageBase64, selectedGoal)

      if (!result.success) {
        toast.error(result.error || '분석 중 오류가 발생했습니다.')
        setLoading(false)
        setStep('upload')
        return
      }

      setAnalysisResult(result)
      if (deductResult.remainingBalance !== undefined) setBalance(deductResult.remainingBalance)

      if (targetId) {
        await saveAnalysisSession({
          targetMemberId: targetId,
          category: 'FACE',
          inputData: { goal: selectedGoal, imageUrl: `data:image/jpeg;base64,${imageBase64}` },
          resultData: {
            score: result.currentScore,
            analysis: result.currentAnalysis,
            facialFeatures: result.facialFeatures,
            confidence: result.confidence,
            recommendations: result.recommendations,
          },
          creditsUsed: FACE_COST,
        })
      }

      setStep('result')
    } catch (error) {
      logger.error('Face analysis error:', error)
      toast.error('분석 중 예상치 못한 오류가 발생했습니다.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudioAnalysisLayout category="FACE" targetMember={targetMember}>
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
            {/* 복채 잔액 + 비용 배너 */}
            <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#1A0F00]/80 to-[#0A192F]/80 p-4 backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.12),transparent_60%)]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs text-white/50 font-sans">보유 복채</span>
                  <span className="text-sm font-bold text-[#D4AF37] font-serif">
                    {balance !== null ? `${balance}만냥` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-3 py-1">
                  <span className="text-xs text-[#D4AF37] font-medium">관상 분석</span>
                  <span className="text-xs text-white/50">·</span>
                  <span className="text-sm font-bold text-[#D4AF37] font-serif">{FACE_COST}만냥</span>
                </div>
              </div>
            </div>

            {/* 목적 선택 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <p className="text-xs text-[#D4AF37]/70 font-medium tracking-widest mb-3 uppercase">분석 목적 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setSelectedGoal(g.value)}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 border ${
                      selectedGoal === g.value
                        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                        : 'border-white/5 bg-white/3 hover:border-white/15'
                    }`}
                  >
                    <div className="text-lg mb-1">{g.icon}</div>
                    <p
                      className={`text-sm font-serif font-bold ${selectedGoal === g.value ? 'text-[#D4AF37]' : 'text-white/80'}`}
                    >
                      {g.label}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">{g.desc}</p>
                    {selectedGoal === g.value && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* 사진 안내 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <p className="text-xs text-[#D4AF37]/70 font-medium tracking-widest uppercase">촬영 안내</p>
              </div>
              <ul className="space-y-2">
                {[
                  '정면을 보고 자연스러운 표정으로 촬영하세요',
                  '조명이 밝은 곳에서 촬영하면 더 정확합니다',
                  '얼굴 전체가 잘 보이도록 촬영하세요',
                  '선글라스나 마스크는 벗어주세요',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/50 font-sans font-light">
                    <span className="text-[#D4AF37]/60 mt-0.5 shrink-0">·</span>
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
                  ? 'linear-gradient(135deg, #D4AF37 0%, #F4E4BA 50%, #C9A227 100%)'
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
                    관상 분석 시작 · {FACE_COST}만냥
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </span>
            </button>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingAnimation type="faceScanning" message="오관(五官)을 판독하고 있습니다..." />
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
            <div id="face-result-container" className="space-y-5">
              {/* 스코어 헤더 */}
              <div
                className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 p-8 text-center"
                style={{ background: 'linear-gradient(135deg, #0D0A00 0%, #1A1200 50%, #0A0800 100%)' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15),transparent_70%)]" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                <p className="relative text-[10px] tracking-[0.3em] text-[#D4AF37]/50 uppercase mb-3 font-sans">
                  관상 분석 결과
                </p>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="relative text-7xl font-serif font-bold mb-2"
                  style={{
                    background: 'linear-gradient(180deg, #F4E4BA 0%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {analysisResult.currentScore}
                </motion.div>
                <p className="relative text-xs text-white/30 font-sans">신뢰도 {analysisResult.confidence}%</p>
              </div>

              {/* 부위별 상세 분석 */}
              {analysisResult.partAnalysis && Object.values(analysisResult.partAnalysis).some(Boolean) && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37] tracking-wide">부위별 심층 분석</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'forehead',
                        label: '이마 (天庭)',
                        subtitle: '초년운·지능·부모복',
                        data: analysisResult.partAnalysis.forehead,
                      },
                      {
                        key: 'eyes',
                        label: '눈 (監察官)',
                        subtitle: '인간관계·이성운',
                        data: analysisResult.partAnalysis.eyes,
                      },
                      {
                        key: 'nose',
                        label: '코 (財帛宮)',
                        subtitle: '재물운·건강·자존심',
                        data: analysisResult.partAnalysis.nose,
                      },
                      {
                        key: 'mouth',
                        label: '입 (出納官)',
                        subtitle: '식복·표현력·노년운',
                        data: analysisResult.partAnalysis.mouth,
                      },
                      {
                        key: 'ears',
                        label: '귀 (採聽官)',
                        subtitle: '명예·건강·장수',
                        data: analysisResult.partAnalysis.ears,
                      },
                      {
                        key: 'chin',
                        label: '턱 (地閣)',
                        subtitle: '만년운·부동산운',
                        data: analysisResult.partAnalysis.chin,
                      },
                    ]
                      .filter((f) => f.data)
                      .map((f, i) => (
                        <PartFeatureCard
                          key={f.key}
                          label={f.label}
                          subtitle={f.subtitle}
                          score={f.data!.score}
                          description={f.data!.description}
                          fortuneArea={f.data!.fortuneArea}
                          advice={f.data!.advice}
                          index={i}
                        />
                      ))}
                  </div>
                </Card>
              )}

              {/* 운세별 종합 점수 */}
              {analysisResult.overallFortuneScores && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37] tracking-wide">운세별 종합 점수</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { label: '재물운', value: analysisResult.overallFortuneScores.wealth, icon: '💰' },
                      { label: '직업·명예운', value: analysisResult.overallFortuneScores.career, icon: '👑' },
                      { label: '연애운', value: analysisResult.overallFortuneScores.love, icon: '🌸' },
                      { label: '건강운', value: analysisResult.overallFortuneScores.health, icon: '🌿' },
                      { label: '가족·부모복', value: analysisResult.overallFortuneScores.family, icon: '🏠' },
                    ].map((item, idx) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-base w-5 shrink-0">{item.icon}</span>
                        <span className="text-xs text-white/50 font-sans w-20 shrink-0">{item.label}</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 + 0.3 }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #C9A227, #F4E4BA)' }}
                          />
                        </div>
                        <span className="text-sm font-bold text-[#D4AF37] font-serif w-8 text-right">{item.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 오관 분석 */}
              {analysisResult.facialFeatures && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37] tracking-wide">오관(五官) 분석</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'ears', label: '귀 (耳)', data: analysisResult.facialFeatures.ears },
                      { key: 'eyebrows', label: '눈썹 (眉)', data: analysisResult.facialFeatures.eyebrows },
                      { key: 'eyes', label: '눈 (目)', data: analysisResult.facialFeatures.eyes },
                      { key: 'nose', label: '코 (鼻)', data: analysisResult.facialFeatures.nose },
                      { key: 'mouth', label: '입 (口)', data: analysisResult.facialFeatures.mouth },
                    ]
                      .filter((f) => f.data)
                      .map((f, i) => (
                        <FeatureCard
                          key={f.key}
                          label={f.label}
                          score={f.data!.score}
                          description={f.data!.description}
                          index={i}
                        />
                      ))}
                  </div>
                </Card>
              )}

              {/* 개선 방법 */}
              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37]">운기 상승 방법</h3>
                  </div>
                  <ul className="space-y-2">
                    {analysisResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-white/60 font-sans font-light">
                        <span className="text-[#D4AF37]/60 mt-0.5 shrink-0">·</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* 상세 분석 */}
              <Card className="card-glass-manse p-5 border-white/5">
                <h3 className="text-sm font-serif font-bold text-[#D4AF37] mb-3">상세 분석</h3>
                <p className="text-sm text-white/60 leading-loose whitespace-pre-wrap font-sans font-light">
                  {analysisResult.currentAnalysis}
                </p>
              </Card>
            </div>

            <ShareSaveButtons
              resultContainerId="face-result-container"
              analysisTitle="관상 분석 결과"
              memberName={targetMember?.name}
            />

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep('upload')
                  setImageBase64('')
                  setAnalysisResult(null)
                  setSelectedGoal('general')
                }}
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:bg-white/5 hover:text-[#D4AF37] h-12"
              >
                다시 분석
              </Button>
              <Button
                onClick={() => router.push('/protected/family')}
                className="flex-1 h-12 font-serif font-bold text-[#0A192F]"
                style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F4E4BA 100%)' }}
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

function PartFeatureCard({
  label,
  subtitle,
  score,
  description,
  fortuneArea,
  advice,
  index,
}: {
  label: string
  subtitle: string
  score: number
  description: string
  fortuneArea: string
  advice: string
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const color = score >= 8 ? '#D4AF37' : score >= 6 ? '#A8C5DA' : '#E8A0A0'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl border border-white/5 bg-white/3 overflow-hidden"
    >
      <button onClick={() => setExpanded((v) => !v)} className="w-full p-3.5 text-left">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-serif font-bold" style={{ color }}>
              {label}
            </span>
            <span className="text-[10px] text-white/30 ml-2 font-sans">{subtitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white/80">
              {score}
              <span className="text-xs text-white/30">/10</span>
            </span>
            <span className="text-[10px] text-white/30">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
        <p className="text-xs text-white/45 leading-relaxed font-sans font-light line-clamp-2">{description}</p>
        <div className="mt-2.5 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(score / 10) * 100}%` }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
            transition={{ duration: 0.9, delay: index * 0.1 + 0.3 }}
          />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (fortuneArea || advice) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="p-3.5 space-y-2">
              {fortuneArea && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#D4AF37]/60 font-sans shrink-0 mt-0.5">운세</span>
                  <span className="text-xs text-white/50 font-sans font-light leading-relaxed">{fortuneArea}</span>
                </div>
              )}
              {advice && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-[#D4AF37]/60 font-sans shrink-0 mt-0.5">개운</span>
                  <span className="text-xs text-[#D4AF37]/70 font-sans font-light leading-relaxed">{advice}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FeatureCard({
  label,
  score,
  description,
  index,
}: {
  label: string
  score: number
  description: string
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl p-3.5 border border-white/5 bg-white/3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-serif font-bold text-[#D4AF37]">{label}</span>
        <span className="text-sm font-bold text-white/80">
          {score}
          <span className="text-xs text-white/30">/10</span>
        </span>
      </div>
      <p className="text-xs text-white/45 leading-relaxed font-sans font-light">{description}</p>
      <div className="mt-2.5 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #C9A227, #F4E4BA)' }}
          transition={{ duration: 0.9, delay: index * 0.1 + 0.3 }}
        />
      </div>
    </motion.div>
  )
}

export default function FaceAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto" />
            <p className="text-white/40 font-sans text-sm">관상 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <FaceAnalysisPageContent />
    </Suspense>
  )
}
