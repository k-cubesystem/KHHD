"use server";

import { createClient } from "@/lib/supabase/server";

// Types
export interface MonthlyFortune {
  totalPossible: number;
  currentFortune: number;
  percentage: number;
  completedCategories: string[];
}

export interface YearlyFortuneMonth {
  month: number;
  fortune: number;
  memberCount: number;
}

export interface FamilyMemberFortune {
  memberId: string;
  memberName: string;
  relationship: string;
  fortune: number;
  missionsCompleted: number;
}

/**
 * 이번 달 가족 전체 운세 조회 (월운)
 * Get current month's family fortune
 */
export async function getMonthlyFamilyFortune(): Promise<MonthlyFortune> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    // Get all family members count
    const { data: members } = await supabase
      .from("family_members")
      .select("id")
      .eq("user_id", user.id);

    if (!members || members.length === 0) {
      return {
        totalPossible: 800,
        currentFortune: 0,
        percentage: 0,
        completedCategories: [],
      };
    }

    // Get fortune entries for this month
    const { data: fortuneData } = await supabase
      .from("fortune_journal")
      .select("fortune_points, category")
      .eq("user_id", user.id)
      .eq("year", year)
      .eq("month", month);

    const currentFortune = fortuneData?.reduce((sum, f) => sum + (f.fortune_points || 0), 0) || 0;
    const completedCategories = [...new Set(fortuneData?.map(f => f.category) || [])];
    const totalPossible = members.length * 800; // 8 missions × 100 points per member

    return {
      totalPossible,
      currentFortune,
      percentage: Math.round((currentFortune / totalPossible) * 100 * 10) / 10,
      completedCategories,
    };
  } catch (error) {
    console.error("Error fetching monthly fortune:", error);
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    };
  }
}

/**
 * 년운 추세 조회 (12개월)
 * Get yearly fortune trend
 */
export async function getYearlyFortuneTrend(year?: number): Promise<YearlyFortuneMonth[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const targetYear = year || new Date().getFullYear();

  try {
    const { data, error } = await supabase.rpc("calculate_yearly_fortune", {
      user_id_param: user.id,
      year_param: targetYear,
    });

    if (error) {
      // If RPC function doesn't exist, use fallback
      if (error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
        console.log("RPC function not found, using fallback implementation for yearly trend");
        return getYearlyFortuneTrendFallback(user.id, targetYear);
      }
      console.error("Error fetching yearly fortune:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getYearlyFortuneTrend:", error);
    return [];
  }
}

/**
 * Fallback implementation for yearly fortune trend
 */
async function getYearlyFortuneTrendFallback(
  userId: string,
  year: number
): Promise<YearlyFortuneMonth[]> {
  const supabase = await createClient();

  try {
    const results: YearlyFortuneMonth[] = [];

    // Generate data for all 12 months
    for (let month = 1; month <= 12; month++) {
      const { data: fortuneData } = await supabase
        .from("fortune_journal")
        .select("fortune_points")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month);

      const totalFortune = fortuneData?.reduce((sum, f) => sum + (f.fortune_points || 0), 0) || 0;

      // Get family members count for this calculation
      const { data: members } = await supabase
        .from("family_members")
        .select("id")
        .eq("user_id", userId);

      results.push({
        month,
        fortune: totalFortune,
        memberCount: members?.length || 0,
      });
    }

    return results;
  } catch (error) {
    console.error("Error in yearly trend fallback:", error);
    return [];
  }
}


/**
 * 가족 구성원별 운세 현황 조회
 * Get family fortune breakdown
 */
export async function getFamilyFortuneBreakdown(): Promise<FamilyMemberFortune[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc("calculate_family_fortune", {
      user_id_param: user.id,
      year_param: year,
      month_param: month,
    });

    if (error) {
      // If RPC function doesn't exist, use fallback
      if (error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
        console.log("RPC function not found, using fallback implementation");
        return getFamilyFortuneBreakdownFallback(user.id, year, month);
      }
      console.error("Error fetching family fortune:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getFamilyFortuneBreakdown:", error);
    return [];
  }
}

/**
 * Fallback implementation for family fortune breakdown
 */
async function getFamilyFortuneBreakdownFallback(
  userId: string,
  year: number,
  month: number
): Promise<FamilyMemberFortune[]> {
  const supabase = await createClient();

  try {
    // Get all family members
    const { data: members } = await supabase
      .from("family_members")
      .select("id, name, relationship")
      .eq("user_id", userId);

    if (!members || members.length === 0) return [];

    // Get fortune data for each member
    const results: FamilyMemberFortune[] = [];

    for (const member of members) {
      const { data: fortuneData } = await supabase
        .from("fortune_journal")
        .select("fortune_points, category")
        .eq("family_member_id", member.id)
        .eq("year", year)
        .eq("month", month);

      const totalFortune = fortuneData?.reduce((sum, f) => sum + (f.fortune_points || 0), 0) || 0;
      const missionsCompleted = fortuneData?.length || 0;

      results.push({
        memberId: member.id,
        memberName: member.name,
        relationship: member.relationship || "가족",
        fortune: totalFortune,
        missionsCompleted,
      });
    }

    return results;
  } catch (error) {
    console.error("Error in fallback implementation:", error);
    return [];
  }
}


/**
 * 운세 기록하기 (분석 완료 시 호출)
 * Record fortune entry when analysis completes
 */
export async function recordFortuneEntry(
  familyMemberId: string,
  category: string,
  analysisId: string,
  fortunePoints: number = 100
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    // Upsert: Only one entry per category per member per month
    const { error } = await supabase.from("fortune_journal").upsert(
      {
        user_id: user.id,
        family_member_id: familyMemberId,
        year,
        month,
        category,
        analysis_id: analysisId,
        fortune_points: fortunePoints,
      },
      {
        onConflict: "family_member_id,year,month,category",
      }
    );

    if (error) {
      console.error("Error recording fortune:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in recordFortuneEntry:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, error: message };
  }
}

/**
 * 특정 구성원의 이번 달 운세 조회
 * Get specific member's monthly fortune
 */
export async function getMemberMonthlyFortune(
  memberId: string
): Promise<MonthlyFortune> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const { data, error } = await supabase.rpc("calculate_monthly_fortune", {
      member_id_param: memberId,
      year_param: year,
      month_param: month,
    });

    if (error || !data || data.length === 0) {
      return {
        totalPossible: 800,
        currentFortune: 0,
        percentage: 0,
        completedCategories: [],
      };
    }

    const result = data[0];
    return {
      totalPossible: result.total_possible || 800,
      currentFortune: result.current_fortune || 0,
      percentage: result.percentage || 0,
      completedCategories: result.completed_categories || [],
    };
  } catch (error) {
    console.error("Error fetching member fortune:", error);
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    };
  }
}
