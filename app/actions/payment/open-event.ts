'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const EVENT_DAILY_AMOUNT = 20 // 20만냥
const EVENT_FEATURE_KEY = 'OPEN_EVENT_DAILY'

/**
 * KST 기준 오늘 시작 시각 (UTC ISO string)
 */
function getTodayKSTStart(): string {
  const now = new Date()
  // KST = UTC+9
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  const kstDateStr = kstNow.toISOString().split('T')[0]
  // KST 자정을 UTC로 변환: KST 00:00 = UTC 전날 15:00
  return new Date(`${kstDateStr}T00:00:00+09:00`).toISOString()
}

export async function claimDailyEventBonus(): Promise<{
  success: boolean
  message: string
  alreadyClaimed?: boolean
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    const adminClient = createAdminClient()
    const todayStart = getTodayKSTStart()

    // 오늘 이미 받았는지 확인
    const { data: existing } = await adminClient
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('feature_key', EVENT_FEATURE_KEY)
      .gte('created_at', todayStart)
      .maybeSingle()

    if (existing) {
      return { success: false, alreadyClaimed: true, message: '오늘 이미 복채를 받았습니다.' }
    }

    // 트랜잭션 로그 먼저 삽입 (중복 방지)
    const { error: txError } = await adminClient.from('wallet_transactions').insert({
      user_id: user.id,
      amount: EVENT_DAILY_AMOUNT,
      type: 'BONUS',
      feature_key: EVENT_FEATURE_KEY,
      description: '오픈 이벤트 일일 복채 20만냥',
    })

    if (txError) {
      logger.error('[OpenEvent] Transaction insert error:', txError)
      return { success: false, message: '이미 처리된 요청입니다.' }
    }

    // 지갑 잔액 업데이트
    const { data: wallet } = await adminClient.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()

    const currentBalance = wallet?.balance ?? 0
    const newBalance = currentBalance + EVENT_DAILY_AMOUNT

    if (wallet) {
      await adminClient.from('wallets').update({ balance: newBalance }).eq('user_id', user.id)
    } else {
      await adminClient.from('wallets').insert({ user_id: user.id, balance: newBalance })
    }

    logger.info(`[OpenEvent] Granted ${EVENT_DAILY_AMOUNT}만냥 to user ${user.id}`)
    return { success: true, message: `오픈 이벤트 복채 ${EVENT_DAILY_AMOUNT}만냥이 지급되었습니다!` }
  } catch (error) {
    logger.error('[OpenEvent] Unexpected error:', error)
    return { success: false, message: '복채 지급 중 오류가 발생했습니다.' }
  }
}

export async function checkEventBonusStatus(): Promise<{
  claimed: boolean
  eventActive: boolean
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { claimed: false, eventActive: true }
    }

    const adminClient = createAdminClient()
    const todayStart = getTodayKSTStart()

    const { data: existing } = await adminClient
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('feature_key', EVENT_FEATURE_KEY)
      .gte('created_at', todayStart)
      .maybeSingle()

    return { claimed: !!existing, eventActive: true }
  } catch (error) {
    logger.error('[OpenEvent] Status check error:', error)
    return { claimed: false, eventActive: true }
  }
}
