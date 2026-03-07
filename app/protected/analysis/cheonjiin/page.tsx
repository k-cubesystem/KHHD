import type { Metadata } from 'next'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { AnalysisClientPage } from './analysis-client-page'

export const metadata: Metadata = {
  title: '천지인 통합 분석',
  description: '천지인 사주 통합 분석으로 운명의 흐름을 파악하세요.',
}

interface AnalysisPageProps {
  searchParams: Promise<{ targetId?: string; target?: string }>
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const targets = await getDestinyTargets()
  const params = await searchParams
  // Support both 'target' and 'targetId' parameter names
  const targetId = params.target || params.targetId

  return <AnalysisClientPage targets={targets} initialTargetId={targetId} />
}
