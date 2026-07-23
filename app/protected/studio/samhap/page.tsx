'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowRight,
  Coins,
  Check,
  X,
  Sparkles,
  Layers,
  User2,
  Hand,
  Compass,
  Calendar,
  ChevronLeft,
} from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { GOLD_500, GOLD_300 } from '@/lib/config/design-tokens'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import {
  getSamhapReadiness,
  generateSamhapReport,
  type SamhapReadiness,
  type SamhapResult,
} from '@/app/actions/ai/samhap'
import { AnalyzingAnimation } from '@/components/studio/analyzing-animation'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { SamhapResultView } from '@/components/studio/samhap-result'
import { GA, trackEvent } from '@/lib/analytics/ga4'

type StepType = 'check' | 'loading' | 'result'

const SAMHAP_COST = FEATURE_COST.samhap.display

const LOADING_STEPS = [
  '사주(天)의 기운을 불러옵니다...',
  '관상·손금(人)의 결을 겹쳐 봅니다...',
  '풍수(地)의 터 기운을 더합니다...',
  '네 기운의 합치점을 찾고 있습니다...',
  '종합사주풀이 처방을 정리합니다...',
]

function SamhapPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')
  const targetQuery = targetId ? `?target=${targetId}` : ''

  const [step, setStep] = useState<StepType>('check')
  const [readiness, setReadiness] = useState<SamhapReadiness | null>(null)
  const [result, setResult] = useState<SamhapResult | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getWalletBalance().then(setBalance)
    getSamhapReadiness(targetId ?? undefined).then((r) => {
      setReadiness(r)
      trackEvent({
        action: r.ready ? 'samhap_ready' : 'samhap_requirements_unmet',
        category: 'analysis',
        label: 'samhap',
      })
    })
  }, [targetId])

  const handleGenerate = async () => {
    setLoading(true)
    setStep('loading')
    GA.analysisStart('samhap')
    try {
      const res = await generateSamhapReport(targetId ?? undefined)
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
          <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
            <Layers className="w-6 h-6 text-gold-500" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-ink-light">종합사주풀이</h1>
              <span className="text-[9px] font-bold text-gold-500 tracking-[0.2em] uppercase border border-gold-500/30 rounded-full px-2 py-0.5">
                Premium
              </span>
            </div>
            <p className="text-xs text-white/40 font-sans mt-0.5">사주·관상·손금·풍수 四柱 종합</p>
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
              {readiness === null ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
                  <p className="text-white/40 text-sm font-sans">요건을 확인하고 있습니다...</p>
                </div>
              ) : (
                <SamhapCheck
                  readiness={readiness}
                  balance={balance}
                  targetQuery={targetQuery}
                  onGenerate={handleGenerate}
                  loading={loading}
                />
              )}
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnalyzingAnimation type="default" steps={LOADING_STEPS} />
            </motion.div>
          )}

          {step === 'result' && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div id="samhap-result-container">
                <SamhapResultView result={result} targetName={result.targetName} />
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
  onGenerate,
  loading,
}: {
  readiness: SamhapReadiness
  balance: number | null
  targetQuery: string
  onGenerate: () => void
  loading: boolean
}) {
  const requirements = [
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
    { key: 'birth', label: '생년월일 등록', ok: readiness.hasBirth, icon: Calendar, href: '/protected/family' },
  ]

  return (
    <div className="space-y-5">
      {/* 소개 */}
      <div
        className="relative overflow-hidden rounded-2xl border border-gold-500/30 p-6"
        style={{ background: 'linear-gradient(135deg, #0D0A00 0%, #1A1200 55%, #0A0800 100%)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_65%)]" />
        <p className="relative text-sm text-ink-primary/85 font-serif font-light leading-relaxed">
          하늘의 기운(사주), 사람의 기운(관상·손금), 터의 기운(풍수)이 이미 당신 안에 모였습니다. 네 기운이{' '}
          <b className="text-gold-500 font-bold">같은 말을 하는 지점</b>을 찾아, 하나의 종합사주풀이로 엮어 드립니다.
        </p>
      </div>

      {/* 요건 체크 */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p className="text-xs text-gold-500/70 font-medium tracking-widest mb-3 uppercase">필요 재료</p>
        <div className="space-y-2.5">
          {requirements.map((r) => (
            <div key={r.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full ${r.ok ? 'bg-gold-500/15 border border-gold-500/40' : 'bg-white/[0.03] border border-white/10'}`}
                >
                  {r.ok ? <Check className="w-3.5 h-3.5 text-gold-500" /> : <X className="w-3.5 h-3.5 text-white/30" />}
                </div>
                <span className={`text-sm font-sans ${r.ok ? 'text-white/80' : 'text-white/45'}`}>{r.label}</span>
              </div>
              {!r.ok && (
                <Link href={r.href} className="flex items-center gap-1 text-xs text-gold-500/80 hover:text-gold-500">
                  준비하기 <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
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
            <span className="text-sm font-bold text-gold-500 font-serif">종합 · {SAMHAP_COST}만냥</span>
          </div>

          <button
            onClick={onGenerate}
            disabled={loading}
            className="w-full h-14 rounded-2xl font-serif font-bold text-base tracking-wide transition-all duration-300 relative overflow-hidden disabled:opacity-40 group"
            style={{ background: `linear-gradient(135deg, ${GOLD_500} 0%, ${GOLD_300} 50%, #C9A227 100%)` }}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-2 text-[#0A0A08]">
              <Sparkles className="w-4 h-4" />
              종합사주풀이 열람 · {SAMHAP_COST}만냥
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
          <p className="text-[10px] text-white/35 text-center font-sans">
            새 사진 촬영 없이, 저장된 사주·관상·손금·풍수를 종합합니다.
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
          <p className="text-sm text-white/55 font-sans font-light leading-relaxed">
            위 재료가 모두 준비되면 종합사주풀이를 열람할 수 있습니다.
            <br />
            부족한 항목을 먼저 준비해 주세요. (준비 단계에서는 복채가 차감되지 않습니다.)
          </p>
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
