import type { Metadata } from 'next'
import { getMyPassSummary } from '@/app/actions/payment/passes'
import { StudioPageClient } from './studio-page-client'

export const metadata: Metadata = {
  title: '스튜디오',
  description: '관상, 손금, 풍수 - 운명의 비밀을 밝히세요',
}

export default async function StudioPage() {
  const passSummary = await getMyPassSummary()

  return <StudioPageClient passSummary={passSummary} />
}
