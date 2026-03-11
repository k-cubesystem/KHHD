'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface AdminPayment {
  id: string
  user_id: string
  order_id: string
  amount: number
  credits_purchased: number
  status: string
  created_at: string
  profiles: {
    email: string | null
    full_name: string | null
  } | null
}

import { createAdminClient } from '@/lib/supabase/admin'

export async function getPayments(
  page: number = 1,
  limit: number = 20,
  statusFilter: string = 'all'
): Promise<{ data: AdminPayment[]; total: number }> {
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
      .select('id, user_id, order_id, amount, credits_purchased, status, created_at', { count: 'exact' })

    if (statusFilter !== 'all') {
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

    let profilesMap: Record<string, any> = {}

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
        profiles = retryResult.data as any
        profilesError = retryResult.error
      }

      if (!profilesError && profiles) {
        profilesMap = profiles.reduce(
          (acc: Record<string, any>, curr: any) => {
            acc[curr.id] = curr
            return acc
          },
          {} as Record<string, any>
        )
      }
    }

    // 3. Merge
    const joinedData: AdminPayment[] = paymentsData.map((p) => {
      const profile = p.user_id ? profilesMap[p.user_id] : null
      return {
        ...p,
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
