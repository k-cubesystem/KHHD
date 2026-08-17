import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishThread, type ThreadsMediaType } from '@/lib/services/threads/client'
import { logger } from '@/lib/utils/logger'

/**
 * 예약 글 발행 크론 (30분). status=scheduled 이고 scheduled_at 이 지난 글을 순서대로 발행한다.
 * 한 번에 5건 — 게시 한도 250/24h 대비 넉넉하고, 미디어 컨테이너 대기(30초+)가 있어 60초 예산을 지킨다.
 * 실패는 failed 로 남기고 다음 회차에 재시도하지 않는다(어드민에서 사람이 판단 — 같은 글이 두 번 나가면 안 된다).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PER_RUN = 5

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'development') logger.warn('[Cron threads-publish] dev — auth skip')
    else return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'threads_automation_enabled')
    .single()
  if (!setting || setting.value !== 'true') return NextResponse.json({ message: 'threads automation disabled' })

  const { data: due } = await admin
    .from('threads_posts')
    .select('id, kind, body, media_type, media_url, round_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(PER_RUN)

  const summary = { published: 0, failed: 0, errors: [] as string[] }
  for (const p of due ?? []) {
    // 낙관적 잠금 — 같은 글을 두 크론이 동시에 집지 않게 상태를 먼저 바꾼다
    const { data: locked } = await admin
      .from('threads_posts')
      .update({ status: 'publishing' })
      .eq('id', p.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle()
    if (!locked) continue

    const res = await publishThread({
      text: String(p.body),
      mediaType: String(p.media_type) as ThreadsMediaType,
      mediaUrl: p.media_url ? String(p.media_url) : undefined,
    })
    if (!res.ok) {
      summary.failed++
      summary.errors.push(`${p.id}: ${res.error}`)
      await admin.from('threads_posts').update({ status: 'failed', error: res.error }).eq('id', p.id)
      continue
    }
    summary.published++
    await admin
      .from('threads_posts')
      .update({
        status: 'published',
        media_id: res.data.mediaId,
        container_id: res.data.containerId,
        published_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', p.id)
    if (p.kind === 'campaign' && p.round_id) {
      await admin.from('event_rounds').update({ threads_post_id: res.data.mediaId }).eq('id', p.round_id)
    }
  }
  return NextResponse.json({ ok: summary.failed === 0, ...summary })
}
