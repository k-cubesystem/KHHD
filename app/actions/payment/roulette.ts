'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// 복채 단위: 1 복채 = 1만냥
const DEFAULT_ROULETTE_CONFIG = [
  { reward_type: 'bokchae', reward_value: 1, label: '1만냥', probability: 40, color: '#f59e0b' },
  { reward_type: 'bokchae', reward_value: 3, label: '3만냥', probability: 30, color: '#10b981' },
  { reward_type: 'bokchae', reward_value: 5, label: '5만냥', probability: 15, color: '#3b82f6' },
  { reward_type: 'bokchae', reward_value: 10, label: '10만냥', probability: 10, color: '#8b5cf6' },
  { reward_type: 'miss', reward_value: 0, label: '꽝', probability: 5, color: '#ef4444' },
]

/**
 * 룰렛 설정 조회 (DB 우선, 없으면 기본값)
 */
export async function getRouletteConfig() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roulette_config')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error || !data || data.length === 0) {
    return { success: true, config: DEFAULT_ROULETTE_CONFIG }
  }

  return { success: true, config: data }
}

/**
 * 오늘 룰렛 사용 가능 여부 확인
 */
export async function checkRouletteAvailability() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.', canSpin: false }
    }

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const { data: todayRecord } = await supabase
      .from('roulette_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('spun_at', todayStart.toISOString())
      .single()

    if (todayRecord) {
      const nextAvailable = new Date(todayRecord.spun_at)
      nextAvailable.setDate(nextAvailable.getDate() + 1)
      nextAvailable.setHours(0, 0, 0, 0)

      return {
        success: true,
        canSpin: false,
        nextAvailableTime: nextAvailable.toISOString(),
      }
    }

    return { success: true, canSpin: true }
  } catch (error: unknown) {
    logger.error('checkRouletteAvailability error:', error)
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: msg,
      canSpin: false,
    }
  }
}

/**
 * 룰렛 돌리기
 */
export async function spinRoulette() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    logger.log(`[Roulette] User ${user.id} attempting to spin...`)

    // 사용 가능 여부 확인
    const availCheck = await checkRouletteAvailability()
    if (!availCheck.canSpin) {
      return { success: false, error: '오늘은 이미 룰렛을 돌렸습니다.' }
    }

    // DB에서 룰렛 설정 조회
    const { config } = await getRouletteConfig()

    // 확률 계산 (서버 사이드)
    const totalProb = config.reduce((sum: number, c: (typeof config)[number]) => sum + Number(c.probability), 0)
    const rand = Math.random() * totalProb
    let cumulative = 0
    let selectedReward = config[0]

    for (const reward of config) {
      cumulative += Number(reward.probability)
      if (rand <= cumulative) {
        selectedReward = reward
        break
      }
    }

    logger.log(`[Roulette] Selected reward:`, selectedReward)

    // 1. 먼저 wallet이 존재하는지 확인하고 없으면 생성
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingWallet) {
      logger.log(`[Roulette] Creating wallet for user ${user.id}`)
      const { error: walletCreateError } = await supabase.from('wallets').insert({ user_id: user.id, balance: 0 })

      if (walletCreateError) {
        logger.error('[Roulette] Failed to create wallet:', walletCreateError)
        throw new Error(`지갑 생성 실패: ${walletCreateError.message}`)
      }
    }

    // 2. 기록 저장
    logger.log(`[Roulette] Inserting roulette history...`)
    const { error: insertError } = await supabase.from('roulette_history').insert({
      user_id: user.id,
      reward_type: selectedReward.reward_type || selectedReward.type,
      reward_value: selectedReward.reward_value || selectedReward.value || 0,
    })

    if (insertError) {
      logger.error('[Roulette] Insert error:', insertError)
      throw new Error(`룰렛 기록 저장 실패: ${insertError.message}`)
    }

    logger.log(`[Roulette] History saved successfully`)

    // 3. 복채 지급 (꽝이 아닐 경우)
    const rewardValue = selectedReward.reward_value ?? selectedReward.value ?? 0
    const rewardType = selectedReward.reward_type ?? selectedReward.type

    let currentBalance = 0

    if (rewardType === 'bokchae' && rewardValue > 0) {
      logger.log(`[Roulette] Crediting ${rewardValue} bokchae via RPC...`)

      // add_bokchae RPC 시도
      const { data: rpcResult, error: rpcError } = await supabase.rpc('add_bokchae', {
        p_user_id: user.id,
        p_amount: rewardValue,
        p_reason: `행운의 룰렛 당첨 (${selectedReward.label})`,
      })

      if (rpcError) {
        logger.warn('[Roulette] RPC add_bokchae failed, using direct method:', rpcError)

        // Fallback: 직접 처리
        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

        const oldBalance = wallet?.balance || 0
        const newBalance = oldBalance + rewardValue

        logger.log(`[Roulette] Direct credit: ${oldBalance} -> ${newBalance}`)

        const { error: updateError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id)

        if (updateError) {
          logger.error('[Roulette] Failed to update wallet:', updateError)
          throw new Error(`복채 지급 실패: ${updateError.message}`)
        }

        const { error: txError } = await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          amount: rewardValue,
          type: 'BONUS',
          description: `행운의 룰렛 당첨 (${selectedReward.label})`,
        })

        if (txError) {
          logger.error('[Roulette] Failed to record transaction:', txError)
          // 트랜잭션 기록 실패는 치명적이지 않으므로 warning만
        }

        currentBalance = newBalance
      } else {
        logger.log(`[Roulette] RPC add_bokchae succeeded:`, rpcResult)

        // Get updated balance
        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

        currentBalance = wallet?.balance || 0
      }
    } else {
      // 꽝인 경우에도 현재 잔액 조회
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()

      currentBalance = wallet?.balance || 0
    }

    logger.log(`[Roulette] Final wallet balance: ${currentBalance}`)

    const nextAvailable = new Date()
    nextAvailable.setDate(nextAvailable.getDate() + 1)
    nextAvailable.setHours(0, 0, 0, 0)

    return {
      success: true,
      reward: {
        type: rewardType,
        value: rewardValue,
        label: selectedReward.label,
        isMiss: rewardType === 'miss',
      },
      currentBalance,
      nextAvailableTime: nextAvailable.toISOString(),
    }
  } catch (error: unknown) {
    logger.error('[Roulette] Critical error:', error)
    const msg = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * 룰렛 상품 목록 (프론트엔드 표시용)
 */
export async function getRouletteRewards() {
  const { config } = await getRouletteConfig()
  return { success: true, rewards: config }
}

/**
 * [어드민] 룰렛 설정 업데이트
 */
export async function updateRouletteConfig(
  configs: Array<{
    id?: string
    reward_type: string
    reward_value: number
    label: string
    probability: number
    color: string
    sort_order: number
  }>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  // 확률 합계 검증 (0-100 사이)
  const totalProb = configs.reduce((sum, c) => sum + Number(c.probability), 0)
  if (totalProb <= 0) {
    return { success: false, error: '확률 합계는 0보다 커야 합니다.' }
  }

  // 기존 설정 삭제 후 재삽입
  const { error: deleteError } = await supabase
    .from('roulette_config')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // 전체 삭제

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  const { error: insertError } = await supabase.from('roulette_config').insert(
    configs.map((c) => ({
      reward_type: c.reward_type,
      reward_value: c.reward_value,
      label: c.label,
      probability: c.probability,
      color: c.color,
      sort_order: c.sort_order,
      is_active: true,
      updated_at: new Date().toISOString(),
    }))
  )

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true }
}
