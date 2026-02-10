"use server";

import { createClient } from "@/lib/supabase/server";
import { SolapiMessageService } from "solapi";

export async function sendKakaoNotification(userId: string, templateId: string, variables: Record<string, string>) {
    const supabase = await createClient();

    // 1. Get User Phone Number
    const { data: profile } = await supabase
        .from('profiles')
        .select('phone, name')
        .eq('id', userId)
        .single();

    if (!profile) return { success: false, error: "User not found" };
    if (!profile.phone) return { success: false, error: "Phone number missing" };

    // 2. Prepare Solapi Service
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const senderPhone = process.env.SOLAPI_SENDER_PHONE;

    // Fallback for Dev/Missing Keys
    if (!apiKey || !apiSecret || !senderPhone) {
        console.warn("[SOLAPI] Missing API Keys. Mocking send.");
        console.log(`[MOCK KAKAO] To: ${profile.phone}, Template: ${templateId}, Vars:`, variables);

        await logNotification(userId, 'KAKAO', 'SENT_MOCK', null);
        return { success: true, mocked: true };
    }

    try {
        const messageService = new SolapiMessageService(apiKey, apiSecret);

        // 3. Send AlimTalk
        // Note: Solapi structure might vary. Using user provided structure.
        const result = await messageService.send({
            to: profile.phone.replace(/-/g, ''), // Clean phone number
            from: senderPhone,
            kakaoOptions: {
                pfId: process.env.KAKAO_PFID || "PFID_NEEDED", // Channel ID needs to be in ENV too? Or hardcoded.
                templateId: templateId,
                variables: variables,
                disableSms: true // Do not fallback to SMS if failed (cost saving)
            }
        });

        console.log("[SOLAPI] Sent:", result);

        // 4. Log Success
        await logNotification(userId, 'KAKAO', 'SENT', null);
        return { success: true, result };

    } catch (error) {
        console.error("[SOLAPI] Error:", error);
        const message = error instanceof Error ? error.message : "알림 전송 실패";
        await logNotification(userId, 'KAKAO', 'FAILED', message);
        return { success: false, error: message };
    }
}

async function logNotification(userId: string, type: string, status: string, errorMsg: string | null) {
    const supabase = await createClient();
    await supabase.from('notification_logs').insert({
        user_id: userId,
        type,
        status,
        error_message: errorMsg
    });
}
