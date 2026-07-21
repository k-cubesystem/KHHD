'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * 「오늘의 정성」 — 데일리 루프 3상태를 한 번에 반환(F-6).
 * 출석(프로필)·오늘의 운세(대시보드)·신탁(신당)이 3화면에 흩어져 있어 재방문 동기가 약했다.
 * 이 액션 하나로 대시보드 허브가 오늘 할 일을 모아 보여준다.
 */
export interface DailyRitualStatus {
  /** 오늘 출석 도장을 찍었는가 */
  attendanceDone: boolean
  /** 오늘의 운세를 조회했는가 */
  fortuneViewed: boolean
  /** 미확인 신탁 수 */
  unseenOracleCount: number
}

const EMPTY: DailyRitualStatus = { attendanceDone: false, fortuneViewed: false, unseenOracleCount: 0 }

export async function getDailyRitualStatus(): Promise<DailyRitualStatus> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return EMPTY

    // attendance_logs.checked_date 는 KST, daily_fortunes.date 는 UTC 로 저장 → 자정 경계 방어 위해 둘 다 조회
    const now = Date.now()
    const utcToday = new Date(now).toISOString().split('T')[0]
    const kstToday = new Date(now + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
    const dates = utcToday === kstToday ? [utcToday] : [utcToday, kstToday]

    const [attendanceRes, fortuneRes, oracleRes] = await Promise.all([
      supabase
        .from('attendance_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('checked_date', dates),
      supabase
        .from('daily_fortunes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('date', dates),
      supabase
        .from('deity_oracles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('seen_at', null),
    ])

    return {
      attendanceDone: (attendanceRes.count ?? 0) > 0,
      fortuneViewed: (fortuneRes.count ?? 0) > 0,
      unseenOracleCount: oracleRes.count ?? 0,
    }
  } catch (e) {
    logger.warn('[getDailyRitualStatus] skipped:', e)
    return EMPTY
  }
}
