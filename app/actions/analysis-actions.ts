"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateFateReport } from "@/lib/gemini";
import { getSajuData } from "@/lib/saju";

export async function startFateAnalysis(formData: FormData): Promise<void> {
    const supabase = await createClient();
    const targetId = formData.get("memberId") as string; // Actually targetId now
    const homeAddress = formData.get("homeAddress") as string;
    const faceFile = formData.get("faceImage") as File;
    const handFile = formData.get("handImage") as File;

    console.log(`[Analysis] Starting analysis for target: ${targetId}`);

    // 1. Destiny Target 정보 가져오기 (본인 or 가족)
    const { data: target, error: targetError } = await supabase
        .from("v_destiny_targets")
        .select("*")
        .eq("id", targetId)
        .single();

    if (targetError || !target) {
        console.error("[Analysis] Target lookup failed:", targetError);
        throw new Error("대상 정보를 찾을 수 없습니다.");
    }

    console.log(`[Analysis] Target type: ${target.target_type}, Name: ${target.name}`);

    // 2. 사주 데이터 생성 (생년월일이 필수)
    if (!target.birth_date) {
        throw new Error("분석을 위해서는 생년월일 정보가 필요합니다.");
    }

    const sajuData = getSajuData(
        target.birth_date,
        target.birth_time || "00:00",
        target.calendar_type === "solar"
    );

    // 3. 이미지 업로드 (이미지가 있을 경우)
    let faceImageUrl = target.face_image_url;
    let handImageUrl = target.hand_image_url;

    const uploadImage = async (file: File, bucket: string, prefix: string) => {
        try {
            const fileName = `${prefix}_${targetId}_${Date.now()}`; // Unique filename
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    upsert: true
                });

            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
            return publicUrlData.publicUrl;
        } catch (error) {
            console.error(`[Analysis] Upload failed for ${bucket}:`, error);
            // Don't block the analysis if image upload fails, just proceed without image
            return null;
        }
    };

    if (faceFile && faceFile.size > 0) {
        console.log("[Analysis] Uploading face image...");
        const url = await uploadImage(faceFile, "face-images", "face");
        if (url) faceImageUrl = url;
    }

    if (handFile && handFile.size > 0) {
        console.log("[Analysis] Uploading hand image...");
        const url = await uploadImage(handFile, "hand-images", "hand");
        if (url) handImageUrl = url;
    }

    // 4. Target 정보 업데이트 (주소 및 이미지 URL)
    if (target.target_type === "self") {
        // 본인(profiles) 업데이트
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                avatar_url: faceImageUrl, // profiles는 face_image_url 대신 avatar_url 사용
            })
            .eq("id", targetId);

        if (updateError) {
            console.error("[Analysis] Failed to update profile:", updateError);
        }
    } else {
        // 가족(family_members) 업데이트
        const { error: updateError } = await supabase
            .from("family_members")
            .update({
                home_address: homeAddress,
                face_image_url: faceImageUrl,
                hand_image_url: handImageUrl,
            })
            .eq("id", targetId);

        if (updateError) {
            console.error("[Analysis] Failed to update family member:", updateError);
        }
    }

    // 5. AI 리포트 생성 (Gemini 호출)
    try {
        // generateFateReport는 memberInfo를 받으므로 target을 member 형식으로 변환
        const memberInfo = {
            name: target.name,
            birth_date: target.birth_date,
            birth_time: target.birth_time,
            calendar_type: target.calendar_type,
            gender: target.gender,
            relationship: target.relation_type,
        };

        const reportText = await generateFateReport({
            memberInfo,
            sajuData,
            faceImageUrl,
            handImageUrl,
            homeAddress,
            reportType: "comprehensive",
        });

        console.log("[Analysis] Report generated. Parsing results...");

        // 5. AI 리포트 데이터 파싱 (성공확률, 행복지수 추출)
        const parseTag = (tag: string, text: string) => {
            const regex = new RegExp(`\\[\\[${tag}:\\s*(.*?)\\]\\]`, "i");
            const match = text.match(regex);
            return match ? match[1].trim() : null;
        };

        const successProbability = parseInt(parseTag("SUCCESS_PROBABILITY", reportText) || "70");
        const happinessIndex = parseInt(parseTag("HAPPINESS_INDEX", reportText) || "80");
        const luckyColor = parseTag("LUCKY_COLOR", reportText) || "Gold";
        const luckyNumber = parseInt(parseTag("LUCKY_NUMBER", reportText) || "7");

        // 6. saju_records에 저장
        const { error: insertError } = await supabase.from("saju_records").insert([
            {
                member_id: targetId, // DestinyTarget ID 사용
                full_report_html: reportText, // Markdown content
                success_probability: isNaN(successProbability) ? 70 : successProbability,
                happiness_index: isNaN(happinessIndex) ? 80 : happinessIndex,
                analysis_data: {
                    report_type: "cheonjiin", // 천지인 분석
                    target_type: target.target_type, // self or family
                    generated_by: "gemini-1.5-pro",
                    lucky_color: luckyColor,
                    lucky_number: luckyNumber,
                    timestamp: new Date().toISOString()
                }
            },
        ]);

        if (insertError) {
            console.error("[Analysis] DB Insert Error:", insertError);
            console.error("[Analysis] Insert details:", {
                targetId,
                reportLength: reportText.length,
                successProbability,
                happinessIndex
            });
            throw new Error(`분석 결과를 저장하는 중 오류가 발생했습니다: ${insertError.message}`);
        }

        revalidatePath("/protected/analysis");
        revalidatePath("/protected/history");

    } catch (error: unknown) {
        console.error("AI Analysis Critical Error:", error);
        const errorMessage = error instanceof Error ? error.message : "AI 분석 중 치명적인 오류가 발생했습니다.";
        throw new Error(errorMessage);
    }
}
