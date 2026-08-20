import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { loadThreadsToken } from '@/lib/services/threads/client'
import {
  previousWeekKst,
  buildWeeklyReport,
  type AcquisitionRow,
  type ThreadsWeeklyMetrics,
} from '@/lib/domain/threads/report'
import { logger } from '@/lib/utils/logger'

/**
 * 주간 보고서 생성 — 크론(월 09:00 KST)과 어드민 «지금 집계» 버튼이 **같은 경로**를 쓴다.
 *
 * 🔴 Route 파일에서 헬퍼를 export 하면 Next.js 가 거부하므로 서비스로 분리했다
 *    (draw-service.ts 와 같은 이유).
 */

export interface GenerateResult {
  success: boolean
  period?: { start: string; end: string }
  metrics?: ThreadsWeeklyMetrics
  error?: string
}

export async function generateWeeklyReport(now: Date = new Date()): Promise<GenerateResult> {
  const admin = createAdminClient()
  const bounds = previousWeekKst(now)
  const lo = bounds.startUtc.toISOString()
  const hi = bounds.endUtc.toISOString()

  const [postsRes, repliesRes, queueRes, entriesRes, roundsRes, winnersRes, acqRes] = await Promise.all([
    admin
      .from('threads_posts')
      .select('kind, body, permalink, published_at, insights')
      .not('published_at', 'is', null)
      .gte('published_at', lo)
      .lt('published_at', hi),
    // 수집 시각 기준(폴링이 10분이라 작성 시각과 사실상 같고, created_at 은 NOT NULL 이라 새지 않는다)
    admin.from('threads_replies').select('classification').gte('created_at', lo).lt('created_at', hi),
    admin
      .from('threads_reply_queue')
      .select('status, created_at, approved_at')
      .gte('created_at', lo)
      .lt('created_at', hi),
    admin.from('event_entries').select('round_id').gte('created_at', lo).lt('created_at', hi),
    admin.from('event_rounds').select('id, slug, status').gte('closes_at', lo).lt('closes_at', hi),
    admin.from('event_winners').select('published_at, converted_user_id').gte('created_at', lo).lt('created_at', hi),
    // 유입 귀속은 자사 분석의 기존 함수를 그대로 쓴다 — 새로 만들지 않는다
    admin.rpc('analytics_acquisition', { p_start: bounds.startDate, p_end: bounds.endDate }),
  ])

  const errs = [postsRes, repliesRes, queueRes, entriesRes, roundsRes, winnersRes, acqRes]
    .map((r) => r.error?.message)
    .filter((m): m is string => Boolean(m))
  if (errs.length > 0) {
    logger.error('[ThreadsReport] query error', errs)
    return { success: false, error: errs.join(' / ') }
  }

  const acquisition = ((acqRes.data ?? []) as Array<AcquisitionRow & { source: string | null }>).filter(
    (r) => (r.source ?? '').toLowerCase() === 'threads'
  )

  const token = await loadThreadsToken()

  const metrics = buildWeeklyReport({
    bounds,
    posts: postsRes.data ?? [],
    replies: repliesRes.data ?? [],
    queue: queueRes.data ?? [],
    entries: entriesRes.data ?? [],
    rounds: roundsRes.data ?? [],
    winners: winnersRes.data ?? [],
    acquisition,
    tokenExpiresAt: token?.expiresAt ?? null,
  })

  const { error: upsertError } = await admin.from('threads_reports').upsert(
    {
      period_start: bounds.startDate,
      period_end: bounds.endDate,
      metrics,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'period_start,period_end' }
  )
  if (upsertError) {
    logger.error('[ThreadsReport] upsert failed', upsertError)
    return { success: false, error: upsertError.message }
  }

  // 토큰은 60일이고 놓치면 브라우저 재인증이라, 보고서가 도는 김에 만료 임박을 소리내 알린다.
  if (metrics.token.daysLeft !== null && metrics.token.daysLeft < 14) {
    logger.error('[ThreadsReport] Threads 토큰 만료 임박', { daysLeft: metrics.token.daysLeft })
  }

  return { success: true, period: metrics.period, metrics }
}
