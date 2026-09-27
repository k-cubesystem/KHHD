import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchDailyFortuneAlimtalk } from '@/lib/services/daily-fortune-dispatch'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow 1 minute execution

/**
 * 오늘의 운세 알림톡 크론.
 * 대상 선정·생성·발송·기록은 전부 lib/services/daily-fortune-dispatch 가 한다(어드민 수동 실행과 같은 경로).
 * 여기서는 «부를 자격»과 «전역 스위치»만 본다.
 */
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

  // 2. 전역 스위치 — 켜는 건 승인 템플릿·PFID 가 들어온 뒤 대표가 결정한다.
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'daily_fortune_enabled')
    .single()

  if (!setting || setting.value !== 'true') {
    return NextResponse.json({ message: 'Daily fortune automation is disabled' })
  }

  // 3. 템플릿 코드 — 승인 코드를 배포 없이 갈아끼우는 자리(비어 있으면 상수 기본값).
  const { data: tmplSetting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'kakao_template_id')
    .single()

  const stats = await dispatchDailyFortuneAlimtalk(tmplSetting?.value)

  if (!stats.ok) {
    logger.error('[Cron] 오늘의 운세 발송이 시작도 못 했다:', stats.blocked)
    return NextResponse.json({ success: false, message: stats.blocked, stats }, { status: 503 })
  }

  return NextResponse.json({
    success: true,
    message: 'Batch processing completed',
    stats,
  })
}
