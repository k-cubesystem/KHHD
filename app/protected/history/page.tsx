import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { AnalysisHistory } from '@/app/actions/user/history'
import { HistoryPageClient } from './history-page-client'

export const metadata: Metadata = {
  title: '분석 기록',
  description: '운명 분석 기록 아카이브',
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <HistoryPageClient initialRecords={[]} isGuest />
  }

  const { data, error } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const records: AnalysisHistory[] = !error && data ? (data as AnalysisHistory[]) : []

  return <HistoryPageClient initialRecords={records} isGuest={false} />
}
