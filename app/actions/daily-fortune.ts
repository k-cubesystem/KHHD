"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateManse } from "@/lib/saju/manse";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export type TargetType = 'USER' | 'FAMILY';

export async function generateDailyFortune(
    userId: string,
    targetId: string,
    type: TargetType = 'USER',
    dateStr?: string,
    force: boolean = false
) {
    const supabase = await createClient();
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    // 1. Check Cache / Handle Force
    // We filter by user_id AND metadata->target_id (if we use JSONB) or just assume one fortune per user per day?
    // No, user can view multiple fortunes (self + family).
    // So we need unique constraint on (user_id, target_id, date).
    // I will try to query based on JSON metadata or new columns if I add them.
    // For now, I'll store `target_id` in a generic way or assume `daily_fortunes` needs update.
    // Let's assume I updated the schema to have `target_id`.

    // Note: Migration 20260127_daily_fortune_target.sql will be created to add target_id
    const query = supabase
        .from('daily_fortunes')
        .select('*')
        .eq('user_id', userId)
        .eq('target_id', targetId) // migration needed
        .eq('date', targetDate)
        .single();

    const { data: existing } = await query;

    if (force && existing) {
        // Delete existing fortune to regenerate
        await supabase
            .from('daily_fortunes')
            .delete()
            .eq('id', existing.id);
    } else if (existing) {
        return { success: true, content: existing.content, cached: true };
    }

    // 2. Fetch Target Profile Data
    let name, gender, birthDate, birthTime;

    if (type === 'USER') {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).single();
        if (!profile || !profile.birth_date) return { success: false, error: "생년월일 정보가 필요합니다." };
        name = profile.name;
        gender = profile.gender;
        birthDate = profile.birth_date;
        birthTime = profile.birth_time;
    } else {
        const { data: member } = await supabase.from('family_members').select('*').eq('id', targetId).single();
        if (!member || !member.birth_date) return { success: false, error: "가족의 생년월일 정보가 필요합니다." };
        name = member.name;
        gender = member.gender;
        birthDate = member.birth_date;
        birthTime = member.birth_time;
    }

    // 3. Calculate Manse
    const manseElement = calculateManse(birthDate, birthTime || '00:00');
    const sajuStr = `${manseElement.year.gan}${manseElement.year.ji}년 ${manseElement.month.gan}${manseElement.month.ji}월 ${manseElement.day.gan}${manseElement.day.ji}일 ${manseElement.time.gan}${manseElement.time.ji}시`;

    // 4. Get Prompt
    let promptData = null;
    let fetchError = null;

    // Strategy 1: Attempt Admin Client (Bypassing RLS)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const adminClient = createAdminClient();
            const { data, error } = await adminClient
                .from('ai_prompts')
                .select('template') // Corrected column name
                .ilike('key', 'daily_fortune') // Case-insensitive match
                .limit(1);

            if (error) throw error;
            if (data && data.length > 0) promptData = data[0];
        } catch (e: any) {
            console.error("Admin Client Fetch Error:", e);
            fetchError = "Admin Error: " + e.message;
        }
    } else {
        fetchError = "Server Config Error: Missing Service Role Key";
    }

    // Strategy 2: Attempt standard client (If RLS permitted)
    if (!promptData) {
        try {
            const { data, error } = await supabase
                .from('ai_prompts')
                .select('template') // Corrected column name
                .ilike('key', 'daily_fortune')
                .maybeSingle();

            if (data) promptData = data;
            if (error) fetchError += " | Standard Error: " + error.message;
        } catch (e: any) {
            fetchError += " | Standard Exception: " + e.message;
        }
    }

    // STRICT ENFORCEMENT: No Fallback
    if (!promptData || !promptData.template) {
        console.error("CRITICAL: Daily Fortune Prompt NOT FOUND in DB.");
        return {
            success: false,
            error: `시스템 설정 오류: 관리자 프롬프트를 불러올 수 없습니다. (관리자에게 문의하세요) \nDebug: ${fetchError}`
        };
    }

    let promptTemplate = promptData.template;

    // 5. Generate
    let prompt = promptTemplate
        .replace('{{date}}', targetDate)
        .replace('{{name}}', name || '사용자')
        .replace('{{gender}}', gender === 'male' ? '남성' : '여성')
        .replace('{{birthDate}}', birthDate)
        .replace('{{birthTime}}', birthTime || '알 수 없음')
        .replace('{{saju}}', sajuStr);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // 6. Save
        // We will save with target_id.
        // If DB strictly doesn't have target_id yet, this insert might fail if I use it.
        // MUST RUN MIGRATION FIRST.
        const { error: saveError } = await supabase
            .from('daily_fortunes')
            .insert({
                user_id: userId,
                target_id: targetId,
                date: targetDate,
                content: text
            });

        if (saveError) {
            console.error("Failed to save fortune:", saveError);
        }

        return { success: true, content: text, cached: false };

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: error.message };
    }
}
