'use client'

import { useState } from 'react'
import { analyzeCheonjiinAction } from '@/app/actions/cheonjiin-analysis-action'
import { CheonjiinLoadingState } from '@/components/analysis/cheonjiin/CheonjiinLoadingState'
import { CheonjiinSummary } from '@/components/analysis/cheonjiin/CheonjiinSummary'
import { CheonSection } from '@/components/analysis/cheonjiin/CheonSection'
import { JiSection } from '@/components/analysis/cheonjiin/JiSection'
import { InSection } from '@/components/analysis/cheonjiin/InSection'
import {
  CheonjiinDataCollectionForm,
  CollectedData,
} from '@/components/analysis/cheonjiin/CheonjiinDataCollectionForm'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface CheonjiinResultClientProps {
  target: DestinyTarget
  initialData?: any
  isCached?: boolean
  serverError?: string
  needsData?: boolean
}

export function CheonjiinResultClient({
  target,
  initialData = null,
  isCached = false,
  serverError,
  needsData = false,
}: CheonjiinResultClientProps) {
  const [analysisResult, setAnalysisResult] = useState<any>(initialData)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(serverError ?? null)
  const [showDataForm, setShowDataForm] = useState(needsData && !initialData)

  // 데이터 수집 완료 후 분석 실행 (사용자가 직접 제출한 경우에만)
  async function handleDataCollected(data: CollectedData) {
    setShowDataForm(false)
    await runAnalysis(data, false)
  }

  // 다시 분석 (사용자가 명시적으로 클릭한 경우에만)
  async function runAnalysis(additionalData: CollectedData | null = null, skipCache = true) {
    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeCheonjiinAction(target.id, additionalData, false, skipCache)

      if (result.success) {
        setAnalysisResult(result.data)
        toast.success('분석이 완료되었습니다!')
      } else {
        setError(result.error || '분석 중 오류가 발생했습니다.')
        toast.error(result.error || '분석 중 오류가 발생했습니다.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      setError(message)
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 데이터 수집 폼
  if (showDataForm) {
    return <CheonjiinDataCollectionForm target={target} onComplete={handleDataCollected} />
  }

  // 분석 중 (재분석 시)
  if (isAnalyzing) {
    return <CheonjiinLoadingState target={target} />
  }

  // 에러
  if (error && !analysisResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-14 h-14 mx-auto text-red-400/80" />
          <p className="text-red-400 font-medium text-sm">{error}</p>
          <Button
            onClick={() => runAnalysis(null, false)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <CheonjiinSummary data={analysisResult} target={target} />

      {/* 섹션 탭 내비게이션 */}
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

          {/* 재분석 버튼 */}
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
          <CheonSection data={analysisResult?.cheon} />
        </div>
        <div id="ji">
          <JiSection data={analysisResult?.ji} />
        </div>
        <div id="in">
          <InSection data={analysisResult?.in} />
        </div>
      </div>
    </div>
  )
}
