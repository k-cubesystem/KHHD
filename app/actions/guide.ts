'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/** 신규 가입자 온보딩 — 다음에 할 일 1건 (전부 마치면 null) */
export interface GuideOnboarding {
  key: 'saju' | 'shrine' | 'chat'
  text: string
  ctaLabel: string
  ctaHref: string
  /** 완료 수 / 전체 (진행 표시용) */
  done: number
  total: number
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
  /** 서버 저장 투어 진행률 (경로→완료 스텝). 기기 바뀌어도 유지 */
  progress: Record<string, number>
  /** 확인한 공지 id (서버 저장) */
  seenNoticeId: string | null
  /** 다음 온보딩 단계 (전부 마쳤으면 null) */
  onboarding: GuideOnboarding | null
}

/** 알림 종류 → 가이드 말풍선 CTA */
const NOTICE_CTA: Record<string, { label: string; href: string }> = {
  chat_expiry_notice: { label: '기억의 함 보러가기', href: '/protected/store?tab=items' },
  membership_deity_gift: { label: '신위전에서 좌정하기', href: '/protected/shrine/deities' },
  // 신탁은 «읽고 닫히던» 말이었다 — 문답으로 잇는다(P1-C). id 는 알림 행에 없으므로 최근 신탁을
  // 이어받는 경로(?oracle=latest)로 보낸다.
  deity_oracle: { label: '이어서 여쭙기', href: '/protected/ai-shaman?oracle=latest' },
}

/** 전 페이지 신 가이드 초기 데이터 — 마운트 시 1회 로드. */
export async function getGuideData(): Promise<GuideData> {
  const empty: GuideData = {
    deityName: null,
    portraitUrl: null,
    accent: null,
    announcement: null,
    personalNotice: null,
    progress: {},
    seenNoticeId: null,
    onboarding: null,
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return empty

    const [{ data: shrine }, { data: notice }, { data: personal }, { data: profile }, { count: chatCount }] =
      await Promise.all([
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
        supabase.from('profiles').select('birth_date, guide_progress').eq('id', user.id).maybeSingle(),
        supabase.from('chat_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
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

    // 서버 저장 진행률 파싱
    const rawProgress = profile?.guide_progress
    const stored: Record<string, unknown> =
      typeof rawProgress === 'object' && rawProgress !== null ? (rawProgress as Record<string, unknown>) : {}
    const progress: Record<string, number> = {}
    for (const [k, v] of Object.entries(stored)) {
      if (k !== '_notice' && typeof v === 'number') progress[k] = v
    }
    const seenNoticeId = typeof stored._notice === 'string' ? stored._notice : null

    // 온보딩: 사주 입력 → 신당 강신 → 첫 상담. 다음 미완료 1건만 안내.
    const steps = [
      {
        key: 'saju' as const,
        done: !!profile?.birth_date,
        text: '먼저 생년월일을 알려주시면, 그대의 사주로 모든 풀이가 시작됩니다.',
        ctaLabel: '사주 입력하기',
        ctaHref: '/protected/settings',
      },
      {
        key: 'shrine' as const,
        done: !!shrine?.main_deity_id,
        text: '신당을 열면 그대 사주에 맞는 수호신이 강림합니다.',
        ctaLabel: '신당 열러 가기',
        ctaHref: '/protected/shrine',
      },
      {
        key: 'chat' as const,
        done: (chatCount ?? 0) > 0,
        text: '이제 속풀이로 여쭤보세요. 좌정하신 神이 사주를 근거로 답해드립니다.',
        ctaLabel: '여쭈러 가기',
        ctaHref: '/protected/ai-shaman',
      },
    ]
    const doneCount = steps.filter((s) => s.done).length
    const next = steps.find((s) => !s.done)
    const onboarding: GuideOnboarding | null = next
      ? {
          key: next.key,
          text: next.text,
          ctaLabel: next.ctaLabel,
          ctaHref: next.ctaHref,
          done: doneCount,
          total: steps.length,
        }
      : null

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
      progress,
      seenNoticeId,
      onboarding,
    }
  } catch (e) {
    logger.warn('[guide] getGuideData skipped:', e)
    return empty
  }
}

/**
 * 투어 진행률·공지 확인 저장 — 기기가 바뀌어도 유지되도록 서버에 기록.
 * 진행률은 **되돌아가지 않게** 기존값과 max 병합(다른 기기의 진행을 덮어쓰지 않음).
 */
export async function saveGuideProgress(input: {
  path?: string
  step?: number
  seenNoticeId?: string
}): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const { data: profile } = await supabase.from('profiles').select('guide_progress').eq('id', user.id).maybeSingle()
    const raw = profile?.guide_progress
    const merged: Record<string, unknown> =
      typeof raw === 'object' && raw !== null ? { ...(raw as Record<string, unknown>) } : {}

    if (input.path && typeof input.step === 'number') {
      const prev = typeof merged[input.path] === 'number' ? (merged[input.path] as number) : 0
      merged[input.path] = Math.max(prev, input.step)
    }
    if (input.seenNoticeId) merged._notice = input.seenNoticeId

    const { error } = await supabase.from('profiles').update({ guide_progress: merged }).eq('id', user.id)
    if (error) {
      logger.warn('[guide] progress save failed:', error)
      return { success: false }
    }
    return { success: true }
  } catch (e) {
    logger.warn('[guide] progress save exception:', e)
    return { success: false }
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
  /** true면 전 회원 알림함에도 발송 (알림 센터 + 가이드 말풍선 노출) */
  alsoNotify?: boolean
}): Promise<{ success: boolean; error?: string; notifiedCount?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const title = input.title.trim().slice(0, 80)
  const body = input.body.trim().slice(0, 500)
  if (!title || !body) return { success: false, error: 'EMPTY' }

  // RLS(is_admin) 가 권한 최종 방어 — 실패 시 여기서 끊긴다.
  const { error } = await supabase.from('announcements').insert({ title, body, created_by: user.id })
  if (error) return { success: false, error: error.message }

  let notifiedCount: number | undefined
  if (input.alsoNotify) {
    // 공지 insert 가 통과 = admin 확인됨. 전 회원 알림 발행은 service_role.
    const admin = createAdminClient()
    const { data: profiles } = await admin.from('profiles').select('id')
    const rows = (profiles ?? []).map((p) => ({
      user_id: p.id,
      title,
      message: body,
      type: 'admin_announcement',
      is_read: false,
    }))
    if (rows.length > 0) {
      const { error: notifyError } = await admin.from('notifications').insert(rows)
      if (notifyError) {
        // 공지 자체는 이미 등록됨 — 알림 실패는 부분 실패로 알린다.
        logger.error('[announcement] notify failed:', notifyError)
        revalidatePath('/admin/announcements')
        return { success: true, error: 'NOTIFY_FAILED', notifiedCount: 0 }
      }
      notifiedCount = rows.length
    } else {
      notifiedCount = 0
    }
  }

  revalidatePath('/admin/announcements')
  return { success: true, notifiedCount }
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
