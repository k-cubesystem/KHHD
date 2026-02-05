"use server";

import { createClient } from "@/lib/supabase/server";
import {
    analyzeSajuDetail,
    analyzeFaceForDestiny,
    analyzePalm,
    analyzeInteriorForFengshui
} from "@/app/actions/ai-saju";
import { saveAnalysisHistory } from "@/app/actions/analysis-history";

// Types
export type StudioAnalysisType = "saju" | "face" | "palm" | "fengshui";

interface AnalyzeParams {
    type: StudioAnalysisType;
    isGuest: boolean;
    data: any; // Dynamic data bag
}

export async function analyzeDestinyStudio({ type, isGuest, data }: AnalyzeParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Guest check
    if (!user && !isGuest) {
        return { success: false, error: "Unauthorized" };
    }

    // Determine if we should save to DB
    // Guest mode = NO SAVE (unless we implement a temporary guest/session storage later)
    // Family mode = SAVE
    const saveToHistory = !isGuest;

    console.log(`[Studio] Analyzing ${type} (Guest: ${isGuest})`);

    try {
        let result;

        switch (type) {
            case "saju":
                // data: { name, gender, birthDate, birthTime, calendarType }
                result = await analyzeSajuDetail(
                    data.name,
                    data.gender,
                    data.birthDate,
                    data.birthTime,
                    data.calendarType,
                    saveToHistory
                );
                break;

            case "face":
                // data: { imageBase64, goal }
                result = await analyzeFaceForDestiny(
                    data.imageBase64,
                    data.goal || "wealth", // Default goal
                    saveToHistory
                );
                break;

            case "palm":
                // data: { imageBase64 }
                result = await analyzePalm(
                    data.imageBase64,
                    saveToHistory
                );
                break;

            case "fengshui":
                // data: { imageBase64, theme, roomType }
                result = await analyzeInteriorForFengshui(
                    data.imageBase64,
                    data.theme || "wealth",
                    data.roomType || "living_room",
                    saveToHistory
                );
                break;

            default:
                throw new Error("Invalid analysis type");
        }

        if (!result.success) {
            throw new Error(result.error);
        }

        return { success: true, data: result };

    } catch (error: unknown) {
        console.error("[Studio] Analysis Failed:", error);
        return { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" };
    }
}
