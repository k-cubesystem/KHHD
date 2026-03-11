'use server'

import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

// RLS를 우회해 attendance_logs를 안전하게 조회하기 위한 admin client
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  })
}

// KST(UTC+9) 기준 오늘 날짜 문자열 반환
function getKSTDateString(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
}

// KST 기준 이번 주 월요일 날짜 문자열 반환
function getKSTWeekStartString(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay() // 0=일
  const daysFromMonday = day === 0 ? 6 : day - 1
  kst.setUTCDate(kst.getUTCDate() - daysFromMonday)
  return kst.toISOString().split('T')[0]
}

/**
 * 오늘 출석 체크 가능 여부 확인
 */
export async function checkAttendanceAvailability() {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'checkAttendanceAvailability' })
  }
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.', canCheckIn: false }
  }

  const today = getKSTDateString()
  const db = admin ?? supabase

  const { data: todayRecord } = await db
    .from('attendance_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('checked_date', today)
    .maybeSingle()

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
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'checkInAttendance' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  try {
    // 이미 체크인했는지 확인 (admin client로)
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

    if (todayRecord) {
      return { success: false, error: '오늘은 이미 출석 체크를 완료했습니다.' }
    }

    // 이번 주 출석 횟수 확인
    const { data: weekRecords } = await db
      .from('attendance_logs')
      .select('checked_date')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)

    const weekCount = weekRecords?.length || 0
    const isLastDayOfWeek = weekCount === 6 // 이번이 7번째(마지막)
    const baseReward = 1
    const weeklyBonus = isLastDayOfWeek ? 3 : 0
    const totalReward = baseReward + weeklyBonus

    // 1. 먼저 wallet이 존재하는지 확인하고 없으면 생성
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingWallet) {
      logger.log(`[Attendance] Creating wallet for user ${user.id}`)
      const { error: walletCreateError } = await supabase.from('wallets').insert({ user_id: user.id, balance: 0 })

      if (walletCreateError) {
        logger.error('[Attendance] Failed to create wallet:', walletCreateError)
        throw new Error(`지갑 생성 실패: ${walletCreateError.message}`)
      }
    }

    // 2. 출석 기록 저장
    logger.log(`[Attendance] Inserting attendance log...`)
    const { error: insertError } = await supabase.from('attendance_logs').insert({
      user_id: user.id,
      checked_date: todayStr,
      week_start: weekStartStr,
      bokchae_awarded: totalReward,
      is_weekly_bonus: isLastDayOfWeek,
    })

    if (insertError) {
      logger.error('[Attendance] Failed to insert attendance log:', insertError)
      throw new Error(`출석 기록 실패: ${insertError.message}`)
    }

    logger.log(`[Attendance] Attendance log inserted successfully`)

    // 3. 복채 지급 - RPC 함수 사용
    logger.log(`[Attendance] Crediting ${totalReward} bokchae via RPC...`)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('add_bokchae', {
      p_user_id: user.id,
      p_amount: totalReward,
      p_reason: isLastDayOfWeek
        ? `출석 체크 (${totalReward}만냥 = 기본 1 + 주간 보너스 3)`
        : `출석 체크 (${totalReward}만냥)`,
    })

    if (rpcError) {
      logger.warn('[Attendance] RPC add_bokchae failed, using direct method:', rpcError)

      // RPC 실패 시 직접 처리
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

      const currentBalance = wallet?.balance || 0
      const newBalance = currentBalance + totalReward

      logger.log(`[Attendance] Direct credit: ${currentBalance} -> ${newBalance}`)

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id)

      if (updateError) {
        logger.error('[Attendance] Failed to update wallet:', updateError)
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
        logger.error('[Attendance] Failed to record transaction:', txError)
        // 트랜잭션 기록 실패는 치명적이지 않으므로 warning만
      }
    } else {
      logger.log(`[Attendance] RPC add_bokchae succeeded:`, rpcResult)
    }

    // 4. 최종 검증: 복채가 실제로 지급되었는지 확인
    const { data: finalWallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

    logger.log(`[Attendance] Final wallet balance: ${finalWallet?.balance}`)

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
  } catch (error: unknown) {
    logger.error('[Attendance] Critical error:', error)
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * 이번 주 출석 현황 조회
 */
export async function getWeeklyAttendance() {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'getWeeklyAttendance' })
  }
  const supabase = await createClient()
  const admin = createAdminClient()
  const db = admin ?? supabase
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

  const todayStr = getKSTDateString()
  const weekStartStr = getKSTWeekStartString()

  const { data: records } = await db
    .from('attendance_logs')
    .select('checked_date, bokchae_awarded, is_weekly_bonus')
    .eq('user_id', user.id)
    .eq('week_start', weekStartStr)
    .order('checked_date', { ascending: true })

  const checkedDates = new Set(records?.map((r) => r.checked_date) || [])

  // 이번 주 7일 배열 생성 (월~일, KST 기준)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartStr + 'T00:00:00+09:00')
    d.setDate(d.getDate() + i)
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

