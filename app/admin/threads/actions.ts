'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  publishThread,
  hideReply,
  fetchPublishingLimit,
  loadThreadsToken,
  validateText,
} from '@/lib/services/threads/client'
import { runDrawForRound, generateDraftForWinner } from '@/lib/services/event/draw-service'
import { generateWeeklyReport } from '@/lib/services/threads/report-service'
import { maskUsername } from '@/lib/domain/event/reading'
import { logger } from '@/lib/utils/logger'
import { getSiteUrl } from '@/lib/utils/site-url'

/**
 * Threads 이벤트 어드민 액션.
 *
 * 권한: 이 리포 관례상 액션은 role 검사를 하지 않고 미들웨어(/admin 진입)·레이아웃·RLS is_admin() 이 막는다.
 * 여기서 admin client 를 쓰는 곳은 «RLS 가 원천 봉쇄한 threads_tokens» 와 «Threads API 발송» 뿐이며,
 * 그 두 경로는 아래 assertAdmin() 으로 한 번 더 잠근다(발송은 되돌릴 수 없는 외부 부작용이라 방어를 겹친다).
 */

const ADMIN_PATH = '/admin/threads'

async function assertAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) return { error: '로그인이 필요합니다' }
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', uid).maybeSingle()
  if (p?.role !== 'admin') return { error: '관리자만 가능합니다' }
  return { userId: uid }
}

// ────────────────────────────────────────────────────────────────
// 상태
// ────────────────────────────────────────────────────────────────

export async function getThreadsStatus() {
  const admin = createAdminClient()
  const [token, { data: setting }, limit] = await Promise.all([
    loadThreadsToken(),
    admin.from('system_settings').select('value').eq('key', 'threads_automation_enabled').maybeSingle(),
    fetchPublishingLimit(),
  ])
  return {
    connected: !!token,
    username: token?.username ?? null,
    tokenExpiresAt: token?.expiresAt.toISOString() ?? null,
    automationEnabled: setting?.value === 'true',
    publishingLimit: limit.ok ? limit.data : null,
  }
}

export async function setAutomationEnabled(enabled: boolean) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const admin = createAdminClient()
  const { error } = await admin
    .from('system_settings')
    .upsert({ key: 'threads_automation_enabled', value: enabled ? 'true' : 'false' }, { onConflict: 'key' })
  if (error) return { success: false as const, error: error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

// ────────────────────────────────────────────────────────────────
// 라운드
// ────────────────────────────────────────────────────────────────

const RoundSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/, 'slug 는 소문자·숫자·하이픈 3~40자'),
  title: z.string().min(2).max(80),
  topic: z.enum(['saju', 'compatibility', 'wealth', 'career', 'love', 'family']),
  description: z.string().max(500).optional().or(z.literal('')),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  winnerCount: z.number().int().min(1).max(100),
})

export async function listRounds() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_rounds')
    .select(
      'id, slug, title, topic, opens_at, closes_at, winner_count, status, draw_seed, drawn_at, threads_post_id, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, items: data ?? [] }
}

export async function createRound(raw: unknown) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const parsed = RoundSchema.safeParse(raw)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? '입력 오류' }
  const v = parsed.data
  if (Date.parse(v.closesAt) <= Date.parse(v.opensAt))
    return { success: false as const, error: '마감이 시작보다 빨라요' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_rounds')
    .insert({
      slug: v.slug,
      title: v.title,
      topic: v.topic,
      description: v.description || null,
      opens_at: v.opensAt,
      closes_at: v.closesAt,
      winner_count: v.winnerCount,
      status: 'draft',
    })
    .select('id')
    .single()
  if (error) return { success: false as const, error: error.code === '23505' ? 'slug 중복' : error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const, id: data.id }
}

