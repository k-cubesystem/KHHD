import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface WeeklySummary {
  user_id: string
  weekly_earned: number
  activities: number
}

interface FamilyCount {
  user_id: string
  member_count: number
}

interface ProfileWithToken {
  id: string
  push_token: string | null
  display_name: string | null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    logger.warn('[BokReport Cron] Skipping auth in development mode')
  }

  const supabase = createAdminClient()
  const results = { processed: 0, reported: 0, errors: 0 }

  try {
    const { data: activeUsers, error: usersError } = await supabase
      .from('bok_points')
      .select('user_id')
      .gt('balance', 0)

    if (usersError || !activeUsers) {
      logger.error('[BokReport Cron] Active users query error:', usersError)
      return NextResponse.json({ error: usersError?.message ?? 'active users query failed' }, { status: 500 })
    }

    if (activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active users with bok points',
        stats: results,
      })
    }

    const userIds = activeUsers.map((u) => u.user_id)
    results.processed = userIds.length

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoISO = sevenDaysAgo.toISOString()

    const { data: txSummaries, error: txError } = await supabase
      .from('bok_transactions')
      .select('user_id, amount')
      .in('user_id', userIds)
      .gte('created_at', sevenDaysAgoISO)

    if (txError) {
      logger.error('[BokReport Cron] Transaction query error:', txError)
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    const summaryMap = new Map<string, WeeklySummary>()
    for (const tx of txSummaries ?? []) {
      const existing = summaryMap.get(tx.user_id)
      if (existing) {
        existing.weekly_earned += tx.amount
        existing.activities += 1
      } else {
        summaryMap.set(tx.user_id, {
          user_id: tx.user_id,
          weekly_earned: tx.amount,
          activities: 1,
        })
      }
    }

    const { data: familyCounts, error: familyError } = await supabase
      .from('family_members')
      .select('user_id')
      .in('user_id', userIds)

    if (familyError) {
      logger.error('[BokReport Cron] Family members query error:', familyError)
    }

    const familyCountMap = new Map<string, FamilyCount>()
    for (const fm of familyCounts ?? []) {
      const existing = familyCountMap.get(fm.user_id)
      if (existing) {
        existing.member_count += 1
      } else {
        familyCountMap.set(fm.user_id, {
          user_id: fm.user_id,
          member_count: 1,
        })
      }
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, push_token, display_name')
      .in('id', userIds)

    if (profileError) {
      logger.error('[BokReport Cron] Profiles query error:', profileError)
    }

    const profileMap = new Map<string, ProfileWithToken>()
    for (const p of (profiles ?? []) as ProfileWithToken[]) {
      profileMap.set(p.id, p)
    }

    for (const userId of userIds) {
      try {
        const summary = summaryMap.get(userId) ?? {
          user_id: userId,
          weekly_earned: 0,
          activities: 0,
        }
        const familyInfo = familyCountMap.get(userId)
        const profile = profileMap.get(userId)

        const report = {
          userId,
          displayName: profile?.display_name ?? 'unknown',
          weeklyEarned: summary.weekly_earned,
          activities: summary.activities,
          managedMembers: familyInfo?.member_count ?? 0,
          hasPushToken: !!profile?.push_token,
        }

        if (profile?.push_token) {
          // TODO: 실제 푸시 알림 전송 구현 (현재는 로그만)
          logger.log('[BokReport Cron] Push notification target:', {
            userId,
            weeklyEarned: report.weeklyEarned,
            activities: report.activities,
          })
          results.reported++
        } else {
          logger.log('[BokReport Cron] No push token, skipping notification:', {
            userId,
            weeklyEarned: report.weeklyEarned,
          })
        }
      } catch (err) {
        results.errors++
        const msg = err instanceof Error ? err.message : 'Unknown error'
        logger.error(`[BokReport Cron] Error processing user ${userId}:`, msg)
      }
    }

    logger.log('[BokReport Cron] Completed:', results)

    return NextResponse.json({
      success: true,
      message: 'Weekly bok report cron completed',
      stats: results,
    })
  } catch (err) {
    logger.error('[BokReport Cron] Unexpected error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
