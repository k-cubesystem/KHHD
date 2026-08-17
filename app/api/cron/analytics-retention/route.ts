import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * 분석·이벤트 데이터 보존 크론 (매일 03:00 KST).
 *  · page_views 원본 90일 파기 (집계는 조회 시 계산 — 규모 커지면 롤업 표로 이관)
 *  · 이벤트 응모자 개인정보(생년월일시·연락처) 라운드 종료 90일 후 파기 — 응모 폼 고지와 일치
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'development') logger.warn('[Cron analytics-retention] dev — auth skip')
    else return new NextResponse('Unauthorized', { status: 401 })
  }
  const admin = createAdminClient()
  const [pv, pii] = await Promise.all([
    admin.rpc('purge_page_views', { p_days: 90 }),
    admin.rpc('purge_event_entries_pii', { p_days: 90 }),
  ])
  const errors = [pv.error?.message, pii.error?.message].filter(Boolean)
  if (errors.length) logger.error('[analytics-retention]', errors.join(' | '))
  return NextResponse.json({
    ok: errors.length === 0,
    purgedPageViews: pv.data ?? 0,
    purgedEntriesPii: pii.data ?? 0,
    errors,
  })
}