export async function setRoundStatus(id: string, status: 'draft' | 'open' | 'cancelled') {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const supabase = await createClient()
  const { error } = await supabase.from('event_rounds').update({ status }).eq('id', id).in('status', ['draft', 'open'])
  if (error) return { success: false as const, error: error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

/** «지금 추첨» — 마감 전이라도 운영자가 닫고 뽑는다. */
export async function drawNow(roundId: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const r = await runDrawForRound(roundId)
  revalidatePath(ADMIN_PATH)
  return r.ok
    ? { success: true as const, winners: r.winners, seed: r.seed }
    : { success: false as const, error: r.error }
}

// ────────────────────────────────────────────────────────────────
// 응모·당첨
// ────────────────────────────────────────────────────────────────

export async function listEntries(roundId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_entries')
    .select('id, threads_username, gender, question, consent_public, status, user_id, created_at')
    .eq('round_id', roundId)
    .order('created_at', { ascending: false })
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, items: data ?? [] }
}

export async function listWinners(roundId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_winners')
    .select(
      'id, entry_id, rank, draft_reading, draft_json, draft_status, approved_at, card_token, published_post_id, published_at, event_entries(threads_username, question, consent_public)'
    )
    .eq('round_id', roundId)
    .order('rank', { ascending: true })
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, items: data ?? [] }
}

export async function regenerateDraft(winnerId: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const admin = createAdminClient()
  await admin.from('event_winners').update({ draft_status: 'pending' }).eq('id', winnerId)
  const r = await generateDraftForWinner(winnerId)
  revalidatePath(ADMIN_PATH)
  return r.ok ? { success: true as const } : { success: false as const, error: r.error }
}

