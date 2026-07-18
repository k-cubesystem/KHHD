'use client'

import { useEffect } from 'react'
import { GA } from '@/lib/analytics/ga4'

/**
 * 상점 퍼널 진입 계측 (로드맵 P1-5).
 * 서버 컴포넌트인 상점 페이지에서 탭이 바뀔 때마다 마운트되어 store_view 를 남긴다.
 * (탭 전환이 링크 네비게이션이라 tab 값이 곧 진입 단계다)
 */
export function StoreFunnelTracker({ tab }: { tab: string }) {
  useEffect(() => {
    GA.storeView(tab)
  }, [tab])

  return null
}
