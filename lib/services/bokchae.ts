import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { getUserRole } from '@/lib/supabase/helpers'
import { hasUnlimitedAccess, UNLIMITED_BALANCE } from '@/lib/auth/privileges'

/**
 * 복채(wallets) 직접 차감 — 아이템/테마/신위 등 **일회성 구매**용.
 * 단일 통화(복채) 정책: 모든 구매는 복채로. AI 기능 일일한도(deductTalisman)와는 별개.
 * 원자적(deduct_wallet_balance RPC, service_role). 부족 시 error='INSUFFICIENT_BOKCHAE'.
 */
export async function spendBokchae(
  amount: number,
  description: string,
  featureKey?: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  if (amount <= 0) return { success: true }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  // 마스터: 실제 지갑을 건드리지 않고 통과. (잔액은 UNLIMITED_BALANCE 로 표시되는데
  // 여기서 우회하지 않으면 테마·신위·아이템 구매가 INSUFFICIENT_BOKCHAE 로 막힌다)
  const role = await getUserRole(supabase, user.id)
  if (hasUnlimitedAccess(role)) {
    return { success: true, balance: UNLIMITED_BALANCE }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('deduct_wallet_balance', { p_user_id: user.id, p_amount: amount })
  if (error) {
    logger.error('[spendBokchae] deduct rpc error:', error)
    return { success: false, error: 'PAYMENT_FAILED' }
  }
  const bal = data as number
  if (bal === -1 || bal === -2) return { success: false, error: 'INSUFFICIENT_BOKCHAE' }

  await admin
    .from('wallet_transactions')
    .insert({ user_id: user.id, amount: -amount, type: 'USE', description, feature_key: featureKey ?? null })
  return { success: true, balance: bal }
}

/** 복채 환불(구매 후 지급 실패 시 롤백). */
export async function refundBokchae(userId: string, amount: number, description: string): Promise<void> {
  if (amount <= 0) return
  const admin = createAdminClient()
  await admin.rpc('add_wallet_balance', { p_user_id: userId, p_amount: amount })
  await admin.from('wallet_transactions').insert({ user_id: userId, amount, type: 'BONUS', description })
}
