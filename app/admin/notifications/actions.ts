'use server'

import { requireAdminClient } from '@/lib/auth/admin-guard'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://haehwadang.com'

export interface SystemSetting {
  key: string
  value: string
  description?: string
}

export async function getNotificationSettings() {
  const supabase = await requireAdminClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .in('key', ['daily_fortune_time', 'daily_fortune_enabled', 'kakao_template_id'])

  if (error) throw error

  // Transform to object for easier use
  const settings: Record<string, string> = {}
  data.forEach((item) => {
    settings[item.key] = item.value
  })

  return settings
}

const EDITABLE_SETTING_KEYS = ['daily_fortune_time', 'daily_fortune_enabled', 'kakao_template_id'] as const

export async function updateNotificationSetting(key: string, value: string) {
  // key를 그대로 받으면 system_settings의 임의 키(기능 플래그·환율 등)를 덮어쓸 수 있다
  if (!EDITABLE_SETTING_KEYS.includes(key as (typeof EDITABLE_SETTING_KEYS)[number])) {
    return { success: false, error: `수정할 수 없는 설정 키입니다: ${key}` }
  }

  const supabase = await requireAdminClient()
  const { error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() })

  if (error) {
    logger.error('Error updating setting:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/notifications')
  return { success: true }
}

export async function getNotificationLogs(page = 1, limit = 20) {
  const supabase = await requireAdminClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  // notification_logs.user_id의 FK는 auth.users를 가리켜 profiles를 임베드할 수 없다(PGRST200)
  const { data, count, error } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const rows = data ?? []
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>()

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (profileError) logger.error('발송 로그 프로필 조회 실패:', profileError)
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email })
    }
  }

  return {
    data: rows.map((r) => ({ ...r, profiles: profileMap.get(r.user_id) ?? null })),
    count,
  }
}

export async function runManualAutomation() {
  try {
    const supabase = await requireAdminClient()

    // 1. Get Template
    const { data: tmplSetting, error: tmplError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'kakao_template_id')
      .maybeSingle()

    if (tmplError) logger.error('알림톡 템플릿 조회 실패:', tmplError)
    const templateId = tmplSetting?.value || 'DAILY_FORTUNE_V1'

    // 2. Fetch Active Subscribers
    // status 값은 대문자다(ACTIVE/PENDING/...). 소문자 'active'로는 영원히 0건이었다
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'ACTIVE')

    if (subError) {
      logger.error('활성 구독자 조회 실패:', subError)
      return { success: false, message: '활성 구독자 조회에 실패했습니다.' }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, message: '활성 구독자가 없습니다.' }
    }

    // 3. Import Logic Dynamically
    const { generateDailyFortune } = await import('@/app/actions/fortune/daily')
    const { sendKakaoNotification } = await import('@/app/actions/fortune/notification')

    let sentCount = 0
    let errorCount = 0

    // 4. Process Batch
    const promises = subscriptions.map(async (sub) => {
      try {
        const genResult = await generateDailyFortune(sub.user_id, sub.user_id, 'USER')
        if (genResult.success && genResult.content) {
          await sendKakaoNotification(sub.user_id, templateId, {
            content: genResult.content.substring(0, 50) + '...',
            link: `${SITE_URL}/protected/analysis?tab=daily`,
          })
          sentCount++
        } else {
          errorCount++
        }
      } catch (e) {
        logger.error(e)
        errorCount++
      }
    })

    await Promise.allSettled(promises)

    return {
      success: true,
      message: `발송 완료: 성공 ${sentCount}건, 실패 ${errorCount}건`,
    }
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : String(e) }
  }
}
