'use server'

import { createClient } from '@/lib/supabase/server'
import { addTalismans } from './wallet-actions'
import { createServerClient } from '@supabase/ssr'

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_z6OdyEPWpUpnLp90z608nM7XyVNb'
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
  talismans_per_period: number
  daily_talisman_limit: number
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
    bonus_rate?: number
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
  talismans_granted: number
  created_at: string
}

// Helper to create Admin Client
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[Subscription] Missing Supabase Admin credentials')
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
      console.error('[Subscription] Get plans error:', error.message)
      return []
    }

    return data || []
  } catch (e) {
    console.error('[Subscription] getMembershipPlans exception:', e)
    return []
  }
}

export async function getMembershipPlan(planId: string): Promise<MembershipPlan | null> {
  try {
    const supabase = createAdminClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (error) {
      console.error('[Subscription] Get plan error:', error)
      return null
    }

    return data
  } catch (e) {
    console.error('[Subscription] getMembershipPlan exception:', e)
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
    console.error('[Subscription] getSubscriptionStatus exception:', e)
    return { isSubscribed: false, subscription: null, plan: null }
  }
}

// ============================================
// 빌링키 발급 URL 생성
// ============================================
export async function createBillingAuthUrl(planId: string): Promise<{
  success: boolean
  authUrl?: string
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

  // 플랜 확인
  const plan = await getMembershipPlan(planId)
  if (!plan) {
    return { success: false, error: '유효하지 않은 멤버십 플랜입니다.' }
  }

  // 기존 구독 확인
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['ACTIVE', 'PENDING'])
    .single()

  if (existingSub?.status === 'ACTIVE') {
    return { success: false, error: '이미 활성화된 구독이 있습니다.' }
  }

  // customerKey 생성 (사용자별 고유)
  const customerKey = `HHD_${user.id.slice(0, 8)}_${Date.now()}`

  // PENDING 상태로 구독 레코드 생성 또는 업데이트
  if (existingSub) {
    await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        customer_key: customerKey,
        status: 'PENDING',
      })
      .eq('id', existingSub.id)
  } else {
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      plan_id: planId,
      customer_key: customerKey,
      status: 'PENDING',
    })
  }

  // Toss Payments 빌링키 발급 URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const successUrl = `${baseUrl}/protected/membership/success?customerKey=${customerKey}&planId=${planId}`
  const failUrl = `${baseUrl}/protected/membership/fail`

  // 빌링키 인증 창 URL 생성
  const clientKey =
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_z6OdyEPWpUpnLp90z608nM7XyVNb'

  const authUrl =
    `https://api.tosspayments.com/v1/billing/authorizations/widget?` +
    `clientKey=${clientKey}` +
    `&customerKey=${customerKey}` +
    `&successUrl=${encodeURIComponent(successUrl)}` +
    `&failUrl=${encodeURIComponent(failUrl)}`

  return {
    success: true,
    authUrl,
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
    console.error('[Subscription] Issue billing key error:', result)
    return {
      success: false,
      error: result.message || '빌링키 발급에 실패했습니다.',
    }
  }

  const billingKey = result.billingKey

  // 구독 레코드 업데이트
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      billing_key: billingKey,
    })
    .eq('customer_key', customerKey)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('[Subscription] Update billing key error:', updateError)
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

  const plan = subscription.plan as MembershipPlan
  const orderId = `SUB_${user.id.slice(0, 8)}_${Date.now()}`

  // Toss API: 빌링 결제
  const response = await fetch(
    `https://api.tosspayments.com/v1/billing/${subscription.billing_key}`,
    {
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
    }
  )

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
    console.error('[Subscription] First payment error:', result)

    // 결제 실패 기록
    await supabase.from('subscription_payments').insert({
      subscription_id: subscription.id,
      user_id: user.id,
      order_id: orderId,
      amount: plan.price,
      status: 'FAILED',
      failure_code: result.code,
      failure_reason: result.message,
    })

    // 구독 상태 업데이트
    await supabase
      .from('subscriptions')
      .update({ status: 'PAYMENT_FAILED' })
      .eq('id', subscription.id)

    return {
      success: false,
      error: result.message || '첫 결제에 실패했습니다.',
    }
  }

  // 결제 성공 처리
  // 1. 결제 기록
  await supabase.from('subscription_payments').insert({
    subscription_id: subscription.id,
    user_id: user.id,
    payment_key: result.paymentKey,
    order_id: orderId,
    amount: plan.price,
    status: 'SUCCESS',
    billing_period_start: now.toISOString(),
    billing_period_end: periodEnd.toISOString(),
    talismans_granted: plan.talismans_per_period,
  })

  // 2. 구독 활성화
  const { data: updatedSub } = await supabase
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

  // 3. 부적 지급
  await addTalismans(
    plan.talismans_per_period,
    'SUBSCRIPTION',
    `${plan.name} 구독 - 부적 ${plan.talismans_per_period}장 지급`
  )

  console.log('[Subscription] First payment success:', orderId)

  return {
    success: true,
    subscription: updatedSub as Subscription,
  }
}

