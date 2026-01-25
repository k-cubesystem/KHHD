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

    // 1. Check Caller Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("getUsers: Auth failed", authError);
      return { data: [], total: 0 };
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      console.error("getUsers: Not an admin", profile);
      return { data: [], total: 0 };
    }

    console.log("getUsers: Admin check passed. Fetching profiles...");

    // 2. Direct Query to Profiles (Relies on RLS 'Admins can view all profiles')
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("profiles")
      .select("id, full_name, role, updated_at, email", { count: "exact" });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: rawData, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    const data = rawData?.map(p => ({
      ...p,
      created_at: p.updated_at // Map updated_at to created_at for frontend compatibility
    }));

    if (error) {
      console.warn("[getUsers] Primary query failed. Retrying without 'email' column...", error.message);

      // Fallback: Query WITHOUT email column
      const { data: fallbackData, error: fallbackError, count: fallbackCount } = await supabase
        .from("profiles")
        .select("id, full_name, role, updated_at", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (fallbackError) {
        console.error("[getUsers] Fallback Query Error:", fallbackError);
        return { data: [], total: 0 };
      }

      console.log("[getUsers] Fallback success. Profiles found:", fallbackData?.length);

      // Return data with null email
      const resultData = fallbackData?.map(p => ({
        ...p,
        email: null,
        created_at: p.updated_at
      })) || [];

      return {
        data: resultData as AdminUser[],
        total: fallbackCount || 0
      };
    }

    if (!data || data.length === 0) {
      console.warn("[getUsers] No profiles found. Count:", count);
      console.warn("[getUsers] RLS might be blocking access despite admin role.");
      // Try a safe query to debug
      const { count: safeCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
      console.warn("[getUsers] Safe Query Count (Head):", safeCount);
    } else {
      console.log(`[getUsers] Success! Found ${data.length} profiles.`);
      console.log(`[getUsers] Sample Profile:`, data[0]);
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

export async function getUserDetails(userId: string) {
  try {
    const supabase = await createClient();

    // 1. Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (adminProfile?.role !== "admin") return { error: "Forbidden" };

    // 2. Fetch Data in Parallel
    const [profileRes, sajuRes, familyRes, paymentsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("saju_records").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("family_members").select("*").eq("user_id", userId),
      supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false })
    ]);

    // 3. Fallback for Profile Email (if missing)
    let profile = profileRes.data;
    if (profile && !profile.email) {
      // Try to fetch email via admin client if available
      try {
        const adminClient = createAdminClient();
        const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(userId);
        if (targetUser) {
          profile.email = targetUser.email;
        }
      } catch (e) {
        console.warn("getUserDetails: Failed to fetch email via admin client", e);
      }
    }

    return {
      profile: profile,
      sajuRecords: sajuRes.data || [],
      familyMembers: familyRes.data || [],
      payments: paymentsRes.data || [],
      error: null
    };

  } catch (e) {
    console.error("getUserDetails Error:", e);
    return { error: "Failed to fetch user details" };
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = await createClient();

    // 1. Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (adminProfile?.role !== "admin") return { success: false, error: "Forbidden" };

    // 2. Delete from Auth (Hard Delete) - Requires Admin Client
    // This will trigger CASCADE delete for profile and related data
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) throw error;

    revalidatePath("/admin/users");
    return { success: true };

  } catch (e: any) {
    console.error("deleteUser Error:", e);
    return { success: false, error: e.message || "Failed to delete user" };
  }
}
