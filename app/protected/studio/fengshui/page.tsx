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
  analyzeInteriorForFengshui,
  type InteriorAnalysisResult,
  type InteriorTheme,
  checkAndDeductCredits,
} from '@/app/actions/ai/image'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import {
  getFamilyWithMissions,
  type FamilyMemberWithMissions,
} from '@/app/actions/user/family-missions'
import { toast } from 'sonner'
import { ArrowRight, ChevronLeft, Sparkles, Leaf, Zap, Home } from 'lucide-react'
import { motion } from 'framer-motion'

type StepType = 'upload' | 'analyzing' | 'result'

const ROOM_TYPES = [
  { value: '거실', label: '거실' },
  { value: '침실', label: '침실' },
  { value: '서재', label: '서재' },
  { value: '주방', label: '주방' },
  { value: '화장실', label: '화장실' },
  { value: '현관', label: '현관' },
]

function FengShuiAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
  const [selectedTheme, setSelectedTheme] = useState<InteriorTheme>('general')
  const [selectedRoom, setSelectedRoom] = useState<string>('거실')
  const [targetMember, setTargetMember] = useState<FamilyMemberWithMissions | null>(null)
  const [imageBase64, setImageBase64] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<InteriorAnalysisResult | null>(null)
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
      toast.error('공간 사진을 먼저 업로드해주세요.')
      return
    }

    setLoading(true)
    setStep('analyzing')

    try {
      // Check and deduct credits (7 credits for feng shui)
      if (targetId) {
        const {
          data: { user },
        } = await (await import('@/lib/supabase/client')).createClient().auth.getUser()
        if (user) {
          const creditResult = await checkAndDeductCredits(user.id, 7)
          if (!creditResult.success) {
            toast.error(creditResult.error || '크레딧이 부족합니다.')
            setLoading(false)
            setStep('upload')
            return
          }
        }
      }

      // Analyze interior
      const result = await analyzeInteriorForFengshui(imageBase64, selectedTheme, selectedRoom)

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
          category: 'FENGSHUI',
          inputData: {
            theme: selectedTheme,
            roomType: selectedRoom,
            imageUrl: `data:image/jpeg;base64,${imageBase64}`,
          },
          resultData: {
            analysis: result.currentAnalysis,
            problems: result.problems,
            shoppingList: result.shoppingList,
          },
          creditsUsed: 7,
        })
      }

      setStep('result')
    } catch (error) {
      console.error('Feng shui analysis error:', error)
      toast.error('분석 중 예상치 못한 오류가 발생했습니다.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudioAnalysisLayout category="FENGSHUI" targetMember={targetMember}>
      {/* Step: Upload + Theme Selection */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
            <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-3">📸 공간 사진 안내</h3>
            <ul className="space-y-2 text-sm text-white/70 font-sans">
              <li>• 방 전체가 잘 보이도록 넓게 촬영하세요</li>
              <li>• 가구 배치와 레이아웃이 명확하게 보여야 합니다</li>
              <li>• 자연광이 있는 낮 시간대에 촬영하면 좋습니다</li>
              <li>• 여러 각도에서 찍으면 더 정확합니다</li>
            </ul>
          </Card>

          <ImageCapture onImageCapture={handleImageCapture} maxSizeMB={10} />

          {/* Room Type Selection */}
          <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
            <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">🏠 공간 유형 선택</h3>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_TYPES.map((room) => (
                <button
                  key={room.value}
                  onClick={() => setSelectedRoom(room.value)}
                  className={`p-3 rounded-lg text-sm font-sans transition-all ${
                    selectedRoom === room.value
                      ? 'bg-[#D4AF37] text-[#0A192F] font-semibold'
                      : 'bg-black/20 text-white/70 border border-white/10 hover:border-[#D4AF37]/50'
                  }`}
                >
                  {room.label}
                </button>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleStartAnalysis}
            disabled={!imageBase64 || loading}
            className="w-full h-14 text-lg bg-[#D4AF37] text-[#0A192F] 
              hover:bg-[#F4E4BA] font-serif font-bold
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '분석 중...' : '풍수 분석 시작'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <AnalyzingAnimation type="qiFlow" message="공간의 기(氣) 흐름을 분석하고 있습니다..." />
      )}

      {/* Step: Result */}
      {step === 'result' && analysisResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Result Container for Screenshot */}
          <div id="fengshui-result-container" className="space-y-6">
            {/* Selected Options */}
            <Card className="card-glass-manse p-4 border-[#D4AF37]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white`}
                  >
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#D4AF37] font-serif">
                      종합 풍수 분석
                    </p>
                    <p className="text-xs text-white/60 font-sans">{selectedRoom}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Problems */}
            {analysisResult.problems && analysisResult.problems.length > 0 && (
              <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
                <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">
                  ⚠️ 풍수적 문제점
                </h3>
                <ul className="space-y-2">
                  {analysisResult.problems.map((problem, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-white/70 font-sans"
                    >
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{problem}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Shopping List */}
            {analysisResult.shoppingList && analysisResult.shoppingList.length > 0 && (
              <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
                <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">
                  🛒 필요한 아이템
                </h3>
                <ul className="space-y-2">
                  {analysisResult.shoppingList.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-white/70 font-sans"
                    >
                      <span className="text-[#D4AF37] mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Full Analysis */}
            <Card className="card-glass-manse p-6 border-[#D4AF37]/20">
              <h3 className="text-lg font-serif font-bold text-[#D4AF37] mb-4">
                상세 분석 및 개선 방향
              </h3>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-white/70 leading-relaxed whitespace-pre-wrap font-sans">
                  {analysisResult.currentAnalysis}
                </p>
              </div>
            </Card>
          </div>

          {/* Share/Save Buttons */}
          <ShareSaveButtons
            resultContainerId="fengshui-result-container"
            analysisTitle={`풍수 분석 (${selectedRoom})`}
            memberName={targetMember?.name}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setStep('upload')
                setImageBase64('')
                setAnalysisResult(null)
                setSelectedTheme('general')
                setSelectedRoom('거실')
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

export default function FengShuiAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto"></div>
            <p className="text-white/60 font-sans">풍수 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <FengShuiAnalysisPageContent />
    </Suspense>
  )
}
