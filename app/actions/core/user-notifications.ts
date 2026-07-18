'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'

export interface UserNotification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

/** 내 알림 목록 (최신순). RLS(select own)가 소유 보장. */
export async function listMyNotifications(limit = 50): Promise<UserNotification[]> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      logger.error('[notifications] list failed:', error)
      return []
    }
    return (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read === true,
      createdAt: n.created_at,
    }))
  } catch (e) {
    logger.error('[notifications] list exception:', e)
    return []
  }
}

/** 안 읽은 알림 중 가장 최근 1건 — 신 가이드 말풍선 노출용. */
export async function getLatestUnreadNotification(): Promise<UserNotification | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    title: data.title,
    message: data.message,
    type: data.type,
    isRead: false,
    createdAt: data.created_at,
  }
}

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) {
    logger.error('[notifications] mark read failed:', error)
    return { success: false }
  }
  revalidatePath('/protected/notifications')
  return { success: true }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  if (error) {
    logger.error('[notifications] mark all read failed:', error)
    return { success: false }
  }
  revalidatePath('/protected/notifications')
  return { success: true }
}
