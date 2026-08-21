import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser, isPushConfigured } from '@/lib/services/webpush'
import { getRitualWindow, RITUAL_PUSH_TOPIC } from '@/lib/domain/ritual/lunar-window'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 초하루 기별 크론 — 매일 22:00 UTC(07:00 KST) 실행, 판정↔발송 분리.
 *
 * 발송 조건 (E1 — 미스런 복원력): 「의례 창(음력 1~3일) 내 && 이번 달 미발송」.
 * 크론이 하루 죽어도 창이 남았으면 다음날 보정 발송된다.
 * 멱등 (V5): ritual_push_log(user_id, lunar_month_seq) 유니크 — 유저·월 1회.
 * 대상 (V2): push_subscriptions.topics 에 'ritual' 옵트인한 유저만.
 * 이미 완주한 유저에게는 보내지 않는다.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // 킬스위치 (2A)
  const { data: enabled } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'ritual_enabled')
    .maybeSingle()
  if (enabled?.value === 'false') {
    return NextResponse.json({ success: true, message: 'ritual_enabled=false — 발송 생략' })
  }

  const window = getRitualWindow()
  if (!window.inWindow) {
    return NextResponse.json({ success: true, message: '의례 창 밖 — 발송 없음', kstDate: window.kstDate })
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ success: true, message: 'VAPID 미설정 — 발송 생략' })
  }

  // 옵트인 유저 (topics ∋ 'ritual')
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id')
    .contains('topics', [RITUAL_PUSH_TOPIC])
  if (subsError) {
    logger.error('[cron/ritual-push] 구독 조회 실패', subsError)
    return NextResponse.json({ success: false, error: 'subs query failed' }, { status: 500 })
  }
  const userIds = Array.from(new Set((subs ?? []).map((s) => String(s.user_id))))

  const stats = { candidates: userIds.length, sent: 0, skippedSent: 0, skippedCompleted: 0, errors: 0 }

  for (const userId of userIds) {
    try {
      // 이번 달 이미 발송? (멱등)
      const { data: log } = await supabase
        .from('ritual_push_log')
        .select('id')
        .eq('user_id', userId)
        .eq('lunar_month_seq', window.lunarMonthSeq)
        .maybeSingle()
      if (log) {
        stats.skippedSent += 1
        continue
      }
      // 이미 완주한 유저는 기별 불필요
      const { data: rec } = await supabase
        .from('ritual_records')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('ritual_month', window.ritualMonth)
        .eq('is_leap_month', window.isLeapMonth)
        .maybeSingle()
      if (rec?.completed_at) {
        stats.skippedCompleted += 1
        continue
      }

      const result = await sendPushToUser(userId, {
        title: `${window.monthLabel} 문안드립니다 🏮`,
        body: '식구들 이번 달 안부가 도착했어요. 향 한 번 올리고 가세요.',
        url: '/protected/ritual',
        tag: 'ritual-first-day',
      })

      // 발송 로그는 시도 결과와 무관하게 성공 시에만 기록 → 실패 유저는 창 내 재시도
      if (result?.sent && result.sent > 0) {
        await supabase.from('ritual_push_log').insert({ user_id: userId, lunar_month_seq: window.lunarMonthSeq })
        stats.sent += 1
      } else {
        stats.errors += 1
      }
    } catch (err) {
      stats.errors += 1
      logger.error('[cron/ritual-push] 유저 발송 실패', { userId, err })
    }
  }

  return NextResponse.json({ success: true, window: window.ritualMonth, stats })
}
