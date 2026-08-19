import { getDestinyTarget } from '@/app/actions/user/destiny'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { redirect } from 'next/navigation'
import { SajuResultClient } from './saju-result-client'
import { MissingBirthChart } from '@/components/analysis/missing-birth-chart'

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

  // 🔴 명식 확인은 **차감보다 먼저**. 생년월일이 없으면 풀이가 아예 성립하지 않는데,
  //    예전에는 로딩 화면이 돌고 복채를 먼저 빼려다 실패해 「복채를 충전하세요」가 떴다.
  if (!target.birth_date) {
    return <MissingBirthChart targetName={target.name} isSelf={target.target_type === 'self'} />
  }

  // 캐시 확인 — 있으면 즉시 렌더
  const cacheCheck = await analyzeCheonjiinAction(targetId, null, true, false)

  if (cacheCheck.success && cacheCheck.cached) {
    return <SajuResultClient target={target} initialData={cacheCheck.data} isCached />
  }

  // 캐시 없으면 클라이언트에서 분석
  return <SajuResultClient target={target} />
}
