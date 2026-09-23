import { SharedSajuResult } from './shared-saju-result'
import { getSharedAnalysis } from '@/app/actions/user/history'
import type { Metadata } from 'next'
import { logger } from '@/lib/utils/logger'
import { getSiteUrl } from '@/lib/utils/site-url'

interface ShareSajuPageProps {
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

export async function generateMetadata({ params }: ShareSajuPageProps): Promise<Metadata> {
  try {
    const { token } = await params
    const record = await getSharedAnalysis(token)

    if (!record) {
      return {
        title: '사주풀이 결과 - 청담 해화당',
        description: 'AI가 풀어드리는 정밀 사주 분석 결과를 확인하세요.',
        robots: SHARE_ROBOTS,
      }
    }

    const personTitle = `${record.target_name}님의 사주풀이`
    const fullTitle = `${personTitle} | 청담 해화당`
    const summary = record.summary
      ? record.summary.slice(0, 120)
      : 'AI가 사주팔자를 정밀하게 풀어드린 결과입니다. 나도 무료로 내 사주를 확인해보세요.'

    const siteUrl = getSiteUrl()
    const ogParams = new URLSearchParams({
      title: personTitle,
      desc: summary,
      name: record.target_name,
      category: 'SAJU',
      type: 'saju',
    })
    if (record.score !== null && record.score !== undefined) {
      ogParams.set('score', String(record.score))
    }
    const ogImageUrl = `${siteUrl}/api/og?${ogParams.toString()}`

    return {
      title: fullTitle,
      description: summary,
      robots: SHARE_ROBOTS,
      openGraph: {
        title: fullTitle,
        description: summary,
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
        description: summary,
        images: [ogImageUrl],
      },
    }
  } catch (error) {
    logger.warn('[ShareSaju Metadata] Failed:', error)
    return {
      title: '사주풀이 결과 - 청담 해화당',
      description: 'AI가 풀어드리는 정밀 사주 분석 결과를 확인하세요.',
      robots: SHARE_ROBOTS,
    }
  }
}

export default async function ShareSajuPage({ params }: ShareSajuPageProps) {
  const { token } = await params
  return <SharedSajuResult token={token} />
}
