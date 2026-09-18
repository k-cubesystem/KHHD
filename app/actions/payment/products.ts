'use server'

import { createClient } from '@/lib/supabase/server'
import { PricePlan, UserRole } from '@/types/auth'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/utils/logger'

// Helper to create Admin Client (Service Role)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.warn('[Products] Missing Supabase Admin credentials. Admin features will be disabled.')
    return null
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll(_cookiesToSet) {},
    },
  })
}

/**
 * 판매 중인 이용권 팩. 옛 복채 팩(product_kind='bokchae')은 판매 종료라 읽지 않는다.
 */
export async function getActivePlans(): Promise<PricePlan[]> {
  // Use Admin Client to avoid RLS recursion issues since plans are public
  const supabase = createAdminClient()

  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('price_plans')
    .select('*')
    .eq('product_kind', 'pass')
    .eq('is_active', true)
    .order('price', { ascending: true })

  if (error) {
    logger.error('[Products] Fetch error:', error)
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
