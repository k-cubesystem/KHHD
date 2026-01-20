"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateFateReport } from "@/lib/gemini";
import { getSajuData } from "@/lib/saju";

export async function startFateAnalysis(formData: FormData) {
    const supabase = await createClient();
    const memberId = formData.get("memberId") as string;
    const homeAddress = formData.get("homeAddress") as string;
    const faceFile = formData.get("faceImage") as File;
    const handFile = formData.get("handImage") as File;

    // 1. 회원 정보 및 사주 데이터 가져오기
    const { data: member, error: memberError } = await supabase
        .from("family_members")
        .select("*")
        .eq("id", memberId)
        .single();

    if (memberError || !member) {
        throw new Error("대상 정보를 찾을 oily 수 없습니다.");
    }

    const sajuData = getSajuData(
        member.birth_date,
        member.birth_time || "00:00",
        member.calendar_type === "solar"
    );

    // 2. 이미지 업로드 (이미지가 있을 경우)
    let faceImageUrl = member.face_image_url;
    let handImageUrl = member.hand_image_url;

    if (faceFile && faceFile.size > 0) {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("face-images")
            .upload(`${memberId}_face_${Date.now()}`, faceFile);
        if (uploadData) {
            const { data: publicUrl } = supabase.storage.from("face-images").getPublicUrl(uploadData.path);
            faceImageUrl = publicUrl.publicUrl;
        }
    }

    if (handFile && handFile.size > 0) {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("hand-images")
            .upload(`${memberId}_hand_${Date.now()}`, handFile);
        if (uploadData) {
            const { data: publicUrl } = supabase.storage.from("hand-images").getPublicUrl(uploadData.path);
            handImageUrl = publicUrl.publicUrl;
        }
    }

    // 3. 회원 정보 업데이트 (주소 및 이미지 URL)
    await supabase
        .from("family_members")
        .update({
            home_address: homeAddress,
            face_image_url: faceImageUrl,
            hand_image_url: handImageUrl,
        })
        .eq("id", memberId);

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

        // 5. saju_records에 저장
        const { data: record, error: recordError } = await supabase.from("saju_records").insert([
            {
                member_id: memberId,
                full_report_html: reportText,
                // 성공 확률 등 수치 데이터는 나중에 파싱하여 추가 가능
                success_probability: 80,
                happiness_index: 85,
            },
        ]).select().single();

        revalidatePath("/protected/analysis");
        return { success: true, recordId: record?.id };
    } catch (error: any) {
        console.error("AI Analysis Error:", error);
        throw new Error("AI 분석 중 오류가 발생했습니다: " + error.message);
    }
}
