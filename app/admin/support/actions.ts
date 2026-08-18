'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { requireAdmin } from '@/lib/admin/require-admin'
import { isTicketFilter, statusesForFilter, type TicketFilter } from '@/lib/domain/support/ticket-status'

/**
 * CS 문의 운영 — 어드민 쪽.
 *
 * 🔴 `'use server'` export 는 공개 엔드포인트다. 문의 본문에는 개인적인 사정이 담긴다 —
 *    모든 함수가 `requireAdmin` 을 먼저 지난다.
 *
 * 🔴 필터 조건을 화면에서 다시 짜지 않는다. 「미해결」이 무엇인지는
 *    `lib/domain/support/ticket-status.ts` 한 곳이 정한다.
 */

export interface AdminTicket {
  id: string
  user_id: string
  user_email: string | null
  subject: string
  body: string
  status: string
  category: string
  last_reply_at: string | null
  created_at: string
  reply_count: number
}

export interface TicketCounts {
  open: number
  answered: number
  resolved: number
  unresolved: number
}

export async function getTicketCounts(): Promise<TicketCounts> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { open: 0, answered: 0, resolved: 0, unresolved: 0 }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('support_tickets').select('status')
  if (error) {
    logger.error('[admin/support] 집계 실패', { message: error.message })
    return { open: 0, answered: 0, resolved: 0, unresolved: 0 }
  }

  const rows = data ?? []
  const by = (s: string) => rows.filter((r) => r.status === s).length
  const open = by('OPEN')
  const answered = by('ANSWERED')

  return { open, answered, resolved: by('RESOLVED'), unresolved: open + answered }
}

export async function getAdminTickets(filter: string = 'unresolved'): Promise<AdminTicket[]> {
  const actor = await requireAdmin()
  if (!actor.authorized) return []

  const safeFilter: TicketFilter = isTicketFilter(filter) ? filter : 'unresolved'
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, user_id, subject, body, status, category, last_reply_at, created_at, support_replies(count)')
    .in('status', statusesForFilter(safeFilter) as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    logger.error('[admin/support] 목록 조회 실패', { message: error.message })
    return []
  }

  const rows = data ?? []
  // 이메일은 auth 쪽에 있어 조인이 안 된다 — 필요한 것만 한 번에 끌어온다.
  const emails = new Map<string, string | null>()
  if (rows.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', Array.from(new Set(rows.map((r) => r.user_id))))
    for (const p of profiles ?? []) emails.set(p.id, (p as { email?: string | null }).email ?? null)
  }

  return rows.map((row) => {
    const counts = row.support_replies as unknown as Array<{ count: number }> | null
    return {
      id: row.id,
      user_id: row.user_id,
      user_email: emails.get(row.user_id) ?? null,
      subject: row.subject,
      body: row.body,
      status: row.status,
      category: row.category,
      last_reply_at: row.last_reply_at,
      created_at: row.created_at,
      reply_count: counts?.[0]?.count ?? 0,
    }
  })
}

export async function getTicketReplies(
  ticketId: string
): Promise<Array<{ id: string; body: string; is_admin: boolean; created_at: string }>> {
  const actor = await requireAdmin()
  if (!actor.authorized) return []

  const { data } = await createAdminClient()
    .from('support_replies')
    .select('id, body, is_admin, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function replyToTicket(ticketId: string, body: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  const text = body.trim()
  if (text.length < 2) return { success: false, error: '답변 내용을 적어주세요.' }
  if (text.length > 4000) return { success: false, error: '너무 깁니다. 줄여주세요.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('support_replies')
    .insert({ ticket_id: ticketId, author_id: actor.actorId, is_admin: true, body: text })

  if (error) {
    logger.error('[admin/support] 답변 등록 실패', { message: error.message })
    return { success: false, error: '답변을 등록하지 못했습니다.' }
  }

  // 🔴 답변을 남기면 «답변함» 이 되고, 고객 화면에 빨간 점이 켜진다(이게 유일한 알림 경로).
  await supabase
    .from('support_tickets')
    .update({
      status: 'ANSWERED',
      has_unread_reply: true,
      last_reply_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .neq('status', 'RESOLVED')

  revalidatePath('/admin/support')
  revalidatePath('/admin')
  return { success: true }
}

export async function setTicketResolved(
  ticketId: string,
  resolved: boolean
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  const { error } = await createAdminClient()
    .from('support_tickets')
    .update({
      status: resolved ? 'RESOLVED' : 'ANSWERED',
      resolved_at: resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (error) {
    logger.error('[admin/support] 상태 변경 실패', { message: error.message })
    return { success: false, error: '상태를 바꾸지 못했습니다.' }
  }

  revalidatePath('/admin/support')
  revalidatePath('/admin')
  return { success: true }
}
