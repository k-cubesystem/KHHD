import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { generateContent } from '../_shared/gemini-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  // Verify cron secret
  const cronSecret = Deno.env.get('CRON_SECRET')
  const authHeader = req.headers.get('Authorization')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('Unauthorized', 401)
  }

  const admin = createSupabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  try {
    // Get users with daily fortune notification enabled
    const { data: users } = await admin
      .from('notification_preferences')
      .select('user_id, phone_number')
      .eq('alimtalk_enabled', true)
      .eq('daily_fortune_enabled', true)
      .not('phone_number', 'is', null)

    if (!users || users.length === 0) {
      return successResponse({ processed: 0 })
    }

    // Generate base fortune for the day
    const baseFortune = await generateContent(
      `오늘(${today}) 전체 운세를 간단히 요약해주세요. 3줄 이내.`,
      { systemInstruction: '당신은 운세 전문가입니다.', cacheKey: `daily-fortune:${today}` }
    )

    // Log the cron execution
    await admin.from('cron_logs').insert({
      job_name: 'daily-fortune',
      executed_at: new Date().toISOString(),
      result: { users_count: users.length, fortune_generated: !!baseFortune },
    }).catch(() => { /* cron_logs table may not exist */ })

    return successResponse({ processed: users.length, fortune: baseFortune })
  } catch (err) {
    console.error('[cron-fortune] Error:', err)
    return errorResponse('Cron job failed', 500)
  }
})
