"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateFateReport } from "@/lib/gemini";
import { getSajuData } from "@/lib/saju";

export async function startFateAnalysis(formData: FormData): Promise<void> {
    const supabase = await createClient();
    const memberId = formData.get("memberId") as string;
    const homeAddress = formData.get("homeAddress") as string;
    const faceFile = formData.get("faceImage") as File;
    const handFile = formData.get("handImage") as File;

    console.log(`[Analysis] Starting analysis for member: ${memberId}`);

    // 1. 회원 정보 및 사주 데이터 가져오기
    const { data: member, error: memberError } = await supabase
        .from("family_members")
        .select("*")
        .eq("id", memberId)
        .single();

    if (memberError || !member) {
        console.error("[Analysis] Member lookup failed:", memberError);
        throw new Error("대상 정보를 찾을 수 없습니다.");
    }

    const sajuData = getSajuData(
        member.birth_date,
        member.birth_time || "00:00",
        member.calendar_type === "solar"
    );

    // 2. 이미지 업로드 (이미지가 있을 경우)
    let faceImageUrl = member.face_image_url;
    let handImageUrl = member.hand_image_url;

    const uploadImage = async (file: File, bucket: string, prefix: string) => {
        try {
            const fileName = `${prefix}_${memberId}_${Date.now()}`; // Unique filename
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

    // 3. 회원 정보 업데이트 (주소 및 이미지 URL) - 최신 정보로 갱신
    const { error: updateError } = await supabase
        .from("family_members")
        .update({
            home_address: homeAddress,
            face_image_url: faceImageUrl,
            hand_image_url: handImageUrl,
        })
        .eq("id", memberId);

    if (updateError) {
        console.error("[Analysis] Failed to update member info:", updateError);
        // Proceed anyway as this is not critical for analysis generation, but good to know
    }

    // 4. AI 리포트 생성 (Gemini 호출)
    try {
        const reportText = await generateFateReport({
            memberInfo: member,
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
                member_id: memberId,
                full_report_html: reportText, // Markdown content
                success_probability: isNaN(successProbability) ? 70 : successProbability,
                happiness_index: isNaN(happinessIndex) ? 80 : happinessIndex,
                analysis_data: {
                    report_type: "premium",
                    generated_by: "gemini-1.5-pro",
                    lucky_color: luckyColor,
                    lucky_number: luckyNumber,
                    timestamp: new Date().toISOString()
                }
            },
        ]);

        if (insertError) {
            console.error("[Analysis] DB Insert Error:", insertError);
            throw new Error("분석 결과를 저장하는 중 오류가 발생했습니다.");
        }

        revalidatePath("/protected/analysis");
        revalidatePath("/protected/history");

    } catch (error: unknown) {
        console.error("AI Analysis Critical Error:", error);
        const errorMessage = error instanceof Error ? error.message : "AI 분석 중 치명적인 오류가 발생했습니다.";
        throw new Error(errorMessage);
    }
}
