import { createClient } from "@/lib/supabase/server";
import type { UserRole, UserProfile } from "@/types/auth";

/**
 * Get the current user's role from the database
 * @returns The user's role or 'user' as default
 */
export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return 'user';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return (profile?.role as UserRole) || 'user';
}

/**
 * Get the current user's full profile including role
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile as UserProfile | null;
}

/**
 * Check if current user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * Check if current user is admin or tester (privileged)
 */
export async function isCurrentUserPrivileged(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin' || role === 'tester';
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' };
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentProfile?.role !== 'admin') {
    return { success: false, error: '권한이 없습니다.' };
  }

  // Prevent admin from demoting themselves
  if (targetUserId === user.id && newRole !== 'admin') {
    return { success: false, error: '자신의 관리자 권한은 변경할 수 없습니다.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add credits to a user (admin only, or tester adding to self)
 */
export async function addCredits(
  targetUserId: string,
  amount: number
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' };
  }

  // Check if current user is privileged
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = currentProfile?.role === 'admin';
  const isTester = currentProfile?.role === 'tester';

  // Testers can only add credits to themselves
  if (!isAdmin && !(isTester && targetUserId === user.id)) {
    return { success: false, error: '권한이 없습니다.' };
  }

  // Get current credits
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', targetUserId)
    .single();

  if (!targetProfile) {
    return { success: false, error: '대상 사용자를 찾을 수 없습니다.' };
  }

  const newBalance = (targetProfile.credits || 0) + amount;

  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', targetUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, newBalance };
}
