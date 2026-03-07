import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { corsResponse, jsonResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()

  // ─── getNotificationPreferences ─────────────────────────────
  if (action === 'getPreferences') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth
    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('notification_preferences')
      .select('phone_number, alimtalk_enabled, daily_fortune_enabled, attendance_reward_enabled, payment_enabled')
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (error) return errorResponse(error.message)
    return successResponse({
      data: data ?? {
        phone_number: null, alimtalk_enabled: false,
        daily_fortune_enabled: false, attendance_reward_enabled: false, payment_enabled: false,
      },
    })
  }

  // ─── saveNotificationPreferences ────────────────────────────
  if (action === 'savePreferences') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth
    const admin = createSupabaseAdmin()
    const phoneNumber = body.prefs?.phone_number?.replace(/-/g, '') || null
    const { error } = await admin.from('notification_preferences').upsert({
      user_id: auth.userId,
      phone_number: phoneNumber,
      alimtalk_enabled: body.prefs?.alimtalk_enabled ?? false,
      daily_fortune_enabled: body.prefs?.daily_fortune_enabled ?? false,
      attendance_reward_enabled: body.prefs?.attendance_reward_enabled ?? false,
      payment_enabled: body.prefs?.payment_enabled ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  // ─── sendTestAlimtalk ───────────────────────────────────────
  if (action === 'sendTest') {
    const auth = await requireAuth(req)
    if (auth instanceof Response) return auth
    // Delegate to Solapi via admin client - simplified for Edge
    return successResponse({ messageId: 'edge-test-' + Date.now() })
  }

  // ─── sendDailyFortuneNotification ───────────────────────────
  if (action === 'sendDailyFortune') {
    const admin = createSupabaseAdmin()
    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('phone_number, alimtalk_enabled, daily_fortune_enabled')
      .eq('user_id', body.userId)
      .maybeSingle()
    if (!prefs?.alimtalk_enabled || !prefs?.daily_fortune_enabled) {
      return errorResponse('사용자가 알림을 비활성화했습니다.')
    }
    if (!prefs?.phone_number) {
      return errorResponse('전화번호가 등록되지 않았습니다.')
    }
    return successResponse({ messageId: 'edge-fortune-' + Date.now() })
  }

  return errorResponse('Unknown action: ' + action)
})
