"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductTalisman } from "./wallet-actions";
import { getSubscriptionStatus } from "./subscription-actions";

// --- Helpers ---

const getGeminiModel = () => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("Google Generative AI API Key is missing");
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
};

async function getSystemPrompt(key: string, variables: Record<string, string> = {}) {
    try {
        const adminSupabase = createAdminClient();
        const { data } = await adminSupabase.from('ai_prompts').select('template').eq('key', key).single();
        if (data?.template) {
            let text = data.template;
            for (const [k, v] of Object.entries(variables)) {
                text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
            }
            return text;
        }
    } catch (e) { console.warn(e); }
    return null;
}

export interface ShamanChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export interface ShamanChatResponse {
    success: boolean;
    response?: string;
    turnsRemaining?: number;
    error?: string;
    suggestedQuestions?: string[];
}

export async function sendShamanChatMessage(
    message: string,
    conversationHistory: ShamanChatMessage[],
    turnCount: number
): Promise<ShamanChatResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "로그인 필요" };

        // 1. Check Limits
        const { isSubscribed } = await getSubscriptionStatus();
        if (!isSubscribed) return { success: false, error: "Pro 멤버십 전용 서비스입니다." };
        if (turnCount >= 3) return { success: false, error: "대화 횟수 초과" };

        const deductResult = await deductTalisman("SHAMAN_CHAT");
        if (!deductResult.success) return { success: false, error: deductResult.error };

        // 2. Fetch Context Data (Profile + Analysis History)
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

        // Fetch recent analysis (Saju, Face, Hand)
        // using analysis_history instead of saju_records
        const { data: history } = await supabase
            .from('analysis_history')
            .select('category, result_json, summary, score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const sajuRecord = history?.find(h => h.category === 'SAJU' || h.category === 'TODAY');
        const faceRecord = history?.find(h => h.category === 'FACE');
        const handRecord = history?.find(h => h.category === 'HAND');

        // Build Context String
        const contextParts = [`## 기본 정보 (Profile)\n- 이름: ${profile?.name}\n- 직업: ${profile?.job}\n- 취미: ${profile?.hobbies}\n- 인생관: ${profile?.life_philosophy}`];

        if (sajuRecord) {
            contextParts.push(`## 사주 분석 요약\n- ${sajuRecord.summary} (점수: ${sajuRecord.score})\n- 상세: ${JSON.stringify(sajuRecord.result_json).substring(0, 300)}...`);
        }
        if (faceRecord) {
            contextParts.push(`## 관상 분석 요약\n- ${faceRecord.summary} (점수: ${faceRecord.score})`);
        }
        if (handRecord) {
            contextParts.push(`## 손금 분석 요약\n- ${handRecord.summary} (점수: ${handRecord.score})`);
        }

        const userContext = contextParts.join("\n\n");

        // 3. AI Generation
        const systemPrompt = await getSystemPrompt('shaman_chat', { name: profile?.name || "내담자", context: userContext })
            || "당신은 해화당의 AI 신당(神堂)을 지키는 멘토입니다.";

        const model = getGeminiModel();
        const chat = model.startChat({
            history: conversationHistory.map(msg => ({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.content }] })),
        });

        const result = await chat.sendMessage(`${systemPrompt}\n\n[Context]\n${userContext}\n\n[User Question]\n${message}`);
        const responseText = result.response.text();

        // 4. Suggested Questions
        const questions = [];
        if (sajuRecord) questions.push("제 사주에 맞는 재물 관리법은?");
        if (faceRecord) questions.push("관상학적으로 부족한 부분을 어떻게 보완할까요?");
        questions.push("올해 가장 조심해야 할 것은?");

        return {
            success: true,
            response: responseText,
            turnsRemaining: 2 - turnCount, // 0, 1, 2 used -> 3 total
            suggestedQuestions: questions.slice(0, 3)
        };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

export async function getShamanChatStarters() {
    // Simplified logic, similar to above but just returning questions
    return { success: true, questions: ["오늘의 운세는 어때요?", "제 사주의 특징을 알려주세요."] };
}
