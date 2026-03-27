import { SharedSajuResult } from './shared-saju-result'
import { getSharedAnalysis } from '@/app/actions/user/history'
import type { Metadata } from 'next'
import { logger } from '@/lib/utils/logger'

interface ShareSajuPageProps {
  params: Promise<{
    token: string
  }>
}

export async function generateMetadata({ params }: ShareSajuPageProps): Promise<Metadata> {
  try {
    const { token } = await params
    const record = await getSharedAnalysis(token)

    if (!record) {
      return {
        title: '사주풀이 결과 - 청담 해화당',
        description: 'AI가 풀어드리는 정밀 사주 분석 결과를 확인하세요.',
      }
    }

    const personTitle = `${record.target_name}님의 사주풀이`
    const fullTitle = `${personTitle} | 청담 해화당`
    const summary = record.summary
      ? record.summary.slice(0, 120)
      : 'AI가 사주팔자를 정밀하게 풀어드린 결과입니다. 나도 무료로 내 사주를 확인해보세요.'

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com').trim().replace(/\/+$/, '')
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
    }
  }
}

export default async function ShareSajuPage({ params }: ShareSajuPageProps) {
  const { token } = await params
  return <SharedSajuResult token={token} />
}
