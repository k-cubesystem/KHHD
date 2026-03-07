import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabase-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { supabase, userId } = auth
  const admin = createSupabaseAdmin()

  // ─── wallet ─────────────────────────────────────────────────
  if (action === 'getWalletBalance') {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return errorResponse(error.message)
    return successResponse({ balance: data?.balance ?? 0 })
  }

  if (action === 'deductTalisman') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
    const balance = wallet?.balance ?? 0
    if (balance < (body.amount ?? 1)) return errorResponse('복채가 부족합니다.')

    const { error } = await supabase
      .from('wallets')
      .update({ balance: balance - (body.amount ?? 1) })
      .eq('user_id', userId)
    if (error) return errorResponse(error.message)

    await admin.from('wallet_transactions').insert({
      user_id: userId,
      amount: -(body.amount ?? 1),
      type: 'deduct',
      description: body.description ?? '분석 사용',
    })
    return successResponse({ balance: balance - (body.amount ?? 1) })
  }

  if (action === 'addTalismans') {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle()
    const balance = wallet?.balance ?? 0
    const newBalance = balance + (body.amount ?? 0)

    const { error } = await supabase
      .from('wallets')
      .upsert({ user_id: userId, balance: newBalance }, { onConflict: 'user_id' })
    if (error) return errorResponse(error.message)

    await admin.from('wallet_transactions').insert({
      user_id: userId,
      amount: body.amount ?? 0,
      type: 'add',
      description: body.description ?? '충전',
    })
    return successResponse({ balance: newBalance })
  }

  if (action === 'getWalletTransactions') {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(body.limit ?? 20)
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  // ─── subscription ──────────────────────────────────────────
  if (action === 'getMembershipPlans') {
    const { data, error } = await admin
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'getSubscriptionStatus') {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, membership_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  if (action === 'cancelSubscription') {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active')
    if (error) return errorResponse(error.message)
    return successResponse()
  }

  // ─── attendance ─────────────────────────────────────────────
  if (action === 'checkAttendanceAvailability') {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', userId)
      .eq('check_date', today)
      .maybeSingle()
    return successResponse({ available: !data })
  }

  if (action === 'checkInAttendance') {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('attendance')
      .insert({ user_id: userId, check_date: today })
    if (error) {
      if (error.code === '23505') return errorResponse('이미 출석체크를 완료했습니다.')
      return errorResponse(error.message)
    }
    return successResponse()
  }

  if (action === 'getWeeklyAttendance' || action === 'getMonthlyAttendance') {
    const now = new Date()
    let startDate: string
    if (action === 'getWeeklyAttendance') {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      startDate = weekStart.toISOString().slice(0, 10)
    } else {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    }
    const { data, error } = await supabase
      .from('attendance')
      .select('check_date')
      .eq('user_id', userId)
      .gte('check_date', startDate)
      .order('check_date', { ascending: true })
    if (error) return errorResponse(error.message)
    return successResponse({ data })
  }

  // ─── roulette ───────────────────────────────────────────────
  if (action === 'checkRouletteAvailability') {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('roulette_history')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', today)
      .maybeSingle()
    return successResponse({ available: !data })
  }

  if (action === 'confirmPayment') {
    // Forward to Toss confirm API
    const tossSecretKey = Deno.env.get('TOSS_SECRET_KEY')
    if (!tossSecretKey) return errorResponse('결제 설정이 되어 있지 않습니다.')

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(tossSecretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      }),
    })
    const result = await response.json()
    if (!response.ok) return errorResponse(result.message ?? '결제 확인 실패')
    return successResponse({ payment: result })
  }

  return errorResponse('Unknown action: ' + action)
})
