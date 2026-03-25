'use client'

import { useState, useEffect, useRef } from 'react'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { SajuLoadingOverlay } from '@/components/shared/SajuLoadingOverlay'
import { CheonjiinSummary } from '@/components/analysis/cheonjiin/CheonjiinSummary'
import { CheonSection } from '@/components/analysis/cheonjiin/CheonSection'
import { JiSection } from '@/components/analysis/cheonjiin/JiSection'
import { InSection } from '@/components/analysis/cheonjiin/InSection'
import { CheonjiinDataCollectionForm, CollectedData } from '@/components/analysis/cheonjiin/CheonjiinDataCollectionForm'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { RefreshCw, AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'
import { CheonjiinAnalysisResult } from '@/types/cheonjiin'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'

interface CheonjiinResultClientProps {
  target: DestinyTarget
  initialData?: CheonjiinAnalysisResult | null
  isCached?: boolean
  serverError?: string
  needsData?: boolean
  /** 캐시 없음 — 클라이언트에서 AI 분석 자동 시작 */
  needsAnalysis?: boolean
}

export function CheonjiinResultClient({
  target,
  initialData = null,
  isCached = false,
  serverError,
  needsData = false,
  needsAnalysis = false,
}: CheonjiinResultClientProps) {
  const [analysisResult, setAnalysisResult] = useState<CheonjiinAnalysisResult | null>(initialData ?? null)
  const [isAnalyzing, setIsAnalyzing] = useState(needsAnalysis)
  const { checkQuota, paywallProps } = useAnalysisQuota()
  const [apiComplete, setApiComplete] = useState(false)
  const [error, setError] = useState<string | null>(serverError ?? null)
  const [showDataForm, setShowDataForm] = useState(needsData && !initialData)
  const autoAnalysisStarted = useRef(false)

  // needsAnalysis일 때 마운트 시 자동으로 분석 시작
  useEffect(() => {
    if (needsAnalysis && !autoAnalysisStarted.current) {
      autoAnalysisStarted.current = true
      runAnalysis(null, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAnalysis])

  async function handleDataCollected(data: CollectedData) {
    setShowDataForm(false)
    await runAnalysis(data, true)
  }

  async function runAnalysis(additionalData: CollectedData | null = null, skipCache = true) {
    const canProceed = await checkQuota()
    if (!canProceed) return
    setIsAnalyzing(true)
    setApiComplete(false)
    setError(null)

    try {
      const result = await analyzeCheonjiinAction(target.id, additionalData, false, skipCache)

      if (result.success) {
        setAnalysisResult(result.data)
        setApiComplete(true)
      } else {
        setError(result.error || '분석 중 오류가 발생했습니다.')
        toast.error(result.error || '분석 중 오류가 발생했습니다.')
        setIsAnalyzing(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      setError(message)
      toast.error(message)
      setIsAnalyzing(false)
    }
  }

  if (showDataForm) {
    return <CheonjiinDataCollectionForm target={target} onComplete={handleDataCollected} />
  }

  if (isAnalyzing) {
    return (
      <SajuLoadingOverlay
        targetName={target.name}
        duration={12000}
        isApiComplete={apiComplete}
        onComplete={() => setIsAnalyzing(false)}
      />
    )
  }

  if (error && !analysisResult) {
    const isBirthDateError = error.includes('생년월일')

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-14 h-14 mx-auto text-red-400/80" />
          <p className="text-red-400 font-medium text-sm">{error}</p>

          <div className="flex gap-2 justify-center">
            {isBirthDateError ? (
              <Link href="/protected/settings">
                <Button variant="default" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  프로필 설정하기
                </Button>
              </Link>
            ) : (
              <Button onClick={() => runAnalysis(null, false)} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <PaywallModal {...paywallProps} />
      <div id="cheonjiin-result-capture">
        <CheonjiinSummary data={analysisResult} target={target} />

        {/* 과거 역추산 섹션 */}
        {analysisResult?.pastRetrograde?.events && analysisResult.pastRetrograde.events.length > 0 && (
          <section className="mx-4 mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <h3 className="text-sm font-serif font-medium text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              과거에 이런 일이 있으셨을 겁니다
            </h3>
            <div className="space-y-3">
              {analysisResult.pastRetrograde.events.map((event, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-sm text-ink-light">
                    <span className="text-amber-400/80 font-medium">{event.period}</span> — {event.description}
                  </p>
                  <p className="text-[11px] text-ink-light/40 font-light">{event.basis}</p>
                </div>
              ))}
            </div>
            {analysisResult.pastRetrograde.accuracyHook && (
              <p className="mt-3 pt-3 border-t border-amber-500/10 text-[11px] text-amber-400/60 font-light italic">
                {analysisResult.pastRetrograde.accuracyHook}
              </p>
            )}
          </section>
        )}

        {/* 현재 공감 섹션 */}
        {analysisResult?.currentSituation?.description && (
          <section className="mx-4 mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
            <h3 className="text-sm font-serif font-medium text-blue-400 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              지금 이런 상황이시죠
            </h3>
            <p className="text-sm text-ink-light leading-relaxed">{analysisResult.currentSituation.description}</p>
            {analysisResult.currentSituation.basis && (
              <p className="text-[11px] text-ink-light/40 font-light mt-2">{analysisResult.currentSituation.basis}</p>
            )}
            {analysisResult.currentSituation.advice && (
              <p className="text-sm text-blue-400/80 font-medium mt-3 pt-3 border-t border-blue-500/10">
                {analysisResult.currentSituation.advice}
              </p>
            )}
          </section>
        )}

        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-white/5 px-4 py-2">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-1 flex-1">
              {[
                { label: '天 사주', href: '#cheon', color: 'text-blue-300' },
                { label: '地 풍수', href: '#ji', color: 'text-emerald-300' },
                { label: '人 관상', href: '#in', color: 'text-rose-300' },
              ].map(({ label, href, color }) => (
                <a
                  key={href}
                  href={href}
                  className={`flex-1 text-center py-1.5 text-xs font-serif rounded-lg transition-colors ${color} hover:bg-white/5`}
                >
                  {label}
                </a>
              ))}
            </div>

            {isCached && (
              <button
                onClick={() => runAnalysis(null, true)}
                className="ml-3 flex items-center gap-1 text-[10px] text-ink-light/30 hover:text-primary/60 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                새로 분석
              </button>
            )}
          </div>
        </div>

        <div className="pt-2">
          <div id="cheon">
            <CheonSection data={analysisResult?.cheon ?? null} />
          </div>
          <div id="ji">
            <JiSection data={analysisResult?.ji ?? null} />
          </div>
          <div id="in">
            <InSection data={analysisResult?.in ?? null} />
          </div>
        </div>

        {/* 교차 분석 섹션 */}
        {analysisResult?.crossAnalysis?.convergenceInsight && (
          <section className="mx-4 mt-6 p-4 rounded-xl bg-gold-500/5 border border-gold-500/15">
            <h3 className="text-sm font-serif font-medium text-gold-500 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
              청담해화당 교차 분석
            </h3>
            <div className="space-y-2">
              {analysisResult.crossAnalysis.sajuAndFace && (
                <p className="text-sm text-ink-light/80 leading-relaxed">{analysisResult.crossAnalysis.sajuAndFace}</p>
              )}
              {analysisResult.crossAnalysis.sajuAndPalm && (
                <p className="text-sm text-ink-light/80 leading-relaxed">{analysisResult.crossAnalysis.sajuAndPalm}</p>
              )}
              {analysisResult.crossAnalysis.sajuAndFengshui && (
                <p className="text-sm text-ink-light/80 leading-relaxed">{analysisResult.crossAnalysis.sajuAndFengshui}</p>
              )}
            </div>
            <p className="text-sm text-gold-500/80 font-medium mt-3 pt-3 border-t border-gold-500/10 leading-relaxed">
              {analysisResult.crossAnalysis.convergenceInsight}
            </p>
          </section>
        )}
      </div>
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <ShareSaveButtons
          resultContainerId="cheonjiin-result-capture"
          analysisTitle="천지인 분석"
          memberName={target.name}
        />
      </div>
    </div>
  )
}
