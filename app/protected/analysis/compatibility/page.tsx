import type { Metadata } from 'next'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { CompatibilityClient } from './compatibility-client'

export const metadata: Metadata = {
  title: '궁합 분석',
  description: '두 사람의 사주를 비교하여 궁합을 분석합니다.',
}

export default async function CompatibilityPage() {
  const targets = await getDestinyTargets()

  return <CompatibilityClient targets={targets} />
}
