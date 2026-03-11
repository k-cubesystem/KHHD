import type { Metadata } from 'next'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { CompatibilityClient } from './compatibility-client'

export const metadata: Metadata = {
  title: '궁합 분석',
  description: '두 사람의 사주를 비교하여 궁합을 분석합니다.',
}

interface Props {
  searchParams: Promise<{ targetId?: string }>
}

export default async function CompatibilityPage({ searchParams }: Props) {
  const { targetId } = await searchParams
  const targets = await getDestinyTargets()

  return <CompatibilityClient targets={targets} fixedTargetId={targetId} />
}
