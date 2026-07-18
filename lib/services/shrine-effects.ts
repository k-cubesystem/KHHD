import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * 배치 효험(unlock_effect) 해석 — 서버 내부 전용.
 * "신당에 모셔둬야 효험" 원칙: 유저의 신당에 실제로 **배치된** 아이템만 효과를 낸다.
 * 카탈로그 JSONB 선언을 그대로 읽으므로 새 아이템은 시드만 추가하면 된다.
 */
export interface ShrineEffects {
  /** 신탁 최소 간격(시간). 기본 48, 향로 배치 시 24 */
  oracleMinGapHours: number
  /** 신탁 주간 상한 보너스 (기본 0) */
  oracleWeeklyCapBonus: number
  /** 오늘의 운세 '행운의 시간' 노출 (초롱) */
  luckyHour: boolean
  /** 신당 입장 시 이름 인사 (놋방울) */
  deityGreeting: boolean
  /** 출석 보상 가산율 % (복 부적) */
  attendanceBonusPercent: number
}

export const DEFAULT_EFFECTS: ShrineEffects = {
  oracleMinGapHours: 48,
  oracleWeeklyCapBonus: 0,
  luckyHour: false,
  deityGreeting: false,
  attendanceBonusPercent: 0,
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/**
 * 유저의 모든 신당(본인+가족)에 배치된 아이템의 효험을 합산.
 * max_stack 을 초과한 중복 배치는 무시한다.
 */
export async function getShrineEffects(userId: string): Promise<ShrineEffects> {
  const effects: ShrineEffects = { ...DEFAULT_EFFECTS }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('shrine_placements')
      .select('catalog_item_id, shrines!inner(user_id), shrine_item_catalog!inner(unlock_effect)')
      .eq('shrines.user_id', userId)
      .not('shrine_item_catalog.unlock_effect', 'is', null)

    if (error) {
      logger.warn('[shrine-effects] load failed:', error)
      return effects
    }

    // 타입별 배치 수 집계 (max_stack 적용용)
    const counted: Record<string, number> = {}

    for (const row of data ?? []) {
      const raw = (row as unknown as { shrine_item_catalog?: { unlock_effect?: unknown } }).shrine_item_catalog
        ?.unlock_effect
      if (typeof raw !== 'object' || raw === null) continue
      const eff = raw as Record<string, unknown>
      const type = typeof eff.type === 'string' ? eff.type : null
      if (!type) continue

      const maxStack = num(eff.max_stack, 1)
      counted[type] = (counted[type] ?? 0) + 1
      if (counted[type] > maxStack) continue // 상한 초과분은 효과 없음

      switch (type) {
        case 'oracle_freq':
          effects.oracleMinGapHours = Math.min(effects.oracleMinGapHours, num(eff.min_gap_hours, 24))
          effects.oracleWeeklyCapBonus += num(eff.weekly_cap_bonus, 0)
          break
        case 'lucky_hour':
          effects.luckyHour = true
          break
        case 'deity_greeting':
          effects.deityGreeting = true
          break
        case 'attendance_bonus':
          effects.attendanceBonusPercent += num(eff.percent, 0)
          break
        // chat_retention 은 purge/notify RPC 가 DB 에서 직접 집계 — 여기선 무시
      }
    }
    return effects
  } catch (e) {
    logger.warn('[shrine-effects] exception:', e)
    return effects
  }
}
