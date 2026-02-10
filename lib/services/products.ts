import { createClient } from "@/lib/supabase/server";
import type { PricePlan } from "@/types/auth";
import { logger } from "@/lib/utils/logger";

/**
 * Get all active price plans from the database
 * Server-side function with caching
 */
export async function getProducts(): Promise<PricePlan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("price_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    logger.error("[Products] Error fetching price plans:", error);
    // Return hardcoded fallback if DB fails
    return getDefaultPlans();
  }

  if (!data || data.length === 0) {
    return getDefaultPlans();
  }

  return data as PricePlan[];
}

/**
 * Get a single price plan by credits
 */
export async function getProductByCredits(
  credits: number
): Promise<PricePlan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("price_plans")
    .select("*")
    .eq("credits", credits)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    // Fallback to default
    const defaults = getDefaultPlans();
    return defaults.find((p) => p.credits === credits) || null;
  }

  return data as PricePlan;
}

/**
 * Fallback default plans (matches original hardcoded values)
 */
function getDefaultPlans(): PricePlan[] {
  return [
    {
      id: "default-1",
      name: "운명 분석 1회",
      credits: 1,
      price: 9900,
      is_active: true,
      description: "가장 기본적인 분석 패키지",
      badge_text: null,
      features: ["프리미엄 AI 리포트", "천지인 통합 분석", "영구 소장 가능"],
    },
    {
      id: "default-3",
      name: "운명 분석 3회",
      credits: 3,
      price: 24900,
      is_active: true,
      description: "인연들과 함께 나누는 실속형",
      badge_text: "가장 인기",
      features: [
        "1회당 8,300원 (16% 할인)",
        "프리미엄 AI 리포트",
        "가족/친구 분석 최적화",
        "영구 소장 가능",
      ],
    },
    {
      id: "default-5",
      name: "운명 분석 5회",
      credits: 5,
      price: 39900,
      is_active: true,
      description: "가장 합리적인 대용량 패키지",
      badge_text: "최저가",
      features: [
        "1회당 7,980원 (20% 할인)",
        "프리미엄 AI 리포트",
        "무제한 인연 분석",
        "영구 소장 가능",
        "분석 비록 우선 생성",
      ],
    },
  ];
}
