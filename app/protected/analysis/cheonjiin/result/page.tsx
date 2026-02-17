import { getDestinyTarget } from '@/app/actions/user/destiny'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { CheonjiinResultClient } from './cheonjiin-result-client'
import { redirect } from 'next/navigation'

interface CheonjiinResultPageProps {
  searchParams: Promise<{ targetId?: string }>
}

export default async function CheonjiinResultPage({ searchParams }: CheonjiinResultPageProps) {
  const params = await searchParams
  const targetId = params.targetId

  if (!targetId) {
    redirect('/protected/analysis/cheonjiin')
  }

  const target = await getDestinyTarget(targetId)
  if (!target) {
    redirect('/protected/analysis/cheonjiin')
  }

  // 필수 데이터 확인 (집 주소 + 얼굴 사진)
  const hasRequiredData = !!target.home_address && !!target.face_image_url

  // 필수 데이터 없으면 클라이언트에서 수집
  if (!hasRequiredData) {
    return <CheonjiinResultClient target={target} needsData />
  }

  // 서버사이드에서 캐시 확인 + 분석 실행 (Race Condition 원천 차단)
  const result = await analyzeCheonjiinAction(targetId, null, false, false)

  return (
    <CheonjiinResultClient
      target={target}
      initialData={result.success ? result.data : null}
      isCached={result.cached ?? false}
      serverError={result.success ? undefined : result.error}
    />
  )
}
