import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { FREE_RETENTION_DAYS } from '@/lib/domain/payment/membership-benefits'

// 채팅 보존 정책 cron — ①만료 D-7 예고 알림 ②종료 세션의 원문 메시지만 등급별 보존기간 후 삭제.
// 요약(chat_sessions.summary)·장기기억(user_ai_memory)은 영구 보존: 신은 그 뜻을 기억한다.
// 보존일: 활성 구독 플랜 membership_plans.chat_retention_days (S90/F180/B365) + 기억함 배치 보너스, 무료는 아래 상수.

const EXPIRY_NOTICE_LEAD_DAYS = 7

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

  // 1) 만료 D-7 예고 — 삭제보다 먼저 실행해야 예고 없이 지워지는 일이 없다.
  //    실패해도 정리는 진행(예고는 부가 기능).
  let notifiedUsers = 0
  let notifiedSessions = 0
  const { data: noticeData, error: noticeError } = await supabase.rpc('notify_expiring_chat_sessions', {
    p_free_days: FREE_RETENTION_DAYS,
    p_lead_days: EXPIRY_NOTICE_LEAD_DAYS,
  })
  if (noticeError) {
    logger.error('[Chat Retention Cron] expiry notice failed:', noticeError)
  } else {
    const n = Array.isArray(noticeData) ? noticeData[0] : noticeData
    notifiedUsers = typeof n?.notified_users === 'number' ? n.notified_users : 0
    notifiedSessions = typeof n?.notified_sessions === 'number' ? n.notified_sessions : 0
  }

  // 2) 보존기간 지난 종료 세션의 원문 정리
  const { data, error } = await supabase.rpc('purge_expired_chat_messages', {
    p_free_days: FREE_RETENTION_DAYS,
  })

  if (error) {
    logger.error('[Chat Retention Cron] purge failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  const stats = {
    notifiedUsers,
    notifiedSessions,
    purgedSessions: typeof row?.purged_sessions === 'number' ? row.purged_sessions : 0,
    purgedMessages: typeof row?.purged_messages === 'number' ? row.purged_messages : 0,
  }
  logger.log('[Chat Retention Cron] Completed:', stats)
  return NextResponse.json({ success: true, message: 'Chat retention cron completed', stats })
}
