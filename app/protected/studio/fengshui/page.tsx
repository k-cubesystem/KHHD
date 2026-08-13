'use client'

import { StudioAnalysisLayout } from '@/components/studio/studio-analysis-layout'
import { FengshuiSlotGrid, type SlotImageValue } from '@/components/studio/fengshui-slot-grid'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
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
  type FengshuiSubjectType,
} from '@/app/actions/ai/image'
import { getSlotSpec, isWithinUploadBudget } from '@/lib/domain/analysis/fengshui-slots'
import { deductTalisman, getWalletBalance, refundStudioCost } from '@/app/actions/payment/wallet'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { saveAnalysisSession } from '@/app/actions/core/sessions'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { GOLD_500, GOLD_300 } from '@/lib/config/design-tokens'
import { toast } from 'sonner'
import {
  ArrowRight,
  Coins,
  Compass,
  Zap,
  ShoppingBag,
  Sparkles,
  Wind,
  MapPin,
  Home,
  Building2,
  Store,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { trackEvent } from '@/lib/analytics/ga4'
import { JourneyCard } from '@/components/analysis/journey-card'
import { ScoreRing } from '@/components/studio/score-ring'
import { DetailAnalysisAccordion } from '@/components/studio/detail-analysis-accordion'

type StepType = 'upload' | 'analyzing' | 'result'

const FENGSHUI_COST = FEATURE_COST.fengshui.display // 단일 소스 — 표시 = 실차감

// 분석 대상 3택 — 시스템이 "무엇을 찍을지"를 정해준다(A-1)
const SUBJECT_TYPES: { value: FengshuiSubjectType; label: string; icon: typeof Home }[] = [
  { value: 'interior', label: '집 안 공간', icon: Home },
  { value: 'exterior', label: '집·건물 외관', icon: Building2 },
  { value: 'office', label: '사무실·가게', icon: Store },
]

// 대상별 촬영 가이드 문구 전환(A-1)
const CAPTURE_GUIDES: Record<FengshuiSubjectType, string[]> = {
  interior: [
    '📷 카메라 파노라마 모드로 방 전체를 왼쪽→오른쪽 한 바퀴 담으면 가장 정확합니다',
    '일반 사진도 가능 — 가구 배치와 레이아웃이 잘 보이게 넓게 촬영하세요',
    '자연광이 있는 낮 시간대에 촬영하면 좋습니다',
  ],
  exterior: [
    '길 건너편에서 건물 정면 전체가 들어오게 촬영하세요',
    '대문·현관이 보이면 좋습니다',
    '주변 도로·이웃 건물과의 관계가 드러나게 여유 있게 담으세요',
  ],
  office: [
    '📷 입구에서 안쪽을 향해 전체가 보이게 촬영하세요 (파노라마 권장)',
    '책상·계산대 등 자리 배치가 드러나게 담으세요',
    '자연광이 있는 시간대면 더 좋습니다',
  ],
}

// 집의 향(向) — 8방위 + 모름(기본). 실측 향이 있으면 방위 분석의 기준이 된다.
const FACING_OPTIONS = ['모름', '남', '동', '서', '북', '남동', '남서', '북동', '북서'] as const

const SUBJECT_LABEL: Record<FengshuiSubjectType, string> = {
  interior: '실내',
  exterior: '집·건물 외관',
  office: '사무실·가게',
}

function FengShuiAnalysisPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [step, setStep] = useState<StepType>('upload')
  const [selectedTheme] = useState<InteriorTheme>('general')
  const [subjectType, setSubjectType] = useState<FengshuiSubjectType>('interior')
  const [facing, setFacing] = useState<string>('모름')
  const [address, setAddress] = useState<string>('')
  const [showContext, setShowContext] = useState<boolean>(false)
  const [targetMember, setTargetMember] = useState<FamilyMemberWithMissions | null>(null)
  // 슬롯 이미지 — slotId → 압축 이미지(라벨 슬롯). 대상 전환 시 초기화.
  const [slotImages, setSlotImages] = useState<Record<string, SlotImageValue>>({})
  // 결과 표시용 대표 라벨(예: "현관 외 3곳" / "사무실·가게 2곳") — 분석 시점 확정.
  const [analyzedLabel, setAnalyzedLabel] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<InteriorAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)

  const slotSpec = getSlotSpec(subjectType)
  const filledSlotCount = Object.keys(slotImages).length
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

  const handleStartAnalysis = async () => {
    // 채워진 슬롯을 스펙 순서대로 라벨/base64 배열로. 최소 slotSpec.min 장 필요.
    const filledSlots = slotSpec.slots.filter((s) => slotImages[s.id])
    const orderedImages = filledSlots.map((s) => ({ label: s.label, base64: slotImages[s.id]!.base64 }))

    if (orderedImages.length < slotSpec.min) {
      toast.error(`공간 사진을 최소 ${slotSpec.min}장 넣어주세요.`)
      return
    }

    // 총 용량 가드(합산 3.5MB) — 압축 경유 시 사실상 도달 불가하지만 방어한다.
    if (!isWithinUploadBudget(filledSlots.map((s) => slotImages[s.id]!.bytes))) {
      toast.error('사진 용량이 너무 큽니다. 장수를 줄이거나 다른 사진으로 시도해주세요.')
      return
    }

    const canProceed = await checkQuota()
    if (!canProceed) return

    // 대표/표시 라벨 — 대표 슬롯 라벨(roomType 하위호환) + 여러 장이면 "외 N곳".
    const primaryImageLabel = orderedImages[0]!.label
    const extraCount = orderedImages.length - 1
    const displayLabel =
      subjectType === 'interior'
        ? extraCount > 0
          ? `${primaryImageLabel} 외 ${extraCount}곳`
          : primaryImageLabel
        : extraCount > 0
          ? `${SUBJECT_LABEL[subjectType]} ${orderedImages.length}곳`
          : SUBJECT_LABEL[subjectType]
    setAnalyzedLabel(displayLabel)

    trackEvent({
      action: 'fengshui_analyze_start',
      category: 'analysis',
      label: subjectType,
      value: orderedImages.length,
    })

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

      // roomType 자리에 대표 슬롯 라벨을 넣어 프롬프트 문맥을 맞춘다(하위호환)
      const roomTypeForAnalysis = primaryImageLabel

      const result = await analyzeInteriorForFengshui(
        orderedImages[0]!.base64,
        selectedTheme,
        roomTypeForAnalysis,
        targetMember
          ? { id: targetMember.id, name: targetMember.name, relation: targetMember.relationship }
          : undefined,
        { subjectType, facing, address, images: orderedImages }
      )

      if (!result.success) {
        const refund = await refundStudioCost('FENGSHUI')
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
          category: 'FENGSHUI',
          inputData: {
            theme: selectedTheme,
            roomType: roomTypeForAnalysis,
            subjectType,
            facing,
            slotLabels: orderedImages.map((img) => img.label),
            // 대표 사진 1장만 미리보기용으로 보관(다중 원본은 저장하지 않음)
            imageUrl: `data:image/jpeg;base64,${orderedImages[0]!.base64}`,
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
      const refund = await refundStudioCost('FENGSHUI').catch(() => ({ refunded: false }))
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
            <div className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-[#000D1A]/80 to-[#0A0A1F]/80 p-4 backdrop-blur-sm">
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
                  <span className="text-xs text-gold-500 font-medium">풍수 분석</span>
                  <span className="text-xs text-white/50">·</span>
                  <span className="text-sm font-bold text-gold-500 font-serif">{FENGSHUI_COST}만냥</span>
                </div>
              </div>
            </div>

            {/* 분석 대상 선택 (A-1) — 무엇을 찍을지 시스템이 정해준다 */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-gold-500" />
                <p className="text-xs text-gold-500/70 font-medium tracking-widest uppercase">무엇을 볼까요</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SUBJECT_TYPES.map((s) => {
                  const Icon = s.icon
                  const active = subjectType === s.value
                  return (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSubjectType(s.value)
                        setSlotImages({}) // 대상별 슬롯이 다르므로 전환 시 초기화
                        trackEvent({ action: 'fengshui_subject_select', category: 'analysis', label: s.value })
                      }}
                      className={`p-3 rounded-xl text-center transition-all duration-200 border ${
                        active
                          ? 'border-gold-500/60 bg-gold-500/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                          : 'border-white/5 bg-white/3 hover:border-white/15'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 mx-auto mb-1.5 ${active ? 'text-gold-500' : 'text-white/40'}`}
                        strokeWidth={1.5}
                      />
                      <p
                        className={`text-[11px] font-sans ${active ? 'text-gold-500 font-semibold' : 'text-white/50'}`}
                      >
                        {s.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* 촬영 안내 — 대상별 문구 전환 (A-1) */}
            <Card className="card-glass-manse p-5 border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Wind className="w-4 h-4 text-gold-500" />
                <p className="text-xs text-gold-500/70 font-medium tracking-widest uppercase">촬영 안내</p>
              </div>
              <ul className="space-y-2">
                {CAPTURE_GUIDES[subjectType].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/50 font-sans font-light">
                    <span className="text-gold-500/60 mt-0.5 shrink-0">·</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* 향·위치 선택 입력 (A-2) — 접이식, 선택 사항 */}
            <Card className="card-glass-manse p-0 border-white/5 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowContext((v) => !v)}
                className="w-full flex items-center justify-between p-5"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold-500" />
                  <p className="text-xs text-gold-500/70 font-medium tracking-widest uppercase">향·위치 (선택)</p>
                  {(facing !== '모름' || address.trim().length > 0) && (
                    <span className="text-[10px] text-gold-500 bg-gold-500/10 border border-gold-500/20 rounded-full px-2 py-0.5">
                      입력됨
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-white/30 transition-transform ${showContext ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {showContext && (
                  <motion.div
                    key="context-body"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4">
                      <p className="text-[11px] text-white/40 font-sans font-light leading-relaxed">
                        실제 향을 알면 8방위 분석이 더 정확해집니다. 몰라도 괜찮아요.
                      </p>
                      {/* 집의 향 */}
                      <div>
                        <p className="text-[11px] text-white/50 font-sans mb-2">집의 향(向)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {FACING_OPTIONS.map((f) => (
                            <button
                              key={f}
                              onClick={() => setFacing(f)}
                              className={`text-[11px] rounded-full px-3 py-1.5 border transition-all ${
                                facing === f
                                  ? 'border-gold-500/60 bg-gold-500/10 text-gold-500 font-semibold'
                                  : 'border-white/8 bg-white/3 text-white/50 hover:border-white/20'
                              }`}
                            >
                              {f !== '모름' ? `${f}향` : f}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 위치 (시·구 수준) */}
                      <div>
                        <p className="text-[11px] text-white/50 font-sans mb-2">위치 (시·구까지만)</p>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          maxLength={30}
                          placeholder="예: 서울 강남구 (상세 주소는 입력하지 마세요)"
                          className="w-full h-11 rounded-xl bg-black/20 border border-white/10 px-3.5 text-sm text-white/80 placeholder:text-white/25 font-sans focus:border-gold-500/40 focus:outline-none"
                        />
                        <p className="text-[10px] text-white/30 mt-1.5 font-sans">
                          지역 지세 참고용 — 개인정보 보호를 위해 시·구 수준까지만 입력하세요.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* 라벨 슬롯 그리드 — 대상별 여러 공간 사진을 한 번에(태스크 B) */}
            <Card className="card-glass-manse p-5 border-gold-500/20">
              <FengshuiSlotGrid spec={slotSpec} value={slotImages} onChange={setSlotImages} />
            </Card>

            <button
              onClick={handleStartAnalysis}
              disabled={filledSlotCount < slotSpec.min || loading}
              className="w-full h-14 rounded-2xl font-serif font-bold text-base tracking-wide transition-all duration-300 relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed group"
              style={{
                background:
                  filledSlotCount >= slotSpec.min
                    ? `linear-gradient(135deg, ${GOLD_500} 0%, ${GOLD_300} 50%, #C9A227 100%)`
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
              {/* 결과 히어로 — 점수 링(현재/잠재) + 지배오행·길방 칩 (관상·손금 수준) */}
              <div
                className="relative overflow-hidden rounded-2xl border border-gold-500/30 p-6 text-center"
                style={{ background: 'linear-gradient(135deg, #00050D 0%, #000D1A 50%, #000508 100%)' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12),transparent_70%)]" />
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

                <p className="relative text-[10px] tracking-[0.25em] text-gold-500/50 uppercase font-sans mb-1">
                  공간 풍수 진단
                </p>
                <p className="relative text-lg font-serif font-bold text-gold-500 mb-4">
                  {analyzedLabel || SUBJECT_LABEL[subjectType]} 풍수 진단
                </p>

                {analysisResult.spaceScore ? (
                  <div className="relative flex flex-col items-center">
                    <ScoreRing score={analysisResult.spaceScore.current} label="현재 점수" />
                    {analysisResult.spaceScore.potential > analysisResult.spaceScore.current && (
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-gold-500/10 border border-gold-500/25 rounded-full px-3.5 py-1">
                        <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                        <span className="text-xs text-white/60 font-sans">개선 시 잠재</span>
                        <span className="text-sm font-bold text-gold-500 font-serif tabular-nums">
                          {analysisResult.spaceScore.potential}점
                        </span>
                      </div>
                    )}
                    {analysisResult.spaceScore.description && (
                      <p className="mt-3 text-sm text-ink-primary/80 font-serif font-light leading-relaxed max-w-[22rem]">
                        {analysisResult.spaceScore.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative flex justify-center mb-1">
                    <div className="w-14 h-14 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                      <Compass className="w-7 h-7 text-gold-500" />
                    </div>
                  </div>
                )}

                {(analysisResult.dominantElement || analysisResult.luckyDirection) && (
                  <div className="relative mt-4 flex gap-2 justify-center flex-wrap">
                    {analysisResult.dominantElement && (
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1">
                        <span className="text-[10px] text-white/30 font-sans">지배오행</span>
                        <span className="text-xs font-bold text-gold-500 font-serif">
                          {analysisResult.dominantElement}
                        </span>
                      </div>
                    )}
                    {analysisResult.luckyDirection && (
                      <div className="flex items-center gap-1.5 bg-gold-500/10 border border-gold-500/20 rounded-full px-3 py-1">
                        <span className="text-[10px] text-white/30 font-sans">길한 방위</span>
                        <span className="text-xs font-bold text-gold-500 font-serif">
                          {analysisResult.luckyDirection}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 즉시 개선 3종 (quickFixes) — 오늘 당장 실행 */}
              {analysisResult.quickFixes && analysisResult.quickFixes.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">
                      오늘 당장 · 즉시 개선 {analysisResult.quickFixes.length}종
                    </h3>
                  </div>
                  <div className="space-y-2.5">
                    {analysisResult.quickFixes.map((fix, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-start gap-3 rounded-xl border border-gold-500/15 bg-gold-500/[0.04] p-3"
                      >
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold-500/15 border border-gold-500/30 shrink-0 text-[11px] font-bold text-gold-500 font-serif">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-white/70 font-sans font-light leading-relaxed">{fix}</p>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 8방위 길흉 분석 */}
              {analysisResult.directionalAnalysis && analysisResult.directionalAnalysis.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">
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
                    <Home className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">공간별 맞춤 추천</h3>
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
                    <Layers className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">
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

              {/* 필요 아이템 */}
              {analysisResult.shoppingList && analysisResult.shoppingList.length > 0 && (
                <Card className="card-glass-manse p-5 border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-serif font-bold text-gold-500">기운 전환 아이템</h3>
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
                        <span className="text-gold-500/60 mt-0.5 shrink-0">✓</span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* 상세 분석 — AI 원문은 [[태그]]·마크다운 정돈 후 "전문 보기"로 강등(유령 태그 노출 차단) */}
              <DetailAnalysisAccordion raw={analysisResult.currentAnalysis} title="풍수 상세 · 전문 보기" />

              {/* AI기본법 §31② — 캡처 컨테이너 «안» 이라야 이미지에 함께 박힌다 */}
              <ServiceDisclaimer tone="photo" />
            </div>

            <ShareSaveButtons
              resultContainerId="fengshui-result-container"
              analysisTitle={`풍수 분석 (${analyzedLabel || SUBJECT_LABEL[subjectType]})`}
              memberName={targetMember?.name}
            />

            {/* 종합사주풀이 여정 (컴팩트) — 4상 완료 시 종합 CTA */}
            <JourneyCard variant="compact" targetId={targetId ?? undefined} />

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setStep('upload')
                  setSlotImages({})
                  setAnalyzedLabel('')
                  setAnalysisResult(null)
                  setSubjectType('interior')
                  setFacing('모름')
                  setAddress('')
                  setShowContext(false)
                }}
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:bg-white/5 hover:text-gold-500 h-12"
              >
                다시 분석
              </Button>
              <Button
                onClick={() => router.push('/protected/family')}
                className="flex-1 h-12 font-serif font-bold text-[#0A192F]"
                style={{ background: `linear-gradient(135deg, ${GOLD_500} 0%, ${GOLD_300} 100%)` }}
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
  const fortuneColor = dir.fortune === 'good' ? GOLD_500 : dir.fortune === 'bad' ? '#E8A0A0' : '#A8C5DA'
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
              <span className="text-sm font-serif font-bold text-gold-500">{room.room}</span>
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
                  <p className="text-[10px] text-gold-500/60 font-sans mb-1.5">개선 방법</p>
                  <ul className="space-y-1">
                    {room.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/50 font-sans font-light">
                        <span className="text-gold-500/40 shrink-0">·</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {room.luckyItems.length > 0 && (
                <div>
                  <p className="text-[10px] text-gold-500/60 font-sans mb-1.5">행운 아이템</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.luckyItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-gold-500/10 border border-gold-500/20 text-gold-500/80 rounded-full px-2 py-0.5 font-sans"
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
        <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-gold-500 font-serif">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-serif font-bold text-gold-500">{placement.item}</span>
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
            <p className="text-xs text-gold-500/60 font-sans font-light">효과: {placement.expectedEffect}</p>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto" />
            <p className="text-white/40 font-sans text-sm">풍수 분석 준비 중...</p>
          </div>
        </div>
      }
    >
      <FengShuiAnalysisPageContent />
    </Suspense>
  )
}
