import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { formatKstDate } from '@/lib/utils'

/**
 * 복 포인트(bok_points) **발행**(잔액 증액) 전용 모듈.
 *
 * 여기 있는 함수는 절대 `'use server'` 파일에서 re-export 하지 말 것.
 * Next.js 규약상 `'use server'` 파일의 모든 export 는 로그인 유저가 직접 호출 가능한
 * 공개 엔드포인트가 되며, 금액을 인자로 받는 발행 함수가 그렇게 노출되면 유저가 임의 금액을
 * 자기 계정에 무제한 발행할 수 있다(S-P1). 복 포인트는 신물/테마 구매에 쓰이는 소비처가 있는
 * 재화이므로 실질 피해가 발생한다.
 *
 * 호출자는 **서버가 사실을 검증한 지점**(분석 완료·인연 등록·소원 저장 등)뿐이어야 한다.
 * 클라이언트가 트리거해야 하는 보상은 금액을 인자로 받지 말고, 이 파일의
 * `grantShareReward` 처럼 **금액이 서버 상수로 고정된 좁은 함수**를 새로 만들어
 * 얇은 공개 액션으로 감싼다.
 */

export type BokTransactionType =
  | 'REGISTER'
  | 'ANALYSIS'
  | 'COMPATIBILITY'
  | 'FORTUNE'
  | 'SHARE'
  | 'CHECKIN'
  | 'BONUS'
  | 'REFERRAL'
  | 'MISSION'
  | 'SHRINE_WISH_OWN'
  | 'SHRINE_WISH_VISIT'
  | 'SHRINE_ITEM_PURCHASE'

export interface BokGrantResult {
  success: boolean
  balance?: number
  error?: string
}

export interface ShareRewardResult extends BokGrantResult {
  /** 오늘(KST) 이미 받은 경우 true — 실패가 아니라 정상 흐름(멱등). */
  alreadyClaimed?: boolean
}

/** 카카오 공유 보상 고정 금액 — 클라이언트가 정할 수 없도록 서버 상수. */
export const SHARE_REWARD_POINTS = 20

/**
 * 지정 유저에게 복 포인트 적립. `userId` 를 인자로 받으므로(= 인증 주체와 무관)
 * 반드시 인증을 마친 서버 경로에서만 호출한다.
 */
async function creditBokPoints(
  userId: string,
  amount: number,
  type: BokTransactionType,
  familyMemberId?: string,
  description?: string
): Promise<BokGrantResult> {
  try {
    // 재화(bok_points) 발행은 service_role 전용.
    const admin = createAdminClient()
    const { data: newBalance, error: rpcError } = await admin.rpc('add_bok_points', {
      p_user_id: userId,
      p_amount: amount,
    })

    if (rpcError) {
      logger.error('[BokGrant] add_bok_points RPC error:', rpcError)
      return { success: false, error: '복 포인트 적립에 실패했습니다.' }
    }

    const { error: txError } = await admin.from('bok_transactions').insert({
      user_id: userId,
      family_member_id: familyMemberId || null,
      amount,
      type,
      description: description || `${type} ${amount >= 0 ? '+' : ''}${amount}p`,
    })

    // 로그 실패는 적립 자체를 되돌리지 않되(기존 동작 유지), 멱등 판정 근거가 사라지므로 error 로 남긴다.
    if (txError) logger.error('[BokGrant] bok_transactions insert failed:', txError)

    return { success: true, balance: newBalance as number }
  } catch (err) {
    logger.error('[BokGrant] creditBokPoints error:', err)
    return { success: false, error: '복 포인트 적립 중 오류가 발생했습니다.' }
  }
}

/**
 * 서버가 검증한 행위(분석 완료·인연 등록·소원 저장 등)에 대한 **로그인 본인** 복 포인트 적립.
 * 금액을 인자로 받으므로 **서버 내부에서만** 호출한다(공개 액션으로 노출 금지).
 */
export async function addBokPoints(
  amount: number,
  type: BokTransactionType,
  familyMemberId?: string,
  description?: string
): Promise<BokGrantResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  return creditBokPoints(user.id, amount, type, familyMemberId, description)
}

/**
 * 카카오 공유 보상 — 금액 서버 고정(20p), 하루(KST) 1회 멱등.
 *
 * 멱등 판정(2단):
 * 1) **권위 판정** — `bok_transactions` 에 오늘(KST) `type='SHARE'` 로그가 있으면 재지급 금지.
 *    `'SHARE'` 는 공유 보상 전용 타입이다(미션 완료 적립은 `'MISSION'`) → 전용 테이블 신설 없이
 *    트랜잭션 로그만으로 하루 1회를 판정할 수 있다.
 * 2) **동시성 방어** — KST 날짜를 키에 넣은 rate limit(24h 창, 1회) 으로 원자적 클레임.
 *    `check_rate_limit` 은 원자 check-and-increment 라 동시 요청 이중 지급을 막는다.
 *    다만 `cleanup_rate_limit_entries()`(10분 초과 엔트리 삭제)나 memory fallback 으로
 *    창이 초기화될 수 있으므로 '하루 1회'의 권위는 (1)이 갖는다.
 */
export async function grantShareReward(userId: string): Promise<ShareRewardResult> {
  const today = formatKstDate()
  const admin = createAdminClient()

  const dayStartUtc = new Date(`${today}T00:00:00+09:00`).toISOString()
  const { data: todayLog, error: logError } = await admin
    .from('bok_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'SHARE')
    .gte('created_at', dayStartUtc)
    .limit(1)

  if (logError) {
    logger.error('[BokGrant] share reward idempotency check failed:', logError)
    return { success: false, error: '공유 보상 확인에 실패했습니다.' }
  }

  if (todayLog && todayLog.length > 0) {
    return { success: true, alreadyClaimed: true }
  }

  const rl = await rateLimit(`bok-share:${userId}:${today}`, {
    interval: 24 * 60 * 60 * 1000,
    uniqueTokenPerInterval: 1,
  })
  if (!rl.success) {
    logger.warn('[BokGrant] share reward daily claim already used:', { userId, today })
    return { success: true, alreadyClaimed: true }
  }

  return creditBokPoints(userId, SHARE_REWARD_POINTS, 'SHARE', undefined, '카카오톡 공유')
}
