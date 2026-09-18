'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accrueDevotion } from '@/lib/services/devotion'
import { formatKstDate } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import {
  STREAK_LOOKBACK_DAYS,
  consecutiveStreak,
  kstMonthRange,
  kstWeekStart,
  shiftKstDate,
} from '@/lib/domain/attendance/streak'

/**
 * 출석 — 보상은 재화가 아니라 신당 정성(기원) 하루다(2026-09-18 복채 폐지, 주간 개근 보너스도 폐지).
 *
 * 🔴 attendance_logs 는 service_role 로만 읽고 쓴다. 클라이언트 INSERT 정책은 이용권 전환 때 걷었고,
 *    유저 클라이언트로 강등하면 조용한 실패가 된다.
 * 🔴 정성은 record_shrine_devotion 의 KST 멱등이 하루 한 번으로 묶는다 — 같은 날 기도와 출석은 하루로 센다.
 */

async function sessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function causeOf(error: unknown): unknown {
  return error instanceof Error ? error.message : error
}

/** 오늘(KST) 출석할 수 있는지 — 신당 안내 바가 쓴다. */
export async function checkAttendanceAvailability(): Promise<{ success: boolean; canCheckIn: boolean }> {
  const userId = await sessionUserId()
  if (!userId) return { success: false, canCheckIn: false }

  try {
    const { data, error } = await createAdminClient()
      .from('attendance_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('checked_date', formatKstDate())
      .maybeSingle()
    if (error) {
      logger.error(new Error('[Attendance] 오늘 출석 여부 조회 실패'), { userId, error })
      return { success: false, canCheckIn: false }
    }
    return { success: true, canCheckIn: data === null }
  } catch (error) {
    logger.error(new Error('[Attendance] 오늘 출석 여부 조회 실패'), { userId, cause: causeOf(error) })
    return { success: false, canCheckIn: false }
  }
}

/** 이번 달 출석 날짜 + 연속 출석일 — 내 정보 화면의 출석 달력. */
export async function getMonthlyAttendance(): Promise<{
  success: boolean
  checkedDates: string[]
  consecutiveStreak: number
  canCheckIn: boolean
}> {
  const empty = { success: false, checkedDates: [], consecutiveStreak: 0, canCheckIn: false }
  const userId = await sessionUserId()
  if (!userId) return empty

  const today = formatKstDate()
  const month = kstMonthRange(today)
  const lookback = shiftKstDate(today, -STREAK_LOOKBACK_DAYS)

  try {
    const { data, error } = await createAdminClient()
      .from('attendance_logs')
      .select('checked_date')
      .eq('user_id', userId)
      .gte('checked_date', lookback < month.start ? lookback : month.start)
      .lte('checked_date', month.end)
      .order('checked_date', { ascending: true })
    if (error) {
      logger.error(new Error('[Attendance] 출석 달력 조회 실패'), { userId, error })
      return empty
    }

    const dates = (data ?? []).map((row) => String(row.checked_date))
    const checked = new Set(dates)
    return {
      success: true,
      checkedDates: dates.filter((d) => d >= month.start),
      consecutiveStreak: consecutiveStreak(checked, today),
      canCheckIn: !checked.has(today),
    }
  } catch (error) {
    logger.error(new Error('[Attendance] 출석 달력 조회 실패'), { userId, cause: causeOf(error) })
    return empty
  }
}

/** 오늘 출석 — 기록 한 줄 + 신당 정성 하루. */
export async function recordDailyAttendance(): Promise<
  | { success: true; devotionGained: boolean; devotionTotalDays: number }
  | { success: false; error: string; alreadyChecked?: boolean }
> {
  const userId = await sessionUserId()
  if (!userId) return { success: false, error: '로그인이 필요합니다.' }

  const today = formatKstDate()
  const failed = { success: false as const, error: '출석을 기록하지 못했어요. 잠시 후 다시 시도해 주세요.' }

  try {
    const { error } = await createAdminClient()
      .from('attendance_logs')
      .insert({
        user_id: userId,
        checked_date: today,
        week_start: kstWeekStart(today),
        // 열 기본값이 1 이라 비워 두면 준 적 없는 보상이 기록에 남는다.
        bokchae_awarded: 0,
      })
    if (error?.code === '23505') {
      return { success: false, alreadyChecked: true, error: '오늘은 이미 출석했어요.' }
    }
    if (error) {
      logger.error(new Error('[Attendance] 출석 기록 실패'), { userId, error })
      return failed
    }
  } catch (error) {
    logger.error(new Error('[Attendance] 출석 기록 실패'), { userId, cause: causeOf(error) })
    return failed
  }

  const devotion = await accrueDevotion(userId)
  return { success: true, devotionGained: devotion.gained, devotionTotalDays: devotion.totalDays }
}
