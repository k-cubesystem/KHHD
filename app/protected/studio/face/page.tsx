'use client'

import { StudioAnalysisLayout } from '@/components/studio/studio-analysis-layout'
import { ImageCapture } from '@/components/studio/image-capture'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import {
  analyzeFaceForDestiny,
  type FaceAnalysisResult,
  type FaceDestinyGoal,
  checkAndDeductCredits,
} from '@/app/actions/ai/image'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import {
  getFamilyWithMissions,
  type FamilyMemberWithMissions,
} from '@/app/actions/user/family-missions'
import { toast } from 'sonner'
import { ArrowRight, ChevronLeft, Crown, Heart, Flame } from 'lucide-react'
import { motion } from 'framer-motion'

type StepType = 'upload' | 'analyzing' | 'result'

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
      toast.error('얼굴 사진을 먼저 업로드해주세요.')
      return
    }

    setLoading(true)
    setStep('analyzing')

    try {
      // Check and deduct credits (5 credits for face reading)
      if (targetId) {
        const {
          data: { user },
        } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
        if (user) {
          const creditResult = await checkAndDeductCredits(user.id, 5)
          if (!creditResult.success) {
            toast.error(creditResult.error || '크레딧이 부족합니다.')
            setLoading(false)
            setStep('upload')
            return
          }
        }
      }

      // Analyze face
      const result = await analyzeFaceForDestiny(imageBase64, selectedGoal)

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
          category: 'FACE',
          inputData: {
            goal: selectedGoal,
            imageUrl: `data:image/jpeg;base64,${imageBase64}`,
          },
          resultData: {
            score: result.currentScore,
            analysis: result.currentAnalysis,
            facialFeatures: result.facialFeatures,
            confidence: result.confidence,
            recommendations: result.recommendations,
          },
          creditsUsed: 5,
        })
      }

      setStep('result')
    } catch (error) {
      console.error('Face analysis error:', error)
      toast.error('분석 중 예상치 못한 오류가 발생했습니다.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudioAnalysisLayout category="FACE" targetMember={targetMember}>
      {/* Step: Upload + Goal Selection */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
            <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-3">📸 얼굴 사진 안내</h3>
            <ul className="space-y-2 text-sm text-white/70 font-sans">
              <li>• 정면을 보고 자연스러운 표정으로 촬영하세요</li>
              <li>• 조명이 밝은 곳에서 촬영하면 더 정확합니다</li>
              <li>• 얼굴 전체가 잘 보이도록 촬영하세요</li>
              <li>• 선글라스나 마스크는 벗어주세요</li>
            </ul>
          </Card>

          <ImageCapture onImageCapture={handleImageCapture} maxSizeMB={10} />

          <Button
            onClick={handleStartAnalysis}
            disabled={!imageBase64 || loading}
            className="w-full h-14 text-lg bg-[#D4AF37] text-[#0A192F] 
              hover:bg-[#F4E4BA] font-serif font-bold
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '분석 중...' : '관상 분석 시작'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <AnalyzingAnimation type="faceScanning" message="관상 특징을 분석하고 있습니다..." />
      )}

      {/* Step: Result */}
      {step === 'result' && analysisResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Result Container for Screenshot */}
          <div id="face-result-container" className="space-y-6">
            {/* Overall Score */}
            <Card className="card-glass-manse p-6 border-[#D4AF37]/30 text-center">
              <p className="text-sm text-white/60 mb-2 font-sans">관상 점수</p>
              <div className="text-6xl font-serif font-bold text-[#D4AF37] mb-2">
                {analysisResult.currentScore}
              </div>
              <p className="text-xs text-white/50 font-sans">
                신뢰도: {analysisResult.confidence}%
              </p>
            </Card>

            {/* Facial Features */}
            {analysisResult.facialFeatures && (
              <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
                <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">
                  오관(五官) 분석
                </h3>
                <div className="space-y-3">
                  {analysisResult.facialFeatures.ears && (
                    <FeatureCard
                      label="귀 (耳)"
                      score={analysisResult.facialFeatures.ears.score}
                      description={analysisResult.facialFeatures.ears.description}
                    />
                  )}
                  {analysisResult.facialFeatures.eyebrows && (
                    <FeatureCard
                      label="눈썹 (眉)"
                      score={analysisResult.facialFeatures.eyebrows.score}
                      description={analysisResult.facialFeatures.eyebrows.description}
                    />
                  )}
                  {analysisResult.facialFeatures.eyes && (
                    <FeatureCard
                      label="눈 (目)"
                      score={analysisResult.facialFeatures.eyes.score}
                      description={analysisResult.facialFeatures.eyes.description}
                    />
                  )}
                  {analysisResult.facialFeatures.nose && (
                    <FeatureCard
                      label="코 (鼻)"
                      score={analysisResult.facialFeatures.nose.score}
                      description={analysisResult.facialFeatures.nose.description}
                    />
                  )}
                  {analysisResult.facialFeatures.mouth && (
                    <FeatureCard
                      label="입 (口)"
                      score={analysisResult.facialFeatures.mouth.score}
                      description={analysisResult.facialFeatures.mouth.description}
                    />
                  )}
                </div>
              </Card>
            )}

            {/* Recommendations */}
            {analysisResult.recommendations && (
              <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
                <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">💡 개선 방법</h3>
                <ul className="space-y-2">
                  {analysisResult.recommendations.map((rec, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-white/70 font-sans"
                    >
                      <span className="text-[#D4AF37] mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Full Analysis */}
            <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
              <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">상세 분석</h3>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
                  {analysisResult.currentAnalysis}
                </p>
              </div>
            </Card>
          </div>

          {/* Share/Save Buttons */}
          <ShareSaveButtons
            resultContainerId="face-result-container"
            analysisTitle={`관상 분석 결과`}
            memberName={targetMember?.name}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setStep('upload')
                setImageBase64('')
                setAnalysisResult(null)
                setSelectedGoal('general') // Reset to default
              }}
              variant="outline"
              className="flex-1 border-[#D4AF37]/30 text-white hover:bg-[#D4AF37]/10"
            >
              다시 분석하기
            </Button>
            <Button
              onClick={() => router.push('/protected/family')}
              className="flex-1 bg-[#D4AF37] text-[#0A192F] hover:bg-[#F4E4BA] font-semibold"
            >
              완료
            </Button>
          </div>
        </motion.div>
      )}
    </StudioAnalysisLayout>
  )
}

// Helper Component
function FeatureCard({
  label,
  score,
  description,
}: {
  label: string
  score: number
  description: string
}) {
  return (
    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[#D4AF37] font-serif">{label}</span>
        <span className="text-lg font-bold text-white">{score}/10</span>
      </div>
      <p className="text-xs text-white/60 leading-relaxed font-sans">{description}</p>
      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          className="h-full bg-gradient-to-r from-[#D4AF37]/60 to-[#D4AF37]"
          transition={{ duration: 0.8, delay: 0.1 * score }}
        />
      </div>
    </div>
  )
}

export default function FaceAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto"></div>
            <p className="text-white/60 font-sans">관상 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <FaceAnalysisPageContent />
    </Suspense>
  )
}
