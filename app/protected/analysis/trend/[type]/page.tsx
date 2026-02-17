import { redirect } from 'next/navigation'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { TrendClient } from './trend-client'
import type { TrendType } from '@/app/actions/ai/trend'

const VALID_TYPES: TrendType[] = ['love', 'career', 'exam', 'estate']

export default async function TrendPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: rawType } = await params
  const type = rawType as TrendType
  if (!VALID_TYPES.includes(type)) {
    redirect('/protected/analysis')
  }

  const targets = await getDestinyTargets()
  const selfTarget = targets.find((t) => t.target_type === 'self') || targets[0] || null

  return <TrendClient trendType={type} selfTarget={selfTarget} targets={targets} />
}
