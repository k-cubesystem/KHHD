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
import { analyzePalmReading, type PalmAnalysisResult } from '@/app/actions/ai/image'
import { deductTalisman, getWalletBalance } from '@/app/actions/payment/wallet'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { toast } from 'sonner'
import { ArrowRight, Coins, Hand, TrendingUp, Activity, Heart, Briefcase, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'

type StepType = 'upload' | 'analyzing' | 'result'

const PALM_COST = 2 // 2만냥

function PalmAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
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
        if (!handled) toast.error(deductResult.error || '복채가 부족합니다.')
        return
      }

      const result = await analyzePalmReading(imageBase64)

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
    } catch (error) {
      logger.error('Palm analysis error:', error)
      toast.error('분석 중 예상치 못한 오류가 발생했습니다.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

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
            {/* 복채 잔액 + 비용 배너 */}
            <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#001A0F]/80 to-[#0A192F]/80 p-4 backdrop-blur-sm">
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
                  <span className="text-xs text-[#D4AF37] font-medium">손금 분석</span>
                  <span className="text-xs text-white/50">·</span>
                  <span className="text-sm font-bold text-[#D4AF37] font-serif">{PALM_COST}만냥</span>
                </div>
              </div>
            </div>

            {/* 안내 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Hand className="w-4 h-4 text-[#D4AF37]" />
                <p className="text-xs text-[#D4AF37]/70 font-medium tracking-widest uppercase">촬영 안내</p>
              </div>
              <ul className="space-y-2">
                {[
                  '손바닥이 펼쳐진 상태로 촬영해주세요',
                  '조명이 밝은 곳에서 촬영하면 더 정확합니다',
                  '손금이 잘 보이도록 손을 편하게 펼쳐주세요',
                  '왼손 또는 오른손 중 편한 손을 선택하세요',
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
            <AnalyzingAnimation type="palmReading" message="삼대 주선(主線)을 판독하고 있습니다..." />
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
              {/* 스코어 헤더 */}
              <div
                className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 p-8 text-center"
                style={{ background: 'linear-gradient(135deg, #000D06 0%, #001A0E 50%, #000A04 100%)' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15),transparent_70%)]" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                <p className="relative text-[10px] tracking-[0.3em] text-[#D4AF37]/50 uppercase mb-3 font-sans">
                  손금 분석 결과
                </p>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="relative text-2xl font-serif font-bold mb-2"
                  style={{
                    background: 'linear-gradient(180deg, #F4E4BA 0%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  분석 완료
                </motion.div>
              </div>

              {/* 4대 운세 (텍스트 분석) */}
              {analysisResult.fortuneOverview && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <h3 className="text-sm font-serif font-bold text-[#D4AF37] mb-4 tracking-wide">사대운세(四大運勢)</h3>
                  <div className="space-y-3">
                    {[
                      {
                        icon: TrendingUp,
                        label: '재물운',
                        value: analysisResult.fortuneOverview.wealth,
                        color: '#4ade80',
                      },
                      {
                        icon: Activity,
                        label: '건강운',
                        value: analysisResult.fortuneOverview.health,
                        color: '#60a5fa',
                      },
                      { icon: Heart, label: '애정운', value: analysisResult.fortuneOverview.love, color: '#fb7185' },
                      {
                        icon: Briefcase,
                        label: '직업운',
                        value: analysisResult.fortuneOverview.career,
                        color: '#c084fc',
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-xl p-4 border border-white/5 bg-white/3"
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
              )}

              {/* 삼대 주선 */}
              {analysisResult.palmLines && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <h3 className="text-sm font-serif font-bold text-[#D4AF37] mb-4 tracking-wide">
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

              {/* 상세 분석 */}
              <Card className="card-glass-manse p-5 border-white/5">
                <h3 className="text-sm font-serif font-bold text-[#D4AF37] mb-3">상세 분석</h3>
                <p className="text-sm text-white/60 leading-loose whitespace-pre-wrap font-sans font-light">
                  {analysisResult.currentAnalysis}
                </p>
              </Card>
            </div>

            <ShareSaveButtons
              resultContainerId="palm-result-container"
              analysisTitle="손금 분석"
              memberName={targetMember?.name}
            />

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep('upload')
                  setImageBase64('')
                  setAnalysisResult(null)
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
  const color = assessment === '좋음' ? '#D4AF37' : assessment === '보통' ? '#A8C5DA' : '#E8A0A0'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl p-4 border border-white/5 bg-white/3"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-serif font-bold text-[#D4AF37]">{label}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
          {assessment}
        </span>
      </div>
      <p className="text-xs text-white/45 leading-relaxed font-sans font-light">{description}</p>
      {meaning && <p className="text-xs text-white/35 leading-relaxed font-sans font-light mt-1.5 italic">{meaning}</p>}
    </motion.div>
  )
}

export default function PalmAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto" />
            <p className="text-white/40 font-sans text-sm">손금 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <PalmAnalysisPageContent />
    </Suspense>
  )
}
