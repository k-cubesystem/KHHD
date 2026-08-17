'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { collectPageView } from '@/lib/analytics/collector'

/**
 * 라우트 변경마다 페이지뷰를 자사 수집기로 보낸다. 렌더 결과 없음.
 * app/layout.tsx 에 한 번만 마운트한다(GoogleAnalytics 옆).
 */
export function PageViewTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (pathname) collectPageView(pathname)
  }, [pathname])
  return null
}