/**
 * 이번 달 출석 현황 + 연속 출석 스트릭 조회
 */
export async function getMonthlyAttendance() {
  if (isEdgeEnabled('payment')) {
    return invokeEdgeSafe('payment', { action: 'getMonthlyAttendance' })
  }
  const supabase = await createClient()
  const admin = createAdminClient()
  const db = admin ?? supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const emptyResult = {
    success: false,
    checkedDates: [] as string[],
    monthTotal: 0,
    consecutiveStreak: 0,
    weekCount: 0,
    totalBokchae: 0,
    canCheckIn: false,
  }

  if (!user) return emptyResult

  // KST 기준 오늘 / 이번 달 범위
  const todayStr = getKSTDateString()
  const [year, month] = todayStr.split('-').map(Number)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: monthRecords } = await db
    .from('attendance_logs')
    .select('checked_date, bokchae_awarded')
    .eq('user_id', user.id)
    .gte('checked_date', monthStart)
    .lte('checked_date', monthEnd)
    .order('checked_date', { ascending: true })

  const checkedDates = monthRecords?.map((r) => r.checked_date) || []
  const checkedSet = new Set(checkedDates)
  const canCheckIn = !checkedSet.has(todayStr)

  // 연속 출석 스트릭 계산 (오늘 또는 어제부터 역방향)
  let streak = 0
  const cursor = new Date(todayStr + 'T00:00:00+09:00')
  // 오늘 아직 체크 안 했으면 어제부터 카운트
  if (!checkedSet.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1)
  } else {
    streak = 1
    cursor.setDate(cursor.getDate() - 1)
  }
  // 과거 최대 365일 탐색
  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().split('T')[0]
    // 달이 바뀌어도 DB에서 모두 가져오려면 전체 조회 필요 — 이 함수에서는 월 범위 밖 날짜 처리를 위해
    // 간단히 체크: 이번 달 범위 내라면 checkedSet 사용, 범위 밖이면 DB 추가 조회 없이 break
    if (dateStr < monthStart) {
      // 이전 달 날짜 — streak이 이미 월초까지 이어진 경우 추가 DB 조회
      const { data: prevRecord } = await supabase
        .from('attendance_logs')
        .select('checked_date')
        .eq('user_id', user.id)
        .eq('checked_date', dateStr)
        .maybeSingle()
      if (prevRecord) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    } else {
      if (checkedSet.has(dateStr)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }
  }

  // 이번 주 출석 수
  const weekStartStr = getKSTWeekStartString()
  const { data: weekRecords } = await db
    .from('attendance_logs')
    .select('checked_date')
    .eq('user_id', user.id)
    .eq('week_start', weekStartStr)

  return {
    success: true,
    checkedDates,
    monthTotal: checkedDates.length,
    consecutiveStreak: streak,
    weekCount: weekRecords?.length || 0,
    totalBokchae: monthRecords?.reduce((sum, r) => sum + r.bokchae_awarded, 0) || 0,
    canCheckIn,
  }
}