/** 초안 검토 — 문안을 고쳐서 승인할 수 있다(사람이 최종 문안의 주인). */
export async function approveDraft(winnerId: string, editedReading?: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const supabase = await createClient()
  const patch: Record<string, unknown> = {
    draft_status: 'approved',
    approved_by: g.userId,
    approved_at: new Date().toISOString(),
  }
  if (typeof editedReading === 'string' && editedReading.trim().length >= 50) patch.draft_reading = editedReading.trim()
  const { error } = await supabase
    .from('event_winners')
    .update(patch)
    .eq('id', winnerId)
    .in('draft_status', ['ready', 'rejected'])
  if (error) return { success: false as const, error: error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

export async function rejectDraft(winnerId: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const supabase = await createClient()
  const { error } = await supabase.from('event_winners').update({ draft_status: 'rejected' }).eq('id', winnerId)
  if (error) return { success: false as const, error: error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

/**
 * 승인된 결과를 스레드에 발표 — 결과 카드(IMAGE) + 마스킹 아이디 + 사이트 링크.
 * 되돌릴 수 없는 외부 부작용이라 approved 상태·미발행만 허용하고, 발행 즉시 media_id 를 기록해 이중 발송을 막는다.
 */
export async function publishWinnerResult(winnerId: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const admin = createAdminClient()
  const { data: w } = await admin
    .from('event_winners')
    .select(
      'id, round_id, draft_status, draft_json, card_token, published_post_id, event_entries(threads_username, consent_public)'
    )
    .eq('id', winnerId)
    .maybeSingle()
  if (!w) return { success: false as const, error: '당첨자 없음' }
  if (w.draft_status !== 'approved') return { success: false as const, error: '승인된 초안만 발표할 수 있어요' }
  if (w.published_post_id) return { success: false as const, error: '이미 발표됨' }

  const entry = Array.isArray(w.event_entries) ? w.event_entries[0] : w.event_entries
  const username = String(entry?.threads_username ?? '')
  const consentPublic = !!entry?.consent_public
  const dj = (w.draft_json ?? {}) as { headline?: string }
  const site = getSiteUrl()
  const { data: round } = await admin.from('event_rounds').select('slug, title').eq('id', w.round_id).single()

  // 공개 동의 없으면 카드 없이 텍스트만(멘션으로 안내) — 풀이 본문은 사이트에서 본다
  const resultUrl = `${site}/event/${round?.slug ?? ''}/result/${w.card_token}?utm_source=threads&utm_medium=result&utm_campaign=${encodeURIComponent(round?.slug ?? '')}`
  const text = consentPublic
    ? `[${round?.title ?? '이벤트'}] @${username} 님의 결과예요 🙏\n「${dj.headline ?? ''}」\n전문은 여기서 → ${resultUrl}`
    : `[${round?.title ?? '이벤트'}] @${username} 님, 결과가 준비됐어요 🙏 아래 링크에서 확인해 주세요.\n${resultUrl}`
  const textErr = validateText(text)
  if (textErr) return { success: false as const, error: textErr }

  const cardUrl = consentPublic ? `${site}/api/og/event/${w.card_token}` : undefined
  const res = await publishThread(
    cardUrl ? { text, mediaType: 'IMAGE', mediaUrl: cardUrl } : { text, mediaType: 'TEXT' }
  )
  if (!res.ok) {
    logger.error('[threads] 결과 발표 실패', winnerId, res.error)
    return { success: false as const, error: res.error }
  }
  await admin
    .from('event_winners')
    .update({ published_post_id: res.data.mediaId, published_at: new Date().toISOString() })
    .eq('id', winnerId)
  await admin.from('threads_posts').insert({
    media_id: res.data.mediaId,
    container_id: res.data.containerId,
    kind: 'result',
    round_id: w.round_id,
    body: text,
    media_type: cardUrl ? 'IMAGE' : 'TEXT',
    media_url: cardUrl ?? null,
    status: 'published',
    published_at: new Date().toISOString(),
  })
  revalidatePath(ADMIN_PATH)
  return { success: true as const, mediaId: res.data.mediaId, masked: maskUsername(username) }
}

// ────────────────────────────────────────────────────────────────
// 답글 큐 · 댓글
// ────────────────────────────────────────────────────────────────

export async function listReplyQueue() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('threads_reply_queue')
    .select(
      'id, draft_text, variant_key, status, created_at, sent_at, error, threads_replies(reply_id, username, text, replied_at, classification)'
    )
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, items: data ?? [] }
}

/** 승인+발송 한 번에 — 반자동의 «사람 1클릭». 하루 답글 한도(1,000)와 라운드당 30건 자체 상한을 본다. */
export async function approveAndSendReply(queueId: string, editedText?: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const admin = createAdminClient()
  const { data: q } = await admin
    .from('threads_reply_queue')
    .select('id, draft_text, status, threads_replies(id, reply_id)')
    .eq('id', queueId)
    .maybeSingle()
  if (!q) return { success: false as const, error: '큐 항목 없음' }
  if (q.status !== 'pending' && q.status !== 'failed') return { success: false as const, error: `상태 ${q.status}` }
  const rep = Array.isArray(q.threads_replies) ? q.threads_replies[0] : q.threads_replies
  const replyToId = String(rep?.reply_id ?? '')
  if (!replyToId) return { success: false as const, error: '대상 댓글 없음' }

  const text = (editedText?.trim() || String(q.draft_text)).slice(0, 500)
  const textErr = validateText(text)
  if (textErr) return { success: false as const, error: textErr }

  await admin
    .from('threads_reply_queue')
    .update({ status: 'approved', approved_by: g.userId, approved_at: new Date().toISOString(), draft_text: text })
    .eq('id', queueId)
  const res = await publishThread({ text, mediaType: 'TEXT', replyToId })
  if (!res.ok) {
    await admin.from('threads_reply_queue').update({ status: 'failed', error: res.error }).eq('id', queueId)
    return { success: false as const, error: res.error }
  }
  await Promise.all([
    admin
      .from('threads_reply_queue')
      .update({ status: 'sent', sent_reply_id: res.data.mediaId, sent_at: new Date().toISOString(), error: null })
      .eq('id', queueId),
    rep?.id
      ? admin
          .from('threads_replies')
          .update({ our_reply_id: res.data.mediaId, handled_at: new Date().toISOString() })
          .eq('id', rep.id)
      : Promise.resolve(),
  ])
  revalidatePath(ADMIN_PATH)
  return { success: true as const, mediaId: res.data.mediaId }
}

export async function rejectReply(queueId: string) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const supabase = await createClient()
  const { error } = await supabase.from('threads_reply_queue').update({ status: 'rejected' }).eq('id', queueId)
  if (error) return { success: false as const, error: error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

export async function listRecentReplies(limit = 100) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('threads_replies')
    .select(
      'id, reply_id, username, text, replied_at, classification, classified_by, hide_status, our_reply_id, handled_at, threads_posts(kind, body)'
    )
    .order('replied_at', { ascending: false })
    .limit(limit)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, items: data ?? [] }
}

export async function setReplyClassification(
  replyRowId: string,
  classification: 'apply' | 'question' | 'chat' | 'spam' | 'other'
) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from('threads_replies')
    .update({ classification, classified_by: 'human' })
    .eq('id', replyRowId)
  if (error) return { success: false as const, error: error.message }
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

/** 스팸 숨김 — 1클릭. */
export async function hideReplyAction(replyRowId: string, hide: boolean) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const admin = createAdminClient()
  const { data: r } = await admin.from('threads_replies').select('reply_id').eq('id', replyRowId).maybeSingle()
  if (!r) return { success: false as const, error: '댓글 없음' }
  const res = await hideReply(String(r.reply_id), hide)
  if (!res.ok) return { success: false as const, error: res.error }
  await admin
    .from('threads_replies')
    .update({ hide_status: hide ? 'HIDDEN' : 'UNHUSHED', handled_at: new Date().toISOString() })
    .eq('id', replyRowId)
  revalidatePath(ADMIN_PATH)
  return { success: true as const }
}

