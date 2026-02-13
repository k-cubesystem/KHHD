'use client'

import { useState, useEffect } from 'react'
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
import { CacheSelectionDialog } from '@/components/analysis/cheonjiin/CacheSelectionDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DestinyTarget } from '@/app/actions/destiny-targets'

interface CheonjiinResultClientProps {
  target: DestinyTarget
}

export function CheonjiinResultClient({ target }: CheonjiinResultClientProps) {
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsData, setNeedsData] = useState(false)
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null)
  const [showCacheSelection, setShowCacheSelection] = useState(false)
  const [cachedResult, setCachedResult] = useState<any>(null)
  const [cacheDate, setCacheDate] = useState<string>('')

  useEffect(() => {
    checkCacheAndData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id])

  // 캐시 확인 및 데이터 검증
  async function checkCacheAndData() {
    setIsAnalyzing(true)

    try {
      // 캐시된 결과 확인 (서버 액션에서 분리)
      const result = await analyzeCheonjiinAction(target.id, null, true) // checkOnly=true

      if (result.success && result.cached) {
        // 캐시가 있으면 선택 다이얼로그 표시
        setCachedResult(result.data)
        setCacheDate(result.cacheDate || new Date().toISOString())
        setShowCacheSelection(true)
        setIsAnalyzing(false)
      } else {
        // 캐시 없음 → 데이터 검증
        checkDataAndStartAnalysis()
      }
    } catch (error) {
      // 에러 발생 시 데이터 검증으로 이동
      checkDataAndStartAnalysis()
    }
  }

  // 필수 데이터 검증 (집 주소, 얼굴 사진만 필수)
  function checkDataAndStartAnalysis() {
    const hasHomeAddress = !!target.home_address
    const hasFaceImage = !!target.face_image_url
    // 손금은 선택사항이므로 검증에서 제외

    // 필수 데이터가 있으면 바로 분석 시작
    if (hasHomeAddress && hasFaceImage) {
      runAnalysis(null, false)
    } else {
      // 데이터가 부족하면 수집 폼 표시
      setNeedsData(true)
      setIsAnalyzing(false)
    }
  }

  // 캐시된 결과 보기
  function handleViewCache() {
    setAnalysisResult(cachedResult)
    setShowCacheSelection(false)
    toast.info('이전 분석 결과를 불러왔습니다.')
  }

  // 새로 분석하기
  function handleNewAnalysis() {
    setShowCacheSelection(false)
    setCachedResult(null)
    checkDataAndStartAnalysis()
  }

  // 데이터 수집 완료 핸들러
  function handleDataCollected(data: CollectedData) {
    setCollectedData(data)
    setNeedsData(false)
    runAnalysis(data, false)
  }

  async function runAnalysis(additionalData: CollectedData | null, skipCache: boolean = false) {
    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeCheonjiinAction(target.id, additionalData, false, skipCache)

      if (result.success) {
        setAnalysisResult(result.data)
        if (result.cached && !skipCache) {
          toast.info('최근 분석 결과를 불러왔습니다.')
        } else {
          toast.success('분석이 완료되었습니다!')
        }
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

  // 캐시 선택 다이얼로그
  if (showCacheSelection) {
    return (
      <CacheSelectionDialog
        targetName={target.name}
        cacheDate={cacheDate}
        onViewCache={handleViewCache}
        onNewAnalysis={handleNewAnalysis}
      />
    )
  }

  // 데이터 수집 폼 표시
  if (needsData) {
    return <CheonjiinDataCollectionForm target={target} onComplete={handleDataCollected} />
  }

  // 분석 중
  if (isAnalyzing) {
    return <CheonjiinLoadingState target={target} />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-4 text-red-500">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-red-500 mb-4 font-medium">{error}</p>
          <Button onClick={() => runAnalysis(null, false)} variant="outline">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <CheonjiinSummary data={analysisResult} target={target} />
      <CheonSection data={analysisResult?.cheon} />
      <JiSection data={analysisResult?.ji} />
      <InSection data={analysisResult?.in} />
    </div>
  )
}
