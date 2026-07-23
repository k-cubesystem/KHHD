'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deductTalisman, refundStudioCost } from './wallet'
import { logger } from '@/lib/utils/logger'
import { getVoucherProduct, isVoucherType, isVoucherActive, computeVoucherExpiry } from '@/lib/domain/payment/vouchers'

export interface VoucherRow {
  id: string
  user_id: string
  voucher_type: string
  status: string
  expires_at: string | null
  used_at: string | null
  source: string
  created_at: string
}

export interface PurchaseVoucherResult {
  success: boolean
  error?: string
  errorType?: string
  voucher?: VoucherRow
  remainingBalance?: number
}

const VOUCHER_COLS = 'id, user_id, voucher_type, status, expires_at, used_at, source, created_at'

/** deduct/refund 매칭용 featureKey(같은 문자열이어야 환불이 성립). */
function voucherFeatureKey(voucherType: string): string {
  return `VOUCHER_${voucherType}`
}

/**
 * 이용권 구매 — 복채 차감 후 service_role 로 발급(insert). insert 실패 시 롤백(환불).
 * insert 는 서버 전용(RLS insert 정책 없음) — 결제 없는 클라이언트 직접 발급을 차단한다.
 */
export async function purchaseVoucher(voucherType: string): Promise<PurchaseVoucherResult> {
  if (!isVoucherType(voucherType)) {
    return { success: false, error: '알 수 없는 이용권입니다.' }
  }
  const product = getVoucherProduct(voucherType)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.', errorType: 'UNAUTHENTICATED' }

  // 복채 차감(1만냥) — 마스터/무제한은 wallet 내부에서 면제(성공). 부족 시 errorType 반환.
  const featureKey = voucherFeatureKey(voucherType)
  const deduct = await deductTalisman(featureKey, product.priceBokchae)
  if (!deduct.success) {
    return {
      success: false,
      error: deduct.error || '복채가 부족합니다.',
      errorType: deduct.errorType,
      remainingBalance: deduct.remainingBalance,
    }
  }

  // service_role 로 발급 — 구매 즉시 now + durationHours 만료.
  const admin = createAdminClient()
  const expiresAt = computeVoucherExpiry(product, Date.now()).toISOString()
  const { data, error } = await admin
    .from('user_vouchers')
    .insert({
      user_id: user.id,
      voucher_type: voucherType,
      status: 'active',
      expires_at: expiresAt,
      source: 'purchase',
    })
    .select(VOUCHER_COLS)
    .single()

  if (error || !data) {
    logger.error('[purchaseVoucher] 발급 실패, 환불 시도:', error)
    await refundStudioCost(featureKey).catch(() => {})
    return { success: false, error: '이용권 발급에 실패했습니다. 복채는 환불됩니다.' }
  }

  return { success: true, voucher: data as VoucherRow, remainingBalance: deduct.remainingBalance }
}

/** 내 이용권 목록(최신순). */
export async function getMyVouchers(): Promise<VoucherRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_vouchers')
    .select(VOUCHER_COLS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[getMyVouchers] 조회 실패:', error)
    return []
  }
  return (data ?? []) as VoucherRow[]
}

/** 활성 고민상담 1일권 보유 여부 — 게이트(고민상담)에서 사용. */
export async function hasActiveChatPass(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('user_vouchers')
    .select('status, expires_at')
    .eq('user_id', user.id)
    .eq('voucher_type', 'CHAT_DAY_PASS')
    .eq('status', 'active')
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return false
  return isVoucherActive(data as { status: string; expires_at: string | null }, Date.now())
}
