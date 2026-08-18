'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { TICKET_CATEGORIES, type TicketCategory } from '@/lib/domain/support/ticket-status'

/**
 * 고객 문의 — **본인 글만** 만지는 경로.
 *
 * 🔴 `'use server'` export 는 공개 엔드포인트다. 로그인 확인을 여기서 하고,
 *    «누구의 글인가» 는 클라이언트가 보낸 값이 아니라 **세션에서** 가져온다.
 *    user_id 를 인자로 받으면 남의 이름으로 문의를 만들 수 있다.
 *
 * 🔴 알림은 **사이트 안 배지**뿐이다(CEO 결정 2026-08-19). SMTP 미설정·VAPID 미설정이라
 *    메일·푸시는 지금 동작하지 않는다 — 지키지 못할 약속을 화면에 적지 않는다.
 */

export interface SupportTicketSummary {
  id: string
  subject: string
  status: string
  category: string
  has_unread_reply: boolean
  last_reply_at: string | null
  created_at: string
  reply_count: number
}

export interface SupportTicketDetail extends SupportTicketSummary {
  body: string
  replies: Array<{ id: string; body: string; is_admin: boolean; created_at: string }>
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function createSupportTicket(input: {
  subject: string
  body: string
  category: string
}): Promise<{ success: boolean; error?: string; ticketId?: string }> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: '로그인이 필요합니다.' }

  const subject = input.subject.trim()
  const body = input.body.trim()
  if (subject.length < 2) return { success: false, error: '제목을 2자 이상 적어주세요.' }
  if (body.length < 5) return { success: false, error: '내용을 조금 더 적어주세요.' }
  if (subject.length > 120 || body.length > 4000) return { success: false, error: '너무 깁니다. 줄여주세요.' }

  const category: TicketCategory = (TICKET_CATEGORIES as readonly string[]).includes(input.category)
    ? (input.category as TicketCategory)
    : 'ETC'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, subject, body, category })
    .select('id')
    .single()

  if (error) {
    logger.error('[support] 문의 등록 실패', { message: error.message })
    return { success: false, error: '문의를 등록하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }
  }

  revalidatePath('/protected/support')
  return { success: true, ticketId: data.id }
}

/** 내 문의 목록. RLS 가 «본인 것»만 돌려준다. */
export async function getMyTickets(): Promise<SupportTicketSummary[]> {
  const userId = await currentUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, category, has_unread_reply, last_reply_at, created_at, support_replies(count)')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[support] 내 문의 조회 실패', { message: error.message })
    return []
  }

  return (data ?? []).map((row) => {
    const counts = row.support_replies as unknown as Array<{ count: number }> | null
    return {
      id: row.id,
      subject: row.subject,
      status: row.status,
      category: row.category,
      has_unread_reply: row.has_unread_reply,
      last_reply_at: row.last_reply_at,
      created_at: row.created_at,
      reply_count: counts?.[0]?.count ?? 0,
    }
  })
}

/** 문의 하나 + 답변. 여는 순간 «안 읽은 답변» 표시를 끈다. */
export async function getMyTicket(ticketId: string): Promise<SupportTicketDetail | null> {
  const userId = await currentUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, body, status, category, has_unread_reply, last_reply_at, created_at')
    .eq('id', ticketId)
    .maybeSingle()

  if (error || !data) return null

  const { data: replies } = await supabase
    .from('support_replies')
    .select('id, body, is_admin, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (data.has_unread_reply) {
    // 🔴 배지 해제는 service_role 로 한다 — 고객에게는 UPDATE 권한이 없다(상태 조작 방지).
    await createAdminClient()
      .from('support_tickets')
      .update({ has_unread_reply: false })
      .eq('id', ticketId)
      .eq('user_id', userId)
  }

  return {
    ...data,
    replies: replies ?? [],
    reply_count: replies?.length ?? 0,
  }
}

/** 고객이 자기 글에 덧붙이는 말. is_admin 은 RLS 가 false 로 강제한다. */
export async function addMyReply(ticketId: string, body: string): Promise<{ success: boolean; error?: string }> {
  const userId = await currentUserId()
  if (!userId) return { success: false, error: '로그인이 필요합니다.' }

  const text = body.trim()
  if (text.length < 2) return { success: false, error: '내용을 적어주세요.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('support_replies')
    .insert({ ticket_id: ticketId, author_id: userId, is_admin: false, body: text })

  if (error) {
    logger.error('[support] 고객 답글 실패', { message: error.message })
    return { success: false, error: '등록하지 못했습니다.' }
  }

  // 고객이 다시 말을 걸었으면 «답변함» 이 아니라 다시 «새 문의» 다.
  await createAdminClient()
    .from('support_tickets')
    .update({ status: 'OPEN', last_reply_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('user_id', userId)
    .neq('status', 'RESOLVED')

  revalidatePath('/protected/support')
  return { success: true }
}

/** 사이트 안 배지용 — 안 읽은 답변 개수. */
export async function getUnreadReplyCount(): Promise<number> {
  const userId = await currentUserId()
  if (!userId) return 0

  const supabase = await createClient()
  const { count } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('has_unread_reply', true)

  return count ?? 0
}
