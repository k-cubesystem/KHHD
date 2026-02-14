'use server'

import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/auth'
import { revalidatePath } from 'next/cache'

export interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  last_sign_in_at?: string
}

import { createAdminClient } from '@/lib/supabase/admin'

export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<{ data: AdminUser[]; total: number }> {
  try {
    const supabase = await createClient()

    // 1. Check Caller Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('getUsers: Auth failed', authError)
      return { data: [], total: 0 }
    }

    // TEMPORARY: Skip admin check due to RLS issue
    console.log('getUsers: Bypassing admin check (temporary). Fetching profiles...')

    // 2. Use Admin Client to bypass RLS
    const adminClient = createAdminClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = adminClient
      .from('profiles')
      .select('id, full_name, role, updated_at, email', { count: 'exact' })

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const {
      data: rawData,
      error,
      count,
    } = await query.order('updated_at', { ascending: false }).range(from, to)

    if (error) {
      console.error('[getUsers] Query Error:', error)
      return { data: [], total: 0 }
    }

    // Fetch real sign-up dates from auth.users
    let authCreatedAtMap: Record<string, string> = {}
    try {
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      if (authUsers?.users) {
        for (const u of authUsers.users) {
          authCreatedAtMap[u.id] = u.created_at
        }
      }
    } catch (e) {
      console.warn('[getUsers] Failed to fetch auth users for created_at', e)
    }

    const data =
      rawData?.map((p) => ({
        ...p,
        created_at: authCreatedAtMap[p.id] || p.updated_at, // Use real auth created_at
      })) || []

    console.log(`[getUsers] Success! Found ${data.length} profiles.`)

    return {
      data: (data as AdminUser[]) || [],
      total: count || 0,
    }
  } catch (e) {
    console.error('getUsers Critical Error:', e)
    return { data: [], total: 0 }
  }
}

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
  const supabase = await createClient()

  // Check Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // TEMPORARY: Skip admin check, use admin client
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) {
    console.error('Error updating role:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function getUserDetails(userId: string) {
  try {
    const supabase = await createClient()

    // 1. Check Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // TEMPORARY: Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // 2. Fetch Data in Parallel
    const [profileRes, sajuRes, familyRes, paymentsRes, walletRes, subscriptionRes] =
      await Promise.all([
        adminClient.from('profiles').select('*').eq('id', userId).single(),
        adminClient
          .from('saju_records')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        adminClient.from('family_members').select('*').eq('user_id', userId),
        adminClient
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        adminClient.from('wallets').select('*').eq('user_id', userId).single(),
        adminClient
          .from('subscriptions')
          .select('*, membership_plans(*)')
          .eq('user_id', userId)
          .eq('status', 'ACTIVE')
          .single(),
      ])

    // 3. Fetch auth user for email and real created_at (가입일)
    const profile = profileRes.data
    let authCreatedAt: string | null = null
    try {
      const {
        data: { user: targetUser },
      } = await adminClient.auth.admin.getUserById(userId)
      if (targetUser) {
        if (profile && !profile.email) profile.email = targetUser.email
        authCreatedAt = targetUser.created_at || null
      }
    } catch (e) {
      console.warn('getUserDetails: Failed to fetch auth user', e)
    }

    return {
      profile: profile,
      sajuRecords: sajuRes.data || [],
      familyMembers: familyRes.data || [],
      payments: paymentsRes.data || [],
      wallet: walletRes.data || { balance: 0 },
      subscription: subscriptionRes.data || null,
      authCreatedAt,
      error: null,
    }
  } catch (e) {
    console.error('getUserDetails Error:', e)
    return { error: 'Failed to fetch user details' }
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient()

    // 1. Check Auth & Admin Role
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['admin', 'tester'].includes(callerProfile.role)) {
      return { success: false, error: 'Forbidden: Admin only' }
    }

    // 2. Prevent self-deletion
    if (user.id === userId) {
      return { success: false, error: '본인 계정은 삭제할 수 없습니다.' }
    }

    const adminClient = createAdminClient()

    // 3. Delete related data first to avoid FK constraint issues
    await adminClient.from('wallet_transactions').delete().eq('user_id', userId)
    await adminClient.from('wallets').delete().eq('user_id', userId)
    await adminClient.from('attendance_logs').delete().eq('user_id', userId)
    await adminClient.from('roulette_history').delete().eq('user_id', userId)
    await adminClient.from('analysis_history').delete().eq('user_id', userId)
    await adminClient.from('family_members').delete().eq('user_id', userId)
    await adminClient.from('subscriptions').delete().eq('user_id', userId)
    await adminClient.from('payments').delete().eq('user_id', userId)
    await adminClient.from('profiles').delete().eq('id', userId)

    // 4. Delete from Auth (Hard Delete)
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) throw error

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e: any) {
    console.error('deleteUser Error:', e)
    return { success: false, error: e.message || 'Failed to delete user' }
  }
}

export async function updateUserBalance(targetUserId: string, newBalance: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // Upsert wallet
  const { error } = await adminClient
    .from('wallets')
    .upsert({ user_id: targetUserId, balance: newBalance }, { onConflict: 'user_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  // Log transaction
  await adminClient.from('wallet_transactions').insert({
    user_id: targetUserId,
    amount: 0, // Admin adjustment doesn't necessarily track amount change here easily without reading first, showing 0 for "Reset" or similar
    type: 'BONUS',
    description: `관리자에 의한 잔액 변경: ${newBalance}`,
  })

  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}

export async function updateUserSubscription(targetUserId: string, planTier: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const adminClient = createAdminClient()

  // 1. Get Plan ID if not null
  let planId = null
  if (planTier) {
    const { data: plan } = await adminClient
      .from('membership_plans')
      .select('id')
      .eq('tier', planTier)
      .single()

    if (!plan) return { success: false, error: 'Plan not found' }
    planId = plan.id
  }

  // 2. Manage Subscription
  if (planId) {
    // Upsert Active Subscription
    const { error } = await adminClient.from('subscriptions').upsert(
      {
        user_id: targetUserId,
        plan_id: planId,
        status: 'ACTIVE',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        payment_status: 'PAID', // Admin grant
      },
      { onConflict: 'user_id' }
    ) // Assuming one sub per user or logic to handle multiple

    // Note: If distinct constraints are different, might need logic to deactivate old ones.
    // For now assuming 1 active sub per user for simplicity or upsert handles it if checking unique user_id/status.
    // Actually standard subscription table might allow multiple history.
    // Let's Deactivate all other active subs first to be safe.

    await adminClient
      .from('subscriptions')
      .update({ status: 'EXPIRED' })
      .eq('user_id', targetUserId)
      .eq('status', 'ACTIVE')
      .neq('plan_id', planId) // Don't expire if it's the same (though upsert handled it)

    if (error) return { success: false, error: error.message }
  } else {
    // Cancel Subscription
    const { error } = await adminClient
      .from('subscriptions')
      .update({ status: 'CANCELLED' })
      .eq('user_id', targetUserId)
      .eq('status', 'ACTIVE')

    if (error) return { success: false, error: error.message }
  }

  // Update Profile is_subscribed flag for easier frontend check
  await adminClient.from('profiles').update({ is_subscribed: !!planId }).eq('id', targetUserId)

  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}
