import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { AnalysisHistory } from '@/app/actions/user/history'
import { isRetentionLimited, retentionCutoffISO } from '@/lib/auth/subscription'
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
    return <HistoryPageClient initialRecords={[]} isGuest lockedCount={0} />
  }

  // 무료(비회원)는 최근 30일만 노출 — 삭제하지 않고 잠근다(멤버십 가입 시 전체 복원 = 업셀).
  const cutoffISO = (await isRetentionLimited(user.id)) ? retentionCutoffISO() : null

  let recordsQuery = supabase
    .from('analysis_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (cutoffISO) recordsQuery = recordsQuery.gte('created_at', cutoffISO)

  const { data, error } = await recordsQuery
  const records: AnalysisHistory[] = !error && data ? (data as AnalysisHistory[]) : []

  // 잠긴(30일 이전) 기록 수 — 배너용. 멤버는 0.
  let lockedCount = 0
  if (cutoffISO) {
    const { count } = await supabase
      .from('analysis_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('created_at', cutoffISO)
    lockedCount = count ?? 0
  }

  return <HistoryPageClient initialRecords={records} isGuest={false} lockedCount={lockedCount} />
}
