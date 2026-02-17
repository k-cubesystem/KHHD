import { SharePageClient } from './share-page-client'
import { getSharedAnalysis } from '@/app/actions/analysis-history'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface SharePageProps {
  params: Promise<{
    token: string
  }>
}

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
      }
    }

    const title = `${record.target_name}님의 ${record.category} 분석 결과 | 청담 해화당`
    const description = record.summary || 'AI가 분석한 상세한 운명 분석 결과를 확인하세요.'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        // images: ... (Default or Dynamic)
      },
    }
  } catch (error) {
    console.warn('[Metadata] Failed to fetch shared record:', error)
    return {
      title: '청담 해화당 - 운명 분석',
      description: '당신의 운명을 분석해보세요.',
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
