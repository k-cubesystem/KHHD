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
  const analysisType = params.type || 'comprehensive' // 기본값은 comprehensive

  if (!targetId) {
    redirect('/protected/analysis/cheonjiin')
  }

  const target = await getDestinyTarget(targetId)
  if (!target) {
    redirect('/protected/analysis/cheonjiin')
  }

  // type=basic인 경우: 프로필 만세력 정보만으로 바로 분석 진행 (추가 정보 불필요)
  // type=comprehensive인 경우: 집 주소 + 얼굴 사진 필요
  const needsAdditionalData =
    analysisType === 'comprehensive' && (!target.home_address || !target.face_image_url)

  // 추가 데이터 필요하면 클라이언트에서 수집
  if (needsAdditionalData) {
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
