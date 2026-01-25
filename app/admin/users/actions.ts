"use server";

import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/auth";
import { revalidatePath } from "next/cache";

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at?: string;
}

import { createAdminClient } from "@/lib/supabase/admin";

export async function getUsers(page: number = 1, limit: number = 20, search: string = ""): Promise<{ data: AdminUser[], total: number }> {
  try {
    const supabase = await createClient();

    // 1. Check Caller Auth (Security)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: [], total: 0 };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { data: [], total: 0 };

    // 2. Use Admin Client for Data (Bypass RLS) if available
    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch (e) {
      console.warn("getUsers: Falling back to standard client (Service Role Key likely missing)");
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Try selecting with email first
    let query = dbClient
      .from("profiles")
      .select("id, full_name, role, created_at, email", { count: "exact" });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    let { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    // If 'email' column missing OR RLS error, retry without it
    if (error) {
      console.warn("getUsers: Fetch error (email/RLS), retrying simplified.", error);
      query = dbClient
        .from("profiles")
        .select("id, full_name, role, created_at", { count: "exact" });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%`);
      }

      const retryResult = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      data = retryResult.data;
      error = retryResult.error;
      count = retryResult.count;
    }

    if (error) {
      console.error("getUsers: Admin Query Error", error);
      return { data: [], total: 0 };
    }

    return {
      data: (data as AdminUser[]) || [],
      total: count || 0
    };

  } catch (e) {
    console.error("getUsers Critical Error:", e);
    return { data: [], total: 0 };
  }
}

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
  const supabase = await createClient();

  // Check Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (adminProfile?.role !== "admin") return { success: false, error: "Forbidden" };

  // Update
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    console.error("Error updating role:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}
