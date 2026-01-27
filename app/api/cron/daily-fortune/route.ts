import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailyFortune } from "@/app/actions/daily-fortune";
import { sendKakaoNotification } from "@/app/actions/notification";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 1 minute execution

export async function GET(req: NextRequest) {
    // 1. Authorization
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow local dev testing without secret if needed, or stick to strict
        if (process.env.NODE_ENV !== 'development') {
            return new NextResponse("Unauthorized", { status: 401 });
        }
    }

    const supabase = createAdminClient();

    // 2. Check Global Toggle
    const { data: setting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'daily_fortune_enabled')
        .single();

    if (!setting || setting.value !== 'true') {
        return NextResponse.json({ message: "Daily fortune automation is disabled" });
    }

    // 3. Get Template ID
    const { data: tmplSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'kakao_template_id')
        .single();
    const templateId = tmplSetting?.value || "DAILY_FORTUNE_V1";

    // 4. Fetch Active Subscribers
    // Complex query: users with valid subscription
    // Assuming 'subscriptions' table has status='active'
    const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active');

    if (subError) {
        return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({ message: "No active subscribers found" });
    }

    // 5. Process Batch
    const results = {
        total: subscriptions.length,
        generated: 0,
        sent: 0,
        errors: 0
    };

    // Parallel processing limit could be applied here (e.g., p-limit)
    // For now, standard Promise.allSettled
    const promises = subscriptions.map(async (sub) => {
        try {
            // A. Generate Fortune
            const genResult = await generateDailyFortune(sub.user_id);
            if (!genResult.success) throw new Error(genResult.error);

            // B. Send Notification
            if (genResult.content) {
                // Shorten content for Kakao? Or just send link?
                // Typically Kakao Alimtalk has strict templates.
                // We'll assume the template takes #{content} variable.
                const sendResult = await sendKakaoNotification(sub.user_id, templateId, {
                    content: genResult.content.substring(0, 100) + "...", // Truncate for preview
                    link: `https://haehwadang.com/protected/analysis?tab=daily` // Deep link
                });

                if (sendResult.success) results.sent++;
                else throw new Error(sendResult.error);
            }

            results.generated++;
        } catch (err) {
            console.error(`Error processing user ${sub.user_id}:`, err);
            results.errors++;
        }
    });

    await Promise.allSettled(promises);

    return NextResponse.json({
        success: true,
        message: "Batch processing completed",
        stats: results
    });
}
