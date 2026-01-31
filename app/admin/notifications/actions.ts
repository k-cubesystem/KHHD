"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface SystemSetting {
    key: string;
    value: string;
    description?: string;
}

export async function getNotificationSettings() {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['daily_fortune_time', 'daily_fortune_enabled', 'kakao_template_id']);

    if (error) throw error;

    // Transform to object for easier use
    const settings: Record<string, string> = {};
    data.forEach(item => {
        settings[item.key] = item.value;
    });

    return settings;
}

export async function updateNotificationSetting(key: string, value: string) {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
        console.error("Error updating setting:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/notifications');
    return { success: true };
}

export async function getNotificationLogs(page = 1, limit = 20) {
    const supabase = createAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
        .from('notification_logs')
        .select('*, profiles:user_id(full_name, email)', { count: 'exact' })
        .order('sent_at', { ascending: false })
        .range(from, to);

    if (error) throw error;

    return { data, count };
}

export async function runManualAutomation() {
    try {
        const supabase = createAdminClient();

        // 1. Get Template
        const { data: tmplSetting } = await supabase.from('system_settings').select('value').eq('key', 'kakao_template_id').single();
        const templateId = tmplSetting?.value || "DAILY_FORTUNE_V1";

        // 2. Fetch Active Subscribers
        const { data: subscriptions } = await supabase.from('subscriptions').select('user_id').eq('status', 'active');

        if (!subscriptions || subscriptions.length === 0) {
            return { success: false, message: "활성 구독자가 없습니다." };
        }

        // 3. Import Logic Dynamically
        const { generateDailyFortune } = await import("@/app/actions/daily-fortune");
        const { sendKakaoNotification } = await import("@/app/actions/notification");

        let sentCount = 0;
        let errorCount = 0;

        // 4. Process Batch
        const promises = subscriptions.map(async (sub) => {
            try {
                const genResult = await generateDailyFortune(sub.user_id, sub.user_id, 'USER');
                if (genResult.success && genResult.content) {
                    await sendKakaoNotification(sub.user_id, templateId, {
                        content: genResult.content.substring(0, 50) + "...",
                        link: "https://haehwadang.com/protected/analysis?tab=daily"
                    });
                    sentCount++;
                } else {
                    errorCount++;
                }
            } catch (e) {
                console.error(e);
                errorCount++;
            }
        });

        await Promise.allSettled(promises);

        return {
            success: true,
            message: `발송 완료: 성공 ${sentCount}건, 실패 ${errorCount}건`
        };

    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
