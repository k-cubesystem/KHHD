import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { FortuneClient } from './fortune-client'

export const metadata: Metadata = {
  title: '운세 분석',
  description: '오늘의 운세와 월간 운세를 AI가 분석합니다.',
}

export default async function FortunePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const targets = await getDestinyTargets()
  const selfTarget = targets.find((t) => t.target_type === 'self') || targets[0] || null

  return <FortuneClient selfTarget={selfTarget} targets={targets} />
}
