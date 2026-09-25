'use server'
import { tossBillingSecretKey } from '@/lib/config/toss-keys'

import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { grantMembershipDeity } from '@/lib/services/membership-deity'
import { requestTossCancel } from '@/lib/domain/payment/toss-cancel'
import { firstMonthPrice } from '@/lib/domain/payment/membership-intro'
import { SUPPORT_ASK } from '@/lib/domain/support/contact'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'

/** 구독 결제 계열 공통 한도(S-1) — 유저당 분당 10회. 정상 결제 플로우는 단계당 1회다. */
const BILLING_RATE_LIMIT = { interval: 60_000, uniqueTokenPerInterval: 10 } as const

/** 한도 초과면 사용자 메시지를 반환한다(통과 시 null). */
async function guardBillingRate(step: string, userId: string): Promise<string | null> {
  const rl = await rateLimit(`subscription-${step}:${userId}`, BILLING_RATE_LIMIT)
  if (rl.success) return null
  logger.warn('[Subscription] Rate limit exceeded:', { step, userId })
  return '결제 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.'
}

// 빌링키 발급·정기 청구는 정기결제 상점(bill_khaehqj1a) 소관이다.
const secretKey = tossBillingSecretKey
const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

// ============================================
// Types
// ============================================
export interface MembershipPlan {
  id: string
  name: string
  description: string | null
  tier: 'SINGLE' | 'FAMILY' | 'BUSINESS'
  price: number
  interval: 'MONTH' | 'YEAR'
  /** 결제 주기(월)마다 쓸 수 있는 이용권 장수 — 이월 없음. 지급이 아니라 사용량 표(subscription_usage)로 센다. */
  monthly_passes: number
  relationship_limit: number
  storage_limit: number
  features: {
    daily_fortune?: boolean
    pdf_archive?: boolean
    kakao_daily?: boolean
    ai_shaman?: boolean
    family_compatibility?: boolean
    network_visualization?: boolean
    api_access?: boolean
    priority_support?: boolean
    custom_reports?: boolean
  }
  is_active: boolean
  sort_order?: number
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  billing_key: string | null
  customer_key: string
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'PAYMENT_FAILED'
  current_period_start: string | null
  current_period_end: string | null
  next_billing_date: string | null
  last_payment_date: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  plan?: MembershipPlan
}

export interface SubscriptionPayment {
  id: string
  subscription_id: string
  user_id: string
  payment_key: string | null
  order_id: string
  amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  failure_reason: string | null
  billing_period_start: string | null
  billing_period_end: string | null
  created_at: string
}

// Helper to create Admin Client
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    logger.error('[Subscription] Missing Supabase Admin credentials')
    return null
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
  })
}

// ============================================
// 멤버십 플랜 조회
// ============================================
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  try {
    // membership_plans RLS: is_active=true 는 누구나 조회 가능
    // admin client 실패 시 fallback으로 일반 client 사용
    const adminSupabase = createAdminClient()
    const supabase = adminSupabase ?? (await createClient())

    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('[Subscription] Get plans error:', error.message)
      return []
    }

    return data || []
  } catch (e) {
    logger.error('[Subscription] getMembershipPlans exception:', e)
    return []
  }
}

export async function getMembershipPlan(planId: string): Promise<MembershipPlan | null> {
  try {
    const supabase = createAdminClient()
    if (!supabase) return null

    const { data, error } = await supabase.from('membership_plans').select('*').eq('id', planId).single()

    if (error) {
      logger.error('[Subscription] Get plan error:', error)
      return null
    }

    return data
  } catch (e) {
    logger.error('[Subscription] getMembershipPlan exception:', e)
    return null
  }
}

// ============================================
// 구독 상태 조회
// ============================================
export async function getSubscriptionStatus(): Promise<{
  isSubscribed: boolean
  subscription: Subscription | null
  plan: MembershipPlan | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { isSubscribed: false, subscription: null, plan: null }
    }

    // Admin client로 RLS 우회 (subscriptions + membership_plans 조인)
    const adminSupabase = createAdminClient()
    if (!adminSupabase) {
      return { isSubscribed: false, subscription: null, plan: null }
    }

    const { data: subscription, error } = await adminSupabase
      .from('subscriptions')
      .select('*, plan:membership_plans(*)')
      .eq('user_id', user.id)
      .in('status', ['ACTIVE', 'PAUSED', 'CANCELLED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !subscription) {
      return { isSubscribed: false, subscription: null, plan: null }
    }

    const isSubscribed =
      subscription.status === 'ACTIVE' &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > new Date()

    return {
      isSubscribed: !!isSubscribed,
      subscription: subscription as Subscription,
      plan: (subscription.plan ?? null) as MembershipPlan | null,
    }
  } catch (e) {
    logger.error('[Subscription] getSubscriptionStatus exception:', e)
    return { isSubscribed: false, subscription: null, plan: null }
  }
}

