'use server'

/**
 * 알림 설정 서버 액션 (사용자 화면용)
 * Edge Function 전환 지원: EDGE_NOTIFICATION=true 시 Edge Function 호출
 *
 * 🔴 «발송» 자체는 여기 없다. `'use server'` 의 export 는 전부 공개 엔드포인트라,
 *    번호·템플릿을 인자로 받는 발송 함수를 여기 두면 아무나 대량 발송을 시킬 수 있다.
 *    발송 정본: lib/services/solapi(한 통) · lib/services/daily-fortune-dispatch(오늘의 운세 일괄).
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAlimtalkMessage, ALIMTALK_TEMPLATES, type AlimtalkSendResult } from '@/lib/services/solapi'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { getSiteUrl } from '@/lib/utils/site-url'

const SITE_URL = getSiteUrl()

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  phone_number: string | null
  alimtalk_enabled: boolean
  daily_fortune_enabled: boolean
  attendance_reward_enabled: boolean
  payment_enabled: boolean
}

// ─── 알림 설정 CRUD ───────────────────────────────────────────────────────────

/**
 * 현재 로그인 사용자의 알림 설정 조회
 */
export async function getNotificationPreferences(): Promise<{
  success: boolean
  data?: NotificationPreferences
  error?: string
}> {
  if (isEdgeEnabled('notification')) {
    return invokeEdgeSafe('notification', { action: 'getPreferences' })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('notification_preferences')
    .select('phone_number, alimtalk_enabled, daily_fortune_enabled, attendance_reward_enabled, payment_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { success: false, error: error.message }

  // 기본값 반환 (레코드 없으면 모두 false)
  return {
    success: true,
    data: data ?? {
      phone_number: null,
      alimtalk_enabled: false,
      daily_fortune_enabled: false,
      attendance_reward_enabled: false,
      payment_enabled: false,
    },
  }
}

/**
 * 알림 설정 저장 (upsert)
 */
export async function saveNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  if (isEdgeEnabled('notification')) {
    return invokeEdgeSafe('notification', { action: 'savePreferences', prefs })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  // 전화번호 정규화 저장
  const phoneNumber = prefs.phone_number?.replace(/-/g, '') || null

  const { error } = await adminClient.from('notification_preferences').upsert(
    {
      user_id: user.id,
      phone_number: phoneNumber,
      alimtalk_enabled: prefs.alimtalk_enabled ?? false,
      daily_fortune_enabled: prefs.daily_fortune_enabled ?? false,
      attendance_reward_enabled: prefs.attendance_reward_enabled ?? false,
      payment_enabled: prefs.payment_enabled ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * 알림톡 수신 테스트 발송
 * 설정 페이지에서 "테스트 발송" 버튼 클릭 시 사용 — **본인 번호로만** 나간다.
 */
export async function sendTestAlimtalk(): Promise<AlimtalkSendResult> {
  if (isEdgeEnabled('notification')) {
    return invokeEdgeSafe('notification', { action: 'sendTest' })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()
  const { data: prefs } = await adminClient
    .from('notification_preferences')
    .select('phone_number')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!prefs?.phone_number) {
    return { success: false, error: '전화번호를 먼저 저장해주세요.' }
  }

  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).maybeSingle()

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return sendAlimtalkMessage(prefs.phone_number, ALIMTALK_TEMPLATES.DAILY_FORTUNE, {
    '#{이름}': profile?.full_name || '회원',
    '#{날짜}': today,
    '#{앱링크}': `${SITE_URL}/protected/fortune`,
  })
}
