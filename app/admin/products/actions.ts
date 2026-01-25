"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PricePlan } from "@/types/auth";
import { revalidatePath } from "next/cache";

export async function getAllPlans(): Promise<PricePlan[]> {
  const supabase = await createClient();

  // Check Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  // Use Admin Client if available
  let dbClient = supabase;
  try {
    dbClient = createAdminClient();
  } catch (e) {
    console.warn("getAllPlans: Fallback to standard client");
  }

  const { data, error } = await dbClient
    .from("price_plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) throw new Error(error.message);
  return data as PricePlan[];
}

export async function updatePlan(id: string, updates: Partial<PricePlan>) {
  const supabase = await createClient();

  // Check Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { success: false, error: "Forbidden" };

  // Use Admin Client if available
  let dbClient = supabase;
  try {
    dbClient = createAdminClient();
  } catch (e) {
    console.warn("updatePlan: Fallback to standard client");
  }

  // Update
  const { error } = await dbClient
    .from("price_plans")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/protected"); // 사용자가 보는 화면도 갱신
  return { success: true };
}
