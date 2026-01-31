"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PricePlan } from "@/types/auth";
import { revalidatePath } from "next/cache";

export async function getAllPlans(): Promise<PricePlan[]> {
  const supabase = await createClient();

  // Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // TEMPORARY: Use admin client to bypass RLS
  const dbClient = createAdminClient();

  const { data, error } = await dbClient
    .from("price_plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) throw new Error(error.message);
  return data as PricePlan[];
}

export async function updatePlan(id: string, updates: Partial<PricePlan>) {
  const supabase = await createClient();

  // Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // TEMPORARY: Use admin client to bypass RLS
  const dbClient = createAdminClient();

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
