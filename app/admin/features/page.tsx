import { getFeatureCosts } from './actions'
import FeatureCostManagement from './feature-cost-management-client'
import { logger } from '@/lib/utils/logger'

// 관리자 세션(cookies)에 의존하므로 정적 프리렌더 대상이 아니다.
// 명시하지 않으면 빌드 중 프리렌더가 시도되고, 그때 발생하는 DynamicServerError를
// 아래 try/catch가 삼켜 «조회 실패»로 오인된다.
export const dynamic = 'force-dynamic'

export default async function FeatureCostsPage() {
  // getFeatureCosts는 throw한다 — 그대로 두면 조회 실패가 어드민 에러 바운더리로 떨어진다
  let features: Awaited<ReturnType<typeof getFeatureCosts>> = []
  let loadError: string | null = null
  try {
    features = await getFeatureCosts()
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e)
    logger.error('[FeatureCostsPage] 조회 실패:', loadError)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">기능별 복채 소모량 관리</h1>
        <p className="text-muted-foreground mt-2">
          각 AI 기능의 복채 소모량을 실시간으로 조정할 수 있습니다. (1 복채 = 1만냥)
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-400">복채 설정을 불러오지 못했습니다: {loadError}</p>
      ) : (
        <FeatureCostManagement initialFeatures={features} />
      )}
    </div>
  )
}
