import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { runDrawForRound, generateDraftForWinner } from '@/lib/services/event/draw-service'

/**
 * 이벤트 추첨·초안 크론 (30분).
 *
 * 1) 마감이 지난 open 라운드 → closed → 결정론 추첨(seed = 라운드 id + 마감시각, 공개) → drawn
 * 2) drawn 라운드의 당첨자 중 초안이 없는 것 → 간이 풀이 생성 → ready (사람 승인 대기)
 *
 * 발송은 하지 않는다. 승인은 어드민, 발송은 어드민 액션(반자동 경계 — PLAN §2.5).
 * 어드민 «지금 추첨» 버튼도 같은 함수를 부른다(runDrawForRound).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DRAFTS_PER_RUN = 6 // flash 3~5초/건 — 60초 예산 안

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'development') logger.warn('[Cron event-draw] dev — auth skip')
    else return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'threads_automation_enabled')
    .single()
  if (!setting || setting.value !== 'true') return NextResponse.json({ message: 'threads automation disabled' })

  const summary = { drawn: [] as string[], drafted: 0, errors: [] as string[] }

  // 1) 마감 지난 open 라운드
  const { data: due } = await admin
    .from('event_rounds')
    .select('id, slug, closes_at, winner_count')
    .eq('status', 'open')
    .lt('closes_at', new Date().toISOString())
  for (const r of due ?? []) {
    const res = await runDrawForRound(String(r.id))
    if (res.ok) summary.drawn.push(String(r.slug))
    else summary.errors.push(`draw ${r.slug}: ${res.error}`)
  }

  // 2) 초안 생성
  const { data: pend } = await admin
    .from('event_winners')
    .select('id, entry_id, round_id')
    .eq('draft_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(DRAFTS_PER_RUN)
  for (const w of pend ?? []) {
    const r = await generateDraftForWinner(String(w.id))
    if (r.ok) summary.drafted++
    else summary.errors.push(`draft ${w.id}: ${r.error}`)
  }

  return NextResponse.json({ ok: summary.errors.length === 0, ...summary })
}
