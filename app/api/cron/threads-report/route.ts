import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyReport } from '@/lib/services/threads/report-service'
import { logger } from '@/lib/utils/logger'

/**
 * Threads 주간 보고서 크론 (월 09:00 KST) — S5.
 *
 * 지난 한 주(월~일 KST)를 집계해 `threads_reports` 한 행으로 굳힌다. 같은 주를 두 번 돌려도
 * (period_start, period_end) 유니크 덮어쓰기라 멱등이다.
 *
 * 🔴 킬스위치로 막지 않는다 — 외부 API 를 부르지 않는 읽기 집계이고, 자동화를 끈 주에도
 *    «그 주에 무슨 일이 있었나»는 남아야 한다.
 * 🔴 인사이트는 API 가 «현재 값»만 주므로 주가 지나면 복구가 불가능하다 — 그래서 매주 굳힌다.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'development') logger.warn('[Cron threads-report] dev — auth skip')
    else return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const result = await generateWeeklyReport(new Date())
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ success: true, period: result.period, metrics: result.metrics })
  } catch (e) {
    logger.error('[Cron threads-report] unexpected', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 })
  }
}
