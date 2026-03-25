import { getDestinyTarget } from '@/app/actions/user/destiny'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { redirect } from 'next/navigation'
import { SajuResultClient } from './saju-result-client'

interface SajuResultPageProps {
  searchParams: Promise<{ targetId?: string }>
}

export default async function SajuResultPage({ searchParams }: SajuResultPageProps) {
  const params = await searchParams
  const targetId = params.targetId

  if (!targetId) {
    redirect('/protected/analysis/cheonjiin')
  }

  const target = await getDestinyTarget(targetId)
  if (!target) {
    redirect('/protected/analysis/cheonjiin')
  }

  // 캐시 확인 — 있으면 즉시 렌더
  const cacheCheck = await analyzeCheonjiinAction(targetId, null, true, false)

  if (cacheCheck.success && cacheCheck.cached) {
    return <SajuResultClient target={target} initialData={cacheCheck.data} isCached />
  }

  // 캐시 없으면 클라이언트에서 분석
  return <SajuResultClient target={target} />
}
