import { getDestinyTarget } from '@/app/actions/user/destiny'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { CheonjiinResultClient } from './cheonjiin-result-client'
import { redirect } from 'next/navigation'
import { CheonjiinResultLazy } from './cheonjiin-result-lazy'

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
    return <CheonjiinResultLazy target={target} needsData />
  }

  // 캐시만 먼저 확인 (빠름) — 캐시 있으면 서버에서 바로 렌더
  const cacheCheck = await analyzeCheonjiinAction(targetId, null, true, false)

  if (cacheCheck.success && cacheCheck.cached) {
    return <CheonjiinResultClient target={target} initialData={cacheCheck.data} isCached />
  }

  // 캐시 없으면 클라이언트 전용 렌더 (SSR 끄기 — hydration 불일치 방지)
  return <CheonjiinResultLazy target={target} needsAnalysis />
}