// ============================================
// 자동 결제 처리 (크론잡용)
// ============================================
export async function processRecurringPayments(): Promise<{
  processed: number
  success: number
  failed: number
  errors: string[]
}> {
  const supabase = await createClient()

  // 오늘 결제 대상 구독 조회
  const now = new Date()
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(`*, plan:membership_plans(*)`)
    .eq('status', 'ACTIVE')
    .lte('next_billing_date', now.toISOString())

  if (error || !subscriptions) {
    return { processed: 0, success: 0, failed: 0, errors: [error?.message || '조회 실패'] }
  }

  const results = {
    processed: subscriptions.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const subscription of subscriptions) {
    const plan = subscription.plan as MembershipPlan
    const orderId = `SUB_${subscription.user_id.slice(0, 8)}_${Date.now()}`

    try {
      // 빌링 결제
      const response = await fetch(
        `https://api.tosspayments.com/v1/billing/${subscription.billing_key}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerKey: subscription.customer_key,
            amount: plan.price,
            orderId,
            orderName: `${plan.name} 구독 갱신`,
          }),
        }
      )

      const result = await response.json()

      // 기간 계산
      const periodStart = new Date(subscription.current_period_end)
      const periodEnd = new Date(periodStart)
      if (plan.interval === 'MONTH') {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }

      if (!response.ok) {
        // 결제 실패
        const retryCount = (subscription.retry_count || 0) + 1

        await supabase.from('subscription_payments').insert({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          order_id: orderId,
          amount: plan.price,
          status: 'FAILED',
          failure_code: result.code,
          failure_reason: result.message,
        })

        // 3회 실패 시 일시정지
        if (retryCount >= 3) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'PAYMENT_FAILED',
              retry_count: retryCount,
            })
            .eq('id', subscription.id)
        } else {
          // 다음날 재시도
          const nextRetry = new Date()
          nextRetry.setDate(nextRetry.getDate() + 1)

          await supabase
            .from('subscriptions')
            .update({
              retry_count: retryCount,
              next_billing_date: nextRetry.toISOString(),
            })
            .eq('id', subscription.id)
        }

        results.failed++
        results.errors.push(`${subscription.user_id}: ${result.message}`)
        continue
      }

      // 결제 성공
      await supabase.from('subscription_payments').insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        payment_key: result.paymentKey,
        order_id: orderId,
        amount: plan.price,
        status: 'SUCCESS',
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        talismans_granted: plan.talismans_per_period,
      })

      // 구독 기간 연장
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          last_payment_date: now.toISOString(),
          retry_count: 0,
        })
        .eq('id', subscription.id)

      // 부적 지급 (Service Role 필요 - 크론잡에서 호출)
      await supabase.rpc('add_talismans_by_user', {
        p_user_id: subscription.user_id,
        p_amount: plan.talismans_per_period,
        p_type: 'SUBSCRIPTION',
        p_description: `${plan.name} 구독 갱신 - 부적 ${plan.talismans_per_period}장 지급`,
      })

      results.success++
    } catch (err) {
      results.failed++
      results.errors.push(
        `${subscription.user_id}: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  return results
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
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || '사용자 요청',
    })
    .eq('id', subscription.id)

  if (updateError) {
    console.error('[Subscription] Cancel error:', updateError)
    return { success: false, error: '구독 해지에 실패했습니다.' }
  }

  console.log('[Subscription] Cancelled:', subscription.id)

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
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'ACTIVE',
        cancelled_at: null,
        cancel_reason: null,
      })
      .eq('id', subscription.id)

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
        console.warn(
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
  authUrl?: string
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const successUrl = `${baseUrl}/protected/membership/manage?changed=true&customerKey=${newCustomerKey}`
  const failUrl = `${baseUrl}/protected/membership/manage?changed=false`

  const clientKey =
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_z6OdyEPWpUpnLp90z608nM7XyVNb'

  const authUrl =
    `https://api.tosspayments.com/v1/billing/authorizations/widget?` +
    `clientKey=${clientKey}` +
    `&customerKey=${newCustomerKey}` +
    `&successUrl=${encodeURIComponent(successUrl)}` +
    `&failUrl=${encodeURIComponent(failUrl)}`

  // 임시로 새 customerKey 저장
  await supabase
    .from('subscriptions')
    .update({ customer_key: newCustomerKey })
    .eq('id', subscription.id)

  return { success: true, authUrl }
}
