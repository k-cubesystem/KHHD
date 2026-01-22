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

export async function getUsers(page: number = 1, limit: number = 20, search: string = ""): Promise<{ data: AdminUser[], total: number }> {
  const supabase = await createClient();

  // Check Admin Role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: currentUserProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (currentUserProfile?.role !== "admin") throw new Error("Forbidden");

  // Supabase Auth Admin API를 사용할 수 없으므로(Service Role Key 부재 가능성), 
  // profiles 테이블 정보만 가져옵니다. 
  // *단, profiles에 email이 없다면 auth.users 정보와 조인이 불가능합니다(Client Lib 한계).*
  // *일단 profiles의 정보를 최대한 활용합니다.*

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, created_at, email", { count: "exact" });
  // 주의: profiles 테이블에 email 컬럼이 있다고 가정합니다. (대부분의 Supabase 템플릿이 그러함)
  // 만약 없다면 마이그레이션 필요.

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }

  return {
    data: data as AdminUser[],
    total: count || 0
  };
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
