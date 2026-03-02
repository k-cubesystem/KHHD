'use server'

import { createClient } from '@/lib/supabase/server'
import { PricePlan, UserRole } from '@/types/auth'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'

// Helper to create Admin Client (Service Role)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Products] Missing Supabase Admin credentials. Admin features will be disabled.')
    return null
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll(cookiesToSet) {},
    },
  })
}

/**
 * 활성화된 모든 가격 정책(상품)을 가져옵니다.
 */
export async function getActivePlans(): Promise<PricePlan[]> {
  // Use Admin Client to avoid RLS recursion issues since plans are public
  const supabase = createAdminClient()

  // If admin client is not available, we can try using the anon client or return empty array
  // Assuming price_plans is public read, we can use createClient() if we had it imported,
  // but here let's just return empty array or try with anon key if critical.
  // Ideally price_plans should be public readable.
  if (!supabase) {
    // Fallback: try using standard client if possible, or just fail gracefully
    return []
  }

  const { data, error } = await supabase
    .from('price_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true })

  if (error) {
    console.error('[Products] Fetch error:', error)
    return []
  }

  return data as PricePlan[]
}

/**
 * 현재 로그인한 사용자의 권한(Role)을 가져옵니다.
 */
export async function getCurrentUserRole(): Promise<{ role: UserRole; userId: string | null }> {
  const supabase = await createClient() // User client for auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { role: 'user', userId: null }

  // Use Admin Client for profile fetch to safely bypass RLS recursion
  const adminSupabase = createAdminClient()

  // If admin credentials are missing, we can't bypass RLS.
  // We fall back to standard 'user' role which is safe default.
  if (!adminSupabase) {
    return { role: 'user', userId: user.id }
  }

  const { data: profile } = await adminSupabase.from('profiles').select('role').eq('id', user.id).single()

  return {
    role: (profile?.role as UserRole) || 'user',
    userId: user.id,
  }
}

/**
 * [테스터/관리자 전용] 무료로 크레딧을 추가합니다.
 * 결제 모듈을 거치지 않습니다.
 */
export async function addTestCredits(amount: number = 10) {
  const { role, userId } = await getCurrentUserRole()

  if (!userId) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  if (role !== 'admin' && role !== 'tester') {
    return { success: false, error: '권한이 없습니다. (Tester Only)' }
  }

  const supabase = await createClient()

  // 1. payments 테이블에 test 기록
  const { error: logError } = await supabase.from('payments').insert({
    user_id: userId,
    payment_key: `TEST_${Date.now()}`,
    order_id: `TEST_BOKCHAE_${Date.now()}`,
    amount: 0,
    credits_purchased: amount,
    credits_remaining: amount,
    status: 'test_charge',
    bokchae_type: 'test',
  })

  if (logError) {
    console.error('[TestCharge] Log failed:', logError)
    // 로그 실패해도 지갑 충전 계속 진행
  }

  // 2. wallets 테이블에 직접 복채 충전
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single()

  const currentBalance = wallet?.balance || 0

  const { error: walletError } = await supabase
    .from('wallets')
    .upsert({ user_id: userId, balance: currentBalance + amount })

  if (walletError) {
    console.error('[TestCharge] Wallet update failed:', walletError)
    return { success: false, error: '복채 충전 실패' }
  }

  // 3. 트랜잭션 로그
  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: amount,
    type: 'BONUS',
    description: `[테스트] 복채 ${amount}만냥 충전`,
  })

  revalidatePath('/protected')
  return { success: true, newBalance: currentBalance + amount }
}
