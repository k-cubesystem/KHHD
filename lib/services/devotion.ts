/**
 * 정성 적립 서비스 — 서버 내부 전용. 소원 저장 서버액션에서만 호출한다.
 * 클라이언트가 직접 적립하지 못하도록 service_role 전용 RPC(record_shrine_devotion)를
 * admin 클라이언트로만 호출한다(공개 서버액션으로 노출 금지 — 조작 벡터 차단).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { formatKstDate } from '@/lib/utils'

export interface DevotionAccrual {
  /** 오늘(KST) 첫 적립이면 true. 같은 날 재기도는 false. */
  gained: boolean
  /** 적립 후 누적 기도일. */
  totalDays: number
}

/**
 * 유저의 정성을 하루(KST) 1회 멱등 적립. 동시성 안전(원자 조건부 UPSERT는 RPC 내부).
 * 실패해도 소원 저장 자체는 성공으로 취급해야 하므로 예외를 삼키고 gained=false 반환.
 */
export async function accrueDevotion(userId: string): Promise<DevotionAccrual> {
  try {
    const admin = createAdminClient()
    const today = formatKstDate()
    const { data, error } = await admin.rpc('record_shrine_devotion', {
      p_user_id: userId,
      p_today: today,
    })
    if (error) {
      logger.warn('[devotion] accrue rpc failed (non-fatal):', error)
      return { gained: false, totalDays: 0 }
    }
    // returns table(...) → 배열의 첫 행
    const row = Array.isArray(data) ? data[0] : data
    const gained = typeof row?.gained === 'boolean' ? row.gained : false
    const totalDays = typeof row?.total_days === 'number' ? row.total_days : 0
    return { gained, totalDays }
  } catch (e) {
    logger.warn('[devotion] accrue threw (non-fatal):', e)
    return { gained: false, totalDays: 0 }
  }
}
