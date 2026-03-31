import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateDailyFortune } from '@/app/actions/fortune/daily'
import { sendKakaoNotification } from '@/app/actions/fortune/notification'
import { logger } from '@/lib/utils/logger'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://haehwadang.com'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow 1 minute execution

export async function GET(req: NextRequest) {
  // 1. Authorization
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[Cron] Skipping auth in development mode')
    } else {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // 2. Check Global Toggle
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'daily_fortune_enabled')
    .single()

  if (!setting || setting.value !== 'true') {
    return NextResponse.json({ message: 'Daily fortune automation is disabled' })
  }

  // 3. Get Template ID
  const { data: tmplSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'kakao_template_id')
    .single()
  const templateId = tmplSetting?.value || 'DAILY_FORTUNE_V1'

  // 4. Fetch Active Subscribers
  // Complex query: users with valid subscription
  // Assuming 'subscriptions' table has status='active'
  const { data: subscriptions, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ message: 'No active subscribers found' })
  }

  // 5. Process Batch
  const results = {
    total: subscriptions.length,
    generated: 0,
    sent: 0,
    errors: 0,
  }

  // 동시성 제한: 최대 5개 병렬 처리 (Gemini API 과부하 방지)
  const CONCURRENCY_LIMIT = 5
  const chunks: (typeof subscriptions)[] = []
  for (let i = 0; i < subscriptions.length; i += CONCURRENCY_LIMIT) {
    chunks.push(subscriptions.slice(i, i + CONCURRENCY_LIMIT))
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (sub) => {
      try {
        const genResult = await generateDailyFortune(sub.user_id, sub.user_id, 'USER')
        if (!genResult.success) throw new Error('error' in genResult ? genResult.error : 'Fortune generation failed')

        if (genResult.content) {
          const sendResult = await sendKakaoNotification(sub.user_id, templateId, {
            content: genResult.content.substring(0, 100) + '...',
            link: `${SITE_URL}/protected/analysis?tab=daily`,
          })

          if (sendResult.success) results.sent++
          else throw new Error(sendResult.error)
        }

        results.generated++
      } catch (err) {
        logger.error(`Error processing user ${sub.user_id}:`, err)
        results.errors++
      }
    })

    await Promise.allSettled(promises)
  }

  return NextResponse.json({
    success: true,
    message: 'Batch processing completed',
    stats: results,
  })
}
