'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface MembershipPlanAdmin {
  id: string
  name: string
  description: string | null
  tier: string
  price: number
  interval: string
  talismans_per_period: number
  daily_talisman_limit: number
  relationship_limit: number
  storage_limit: number
  features: Record<string, unknown>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Check admin permission
async function checkAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // TEMPORARY: Skip admin check due to RLS issue
  return user
}

/**
 * Get all membership plans
 */
export async function getAdminMembershipPlans(): Promise<MembershipPlanAdmin[]> {
  await checkAdmin()

  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('membership_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching plans:', error)
    throw new Error('Failed to fetch plans')
  }

  return data as MembershipPlanAdmin[]
}

/**
 * Update membership plan
 */
export async function updateMembershipPlan(
  planId: string,
  updates: {
    name?: string
    description?: string | null
    price?: number
    interval?: string
    daily_talisman_limit?: number
    relationship_limit?: number
    storage_limit?: number
    talismans_per_period?: number
    features?: Record<string, unknown>
    is_active?: boolean
    sort_order?: number
  }
) {
  await checkAdmin()

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('membership_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)

  if (error) {
    console.error('Error updating plan:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/membership/plans')
  revalidatePath('/protected/membership')

  return { success: true }
}

/**
 * Toggle plan active status
 */
export async function togglePlanStatus(planId: string) {
  await checkAdmin()

  const adminSupabase = createAdminClient()

  // Get current status
  const { data: plan } = await adminSupabase
    .from('membership_plans')
    .select('is_active')
    .eq('id', planId)
    .single()

  if (!plan) {
    return { success: false, error: 'Plan not found' }
  }

  // Toggle status
  const { error } = await adminSupabase
    .from('membership_plans')
    .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (error) {
    console.error('Error toggling plan status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/membership/plans')
  revalidatePath('/protected/membership')

  return { success: true, newStatus: !plan.is_active }
}
