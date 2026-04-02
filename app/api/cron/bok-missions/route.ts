import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: users, error: userErr } = await supabase.from('family_members').select('user_id').limit(500)

  if (userErr || !users) {
    logger.error('[BokMissions Cron] User query error:', userErr)
    return NextResponse.json({ error: userErr?.message ?? 'query failed' }, { status: 500 })
  }

  const uniqueUserIds = [...new Set(users.map((u) => u.user_id))]
  const results = { processed: 0, generated: 0, skipped: 0 }

  for (const userId of uniqueUserIds) {
    const { data: existing } = await supabase
      .from('bok_missions')
      .select('id')
      .eq('user_id', userId)
      .eq('mission_date', today)
      .limit(1)

    if (existing && existing.length > 0) {
      results.skipped++
      continue
    }

    const { data: members } = await supabase.from('family_members').select('id, name').eq('user_id', userId).limit(10)

    if (!members || members.length === 0) {
      results.skipped++
      continue
    }

    const missions = members.map((member) => ({
      user_id: userId,
      family_member_id: member.id,
      mission_type: 'DAILY_FORTUNE',
      mission_title: `${member.name}님의 오늘 운세 확인하기`,
      points_reward: 10,
      mission_date: today,
    }))

    missions.push({
      user_id: userId,
      family_member_id: null as unknown as string,
      mission_type: 'SHARE',
      mission_title: '카카오톡으로 복 나누기',
      points_reward: 20,
      mission_date: today,
    })

    const { error: insertErr } = await supabase.from('bok_missions').insert(missions)
    if (insertErr) {
      logger.error(`[BokMissions Cron] Insert error for ${userId}:`, insertErr)
      continue
    }

    results.processed++
    results.generated += missions.length
  }

  return NextResponse.json({
    success: true,
    message: 'Bok missions cron completed',
    stats: results,
  })
}
