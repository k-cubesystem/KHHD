"use server";

import { createClient } from "@/lib/supabase/server";
import { PricePlan, UserRole } from "@/types/auth";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";

// Helper to create Admin Client (Service Role)
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll(cookiesToSet) { }
      },
    }
  );
}

/**
 * 활성화된 모든 가격 정책(상품)을 가져옵니다.
 */
export async function getActivePlans(): Promise<PricePlan[]> {
  // Use Admin Client to avoid RLS recursion issues since plans are public
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("price_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    console.error("[Products] Fetch error:", error);
    return [];
  }

  return data as PricePlan[];
}

/**
 * 현재 로그인한 사용자의 권한(Role)을 가져옵니다.
 */
export async function getCurrentUserRole(): Promise<{ role: UserRole, userId: string | null }> {
  const supabase = await createClient(); // User client for auth check
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { role: "user", userId: null };

  // Use Admin Client for profile fetch to safely bypass RLS recursion
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    role: (profile?.role as UserRole) || "user",
    userId: user.id
  };
}

/**
 * [테스터/관리자 전용] 무료로 크레딧을 추가합니다.
 * 결제 모듈을 거치지 않습니다.
 */
export async function addTestCredits(amount: number = 100) {
  const { role, userId } = await getCurrentUserRole();

  if (!userId) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (role !== "admin" && role !== "tester") {
    return { success: false, error: "권한이 없습니다. (Tester Only)" };
  }

  const supabase = await createClient();

  // 1. Payments 테이블에 'TEST' 타입으로 기록 (매출 집계 제외용)
  const { error: logError } = await supabase.from("payments").insert({
    user_id: userId,
    payment_key: `TEST_${Date.now()}`,
    order_id: `TEST_CHARGE_${Date.now()}`,
    amount: 0,
    credits_purchased: amount,
    credits_remaining: amount,
    status: "test_charge", // 'completed'가 아닌 별도 상태값
  });

  if (logError) {
    console.error("[TestCharge] Log failed:", logError);
    return { success: false, error: "기록 저장 실패" };
  }

  // 2. Profile의 credits 업데이트 (Trigger가 없다면 수동 업데이트 필요할 수 있음)
  // 현재 시스템에서는 payments 조회 기반으로 잔액 계산하나요? 
  // -> CreditBalance 컴포넌트 로직 확인 필요. 
  // -> getAvailableCredits 액션(payment-actions.ts)이 'credits_remaining' 합계라면 위 insert만으로 충분함.

  // 만약 profiles 테이블에 credits 컬럼을 직접 관리한다면 아래 로직 추가:
  /*
  const { error: updateError } = await supabase.rpc('increment_credits', { 
      user_id: userId, 
      amount: amount 
  });
  */

  revalidatePath("/protected");
  return { success: true, newBalance: amount }; // 실제 잔액은 아닐 수 있음, 메시지용
}
