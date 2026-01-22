"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string | null;
  birth_date: string;
  birth_time: string | null;
  gender: string | null;
  calendar_type: string | null;
  created_at: string;
}

export async function getUserFamilyMembersAction(
  userId: string
): Promise<{ success: boolean; data?: FamilyMember[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "인증되지 않은 사용자입니다." };
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { success: false, error: "권한이 없습니다." };
  }

  const { data, error } = await supabase
    .from("family_members")
    .select("id, name, relationship, birth_date, birth_time, gender, calendar_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "인증되지 않은 사용자입니다." };
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { success: false, error: "권한이 없습니다." };
  }

  // Prevent admin from demoting themselves
  if (targetUserId === user.id && newRole !== "admin") {
    return { success: false, error: "자신의 관리자 권한은 변경할 수 없습니다." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function adjustUserCreditsAction(
  targetUserId: string,
  amount: number
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "인증되지 않은 사용자입니다." };
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    return { success: false, error: "권한이 없습니다." };
  }

  // Get target user's current credits
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", targetUserId)
    .single();

  if (!targetProfile) {
    return { success: false, error: "대상 사용자를 찾을 수 없습니다." };
  }

  const newBalance = Math.max(0, (targetProfile.credits || 0) + amount);

  const { error } = await supabase
    .from("profiles")
    .update({ credits: newBalance })
    .eq("id", targetUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, newBalance };
}
