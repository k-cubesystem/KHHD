'use client'

import { StudioAnalysisLayout } from '@/components/studio/studio-analysis-layout'
import { ImageCapture } from '@/components/studio/image-capture'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import {
  analyzePalmReading,
  type PalmAnalysisResult,
  checkAndDeductCredits,
} from '@/app/actions/ai/image'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import {
  getFamilyWithMissions,
  type FamilyMemberWithMissions,
} from '@/app/actions/user/family-missions'
import { toast } from 'sonner'
import { ArrowRight, ChevronLeft, Heart, TrendingUp, Activity, Briefcase } from 'lucide-react'
import { motion } from 'framer-motion'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'

type StepType = 'upload' | 'analyzing' | 'result'

function PalmAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
  const [targetMember, setTargetMember] = useState<FamilyMemberWithMissions | null>(null)
  const [imageBase64, setImageBase64] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<PalmAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Load target member
  useEffect(() => {
    if (!targetId) return

    const loadMember = async () => {
      const members = await getFamilyWithMissions()
      const member = members.find((m) => m.id === targetId)
      if (member) {
        setTargetMember(member)
      }
    }

    loadMember()
  }, [targetId])

  const handleImageCapture = (base64: string) => {
    setImageBase64(base64)
  }

  const handleStartAnalysis = async () => {
    if (!imageBase64) {
      toast.error('손바닥 사진을 먼저 업로드해주세요.')
      return
    }

    setLoading(true)
    setStep('analyzing')

    try {
      // Check and deduct credits (3 credits for palm reading)
      if (targetId) {
        const {
          data: { user },
        } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
        if (user) {
          const creditResult = await checkAndDeductCredits(user.id, 3)
          if (!creditResult.success) {
            toast.error(creditResult.error || '크레딧이 부족합니다.')
            setLoading(false)
            setStep('upload')
            return
          }
        }
      }

      // Analyze palm
      const result = await analyzePalmReading(imageBase64)

      if (!result.success) {
        toast.error(result.error || '분석 중 오류가 발생했습니다.')
        setLoading(false)
        setStep('upload')
        return
      }

      setAnalysisResult(result)

      // Save to DB (family members only)
      if (targetId) {
        await saveAnalysisSession({
          targetMemberId: targetId,
          category: 'HAND',
          inputData: {
            imageUrl: `data:image/jpeg;base64,${imageBase64}`,
          },
          resultData: {
            score: result.currentScore,
            analysis: result.currentAnalysis,
            palmLines: result.palmLines,
            fortuneScores: result.fortuneScores,
            confidence: result.confidence,
          },
          creditsUsed: 3,
        })
      }

      setStep('result')
    } catch (error) {
      console.error('Palm analysis error:', error)
      toast.error('분석 중 예상치 못한 오류가 발생했습니다.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudioAnalysisLayout category="HAND" targetMember={targetMember}>
      {/* Step: Upload */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="card-glass-manse p-6 border-white/10">
            <h3 className="text-lg font-serif font-light text-primary mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-primary inline-block rounded-sm" />
              손바닥 사진 안내
            </h3>
            <ul className="space-y-3 text-sm text-ink-light/70 font-sans font-light">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                손바닥이 펼쳐진 상태로 촬영해주세요
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                조명이 밝은 곳에서 촬영하면 더 정확합니다
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                손금이 잘 보이도록 손을 편하게 펼쳐주세요
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                왼손 또는 오른손 중 편한 손을 촬영하세요
              </li>
            </ul>
          </Card>

          <ImageCapture onImageCapture={handleImageCapture} maxSizeMB={10} />

          <Button
            onClick={handleStartAnalysis}
            disabled={!imageBase64 || loading}
            className="w-full h-14 text-lg bg-primary text-background 
              hover:bg-primary/90 font-serif font-bold tracking-wide
              disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {loading ? '분석 중...' : '손금 분석 시작'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <AnalyzingAnimation type="palmReading" message="손금을 판독하고 있습니다..." />
      )}

      {/* Step: Result */}
      {step === 'result' && analysisResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Result Container for Screenshot */}
          <div id="palm-result-container" className="space-y-6">
            {/* Overall Score */}
            <Card className="card-glass-manse p-8 border-primary/20 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full transform scale-75 pointer-events-none" />
              <p className="text-sm text-primary/80 mb-2 font-serif tracking-widest uppercase">
                Total Score
              </p>
              <div className="text-7xl font-serif font-bold text-primary mb-2 gold-glow">
                {analysisResult.currentScore}
              </div>
              <p className="text-xs text-ink-light/40 font-sans font-light">
                신뢰도: {analysisResult.confidence}%
              </p>
            </Card>

            {/* Fortune Scores */}
            {analysisResult.fortuneScores && (
              <Card className="card-glass-manse p-6 border-white/5">
                <h3 className="text-lg font-serif font-light text-primary mb-4">4대 운세 점수</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FortuneScoreCard
                    icon={TrendingUp}
                    label="재물운"
                    score={analysisResult.fortuneScores.wealth}
                    color="text-emerald-400"
                  />
                  <FortuneScoreCard
                    icon={Activity}
                    label="건강운"
                    score={analysisResult.fortuneScores.health}
                    color="text-blue-400"
                  />
                  <FortuneScoreCard
                    icon={Heart}
                    label="애정운"
                    score={analysisResult.fortuneScores.love}
                    color="text-rose-400"
                  />
                  <FortuneScoreCard
                    icon={Briefcase}
                    label="직업운"
                    score={analysisResult.fortuneScores.career}
                    color="text-purple-400"
                  />
                </div>
              </Card>
            )}

            {/* Palm Lines */}
            {analysisResult.palmLines && (
              <Card className="card-glass-manse p-6 border-white/5">
                <h3 className="text-lg font-serif font-light text-primary mb-4">삼대 주선 분석</h3>
                <div className="space-y-4">
                  <PalmLineCard
                    label="생명선 (生命線)"
                    score={analysisResult.palmLines.lifeLine?.score || 0}
                    description={analysisResult.palmLines.lifeLine?.description || ''}
                  />
                  <PalmLineCard
                    label="지능선 (知能線)"
                    score={analysisResult.palmLines.intelligenceLine?.score || 0}
                    description={analysisResult.palmLines.intelligenceLine?.description || ''}
                  />
                  <PalmLineCard
                    label="감정선 (感情線)"
                    score={analysisResult.palmLines.emotionLine?.score || 0}
                    description={analysisResult.palmLines.emotionLine?.description || ''}
                  />
                </div>
              </Card>
            )}

            {/* Full Analysis */}
            <Card className="card-glass-manse p-6 border-white/5">
              <h3 className="text-lg font-serif font-light text-primary mb-4">상세 분석</h3>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-ink-light/80 leading-loose whitespace-pre-wrap font-sans font-light tracking-wide">
                  {analysisResult.currentAnalysis}
                </p>
              </div>
            </Card>
          </div>

          {/* Share/Save Buttons */}
          <ShareSaveButtons
            resultContainerId="palm-result-container"
            analysisTitle="손금 분석"
            memberName={targetMember?.name}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setStep('upload')
                setImageBase64('')
                setAnalysisResult(null)
              }}
              variant="outline"
              className="flex-1 border-white/10 text-ink-light hover:bg-white/5 hover:text-primary h-12"
            >
              다시 분석하기
            </Button>
            <Button
              onClick={() => router.push('/protected/family')}
              className="flex-1 bg-primary text-background hover:bg-primary/90 font-semibold h-12"
            >
              완료
            </Button>
          </div>
        </motion.div>
      )}
    </StudioAnalysisLayout>
  )
}

export default function PalmAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-ink-light/60 font-sans font-light">손금 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <PalmAnalysisPageContent />
    </Suspense>
  )
}

// Helper Components
function FortuneScoreCard({
  icon: Icon,
  label,
  score,
  color, // Keep color prop for specific fortune types, but maybe map them to theme if needed
}: {
  icon: any
  label: string
  score: number
  color: string
}) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-ink-light/70 font-sans">{label}</span>
      </div>
      <div className={`text-3xl font-serif font-bold ${color}`}>{score}</div>
      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          className={`h-full ${color.replace('text-', 'bg-')}`}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
    </div>
  )
}

function PalmLineCard({
  label,
  score,
  description,
}: {
  label: string
  score: number
  description: string
}) {
  return (
    <div className="bg-white/5 rounded-xl p-5 border border-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-serif font-bold text-primary">{label}</span>
        <span className="text-lg font-bold text-ink-light">{score}/10</span>
      </div>
      <p className="text-sm text-ink-light/60 leading-relaxed font-sans font-light">
        {description}
      </p>
      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          className="h-full bg-primary"
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </div>
  )
}
