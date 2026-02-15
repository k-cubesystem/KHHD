'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * 오늘 출석 체크 가능 여부 확인
 */
export async function checkAttendanceAvailability() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.', canCheckIn: false }
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: todayRecord } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('checked_date', today)
    .single()

  if (todayRecord) {
    return { success: true, canCheckIn: false, alreadyChecked: true }
  }

  return { success: true, canCheckIn: true, alreadyChecked: false }
}

/**
 * 출석 체크 실행
 * - 매일 1 복채 지급
 * - 주 7일 완료 시 마지막날 +3 복채 보너스 (주당 총 10 복채)
 */
export async function checkInAttendance() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  try {
    // 이미 체크인했는지 확인
    const avail = await checkAttendanceAvailability()
    if (!avail.canCheckIn) {
      return { success: false, error: '오늘은 이미 출석 체크를 완료했습니다.' }
    }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // 이번 주 월요일 계산 (ISO 주)
    const dayOfWeek = today.getDay() // 0=일, 1=월, ..., 6=토
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - daysFromMonday)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // 이번 주 출석 횟수 확인
    const { data: weekRecords } = await supabase
      .from('attendance_logs')
      .select('checked_date')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)

    const weekCount = weekRecords?.length || 0
    const isLastDayOfWeek = weekCount === 6 // 이번이 7번째(마지막)
    const baseReward = 1
    const weeklyBonus = isLastDayOfWeek ? 3 : 0
    const totalReward = baseReward + weeklyBonus

    console.log(`[Attendance] User ${user.id} checking in for ${todayStr}`)
    console.log(`[Attendance] Week ${weekStartStr}, count: ${weekCount}, reward: ${totalReward}`)

    // 1. 먼저 wallet이 존재하는지 확인하고 없으면 생성
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingWallet) {
      console.log(`[Attendance] Creating wallet for user ${user.id}`)
      const { error: walletCreateError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id, balance: 0 })

      if (walletCreateError) {
        console.error('[Attendance] Failed to create wallet:', walletCreateError)
        throw new Error(`지갑 생성 실패: ${walletCreateError.message}`)
      }
    }

    // 2. 출석 기록 저장
    console.log(`[Attendance] Inserting attendance log...`)
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      user_id: user.id,
      checked_date: todayStr,
      week_start: weekStartStr,
      bokchae_awarded: totalReward,
      is_weekly_bonus: isLastDayOfWeek,
    })

    if (insertError) {
      console.error('[Attendance] Failed to insert attendance log:', insertError)
      throw new Error(`출석 기록 실패: ${insertError.message}`)
    }

    console.log(`[Attendance] Attendance log inserted successfully`)

    // 3. 복채 지급 - RPC 함수 사용
    console.log(`[Attendance] Crediting ${totalReward} bokchae via RPC...`)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('add_bokchae', {
      p_user_id: user.id,
      p_amount: totalReward,
      p_reason: isLastDayOfWeek
        ? `출석 체크 (${totalReward}만냥 = 기본 1 + 주간 보너스 3)`
        : `출석 체크 (${totalReward}만냥)`,
    })

    if (rpcError) {
      console.warn('[Attendance] RPC add_bokchae failed, using direct method:', rpcError)

      // RPC 실패 시 직접 처리
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single()

      const currentBalance = wallet?.balance || 0
      const newBalance = currentBalance + totalReward

      console.log(`[Attendance] Direct credit: ${currentBalance} -> ${newBalance}`)

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[Attendance] Failed to update wallet:', updateError)
        throw new Error(`복채 지급 실패: ${updateError.message}`)
      }

      const { error: txError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: totalReward,
        type: 'BONUS',
        description: isLastDayOfWeek
          ? `출석 체크 (${totalReward}만냥 = 기본 1 + 주간 보너스 3)`
          : `출석 체크 (${totalReward}만냥)`,
      })

      if (txError) {
        console.error('[Attendance] Failed to record transaction:', txError)
        // 트랜잭션 기록 실패는 치명적이지 않으므로 warning만
      }
    } else {
      console.log(`[Attendance] RPC add_bokchae succeeded:`, rpcResult)
    }

    // 4. 최종 검증: 복채가 실제로 지급되었는지 확인
    const { data: finalWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    console.log(`[Attendance] Final wallet balance: ${finalWallet?.balance}`)

    return {
      success: true,
      reward: totalReward,
      isWeeklyBonus: isLastDayOfWeek,
      weeklyBonusAmount: weeklyBonus,
      weekCount: weekCount + 1,
      currentBalance: finalWallet?.balance || 0,
      message: isLastDayOfWeek
        ? `주간 출석 완료! 복채 ${totalReward}만냥 (보너스 포함) 지급! 💰`
        : `출석 체크 완료! 복채 ${totalReward}만냥 지급! 💰`,
    }
  } catch (error: any) {
    console.error('[Attendance] Critical error:', error)
    return {
      success: false,
      error: error?.message || '출석 체크 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 이번 주 출석 현황 조회
 */
export async function getWeeklyAttendance() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return {
      success: false,
      records: [],
      weekDays: [] as Array<{
        date: string
        dayLabel: string
        checked: boolean
        isToday: boolean
        isFuture: boolean
      }>,
      weekCount: 0,
      totalBokchae: 0,
    }

  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysFromMonday)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { data: records } = await supabase
    .from('attendance_logs')
    .select('checked_date, bokchae_awarded, is_weekly_bonus')
    .eq('user_id', user.id)
    .eq('week_start', weekStartStr)
    .order('checked_date', { ascending: true })

  const todayStr = today.toISOString().split('T')[0]
  const checkedDates = new Set(records?.map((r) => r.checked_date) || [])

  // 이번 주 7일 배열 생성 (월~일)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return {
      date: dateStr,
      dayLabel: ['월', '화', '수', '목', '금', '토', '일'][i],
      checked: checkedDates.has(dateStr),
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    }
  })

  return {
    success: true,
    records: records || [],
    weekDays,
    weekCount: records?.length || 0,
    totalBokchae: records?.reduce((sum, r) => sum + r.bokchae_awarded, 0) || 0,
  }
}
