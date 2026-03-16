import type { SupabaseClient } from '@supabase/supabase-js'

type UserRole = 'admin' | 'tester' | 'user' | null

/**
 * Get user role from profiles table.
 * Centralizes the repeated `.from('profiles').select('role').eq('id', userId).single()` pattern.
 * Returns null if profile not found.
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !profile) return null
  return (profile.role as UserRole) ?? 'user'
}
