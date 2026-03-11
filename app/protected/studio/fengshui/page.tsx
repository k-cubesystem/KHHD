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
import {
  analyzeInteriorForFengshui,
  type InteriorAnalysisResult,
  type InteriorTheme,
  type DirectionAnalysis,
  type RoomRecommendation,
  type PlacementSuggestion,
} from '@/app/actions/ai/image'
import { deductTalisman, getWalletBalance } from '@/app/actions/payment/wallet'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { toast } from 'sonner'
import {
  ArrowRight,
  Coins,
  Compass,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  Wind,
  MapPin,
  Home,
  Layers,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'

type StepType = 'upload' | 'analyzing' | 'result'

const FENGSHUI_COST = 2 // 2만냥

const ROOM_TYPES = [
  { value: '거실', emoji: '🛋' },
  { value: '침실', emoji: '🛏' },
  { value: '서재', emoji: '📚' },
  { value: '주방', emoji: '🍳' },
  { value: '화장실', emoji: '🚿' },
  { value: '현관', emoji: '🚪' },
]

function FengShuiAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
  const [selectedTheme] = useState<InteriorTheme>('general')
  const [selectedRoom, setSelectedRoom] = useState<string>('거실')
  const [targetMember, setTargetMember] = useState<FamilyMemberWithMissions | null>(null)
  const [imageBase64, setImageBase64] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<InteriorAnalysisResult | null>(null)
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
      toast.error('공간 사진을 먼저 업로드해주세요.')
      return
    }

    const canProceed = await checkQuota()
    if (!canProceed) return

    setLoading(true)
    setStep('analyzing')

    try {
      const deductResult = await deductTalisman('FENGSHUI', FENGSHUI_COST)
      if (!deductResult.success) {
        setLoading(false)
        setStep('upload')
        const handled = handleDeductResult(deductResult, {
          currentBalance: balance ?? 0,
          requiredAmount: FENGSHUI_COST,
          featureLabel: '풍수 분석',
        })
        if (!handled) toast.error(deductResult.error || '복채가 부족합니다.')
        return
      }

      const result = await analyzeInteriorForFengshui(imageBase64, selectedTheme, selectedRoom)

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
          creditsUsed: FENGSHUI_COST,
        })
      }

      setStep('result')
    } catch (error) {
      logger.error('Feng shui analysis error:', error)
      toast.error('분석 중 예상치 못한 오류가 발생했습니다.')
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudioAnalysisLayout category="FENGSHUI" targetMember={targetMember}>
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
            <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#000D1A]/80 to-[#0A0A1F]/80 p-4 backdrop-blur-sm">
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
                  <span className="text-xs text-[#D4AF37] font-medium">풍수 분석</span>
                  <span className="text-xs text-white/50">·</span>
                  <span className="text-sm font-bold text-[#D4AF37] font-serif">{FENGSHUI_COST}만냥</span>
                </div>
              </div>
            </div>

            {/* 공간 유형 선택 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-[#D4AF37]" />
                <p className="text-xs text-[#D4AF37]/70 font-medium tracking-widest uppercase">공간 유형 선택</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ROOM_TYPES.map((room) => (
                  <button
                    key={room.value}
                    onClick={() => setSelectedRoom(room.value)}
                    className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                      selectedRoom === room.value
                        ? 'border-[#D4AF37]/60 bg-[#D4AF37]/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                        : 'border-white/5 bg-white/3 hover:border-white/15'
                    }`}
                  >
                    <div className="text-xl mb-1">{room.emoji}</div>
                    <p
                      className={`text-xs font-sans ${selectedRoom === room.value ? 'text-[#D4AF37] font-semibold' : 'text-white/50'}`}
                    >
                      {room.value}
                    </p>
                  </button>
                ))}
              </div>
            </Card>

            {/* 촬영 안내 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Wind className="w-4 h-4 text-[#D4AF37]" />
                <p className="text-xs text-[#D4AF37]/70 font-medium tracking-widest uppercase">촬영 안내</p>
              </div>
              <ul className="space-y-2">
                {[
                  '방 전체가 잘 보이도록 넓게 촬영하세요',
                  '가구 배치와 레이아웃이 명확하게 보여야 합니다',
                  '자연광이 있는 낮 시간대에 촬영하면 좋습니다',
                  '여러 각도에서 찍으면 더 정확합니다',
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
                    풍수 분석 시작 · {FENGSHUI_COST}만냥
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </span>
            </button>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingAnimation type="qiFlow" message="공간의 기(氣) 흐름을 분석하고 있습니다..." />
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
            <div id="fengshui-result-container" className="space-y-5">
              {/* 헤더 배너 */}
              <div
                className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 p-6"
                style={{ background: 'linear-gradient(135deg, #00050D 0%, #000D1A 50%, #000508 100%)' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12),transparent_70%)]" />
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                      <Compass className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.25em] text-[#D4AF37]/50 uppercase font-sans">
                        공간 풍수 분석
                      </p>
                      <p className="text-lg font-serif font-bold text-[#D4AF37]">{selectedRoom} 풍수 진단</p>
                    </div>
                  </div>
                  {analysisResult.overallQiScore !== undefined && (
                    <div className="text-right">
                      <p className="text-[10px] text-[#D4AF37]/40 font-sans">기운 점수</p>
                      <p
                        className="text-3xl font-serif font-bold"
                        style={{
                          background: 'linear-gradient(180deg, #F4E4BA 0%, #D4AF37 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {analysisResult.overallQiScore}
                      </p>
                    </div>
                  )}
                </div>
                {(analysisResult.dominantElement || analysisResult.luckyDirection) && (
                  <div className="relative mt-4 flex gap-3">
                    {analysisResult.dominantElement && (
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
                        <span className="text-[10px] text-white/30 font-sans">지배오행</span>
                        <span className="text-xs font-bold text-[#D4AF37] font-serif">
                          {analysisResult.dominantElement}
                        </span>
                      </div>
                    )}
                    {analysisResult.luckyDirection && (
                      <div className="flex items-center gap-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-3 py-1">
                        <span className="text-[10px] text-white/30 font-sans">길한 방위</span>
                        <span className="text-xs font-bold text-[#D4AF37] font-serif">
                          {analysisResult.luckyDirection}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 8방위 길흉 분석 */}
              {analysisResult.directionalAnalysis && analysisResult.directionalAnalysis.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37] tracking-wide">
                      8방위(八方位) 길흉 분석
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {analysisResult.directionalAnalysis.map((dir, idx) => (
                      <DirectionCard key={idx} dir={dir} index={idx} />
                    ))}
                  </div>
                </Card>
              )}

              {/* 공간별 맞춤 추천 */}
              {analysisResult.roomRecommendations && analysisResult.roomRecommendations.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Home className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37] tracking-wide">공간별 맞춤 추천</h3>
                  </div>
                  <div className="space-y-3">
                    {analysisResult.roomRecommendations.map((room, idx) => (
                      <RoomRecommendationCard key={idx} room={room} index={idx} />
                    ))}
                  </div>
                </Card>
              )}

              {/* 배치 제안 */}
              {analysisResult.placementSuggestions && analysisResult.placementSuggestions.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37] tracking-wide">
                      가구·화분·수석 배치 제안
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {analysisResult.placementSuggestions.map((p, idx) => (
                      <PlacementCard key={idx} placement={p} index={idx} />
                    ))}
                  </div>
                </Card>
              )}

              {/* 풍수적 문제점 */}
              {analysisResult.problems && analysisResult.problems.length > 0 && (
                <Card className="card-glass-manse p-5 border-red-900/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-serif font-bold text-amber-400">풍수 문제점</h3>
                  </div>
                  <ul className="space-y-2">
                    {analysisResult.problems.map((problem, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className="flex items-start gap-2 text-sm text-white/60 font-sans font-light"
                      >
                        <span className="text-amber-400/60 mt-0.5 shrink-0">▸</span>
                        <span>{problem}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* 필요 아이템 */}
              {analysisResult.shoppingList && analysisResult.shoppingList.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-serif font-bold text-[#D4AF37]">기운 전환 아이템</h3>
                  </div>
                  <ul className="space-y-2">
                    {analysisResult.shoppingList.map((item, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.07 }}
                        className="flex items-start gap-2 text-sm text-white/60 font-sans font-light"
                      >
                        <span className="text-[#D4AF37]/60 mt-0.5 shrink-0">✓</span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* 상세 분석 */}
              <Card className="card-glass-manse p-5 border-white/5">
                <h3 className="text-sm font-serif font-bold text-[#D4AF37] mb-3">상세 분석 및 개선 방향</h3>
                <p className="text-sm text-white/60 leading-loose whitespace-pre-wrap font-sans font-light">
                  {analysisResult.currentAnalysis}
                </p>
              </Card>
            </div>

            <ShareSaveButtons
              resultContainerId="fengshui-result-container"
              analysisTitle={`풍수 분석 (${selectedRoom})`}
              memberName={targetMember?.name}
            />

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep('upload')
                  setImageBase64('')
                  setAnalysisResult(null)
                  setSelectedRoom('거실')
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

function DirectionCard({ dir, index }: { dir: DirectionAnalysis; index: number }) {
  const fortuneColor = dir.fortune === 'good' ? '#D4AF37' : dir.fortune === 'bad' ? '#E8A0A0' : '#A8C5DA'
  const fortuneBg =
    dir.fortune === 'good'
      ? 'rgba(212,175,55,0.08)'
      : dir.fortune === 'bad'
        ? 'rgba(232,160,160,0.08)'
        : 'rgba(168,197,218,0.08)'
  const fortuneBorder =
    dir.fortune === 'good'
      ? 'rgba(212,175,55,0.2)'
      : dir.fortune === 'bad'
        ? 'rgba(232,160,160,0.2)'
        : 'rgba(168,197,218,0.15)'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl p-3 border"
      style={{ background: fortuneBg, borderColor: fortuneBorder }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-serif font-bold" style={{ color: fortuneColor }}>
          {dir.direction}
        </span>
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] font-sans px-1.5 py-0.5 rounded-full"
            style={{ background: fortuneBg, color: fortuneColor, border: `1px solid ${fortuneBorder}` }}
          >
            {dir.fortuneLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] text-white/30 font-sans">오행</span>
        <span className="text-[10px] font-bold font-serif" style={{ color: fortuneColor }}>
          {dir.element}
        </span>
      </div>
      {dir.recommendation && (
        <p className="text-[10px] text-white/50 font-sans font-light leading-relaxed line-clamp-2">
          추천: {dir.recommendation}
        </p>
      )}
    </motion.div>
  )
}

function RoomRecommendationCard({ room, index }: { room: RoomRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const roomEmojis: Record<string, string> = { 거실: '🛋', 침실: '🛏', 주방: '🍳', 현관: '🚪' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl border border-white/5 bg-white/3 overflow-hidden"
    >
      <button onClick={() => setExpanded((v) => !v)} className="w-full p-3.5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{roomEmojis[room.room] ?? '🏠'}</span>
            <div>
              <span className="text-sm font-serif font-bold text-[#D4AF37]">{room.room}</span>
              {room.luckyColor && (
                <span className="text-[10px] text-white/30 ml-2 font-sans">행운 색상: {room.luckyColor}</span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-white/30">{expanded ? '▲' : '▼'}</span>
        </div>
        {room.chiFlow && <p className="text-xs text-white/40 mt-1.5 font-sans font-light">{room.chiFlow}</p>}
        {room.mainIssue && <p className="text-xs text-amber-400/60 mt-1 font-sans font-light">▸ {room.mainIssue}</p>}
      </button>
      <AnimatePresence>
        {expanded && (room.improvements.length > 0 || room.luckyItems.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/5 overflow-hidden"
          >
            <div className="p-3.5 space-y-3">
              {room.improvements.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#D4AF37]/60 font-sans mb-1.5">개선 방법</p>
                  <ul className="space-y-1">
                    {room.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/50 font-sans font-light">
                        <span className="text-[#D4AF37]/40 shrink-0">·</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {room.luckyItems.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#D4AF37]/60 font-sans mb-1.5">행운 아이템</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.luckyItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]/80 rounded-full px-2 py-0.5 font-sans"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function PlacementCard({ placement, index }: { placement: PlacementSuggestion; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-xl p-3.5 border border-white/5 bg-white/3"
    >
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-[#D4AF37] font-serif">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-serif font-bold text-[#D4AF37]">{placement.item}</span>
            {placement.position && (
              <span className="text-[10px] text-white/30 font-sans bg-white/5 rounded-full px-2 py-0.5">
                {placement.position}
              </span>
            )}
          </div>
          {placement.reason && (
            <p className="text-xs text-white/45 font-sans font-light leading-relaxed mb-1">{placement.reason}</p>
          )}
          {placement.expectedEffect && (
            <p className="text-xs text-[#D4AF37]/60 font-sans font-light">효과: {placement.expectedEffect}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function FengShuiAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto" />
            <p className="text-white/40 font-sans text-sm">풍수 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <FengShuiAnalysisPageContent />
    </Suspense>
  )
}
