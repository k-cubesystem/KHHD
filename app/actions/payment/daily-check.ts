'use server'

import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

function getKSTDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

function getKSTWeekStartString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  kst.setUTCDate(kst.getUTCDate() - daysFromMonday)
  return kst.toISOString().split('T')[0]
}

export async function checkDailyAttendance() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.', checked: false, consecutiveDays: 0 }
    }

    const admin = createAdminClient()
    const db = admin ?? supabase
    const todayStr = getKSTDateString()
    const weekStartStr = getKSTWeekStartString()

    const { data: todayRecord } = await db
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('checked_date', todayStr)
      .maybeSingle()

    const { data: weekRecords } = await db
      .from('attendance_logs')
      .select('checked_date')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)

    return {
      success: true,
      checked: !!todayRecord,
      consecutiveDays: weekRecords?.length || 0,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: msg, checked: false, consecutiveDays: 0 }
  }
}

export async function recordDailyAttendance() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const admin = createAdminClient()
    const db = admin ?? supabase
    const todayStr = getKSTDateString()
    const weekStartStr = getKSTWeekStartString()

    // 이미 체크인했는지 확인 (admin client로 RLS 우회)
    const { data: existing } = await db
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('checked_date', todayStr)
      .maybeSingle()

    if (existing) {
      return { success: false, error: '오늘은 이미 출석 체크를 완료했습니다.' }
    }

    // 이번 주 출석 횟수 확인
    const { data: weekRecords } = await db
      .from('attendance_logs')
      .select('checked_date')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)

    const weekCount = weekRecords?.length || 0
    const isLastDayOfWeek = weekCount === 6 // 7번째 출석
    const baseReward = 1
    const weeklyBonus = isLastDayOfWeek ? 3 : 0
    const totalReward = baseReward + weeklyBonus
    const newConsecutiveDays = weekCount + 1

    // 출석 기록 저장
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      user_id: user.id,
      checked_date: todayStr,
      week_start: weekStartStr,
      bokchae_awarded: totalReward,
      is_weekly_bonus: isLastDayOfWeek,
    })

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // 복채 지급 (add_bokchae RPC 우선 시도)
    const reason = isLastDayOfWeek ? `출석 체크 (기본 1만냥 + 주간 보너스 3만냥)` : `출석 체크 (1만냥)`

    const { error: rpcError } = await supabase.rpc('add_bokchae', {
      p_user_id: user.id,
      p_amount: totalReward,
      p_reason: reason,
    })

    if (rpcError) {
      // RPC 없으면 직접 업데이트
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

      const currentBalance = wallet?.balance || 0

      await supabase
        .from('wallets')
        .upsert({ user_id: user.id, balance: currentBalance + totalReward }, { onConflict: 'user_id' })

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: totalReward,
        type: 'BONUS',
        description: reason,
      })
    }

    return {
      success: true,
      reward: totalReward,
      consecutiveDays: newConsecutiveDays,
      isWeeklyBonus: isLastDayOfWeek,
      message: isLastDayOfWeek
        ? `주간 출석 완료! 복채 ${totalReward}만냥 입금되었습니다 🎉`
        : `출석 체크 완료! 복채 1만냥 입금되었습니다`,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: msg }
  }
}
