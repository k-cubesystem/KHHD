'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, Coins, Sparkles, User2, Hand, Compass, Calendar, ChevronLeft, type LucideIcon } from 'lucide-react'
import { IconBokjumeoni } from '@/components/icons/traditional-icons'
import { logger } from '@/lib/utils/logger'
import { SamhapIntroCard } from '@/components/studio/samhap-intro-card'
import { TargetSelect, toTargetOption } from '@/components/destiny/target-select'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { resolveSamhapTarget, samhapTargetId, samhapTargetQuery } from '@/lib/domain/analysis/samhap-target'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'
import {
  getSamhapReadiness,
  generateSamhapReport,
  type SamhapReadiness,
  type SamhapResult,
} from '@/app/actions/ai/samhap'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { SamhapResultView } from '@/components/studio/samhap-result'
import { GA, trackEvent } from '@/lib/analytics/ga4'

type StepType = 'check' | 'loading' | 'result'

const SAMHAP_COST = FEATURE_COST.samhap.display
// 할인 포지셔닝 — 개별 4상(사주·관상·손금·풍수)을 따로 보면 합계, 종합은 5만냥.
const INDIVIDUAL_TOTAL =
  FEATURE_COST.saju.display + FEATURE_COST.face.display + FEATURE_COST.palm.display + FEATURE_COST.fengshui.display
const SAMHAP_DISCOUNT_PCT = INDIVIDUAL_TOTAL > 0 ? Math.round((1 - SAMHAP_COST / INDIVIDUAL_TOTAL) * 100) : 0

/**
 * 예상 소요 시간(초) — 2026-08-15 실측 54초(출력 7,861 토큰).
 * 🔴 실제보다 짧게 적으면 막대가 먼저 차고 사용자가 «멈췄다»고 읽는다. 넉넉히 잡는다.
 */
const SAMHAP_EXPECTED_SECONDS = 60

const LOADING_STEPS = [
  '사주, 하늘의 기운을 불러옵니다...',
  '관상·손금, 사람의 결을 겹쳐 봅니다...',
  '풍수, 터의 기운을 더합니다...',
  '네 기운의 합치점을 찾고 있습니다...',
  '종합사주풀이 처방을 정리합니다...',
]

function SamhapPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /**
   * `?target=` 은 **처음 들어올 때만** 읽는다(여정 카드·「준비하기」 링크가 대상을 물고 온다).
   * 이후 주인은 선택 상태이고 URL 은 뒤따라간다 — 매 렌더 다시 읽으면 아래 `router.replace` 와
   * 서로를 깨우는 왕복이 생긴다.
   */
  const initialTargetId = useRef(searchParams.get('target'))

  const [step, setStep] = useState<StepType>('check')
  const [readiness, setReadiness] = useState<SamhapReadiness | null>(null)
  const [result, setResult] = useState<SamhapResult | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<DestinyTarget[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedTarget = targets?.find((t) => t.id === selectedId) ?? null
  // 🔴 본인은 targetId 를 붙이지 않는다(samhap-target.ts 주석의 함정).
  const effectiveTargetId = samhapTargetId(selectedTarget)
  const targetQuery = samhapTargetQuery(selectedTarget)

  // 대상 목록·잔액은 화면당 한 번. 선택이 정해지면 아래 요건 조회가 이어받는다.
  useEffect(() => {
    let active = true
    getWalletBalance().then((b) => {
      if (active) setBalance(b)
    })
    getDestinyTargets().then((list) => {
      if (!active) return
      setTargets(list)
      setSelectedId(resolveSamhapTarget(list, initialTargetId.current)?.id ?? null)
    })
    return () => {
      active = false
    }
  }, [])

  // 요건(채워야 할 복주머니)은 **선택한 대상마다** 다시 잰다 — 가족을 바꾸면 표가 그 사람 것이 된다.
  useEffect(() => {
    if (!selectedId) return
    let active = true
    setReadiness(null)
    getSamhapReadiness(effectiveTargetId).then((r) => {
      if (!active) return
      setReadiness(r)
      trackEvent({
        action: r.ready ? 'samhap_ready' : 'samhap_requirements_unmet',
        category: 'analysis',
        label: effectiveTargetId ? 'samhap_family' : 'samhap_self',
      })
    })
    return () => {
      active = false
    }
  }, [selectedId, effectiveTargetId])

  const handleSelectTarget = (id: string) => {
    if (id === selectedId) return
    setSelectedId(id)
    setResult(null)
    setStep('check')
    // 새로고침·공유로 같은 대상이 다시 서도록 URL 을 맞춰 둔다(기록은 남기지 않는다 — replace).
    const next = targets?.find((t) => t.id === id) ?? null
    router.replace(`/protected/studio/samhap${samhapTargetQuery(next)}`, { scroll: false })
  }

  const handleGenerate = async () => {
    setLoading(true)
    setStep('loading')
    GA.analysisStart('samhap')
    try {
      const res = await generateSamhapReport(effectiveTargetId)
      if (!res.success) {
        setStep('check')
        toast.error(res.error || '종합사주풀이 생성에 실패했습니다.')
        return
      }
      setResult(res)
      if (balance !== null) setBalance(balance - SAMHAP_COST)
      setStep('result')
      GA.analysisComplete('samhap')
    } catch (error) {
      logger.error('Samhap generate error:', error)
      toast.error('종합사주풀이 생성 중 예상치 못한 오류가 발생했습니다.')
      setStep('check')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink-light relative overflow-x-hidden pb-24">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold-500/5 rounded-full blur-[150px]" />
      </div>

      {/* 헤더 */}
      <header className="px-5 pt-12 pb-6 relative z-10 max-w-lg mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white/40 hover:text-gold-500 transition-colors mb-5 text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> 뒤로
        </button>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="w-11 h-11 rounded-md flex items-center justify-center font-serif font-bold text-[22px] text-[#F4E4BA] -rotate-6 shrink-0"
            style={{
              background: '#9E2B2B',
              boxShadow: '0 0 14px rgba(158,43,43,0.35), inset 0 0 0 2px rgba(244,228,186,0.25)',
            }}
          >
            합
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-ink-light">종합사주풀이</h1>
              <span className="text-[9px] font-bold text-gold-500 tracking-[0.2em] uppercase border border-gold-500/30 rounded-full px-2 py-0.5">
                Premium
              </span>
            </div>
            <p className="text-xs text-white/40 font-sans mt-0.5">사주·관상·손금·풍수를 하나로 잇는 풀이</p>
          </div>
        </div>
      </header>

      <div className="px-5 relative z-10 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {step === 'check' && (
            <motion.div
              key="check"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="space-y-5"
            >
              {/* 소개 — 대작 카드 문법(앰비언트 영상·세리프 헤드라인·명언·단청) */}
              <SamhapIntroCard />

              {/* 대상 선택 — 요건 표 «위»에 둔다. 표가 누구 것인지 먼저 말하고 나서 표를 보인다. */}
              <TargetSelect
                label="누구의 종합풀이인가요"
                targets={targets?.map(toTargetOption) ?? null}
                value={selectedId}
                onChange={handleSelectTarget}
                action={
                  <Link
                    href="/protected/family"
                    className="text-[11px] text-white/35 transition-colors hover:text-gold-500"
                  >
                    가족 관리
                  </Link>
                }
              />

              {/* 🔴 스피너는 요건 자리만 덮는다 — 대상 줄까지 사라지면 바꾸자마자 고르던 손이 붕 뜬다.
                  🔴 대상이 하나도 없으면(등록 0건) 요건을 잴 것도 없다 — 여기서 스피너를 그리면
                     선택이 영영 안 서므로 영원히 도는 바퀴가 된다. 그 안내는 위 선택 줄이 진다. */}
              {targets !== null && selectedId === null ? null : readiness === null ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
                  <p className="text-white/40 text-sm font-sans">요건을 확인하고 있습니다...</p>
                </div>
              ) : (
                <SamhapCheck
                  readiness={readiness}
                  balance={balance}
                  targetQuery={targetQuery}
                  targetName={selectedTarget?.name ?? readiness.targetName}
                  onGenerate={handleGenerate}
                  loading={loading}
                />
              )}
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* 🔴 실측 54초(3배 상세화 후). 예상 시간을 주면 문구가 되돌지 않고 경과가 보인다. */}
              <AnalyzingAnimation type="default" steps={LOADING_STEPS} expectedSeconds={SAMHAP_EXPECTED_SECONDS} />
            </motion.div>
          )}

          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div id="samhap-result-container" className="space-y-4">
                <SamhapResultView result={result} targetName={result.targetName} />

                {/* AI기본법 §31② — 캡처 컨테이너 «안» 이라야 이미지에 함께 박힌다 */}
                <ServiceDisclaimer />
              </div>
              <ShareSaveButtons
                resultContainerId="samhap-result-container"
                analysisTitle="종합사주풀이"
                memberName={result.targetName}
              />
              <button
                onClick={() => router.push('/protected/studio')}
                className="w-full h-12 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 hover:text-gold-500 transition-colors font-serif font-bold"
              >
                스튜디오로 돌아가기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SamhapCheck({
  readiness,
  balance,
  targetQuery,
  targetName,
  onGenerate,
  loading,
}: {
  readiness: SamhapReadiness
  balance: number | null
  /** 선택한 대상의 `?target=` 쿼리(본인이면 빈 문자열) — 「준비하기」가 그 사람을 데리고 간다. */
  targetQuery: string
  /** 요건 표가 누구 것인지 밝히는 이름. */
  targetName: string
  onGenerate: () => void
  loading: boolean
}) {
  const requirements: { key: string; label: string; ok: boolean; icon: LucideIcon; href: string }[] = [
    {
      key: 'face',
      label: '관상 분석',
      ok: readiness.hasFace,
      icon: User2,
      href: `/protected/studio/face${targetQuery}`,
    },
    {
      key: 'hand',
      label: '손금 분석',
      ok: readiness.hasHand,
      icon: Hand,
      href: `/protected/studio/palm${targetQuery}`,
    },
    {
      key: 'fengshui',
      label: '풍수 분석',
      ok: readiness.hasFengshui,
      icon: Compass,
      href: `/protected/studio/fengshui${targetQuery}`,
    },
    {
      key: 'birth',
      label: '생년월일 등록',
      ok: readiness.hasBirth,
      icon: Calendar,
      // 본인이든 가족이든 생년월일은 가족 관리에서 고친다(본인 행도 그 화면에 있다).
      href: '/protected/family',
    },
  ]

  const filled = requirements.filter((r) => r.ok).length

  return (
    <div className="space-y-5">
      {/* 요건 체크 — 낙관(도장) 수집 표. 대상이 바뀌면 이 표가 통째로 그 사람 것이 된다. */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hanji-card relative overflow-hidden">
        <div className="relative flex items-baseline justify-between gap-2 mb-3">
          <p className="text-xs text-gold-500/70 font-serif font-medium tracking-widest">채워야 할 복주머니</p>
          <p className="text-[11px] font-serif text-gold-500/60 tabular-nums shrink-0">
            <span className="text-white/40">{targetName}</span> · {filled}/{requirements.length}
          </p>
        </div>
        <div className="relative space-y-3">
          {requirements.map((r) => {
            const Icon = r.icon
            return (
              <div key={r.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {r.ok ? (
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                      style={{
                        background: 'radial-gradient(circle, rgba(201,168,76,0.25) 0%, rgba(201,168,76,0.05) 70%)',
                      }}
                    >
                      <IconBokjumeoni className="w-4 h-4 text-gold-500" fill="rgba(201,168,76,0.35)" />
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full flex items-center justify-center border border-dashed border-white/15 text-white/25 shrink-0">
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </span>
                  )}
                  <span className={`text-sm font-sans ${r.ok ? 'text-white/80' : 'text-white/45'}`}>{r.label}</span>
                </div>
                {r.ok ? (
                  <span className="text-[11px] font-serif text-gold-500/60">가득 참</span>
                ) : (
                  <Link href={r.href} className="flex items-center gap-1 text-xs text-gold-500/80 hover:text-gold-500">
                    준비하기 <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {readiness.ready ? (
        <>
          {/* 잔액 + 비용 */}
          <div className="flex items-center justify-between rounded-2xl border border-gold-500/30 bg-gold-500/[0.05] p-4">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-gold-500" />
              <span className="text-xs text-white/50 font-sans">보유 복채</span>
              <span className="text-sm font-bold text-gold-500 font-serif">
                {balance !== null ? `${balance}만냥` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {SAMHAP_DISCOUNT_PCT > 0 && (
                <span className="text-[11px] text-white/30 line-through font-sans">개별 {INDIVIDUAL_TOTAL}만냥</span>
              )}
              <span className="text-sm font-bold text-gold-500 font-serif">종합 {SAMHAP_COST}만냥</span>
              {SAMHAP_DISCOUNT_PCT > 0 && (
                <span className="text-[10px] font-bold text-red-200 bg-seal/25 border border-seal/50 rounded-full px-2 py-0.5">
                  {SAMHAP_DISCOUNT_PCT}% 할인
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onGenerate}
            disabled={loading}
            className="relative overflow-hidden w-full rounded-sm group/btn hover:scale-[1.01] active:scale-[0.97] transition-transform duration-200 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #E8D5A0 0%, #C9A84C 45%, #A8903F 100%)',
              boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)',
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2.5 py-4">
              <Sparkles className="w-4 h-4 text-[#0A0A08]" />
              <span className="text-[15px] font-serif font-bold tracking-[0.12em] text-[#0A0A08]">
                종합사주풀이 열람 · {SAMHAP_COST}만냥
              </span>
              <ArrowRight className="w-4 h-4 text-[#0A0A08]/80 group-hover/btn:translate-x-0.5 transition-transform duration-300" />
            </span>
          </button>
          <p className="text-[10px] text-white/35 text-center font-sans">
            {SAMHAP_DISCOUNT_PCT > 0 && (
              <>
                개별 4가지 합 {INDIVIDUAL_TOTAL}만냥 → {SAMHAP_COST}만냥 ({SAMHAP_DISCOUNT_PCT}% 할인) ·{' '}
              </>
            )}
            새 사진 촬영 없이, 저장된 사주·관상·손금·풍수를 종합합니다.
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center space-y-2.5">
          <p className="text-sm text-white/55 font-sans font-light leading-relaxed">
            위 재료가 모두 준비되면 종합사주풀이를 열람할 수 있습니다.
            <br />
            부족한 항목을 먼저 준비해 주세요. (준비 단계에서는 복채가 차감되지 않습니다.)
          </p>
          {SAMHAP_DISCOUNT_PCT > 0 && (
            <p className="text-[11px] font-sans">
              <span className="text-white/30 line-through">개별 4가지 합 {INDIVIDUAL_TOTAL}만냥</span>{' '}
              <span className="text-gold-400 font-bold">→ 종합 {SAMHAP_COST}만냥</span>{' '}
              <span className="text-[10px] font-bold text-red-200 bg-seal/25 border border-seal/50 rounded-full px-2 py-0.5">
                {SAMHAP_DISCOUNT_PCT}% 할인
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function SamhapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto" />
            <p className="text-white/40 font-sans text-sm">종합사주풀이 준비 중...</p>
          </div>
        </div>
      }
    >
      <SamhapPageContent />
    </Suspense>
  )
}
