import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalysisHubClient } from './analysis-hub-client'

export const metadata: Metadata = {
  title: '사주 분석',
  description: '사주팔자 기반 AI 운세 분석 서비스',
}

export default async function AnalysisHubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return <AnalysisHubClient />
}
