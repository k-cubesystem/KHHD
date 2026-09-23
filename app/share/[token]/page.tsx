import { SharePageClient } from './share-page-client'
import { getSharedAnalysis } from '@/app/actions/user/history'
import type { Metadata } from 'next'
import { logger } from '@/lib/utils/logger'

interface SharePageProps {
  params: Promise<{
    token: string
  }>
}

/**
 * 🔴 공유 링크는 **색인 금지**다.
 *  · 토큰이 무한하므로 색인되면 검색엔진에 «얇은 페이지가 무한히 있는 사이트»로 집계된다.
 *    잘못된 토큰도 서버는 200 을 돌려준다(유효성 판정을 클라이언트가 한다 — 아래 페이지 주석).
 *  · 그리고 내용 자체가 남의 분석 결과다. 검색에 걸리면 그게 더 큰 사고다.
 *  · 카톡·페북 공유 미리보기는 robots 와 무관하게 동작한다(크롤러가 og: 태그를 따로 읽는다).
 */
const SHARE_ROBOTS = { index: false, follow: false } as const

// Metadata는 서버에서 "Best Effort"로 가져옴
// 실패하더라도 페이지는 렌더링되어야 함 (Client Side Fetching으로 복구)
export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  try {
    const { token } = await params
    const record = await getSharedAnalysis(token)

    if (!record) {
      return {
        title: '청담 해화당 - 운명 분석',
        description: 'AI가 분석한 상세한 운명 분석 결과를 확인하세요.',
        robots: SHARE_ROBOTS,
      }
    }

    const personTitle = `${record.target_name}님의 ${record.category} 운명 분석`
    const fullTitle = `${personTitle} | 청담 해화당`
    const description = record.summary
      ? record.summary.slice(0, 120)
      : 'AI가 분석한 상세한 운명 분석 결과를 확인하세요.'

    // Build dynamic OG image URL with analysis metadata
    const ogParams = new URLSearchParams({
      title: personTitle,
      desc: description,
      name: record.target_name,
      category: record.category,
    })
    if (record.score !== null && record.score !== undefined) {
      ogParams.set('score', String(record.score))
    }
    const ogImageUrl = `/api/og?${ogParams.toString()}`

    return {
      title: fullTitle,
      description,
      robots: SHARE_ROBOTS,
      openGraph: {
        title: fullTitle,
        description,
        type: 'article',
        siteName: '청담해화당',
        locale: 'ko_KR',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: personTitle,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: fullTitle,
        description,
        images: [ogImageUrl],
      },
    }
  } catch (error) {
    logger.warn('[Metadata] Failed to fetch shared record:', error)
    return {
      title: '청담 해화당 - 운명 분석',
      description: '당신의 운명을 분석해보세요.',
      robots: SHARE_ROBOTS,
    }
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  // 서버에서는 더 이상 데이터를 fetch하지 않거나,
  // 하더라도 렌더링을 차단(Block)하지 않음.
  // 에러가 나나 데이터가 없으나 무조건 Client Component를 렌더링함.
  return <SharePageClient token={token} />
}