// ============================================
// 첫 구독 첫 달 할인 — 계정당 생애 1회
// ============================================

/**
 * 유료 멤버십을 결제한 적이 있는가. 조회에 실패하면 null — 할인 여부를 추측하지 않는다.
 * 환불된 결제도 «결제한 적 있음»이다(status 는 SUCCESS 로 남는다) — 가입·즉시 해지를 되풀이해 할인을 또 받지 못한다.
 * 활성화 실패로 자동 환불된 결제(CANCELLED)는 세지 않는다 — 그 회원은 멤버십을 받은 적이 없다.
 */
async function hasPaidMembershipBefore(userId: string): Promise<boolean | null> {
  const adminDb = createAdminClient()
  if (!adminDb) return null
  const { data, error } = await adminDb
    .from('subscription_payments')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'SUCCESS')
    .limit(1)
  if (error) {
    logger.error(new Error('[Subscription] 첫 결제 할인 자격 확인 실패'), { userId, message: error.message })
    return null
  }
  return (data ?? []).length > 0
}

/** 멤버십 카드가 할인 문구를 보여 줄지 — 로그인 사용자 본인 것만. 확인하지 못하면 약속하지 않는다(false). */
export async function getFirstMonthEligibility(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  return (await hasPaidMembershipBefore(user.id)) === false
}

/** 결제 전 화면이 보여 줄 첫 결제 금액. 로그인 사용자 본인 것만 — 인자로 사용자를 받지 않는다. */
export async function getFirstMonthOffer(
  planId: string
): Promise<{ eligible: boolean; firstPrice: number; regularPrice: number } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const plan = await getMembershipPlan(planId)
  if (!plan) return null

  const paidBefore = await hasPaidMembershipBefore(user.id)
  // 자격을 확인하지 못했으면 할인을 약속하지 않는다 — 화면이 정가를 보여 주고, 결제 단계가 다시 판정한다.
  const eligible = paidBefore === false
  return { eligible, firstPrice: eligible ? firstMonthPrice(plan.price) : plan.price, regularPrice: plan.price }
}

// ============================================
// 빌링키 발급 URL 생성
// ============================================

export async function createBillingAuthUrl(planId: string): Promise<{
  success: boolean
  customerKey?: string
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const rateLimited = await guardBillingRate('auth-url', user.id)
  if (rateLimited) return { success: false, error: rateLimited }

  // 플랜 확인
  const plan = await getMembershipPlan(planId)
  if (!plan) {
    return { success: false, error: '유효하지 않은 멤버십 플랜입니다.' }
  }

  // 기존 구독 확인 — 막는 근거는 «정기결제 중인» 활성 구독뿐이다.
  // 🔴 관리자가 결제 없이 부여한 구독(billing_key 없음)은 막지 않는다. 막으면 부여받은 회원이 유료로 올릴 길이 없다.
  const { data: existingSubs } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['ACTIVE', 'PENDING'])
    .order('created_at', { ascending: false })

  // 🔴 기간이 지났어도 막는다. 갱신 결제가 실패해 재시도 중인 구독은 기간이 끝난 채 ACTIVE 로 남는데,
  //    화면에는 비회원으로 보여 다시 가입하게 된다 — 그러면 옛 빌링키와 새 빌링키가 매달 둘 다 청구된다.
  const livePaidSub = (existingSubs ?? []).find((s) => s.status === 'ACTIVE' && !!s.billing_key)
  if (livePaidSub) {
    const periodOver =
      !!livePaidSub.current_period_end && new Date(livePaidSub.current_period_end).getTime() <= Date.now()
    return {
      success: false,
      error: periodOver
        ? '이전 멤버십의 갱신 결제가 진행 중입니다. 멤버십 관리에서 결제 수단을 바꾸거나 해지한 뒤 다시 시도해주세요.'
        : '이미 활성화된 구독이 있습니다.',
    }
  }
  const existingSub = (existingSubs ?? []).find((s) => s.status === 'PENDING') ?? null

  // customerKey 생성 (사용자별 고유)
  const customerKey = `HHD_${user.id.slice(0, 8)}_${Date.now()}`

  // PENDING 구독 레코드 쓰기는 service_role 전용(S1b R1: subscriptions 자가발급 차단).
  // 인증(user.id)은 위에서 검증됨. 돈 관련 쓰기는 admin 부재 시 하드 실패(폴백 금지).
  const dbWrite = createAdminClient()
  if (!dbWrite) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }
  if (existingSub) {
    const { error: pendingError } = await dbWrite
      .from('subscriptions')
      .update({
        plan_id: planId,
        customer_key: customerKey,
        status: 'PENDING',
      })
      .eq('id', existingSub.id)
      .eq('user_id', user.id)
    if (pendingError) {
      logger.error('[Subscription] Pending update error:', pendingError)
      return { success: false, error: '구독 준비에 실패했습니다.' }
    }
  } else {
    const { error: pendingError } = await dbWrite.from('subscriptions').insert({
      user_id: user.id,
      plan_id: planId,
      customer_key: customerKey,
      status: 'PENDING',
    })
    if (pendingError) {
      logger.error('[Subscription] Pending insert error:', pendingError)
      return { success: false, error: '구독 준비에 실패했습니다.' }
    }
  }

  return {
    success: true,
    customerKey,
  }
}

