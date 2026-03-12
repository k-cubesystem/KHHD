import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { analyzeFortuneAction } from '@/app/actions/ai/fortune-analysis'
import { MonthlyFortuneClient } from './monthly-fortune-client'

export const metadata: Metadata = {
  title: '월간 운세 | 해화당',
  description: '이번 달 전체 운세를 한눈에 확인하세요.',
}

export default async function MonthlyFortunePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const targets = await getDestinyTargets()
  const self = targets.find((t) => t.target_type === 'self') ?? targets[0] ?? null

  if (!self?.birth_date) {
    return <MonthlyFortuneClient data={null} />
  }

  const result = await analyzeFortuneAction(self.id, 'monthly')

  if (!result.success || !result.data) {
    return <MonthlyFortuneClient data={null} />
  }

  return <MonthlyFortuneClient data={result.data} cached={result.cached} />
}
