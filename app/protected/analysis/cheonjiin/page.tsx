import { getDestinyTargets } from '@/app/actions/user/destiny'
import { AnalysisClientPage } from './analysis-client-page'

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
