'use server'

import { requireAdmin } from '@/lib/admin/require-admin'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { PaymentStatusFilter } from './payment-display'

export interface AdminPayment {
  id: string
  user_id: string
  order_id: string
  /** 결제 총액(원). 취소가 있어도 줄지 않는 원래 청구액이다. */
  amount: number
  /** 누적 취소 금액(원). 부분 취소는 status 가 'completed' 로 남으므로 이 값이 유일한 단서다. */
  cancelled_amount: number
  cancelled_at: string | null
  credits_purchased: number
  status: string
  created_at: string
  profiles: {
    email: string | null
    full_name: string | null
  } | null
}

export async function getPayments(
  page: number = 1,
  limit: number = 20,
  statusFilter: PaymentStatusFilter = 'all'
): Promise<{ data: AdminPayment[]; total: number }> {
  // 🔴 조회 전용이라도 결제 내역은 개인정보다. `'use server'` export 는 공개 엔드포인트라
  //    어드민 화면 밖에서도 부를 수 있다. 아래 auth.getUser() 는 «로그인 여부»만 보므로
  //    일반 회원도 통과한다 — 관리자 검사를 앞에 세운다.
  const actor = await requireAdmin()
  if (!actor.authorized) return { data: [], total: 0 }

  const supabase = await createClient()

  try {
    // Check Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      logger.error('getPayments: No user found')
      return { data: [], total: 0 }
    }

    // TEMPORARY: Use admin client to bypass RLS
    const dbClient = createAdminClient()

    // 1. Fetch Payments (No Join)
    let query = dbClient
      .from('payments')
      .select('id, user_id, order_id, amount, cancelled_amount, cancelled_at, credits_purchased, status, created_at', {
        count: 'exact',
      })

    if (statusFilter === 'partial_cancel') {
      // 부분 취소 = 완료로 남아 있으면서 취소액이 붙은 결제. 상태값 하나로는 안 잡힌다.
      query = query.eq('status', 'completed').gt('cancelled_amount', 0)
    } else if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const {
      data: paymentsData,
      error: paymentsError,
      count,
    } = await query.order('created_at', { ascending: false }).range(from, to)

    if (paymentsError) {
      logger.error('getPayments: DB Error', paymentsError)
      throw new Error(paymentsError.message)
    }

    if (!paymentsData || paymentsData.length === 0) {
      return { data: [], total: 0 }
    }

    // 2. Manual Fetch Profiles
    const userIds = Array.from(new Set(paymentsData.map((p) => p.user_id).filter(Boolean)))

    interface PaymentProfile {
      id: string
      full_name: string | null
      email?: string | null
    }

    const profilesMap: Record<string, PaymentProfile> = {}

    if (userIds.length > 0) {
      // Try fetching with email
      const profilesQuery = dbClient.from('profiles').select('id, full_name, email').in('id', userIds)

      let { data: profiles, error: profilesError } = await profilesQuery

      // Retry without email if column missing OR if explicit permission denied (RLS) on email column?
      // Actually standard client might return error if selecting email is forbidden?
      // Let's being robust: if ANY error, try simpler query
      if (profilesError) {
        logger.warn(
          'getPayments: Profile fetch error (possibly email column or RLS), retrying simplified.',
          profilesError
        )
        const retryResult = await dbClient.from('profiles').select('id, full_name').in('id', userIds)
        // Map simplified result to include email as null
        profiles = retryResult.data?.map((p) => ({ ...p, email: null })) ?? null
        profilesError = retryResult.error
      }

      if (!profilesError && profiles) {
        for (const curr of profiles) {
          profilesMap[curr.id] = {
            id: curr.id,
            full_name: curr.full_name,
            email: ('email' in curr ? curr.email : null) as string | null,
          }
        }
      }
    }

    // 3. Merge — cancelled_amount 는 화면에서 금액 계산에 바로 쓰이므로 여기서 숫자로 못 박는다
    //    (컬럼 도입 전 행이나 null 이 넘어오면 toLocaleString 에서 터진다).
    const joinedData: AdminPayment[] = paymentsData.map((p) => {
      const profile = p.user_id ? profilesMap[p.user_id] : null
      return {
        ...p,
        cancelled_amount: typeof p.cancelled_amount === 'number' ? p.cancelled_amount : 0,
        cancelled_at: typeof p.cancelled_at === 'string' ? p.cancelled_at : null,
        profiles: profile
          ? {
              full_name: profile.full_name,
              email: profile.email || null,
            }
          : null,
      }
    })

    return {
      data: joinedData,
      total: count || 0,
    }
  } catch (e: unknown) {
    logger.error('getPayments Critical Error:', e)
    // Return empty instead of crashing 500
    return { data: [], total: 0 }
  }
}
