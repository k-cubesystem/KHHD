'use client'

import { useState } from 'react'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
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

interface FengshuiData {
  home_energy?: string
  work_energy?: string
  advice?: string
  lucky_color_for_home?: string
}

interface FaceReadingData {
  overall?: string
  forehead?: string
  eyes?: string
  nose?: string
  mouth?: string
  face_score?: number
}

interface PalmReadingData {
  overall?: string
  life_line?: string
  head_line?: string
  heart_line?: string
  fate_line?: string
  palm_score?: number
}

interface CheonjiinAnalysisResult {
  score?: number
  summary?: string
  cheonScore?: number
  jiScore?: number
  inScore?: number
  lucky?: { color?: string; direction?: string; number?: number; keyword?: string; advice?: string }
  cheon?: { title?: string; content?: string; element_metaphor?: string; strengths?: string[]; weaknesses?: string[] }
  ji?: {
    title?: string
    content?: string
    daewoon_phase?: string
    lucky_direction?: string
    fengshui?: FengshuiData | null
  }
  in?: {
    title?: string
    content?: string
    relationship_advice?: string
    noble_person?: string
    face_reading?: FaceReadingData | null
    palm_reading?: PalmReadingData | null
  }
}

interface CheonjiinResultClientProps {
  target: DestinyTarget
  initialData?: CheonjiinAnalysisResult | null
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
  const [analysisResult, setAnalysisResult] = useState<CheonjiinAnalysisResult | null>(initialData ?? null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [apiComplete, setApiComplete] = useState(false)
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
    setApiComplete(false)
    setError(null)

    try {
      const result = await analyzeCheonjiinAction(target.id, additionalData, false, skipCache)

      if (result.success) {
        setAnalysisResult(result.data)
        setApiComplete(true) // 로딩 오버레이에 완료 신호
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
    // isAnalyzing은 로딩 오버레이 onComplete 후 해제
  }

  // 데이터 수집 폼
  if (showDataForm) {
    return <CheonjiinDataCollectionForm target={target} onComplete={handleDataCollected} />
  }

  // 분석 중 — 감성 로딩 오버레이 (98% 정지 → API 완료 시 자동 진행)
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

  // 에러
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
          <CheonSection data={analysisResult?.cheon ?? null} />
        </div>
        <div id="ji">
          <JiSection data={analysisResult?.ji ?? null} />
        </div>
        <div id="in">
          <InSection data={analysisResult?.in ?? null} />
        </div>
      </div>
    </div>
  )
}
