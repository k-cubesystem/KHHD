import { SharePageClient } from './share-page-client'
import { getSharedAnalysis } from '@/app/actions/analysis-history'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface SharePageProps {
  params: {
    token: string
  }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const record = await getSharedAnalysis(params.token)

  if (!record) {
    return {
      title: '기록을 찾을 수 없습니다 - 청담 해화당',
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
      images: [
        {
          url: '/images/og-default.jpg', // TODO: Make dynamic OG image
          width: 1200,
          height: 630,
          alt: '청담 해화당 운명 분석 결과',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const record = await getSharedAnalysis(params.token)

  if (!record) {
    notFound()
  }

  return <SharePageClient record={record} />
}
