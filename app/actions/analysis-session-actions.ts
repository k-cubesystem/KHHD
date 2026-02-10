"use server";

import { createClient } from "@/lib/supabase/server";

export type AnalysisCategory =
    | "SAJU"
    | "FACE"
    | "HAND"
    | "FENGSHUI"
    | "COMPATIBILITY"
    | "TODAY"
    | "WEALTH"
    | "NEW_YEAR";

export interface AnalysisSession {
    id: string;
    user_id: string;
    target_member_id: string | null;
    category: AnalysisCategory;
    input_data: Record<string, unknown>;
    result_data: Record<string, unknown>;
    credits_used: number;
    shared: boolean;
    share_card_url: string | null;
    created_at: string;
    updated_at: string;
}

interface SaveSessionParams {
    targetMemberId: string | null; // null = guest (not saved to DB)
    category: AnalysisCategory;
    inputData: Record<string, unknown>;
    resultData: Record<string, unknown>;
    creditsUsed: number;
}

/**
 * Save analysis session to database (family members only)
 * Guest analyses are not saved to DB
 */
export async function saveAnalysisSession(
    params: SaveSessionParams
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const { targetMemberId, category, inputData, resultData, creditsUsed } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "인증되지 않은 사용자입니다." };
    }

    // Skip DB save for guests (return success without session ID)
    if (!targetMemberId) {
        console.log("[Studio] Guest analysis - skipping DB save");
        return { success: true, sessionId: "guest" };
    }

    try {
        const { data, error } = await supabase
            .from("analysis_sessions")
            .insert({
                user_id: user.id,
                target_member_id: targetMemberId,
                category,
                input_data: inputData,
                result_data: resultData,
                credits_used: creditsUsed,
            })
            .select("id")
            .single();

        if (error) {
            console.error("[Studio] Save session error:", error);
            return { success: false, error: "분석 결과 저장 중 오류가 발생했습니다." };
        }

        return { success: true, sessionId: data.id };
    } catch (err) {
        console.error("[Studio] Unexpected error saving session:", err);
        return { success: false, error: "분석 결과 저장 중 예상치 못한 오류가 발생했습니다." };
    }
}

/**
 * Get analysis sessions for a specific family member
 */
export async function getMemberAnalysisSessions(
    memberId: string,
    limit: number = 10
): Promise<AnalysisSession[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("analysis_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("target_member_id", memberId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[Studio] Fetch sessions error:", error);
        return [];
    }

    return data || [];
}

/**
 * Get all analysis sessions for current user
 */
export async function getAllAnalysisSessions(
    limit: number = 50
): Promise<AnalysisSession[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from("analysis_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[Studio] Fetch all sessions error:", error);
        return [];
    }

    return data || [];
}

/**
 * Mark session as shared and save share card URL
 */
export async function markSessionAsShared(
    sessionId: string,
    shareCardUrl: string
): Promise<{ success: boolean }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("analysis_sessions")
        .update({
            shared: true,
            share_card_url: shareCardUrl,
        })
        .eq("id", sessionId);

    if (error) {
        console.error("[Studio] Mark shared error:", error);
        return { success: false };
    }

    return { success: true };
}

/**
 * Get analysis stats for a family member (for mission tracking)
 */
export async function getMemberAnalysisStats(
    memberId: string
): Promise<{
    totalAnalyses: number;
    completedCategories: AnalysisCategory[];
    lastAnalysisDate: string | null;
    lastAnalysisSummary: string | null;
    lastAnalysisScore: number | null;
}> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            totalAnalyses: 0,
            completedCategories: [],
            lastAnalysisDate: null,
            lastAnalysisSummary: null,
            lastAnalysisScore: null,
        };
    }

    const { data, error } = await supabase
        .from("analysis_sessions")
        .select("category, created_at, result_data")
        .eq("user_id", user.id)
        .eq("target_member_id", memberId)
        .order("created_at", { ascending: false });

    if (error || !data) {
        console.error("[Studio] Fetch stats error:", error);
        return {
            totalAnalyses: 0,
            completedCategories: [],
            lastAnalysisDate: null,
            lastAnalysisSummary: null,
            lastAnalysisScore: null,
        };
    }

    // Get unique categories
    const completedCategories = [...new Set(data.map(s => s.category))] as AnalysisCategory[];

    // Get last analysis details
    const lastAnalysis = data[0];
    const lastAnalysisScore = lastAnalysis?.result_data?.score as number || null;
    const lastAnalysisSummary =
        (lastAnalysis?.result_data?.analysis as string)?.substring(0, 100) || null;

    return {
        totalAnalyses: data.length,
        completedCategories,
        lastAnalysisDate: lastAnalysis?.created_at || null,
        lastAnalysisSummary,
        lastAnalysisScore,
    };
}