// ============================================
// 빌링키 발급 완료 처리
// ============================================
export async function issueBillingKey(
  authKey: string,
  customerKey: string
): Promise<{
  success: boolean
  billingKey?: string
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const rateLimited = await guardBillingRate('billing-key', user.id)
  if (rateLimited) return { success: false, error: rateLimited }

  // Toss API: 빌링키 발급
  const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey,
      customerKey,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    logger.error('[Subscription] Issue billing key error:', result)
    return {
      success: false,
      error: result.message || '빌링키 발급에 실패했습니다.',
    }
  }

  const billingKey = result.billingKey

  // 구독 레코드 업데이트 — subscriptions 쓰기는 service_role 전용(S1b R1)
  const adminDb = createAdminClient()
  if (!adminDb) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }
  const { error: updateError } = await adminDb
    .from('subscriptions')
    .update({
      billing_key: billingKey,
    })
    .eq('customer_key', customerKey)
    .eq('user_id', user.id)

  if (updateError) {
    logger.error('[Subscription] Update billing key error:', updateError)
    return { success: false, error: '빌링키 저장에 실패했습니다.' }
  }

  return { success: true, billingKey }
}

// ============================================
// 첫 결제 실행 (구독 활성화)
// ============================================
export async function executeFirstPayment(customerKey: string): Promise<{
  success: boolean
  subscription?: Subscription
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const rateLimited = await guardBillingRate('first-payment', user.id)
  if (rateLimited) return { success: false, error: rateLimited }

  // 구독 정보 조회
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(`*, plan:membership_plans(*)`)
    .eq('customer_key', customerKey)
    .eq('user_id', user.id)
    .single()

  if (subError || !subscription) {
    return { success: false, error: '구독 정보를 찾을 수 없습니다.' }
  }

  if (!subscription.billing_key) {
    return { success: false, error: '빌링키가 없습니다.' }
  }

  // subscription_payments·subscriptions 쓰기는 service_role 전용(S1b R1).
  // 유저 클라 insert는 RLS(SELECT 전용)에 조용히 막혀 결제기록 누락 + 멱등성 무력화됨.
  const adminDb = createAdminClient()
  if (!adminDb) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  const plan = subscription.plan as MembershipPlan
  const orderId = `SUB_${user.id.slice(0, 8)}_${Date.now()}`

  // 멱등성 체크: 이미 성공한 결제가 있는지 확인 (재시도/이중 호출 방지)
  const { data: existingPayment } = await supabase
    .from('subscription_payments')
    .select('id')
    .eq('subscription_id', subscription.id)
    .eq('status', 'SUCCESS')
    .limit(1)
    .maybeSingle()

  if (existingPayment) {
    logger.warn('[Subscription] Duplicate first payment attempt blocked:', subscription.id)
    return { success: true, subscription: subscription as unknown as Subscription }
  }

  // 청구 «전에» 다시 본다 — 두 탭에서 동시에 가입하면 위의 접수 검사는 둘 다 통과한다.
  // DB 의 부분 유니크 인덱스(유료 활성 구독은 한 사람에 하나)가 마지막 방어선인데, 그것만 믿으면
  // «결제는 됐는데 활성화가 실패»한다.
  const { data: otherPaid, error: otherPaidError } = await adminDb
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .not('billing_key', 'is', null)
    .neq('id', subscription.id)
    .limit(1)
  if (otherPaidError) {
    logger.error(new Error('[Subscription] 기존 유료 구독 확인 실패 — 청구하지 않음'), {
      userId: user.id,
      message: otherPaidError.message,
    })
    return { success: false, error: '구독 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }
  if ((otherPaid ?? []).length > 0) {
    logger.warn('[Subscription] 유료 구독이 이미 있어 첫 결제를 막음:', { userId: user.id })
    return { success: false, error: '이미 활성화된 구독이 있습니다.' }
  }

  // 첫 결제 금액은 서버가 정한다 — 화면이 보낸 금액을 받지 않는다. 자격을 확인하지 못하면 청구하지 않는다
  // (정가로 청구하면 화면이 보여 준 금액과 다르고, 할인가로 청구하면 자격 없는 사람에게 깎아 준다).
  const paidBefore = await hasPaidMembershipBefore(user.id)
  if (paidBefore === null) {
    return { success: false, error: '결제 조건을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }
  const firstMonthDiscounted = !paidBefore
  const chargeAmount = firstMonthDiscounted ? firstMonthPrice(plan.price) : plan.price

  // Toss API: 빌링 결제
  const response = await fetch(`https://api.tosspayments.com/v1/billing/${subscription.billing_key}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey: subscription.customer_key,
      amount: chargeAmount,
      orderId,
      orderName: firstMonthDiscounted ? `${plan.name} 구독 (첫 달 할인)` : `${plan.name} 구독`,
    }),
  })

  const result = await response.json()

  // 기간 계산
  const now = new Date()
  const periodEnd = new Date(now)
  if (plan.interval === 'MONTH') {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  }

  const nextBilling = new Date(periodEnd)

  if (!response.ok) {
    logger.error('[Subscription] First payment error:', result)

    // 결제 실패 기록
    const { error: failLogError } = await adminDb.from('subscription_payments').insert({
      subscription_id: subscription.id,
      user_id: user.id,
      order_id: orderId,
      amount: chargeAmount,
      status: 'FAILED',
      failure_code: result.code,
      failure_reason: result.message,
    })
    if (failLogError) {
      logger.error('[Subscription] Failed-payment log insert error:', failLogError)
    }

    // 구독 상태 업데이트
    await adminDb.from('subscriptions').update({ status: 'PAYMENT_FAILED' }).eq('id', subscription.id)

    return {
      success: false,
      error: result.message || '첫 결제에 실패했습니다.',
    }
  }

  // 결제 성공 처리
  // 1. 결제 기록 — 실패 시 멱등성(이중결제 방지)이 깨지므로 반드시 로깅
  const { error: successLogError } = await adminDb.from('subscription_payments').insert({
    subscription_id: subscription.id,
    user_id: user.id,
    payment_key: result.paymentKey,
    order_id: orderId,
    amount: chargeAmount,
    status: 'SUCCESS',
    billing_period_start: now.toISOString(),
    billing_period_end: periodEnd.toISOString(),
  })
  if (successLogError) {
    logger.error('[Subscription] Success-payment log insert error:', successLogError)
  }

  // 2. 구독 활성화
  const { data: updatedSub, error: activateError } = await adminDb
    .from('subscriptions')
    .update({
      status: 'ACTIVE',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_date: nextBilling.toISOString(),
      last_payment_date: now.toISOString(),
    })
    .eq('id', subscription.id)
    .select()
    .single()

  if (activateError || !updatedSub) {
    // 돈은 나갔는데 멤버십이 열리지 않았다(예: 유료 구독이 이미 있어 DB 유니크 인덱스에 걸림). 성공으로 답하면
    // 회원은 결제만 하고 아무것도 받지 못한다 — 방금 결제를 되돌리고, 못 되돌리면 사람에게 올린다.
    const refund = await requestTossCancel({
      secretKey,
      paymentKey: String(result.paymentKey),
      cancelReason: '멤버십 활성화 실패 — 자동 환불',
      idempotencyKey: `HHD-SUBACT-${subscription.id}-${orderId}`.slice(0, 300),
    })
    if (refund.ok) {
      await adminDb
        .from('subscription_payments')
        .update({ status: 'CANCELLED', cancelled_amount: chargeAmount, cancelled_at: new Date().toISOString() })
        .eq('order_id', orderId)
    }
    logger.error(new Error('[Subscription] 첫 결제 뒤 구독 활성화 실패'), {
      userId: user.id,
      subscriptionId: subscription.id,
      orderId,
      message: activateError?.message,
      refunded: refund.ok,
    })
    return {
      success: false,
      error: refund.ok
        ? '멤버십을 시작하지 못해 결제를 취소했습니다. 잠시 후 다시 시도해주세요.'
        : `결제는 되었으나 멤버십을 시작하지 못했습니다. ${SUPPORT_ASK}`,
    }
  }

  // 멤버십은 아무것도 지급하지 않는다 — 이번 달 이용권은 사용량 표(subscription_usage)가 구독 기간으로 센다.
  // (재화를 지급하는 구독은 토스 빌링 심사에서 «충전»으로 거절된다.)

  // 3. 관리자가 결제 없이 부여했던 구독은 닫는다 — 활성 구독이 둘이면 등급·월 몫 판정이 흔들린다.
  const { error: closeGrantedError } = await adminDb
    .from('subscriptions')
    .update({ status: 'EXPIRED', current_period_end: now.toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .is('billing_key', null)
    .neq('id', subscription.id)
  if (closeGrantedError) {
    logger.error('[Subscription] 관리자 부여 구독 정리 실패:', closeGrantedError)
  }

  // 4. 멤버십 무료신 증정 (등급당 1위, 멱등·해지해도 보유 유지). 실패해도 구독은 성공.
  await grantMembershipDeity(subscription.user_id, plan.tier)

  logger.log('[Subscription] First payment success:', orderId)

  return {
    success: true,
    subscription: updatedSub as Subscription,
  }
}

// ============================================
// 구독 해지
// ============================================
export async function cancelSubscription(reason?: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (fetchError || !subscription) {
    return { success: false, error: '활성화된 구독이 없습니다.' }
  }

  // 즉시 해지가 아닌, 현재 기간 종료 후 해지 (Grace Period)
  // subscriptions 쓰기는 service_role 전용(S1b R1) — 소유권은 위 조회(user_id)로 검증됨
  const adminDb = createAdminClient()
  if (!adminDb) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }
  const { error: updateError } = await adminDb
    .from('subscriptions')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || '사용자 요청',
    })
    .eq('id', subscription.id)
    .eq('user_id', user.id)

  if (updateError) {
    logger.error('[Subscription] Cancel error:', updateError)
    return { success: false, error: '구독 해지에 실패했습니다.' }
  }

  logger.log('[Subscription] Cancelled:', subscription.id)

  return { success: true }
}

// ============================================
// 구독 재활성화
// ============================================
export async function reactivateSubscription(): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'CANCELLED')
    .single()

  if (fetchError || !subscription) {
    return { success: false, error: '해지된 구독이 없습니다.' }
  }

  // 아직 기간이 남아있으면 재활성화
  if (subscription.current_period_end && new Date(subscription.current_period_end) > new Date()) {
    const adminDb = createAdminClient()
    if (!adminDb) {
      return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
    }
    // 🔴 next_billing_date 를 반드시 되살린다. 해지 시 이를 null 로 끊어 두는데(빌링 크론 2중 차단),
    //    복구하지 않으면 재활성화한 구독이 «영원히 갱신되지 않는» 무료 멤버십이 된다.
    const { error: updateError } = await adminDb
      .from('subscriptions')
      .update({
        status: 'ACTIVE',
        cancelled_at: null,
        cancel_reason: null,
        next_billing_date: subscription.current_period_end,
      })
      .eq('id', subscription.id)
      .eq('user_id', user.id)

    if (updateError) {
      return { success: false, error: '구독 재활성화에 실패했습니다.' }
    }

    return { success: true }
  }

  return { success: false, error: '구독 기간이 만료되었습니다. 새로 가입해주세요.' }
}

// ============================================
// 결제 내역 조회
// ============================================
export async function getSubscriptionPayments(limit: number = 10): Promise<SubscriptionPayment[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  try {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        logger.warn(
          "[Subscription] Could not fetch payment history. This is expected if migrations haven't been run yet."
        )
      }
      return []
    }

    return data || []
  } catch {
    // Silently return empty array if table doesn't exist
    return []
  }
}

// ============================================
// 결제 수단 변경 (빌링키 재발급)
// ============================================

/**
 * 결제 수단 변경 «접수» — 토스 인증창에 쓸 새 customerKey 를 발급한다.
 *
 * 🔴 여기서 customer_key 를 바꾸지 않는다.
 *    예전에는 인증창을 열기 «전»에 덮어썼다. 회원이 인증을 그만두면 빌링키는 옛 키에 묶인 채
 *    customer_key 만 새 값이 되어, 다음 갱신 청구가 토스에서 키 불일치로 거절되고
 *    재시도 3회 뒤 PAYMENT_FAILED 로 떨어졌다 — 멀쩡한 구독이 카드만 만지면 죽었다.
 *    새 키는 대기 칸(pending_customer_key)에만 두고, 인증이 성공한 뒤
 *    completeBillingMethodChange 가 빌링키와 «함께» 한 번에 바꾼다.
 */
export async function changeBillingMethod(): Promise<{
  success: boolean
  customerKey?: string
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const rateLimited = await guardBillingRate('change-billing', user.id)
  if (rateLimited) return { success: false, error: rateLimited }

  const { data: activeSubs, error: findError } = await supabase
    .from('subscriptions')
    .select('id, billing_key, next_billing_date')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })

  if (findError) {
    logger.error('[Subscription] 결제 수단 변경 — 구독 조회 실패:', findError.message)
    return { success: false, error: '구독 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }

  // 자동 결제가 걸려 있는 구독만 «수단»을 바꿀 수 있다 — 관리자가 결제 없이 부여한 구독은
  // 청구할 것이 없어, 카드를 등록해도 쓰이지 않는다.
  const subscription = (activeSubs ?? []).find((s) => !!s.billing_key || !!s.next_billing_date)
  if (!subscription) {
    return {
      success: false,
      error: (activeSubs ?? []).length > 0 ? '자동 결제 중인 멤버십이 아닙니다.' : '활성화된 구독이 없습니다.',
    }
  }

  const newCustomerKey = `HHD_${user.id.slice(0, 8)}_${Date.now()}`

  // subscriptions 쓰기는 service_role 전용(S1b R1)
  const adminDb = createAdminClient()
  if (!adminDb) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }
  const { error: updateError } = await adminDb
    .from('subscriptions')
    .update({ pending_customer_key: newCustomerKey })
    .eq('id', subscription.id)
    .eq('user_id', user.id)
  if (updateError) {
    logger.error('[Subscription] 결제 수단 변경 접수 실패:', updateError)
    return { success: false, error: '결제 수단 변경에 실패했습니다.' }
  }

  return { success: true, customerKey: newCustomerKey }
}

/**
 * 결제 수단 변경 «완료» — 토스 인증이 성공해 돌아온 authKey 로 빌링키를 발급하고,
 * 같은 구독 행의 billing_key·customer_key 를 한 번에 바꾼다.
 *
 * 🔴 이 경로는 청구하지 않는다. 수단만 바꾸는 자리에서 돈을 받으면 이번 주기를 두 번 받는다
 *    — executeFirstPayment 를 부르지 않는다. 다음 청구는 갱신 크론이 한다.
 */
export async function completeBillingMethodChange(
  authKey: string,
  customerKey: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  const rateLimited = await guardBillingRate('change-billing-complete', user.id)
  if (rateLimited) return { success: false, error: rateLimited }

  const adminDb = createAdminClient()
  if (!adminDb) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  const { data: subscription, error: findError } = await adminDb
    .from('subscriptions')
    .select('id, billing_key, customer_key, retry_count')
    .eq('user_id', user.id)
    .eq('pending_customer_key', customerKey)
    .maybeSingle()

  if (findError) {
    logger.error('[Subscription] 결제 수단 변경 — 대기 중인 요청 조회 실패:', findError.message)
    return { success: false, error: '결제 수단 변경을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.' }
  }

  if (!subscription) {
    // 이미 끝난 요청이면 성공으로 답한다 — 복귀 화면을 새로고침해도 같은 결과를 봐야 한다
    // (authKey 는 일회성이라 토스를 다시 부르면 실패한다).
    const { data: applied } = await adminDb
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('customer_key', customerKey)
      .not('billing_key', 'is', null)
      .maybeSingle()
    if (applied) return { success: true }
    return { success: false, error: '결제 수단 변경 요청을 찾을 수 없습니다. 다시 시도해주세요.' }
  }

  // Toss API: 새 빌링키 발급
  const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ authKey, customerKey }),
  })

  const result = (await response.json()) as { billingKey?: unknown; code?: unknown; message?: unknown }
  const billingKey = typeof result.billingKey === 'string' ? result.billingKey : null

  if (!response.ok || !billingKey) {
    logger.error(new Error('[Subscription] 결제 수단 변경 — 빌링키 발급 실패'), {
      userId: user.id,
      subscriptionId: subscription.id,
      code: typeof result.code === 'string' ? result.code : null,
      message: typeof result.message === 'string' ? result.message : null,
    })
    // 대기 키만 비운다 — 기존 customer_key·billing_key 는 그대로다(옛 결제 수단으로 계속 청구된다).
    await adminDb
      .from('subscriptions')
      .update({ pending_customer_key: null })
      .eq('id', subscription.id)
      .eq('pending_customer_key', customerKey)
    return {
      success: false,
      error: typeof result.message === 'string' ? result.message : '빌링키 발급에 실패했습니다.',
    }
  }

  // 두 키는 «함께» 바뀐다 — 하나만 바뀐 상태가 이 결함의 정체였다.
  const patch: Record<string, string | null> = {
    billing_key: billingKey,
    customer_key: customerKey,
    pending_customer_key: null,
  }
  // 갱신 재시도 중이었다면 다음 확인을 지금으로 당긴다 — 카드를 고친 회원이 하루를 더 기다리지 않게.
  // 🔴 재시도 차수는 되돌리지 않는다. 갱신 주문번호가 차수를 쓰므로, 0 으로 되돌리면 이미 실패한
  //    주문번호를 다시 써서 토스가 거절한다.
  if ((subscription.retry_count ?? 0) > 0) {
    patch.next_billing_date = new Date().toISOString()
  }

  const { data: swapped, error: swapError } = await adminDb
    .from('subscriptions')
    .update(patch)
    .eq('id', subscription.id)
    .eq('user_id', user.id)
    // 대기 키가 아직 그대로일 때만 바꾼다 — 같은 복귀가 두 번 들어와도 한 번만 적용된다.
    .eq('pending_customer_key', customerKey)
    .select('id')
    .maybeSingle()

  if (swapError || !swapped) {
    logger.error(new Error('[Subscription] 결제 수단 변경 — 키 교체 실패'), {
      userId: user.id,
      subscriptionId: subscription.id,
      message: swapError?.message ?? '대기 중인 요청이 사라짐',
    })
    return { success: false, error: `결제 수단을 바꾸지 못했습니다. ${SUPPORT_ASK}` }
  }

  // 옛 빌링키는 새 키가 자리를 잡은 «뒤에» 지운다.
  // 🔴 순서를 뒤집지 말 것 — 삭제 통지(BILLING_KEY.DELETED)는 customerKey 로 구독을 찾아 해지한다.
  //    교체를 먼저 끝내면 그 통지가 찾는 옛 customerKey 를 가진 행이 남아 있지 않다.
  //    (통지 처리기도 지워진 빌링키를 «지금 쓰는» 구독만 해지하도록 함께 막아 두었다.)
  if (subscription.billing_key && subscription.billing_key !== billingKey) {
    await deleteTossBillingKey(subscription.billing_key, { userId: user.id, subscriptionId: subscription.id })
  }

  logger.log('[Subscription] 결제 수단 변경 완료:', subscription.id)
  return { success: true }
}

/** 더 쓰지 않는 빌링키를 토스에서 지운다. 실패해도 구독은 새 키로 이미 돌아간다 — 기록만 남긴다. */
async function deleteTossBillingKey(billingKey: string, context: Record<string, string>): Promise<void> {
  try {
    const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${basicAuth}` },
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { code?: unknown }
      logger.error(new Error('[Subscription] 옛 빌링키 삭제 실패'), {
        ...context,
        code: typeof body.code === 'string' ? body.code : String(response.status),
      })
    }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error('[Subscription] 옛 빌링키 삭제 예외'), context)
  }
}
