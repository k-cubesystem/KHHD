import { getDestinyTarget } from '@/app/actions/destiny-targets'
import { CheonjiinResultClient } from './cheonjiin-result-client'
import { redirect } from 'next/navigation'

interface CheonjiinResultPageProps {
  searchParams: Promise<{ targetId?: string }>
}

export default async function CheonjiinResultPage({ searchParams }: CheonjiinResultPageProps) {
  const params = await searchParams
  const targetId = params.targetId

  if (!targetId) {
    redirect('/protected/analysis/cheonjiin')
  }

  const target = await getDestinyTarget(targetId)

  if (!target) {
    redirect('/protected/analysis/cheonjiin')
  }

  return <CheonjiinResultClient target={target} />
}
