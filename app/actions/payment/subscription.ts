'use server'
import { tossBillingSecretKey } from '@/lib/config/toss-keys'

import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { grantMembershipDeity } from '@/lib/services/membership-deity'
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

  const nowMs = Date.now()
  const livePaidSub = (existingSubs ?? []).find(
    (s) =>
      s.status === 'ACTIVE' &&
      !!s.billing_key &&
      (!s.current_period_end || new Date(s.current_period_end).getTime() > nowMs)
  )
  if (livePaidSub) {
    return { success: false, error: '이미 활성화된 구독이 있습니다.' }
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

  // Toss API: 빌링 결제
  const response = await fetch(`https://api.tosspayments.com/v1/billing/${subscription.billing_key}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey: subscription.customer_key,
      amount: plan.price,
      orderId,
      orderName: `${plan.name} 구독`,
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
      amount: plan.price,
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
    amount: plan.price,
    status: 'SUCCESS',
    billing_period_start: now.toISOString(),
    billing_period_end: periodEnd.toISOString(),
  })
  if (successLogError) {
    logger.error('[Subscription] Success-payment log insert error:', successLogError)
  }

  // 2. 구독 활성화
  const { data: updatedSub } = await adminDb
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .single()

  if (!subscription) {
    return { success: false, error: '활성화된 구독이 없습니다.' }
  }

  // 새 customerKey로 빌링키 재발급
  const newCustomerKey = `HHD_${user.id.slice(0, 8)}_${Date.now()}`

  // 임시로 새 customerKey 저장 — subscriptions 쓰기는 service_role 전용(S1b R1)
  const adminDb = createAdminClient()
  if (!adminDb) {
    return { success: false, error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }
  const { error: updateError } = await adminDb
    .from('subscriptions')
    .update({ customer_key: newCustomerKey })
    .eq('id', subscription.id)
    .eq('user_id', user.id)
  if (updateError) {
    logger.error('[Subscription] Change billing method error:', updateError)
    return { success: false, error: '결제 수단 변경에 실패했습니다.' }
  }

  return { success: true, customerKey: newCustomerKey }
}
