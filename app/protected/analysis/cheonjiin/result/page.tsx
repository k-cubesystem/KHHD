import { getDestinyTarget } from '@/app/actions/user/destiny'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { CheonjiinResultClient } from './cheonjiin-result-client'
import { redirect } from 'next/navigation'

interface CheonjiinResultPageProps {
  searchParams: Promise<{ targetId?: string; type?: string }>
}

export default async function CheonjiinResultPage({ searchParams }: CheonjiinResultPageProps) {
  const params = await searchParams
  const targetId = params.targetId
  const analysisType = params.type || 'comprehensive'

  if (!targetId) {
    redirect('/protected/analysis/cheonjiin')
  }

  const target = await getDestinyTarget(targetId)
  if (!target) {
    redirect('/protected/analysis/cheonjiin')
  }

  const needsAdditionalData = analysisType === 'comprehensive' && (!target.home_address || !target.face_image_url)

  if (needsAdditionalData) {
    return <CheonjiinResultClient target={target} needsData />
  }

  // 캐시만 먼저 확인 (빠름) — 캐시 있으면 서버에서 바로 렌더
  const cacheCheck = await analyzeCheonjiinAction(targetId, null, true, false)

  if (cacheCheck.success && cacheCheck.cached) {
    return <CheonjiinResultClient target={target} initialData={cacheCheck.data} isCached />
  }

  // 캐시 없으면 클라이언트에서 AI 호출 (로딩 오버레이 표시)
  return <CheonjiinResultClient target={target} needsAnalysis />
}
