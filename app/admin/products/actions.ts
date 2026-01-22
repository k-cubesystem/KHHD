"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { PricePlan } from "@/types/auth";

export async function updateProductAction(
  product: PricePlan
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

  const { error } = await supabase
    .from("price_plans")
    .update({
      name: product.name,
      price: product.price,
      credits: product.credits,
      description: product.description,
      badge_text: product.badge_text,
      is_active: product.is_active,
      features: product.features,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Cache revalidate
  revalidatePath("/admin/products");
  revalidatePath("/"); // 메인 페이지 가격 표시용

  return { success: true };
}
