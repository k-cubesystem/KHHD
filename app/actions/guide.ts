'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'

export interface GuideAnnouncement {
  id: string
  title: string
  body: string
}

export interface GuidePersonalNotice {
  id: string
  title: string
  message: string
  /** 행동 유도 링크 (알림 종류별) */
  ctaLabel: string | null
  ctaHref: string | null
}

export interface GuideData {
  /** 좌정 主神 (없으면 해화지기 폴백) */
  deityName: string | null
  portraitUrl: string | null
  accent: string | null
  /** 최신 활성 공지 (없으면 null) */
  announcement: GuideAnnouncement | null
  /** 안 읽은 개인 알림 1건 (공지보다 우선 — 만료 예고 등) */
  personalNotice: GuidePersonalNotice | null
}

/** 알림 종류 → 가이드 말풍선 CTA */
const NOTICE_CTA: Record<string, { label: string; href: string }> = {
  chat_expiry_notice: { label: '기억의 함 보러가기', href: '/protected/store?tab=items' },
}

/** 전 페이지 신 가이드 초기 데이터 — 마운트 시 1회 로드. */
export async function getGuideData(): Promise<GuideData> {
  const empty: GuideData = {
    deityName: null,
    portraitUrl: null,
    accent: null,
    announcement: null,
    personalNotice: null,
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return empty

    const [{ data: shrine }, { data: notice }, { data: personal }] = await Promise.all([
      supabase
        .from('shrines')
        .select('main_deity_id')
        .eq('user_id', user.id)
        .is('family_member_id', null)
        .maybeSingle(),
      supabase
        .from('announcements')
        .select('id, title, body')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('notifications')
        .select('id, title, message, type')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    let deityName: string | null = null
    let portraitUrl: string | null = null
    let accent: string | null = null
    if (shrine?.main_deity_id) {
      const { data: deity } = await supabase
        .from('shrine_deities')
        .select('name, portrait_url, aura')
        .eq('id', shrine.main_deity_id)
        .maybeSingle()
      if (deity) {
        deityName = deity.name
        portraitUrl = deity.portrait_url
        const aura =
          typeof deity.aura === 'object' && deity.aura !== null ? (deity.aura as Record<string, unknown>) : {}
        accent = typeof aura.accent === 'string' ? aura.accent : null
      }
    }

    const cta = personal ? NOTICE_CTA[personal.type] : undefined

    return {
      deityName,
      portraitUrl,
      accent,
      announcement: notice ? { id: notice.id, title: notice.title, body: notice.body } : null,
      personalNotice: personal
        ? {
            id: personal.id,
            title: personal.title,
            message: personal.message,
            ctaLabel: cta?.label ?? null,
            ctaHref: cta?.href ?? null,
          }
        : null,
    }
  } catch (e) {
    logger.warn('[guide] getGuideData skipped:', e)
    return empty
  }
}

// ─── 공지사항 관리 (어드민) — RLS is_admin() 이 서버 측 최종 방어 ───

export interface AnnouncementRow {
  id: string
  title: string
  body: string
  isActive: boolean
  startsAt: string
  endsAt: string | null
  createdAt: string
}

export async function listAnnouncements(): Promise<{ success: boolean; items?: AnnouncementRow[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, is_active, starts_at, ends_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return { success: false, error: error.message }
  return {
    success: true,
    items: (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      isActive: r.is_active,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      createdAt: r.created_at,
    })),
  }
}

export async function createAnnouncement(input: {
  title: string
  body: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const title = input.title.trim().slice(0, 80)
  const body = input.body.trim().slice(0, 500)
  if (!title || !body) return { success: false, error: 'EMPTY' }

  const { error } = await supabase.from('announcements').insert({ title, body, created_by: user.id })
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/announcements')
  return { success: true }
}

export async function setAnnouncementActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('announcements').update({ is_active: active }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/announcements')
  return { success: true }
}

export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/announcements')
  return { success: true }
}
