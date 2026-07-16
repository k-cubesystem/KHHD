import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// 채팅 보존 정책 cron — 종료된 세션의 원문 메시지만 등급별 보존기간 후 삭제.
// 요약(chat_sessions.summary)·장기기억(user_ai_memory)은 영구 보존: 신은 그 뜻을 기억한다.
// 보존일: 활성 구독 플랜 membership_plans.chat_retention_days (S90/F180/B365), 무료는 아래 상수.

const FREE_RETENTION_DAYS = 30

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    logger.warn('[Chat Retention Cron] Skipping auth in development mode')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('purge_expired_chat_messages', {
    p_free_days: FREE_RETENTION_DAYS,
  })

  if (error) {
    logger.error('[Chat Retention Cron] purge failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  const stats = {
    purgedSessions: typeof row?.purged_sessions === 'number' ? row.purged_sessions : 0,
    purgedMessages: typeof row?.purged_messages === 'number' ? row.purged_messages : 0,
  }
  logger.log('[Chat Retention Cron] Completed:', stats)
  return NextResponse.json({ success: true, message: 'Chat retention cron completed', stats })
}
