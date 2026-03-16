'use server'

/**
 * 카카오 알림톡(Alimtalk) 서버 액션
 * Solapi를 통해 알림톡 발송 및 알림 설정 관리
 * Edge Function 전환 지원: EDGE_NOTIFICATION=true 시 Edge Function 호출
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { getSolapiClient, ALIMTALK_TEMPLATES, SOLAPI_PFID, SOLAPI_SENDER } from '@/lib/services/solapi'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://haehwadang.com'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface AlimtalkVariable {
  [key: string]: string
}

export interface SendAlimtalkResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface NotificationPreferences {
  phone_number: string | null
  alimtalk_enabled: boolean
  daily_fortune_enabled: boolean
  attendance_reward_enabled: boolean
  payment_enabled: boolean
}

// ─── 알림톡 발송 ──────────────────────────────────────────────────────────────

/**
 * 단일 알림톡 발송
 * @param phoneNumber 수신자 전화번호 (010-XXXX-XXXX 또는 01000000000)
 * @param templateCode Solapi 알림톡 템플릿 코드
 * @param variables 템플릿 변수 (#{변수명} 치환)
 */
export async function sendAlimtalk(
  phoneNumber: string,
  templateCode: string,
  variables: AlimtalkVariable = {}
): Promise<SendAlimtalkResult> {
  const client = getSolapiClient()
  if (!client) {
    return { success: false, error: 'Solapi 클라이언트가 초기화되지 않았습니다.' }
  }

  if (!SOLAPI_PFID) {
    return { success: false, error: 'SOLAPI_PFID 환경변수가 설정되지 않았습니다.' }
  }

  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = phoneNumber.replace(/-/g, '')

  try {
    const response = await client.sendOne({
      to: normalizedPhone,
      from: SOLAPI_SENDER,
      kakaoOptions: {
        pfId: SOLAPI_PFID,
        templateId: templateCode,
        variables,
      },
    })

    return {
      success: true,
      messageId: response.messageId,
    }
  } catch (err: unknown) {
    logger.error('[Alimtalk] 발송 실패:', err)
    const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: msg,
    }
  }
}

// ─── 오늘의 운세 알림톡 ────────────────────────────────────────────────────────

/**
 * 오늘의 운세 요약 알림톡 발송
 * 사용자의 알림 설정 및 전화번호를 확인한 후 발송
 */
export async function sendDailyFortuneNotification(userId: string): Promise<SendAlimtalkResult> {
  const adminClient = createAdminClient()

  // 1. 알림 설정 확인
  const { data: prefs, error: prefsError } = await adminClient
    .from('notification_preferences')
    .select('phone_number, alimtalk_enabled, daily_fortune_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (prefsError) {
    return { success: false, error: '알림 설정을 불러오지 못했습니다.' }
  }

  if (!prefs?.alimtalk_enabled || !prefs?.daily_fortune_enabled) {
    return { success: false, error: '사용자가 알림을 비활성화했습니다.' }
  }

  if (!prefs?.phone_number) {
    return { success: false, error: '전화번호가 등록되지 않았습니다.' }
  }

  // 2. 사용자 이름 조회
  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', userId).maybeSingle()

  // 3. 오늘 날짜 (한국어)
  const today = new Date()
  const dateStr = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  // 4. 알림톡 발송
  return sendAlimtalk(prefs.phone_number, ALIMTALK_TEMPLATES.DAILY_FORTUNE, {
    '#{이름}': profile?.full_name || '회원',
    '#{날짜}': dateStr,
    '#{앱링크}': `${SITE_URL}/protected/fortune`,
  })
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
 * 설정 페이지에서 "테스트 발송" 버튼 클릭 시 사용
 */
export async function sendTestAlimtalk(): Promise<SendAlimtalkResult> {
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

  return sendAlimtalk(prefs.phone_number, ALIMTALK_TEMPLATES.DAILY_FORTUNE, {
    '#{이름}': profile?.full_name || '회원',
    '#{날짜}': today,
    '#{앱링크}': `${SITE_URL}/protected/fortune`,
  })
}
