'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'
import { dispatchDailyFortuneAlimtalk } from '@/lib/services/daily-fortune-dispatch'

export interface SystemSetting {
  key: string
  value: string
  description?: string
}

export async function getNotificationSettings() {
  const supabase = createAdminClient()
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

export async function updateNotificationSetting(key: string, value: string) {
  // 🔴 `'use server'` export 는 **공개 엔드포인트**다. 어드민 화면에서만 부른다고
  //    안전한 게 아니라, 액션 ID 만 알면 누구나 부를 수 있다. 권한을 여기서 막는다.
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  const supabase = createAdminClient()
  const { data: before } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()

  const { error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() })

  if (error) {
    logger.error('Error updating setting:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'notification_setting_change',
    detail: { key, before: before?.value ?? null, after: value },
  })

  revalidatePath('/admin/notifications')
  return { success: true }
}

export async function getNotificationLogs(page = 1, limit = 20) {
  const supabase = createAdminClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from('notification_logs')
    .select('*, profiles:user_id(full_name, email)', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { data, count }
}

export async function runManualAutomation() {
  // 🔴 이 함수는 **활성 구독자 중 수신 동의자 전원에게 실제로 발송한다.** 권한 없이 열려 있으면
  //    외부에서 부르는 것만으로 대량 발송이 일어난다.
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, message: actor.error }

  try {
    const supabase = createAdminClient()

    const { data: tmplSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'kakao_template_id')
      .single()

    // 크론과 **같은 경로**로 보낸다 — 대상 선정·동의 확인·생성·기록이 갈라지지 않도록.
    const stats = await dispatchDailyFortuneAlimtalk(tmplSetting?.value)

    if (!stats.ok) return { success: false, message: stats.blocked ?? '발송할 수 없습니다.' }
    if (stats.subscribers === 0) return { success: false, message: '활성 구독자가 없습니다.' }
    if (stats.total === 0) {
      return { success: false, message: `활성 구독자 ${stats.subscribers}명 중 알림톡 수신 동의자가 없습니다.` }
    }

    revalidatePath('/admin/notifications')
    return {
      success: true,
      message: `발송 완료: 성공 ${stats.sent}건, 실패 ${stats.errors}건 (대상 ${stats.total}명 / 구독자 ${stats.subscribers}명)`,
    }
  } catch (e: unknown) {
    logger.error('[Admin] 오늘의 운세 수동 발송 실패:', e)
    return { success: false, message: e instanceof Error ? e.message : String(e) }
  }
}