// ────────────────────────────────────────────────────────────────
// 글 발행 (라운드 오픈 글·콘텐츠 글)
// ────────────────────────────────────────────────────────────────

const PostSchema = z.object({
  kind: z.enum(['campaign', 'content', 'announce']),
  body: z.string().min(1).max(500),
  mediaUrl: z.string().url().optional().or(z.literal('')),
  roundId: z.string().uuid().optional().or(z.literal('')),
  scheduledAt: z.string().datetime().optional().or(z.literal('')),
})

/** 즉시 발행 또는 예약(scheduledAt 있으면 threads-publish 크론이 시각에 발행). */
export async function createPost(raw: unknown) {
  const g = await assertAdmin()
  if ('error' in g) return { success: false as const, error: g.error }
  const parsed = PostSchema.safeParse(raw)
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? '입력 오류' }
  const v = parsed.data
  const textErr = validateText(v.body)
  if (textErr) return { success: false as const, error: textErr }
  const admin = createAdminClient()

  const base = {
    kind: v.kind,
    body: v.body,
    media_type: v.mediaUrl ? 'IMAGE' : 'TEXT',
    media_url: v.mediaUrl || null,
    round_id: v.roundId || null,
  }
  if (v.scheduledAt) {
    const { error } = await admin
      .from('threads_posts')
      .insert({ ...base, status: 'scheduled', scheduled_at: v.scheduledAt })
    if (error) return { success: false as const, error: error.message }
    revalidatePath(ADMIN_PATH)
    return { success: true as const, scheduled: true }
  }
  const { data: row, error } = await admin
    .from('threads_posts')
    .insert({ ...base, status: 'publishing' })
    .select('id')
    .single()
  if (error) return { success: false as const, error: error.message }
  const res = await publishThread({
    text: v.body,
    mediaType: v.mediaUrl ? 'IMAGE' : 'TEXT',
    mediaUrl: v.mediaUrl || undefined,
  })
  if (!res.ok) {
    await admin.from('threads_posts').update({ status: 'failed', error: res.error }).eq('id', row.id)
    return { success: false as const, error: res.error }
  }
  await admin
    .from('threads_posts')
    .update({
      status: 'published',
      media_id: res.data.mediaId,
      container_id: res.data.containerId,
      published_at: new Date().toISOString(),
    })
    .eq('id', row.id)
  if (v.kind === 'campaign' && v.roundId)
    await admin.from('event_rounds').update({ threads_post_id: res.data.mediaId }).eq('id', v.roundId)
  revalidatePath(ADMIN_PATH)
  return { success: true as const, mediaId: res.data.mediaId }
}

export async function listPosts(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('threads_posts')
    .select(
      'id, media_id, kind, body, media_type, status, scheduled_at, published_at, insights, insights_at, error, permalink'
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const, items: data ?? [] }
}

// ────────────────────────────────────────────────────────────────
// 주간 보고서 (S5)
// ────────────────────────────────────────────────────────────────

export async function listReports(limit = 8) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('threads_reports')
    .select('id, period_start, period_end, metrics, updated_at')
    .order('period_start', { ascending: false })
    .limit(limit)
  if (error) {
    logger.error('[Threads Admin] listReports', error)
    return { success: false as const, error: error.message }
  }
  return { success: true as const, items: data ?? [] }
}

/** 크론을 기다리지 않고 지난주를 지금 집계 — 크론과 같은 서비스를 부르므로 결과가 갈리지 않는다. */
export async function generateReportNow() {
  const gate = await assertAdmin()
  if ('error' in gate) return { success: false as const, error: gate.error }
  const r = await generateWeeklyReport(new Date())
  if (!r.success) return { success: false as const, error: r.error ?? '집계에 실패했어요' }
  revalidatePath(ADMIN_PATH)
  return { success: true as const, period: r.period }
}
