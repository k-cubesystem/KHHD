"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductTalisman } from "./wallet-actions";
import { getSubscriptionStatus } from "./subscription-actions";

// Helper: Get Model Instance
const getGeminiModel = () => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("Google Generative AI API Key is missing");
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
};

// Helper: Fetch System Prompt from Supabase
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
    } catch (e) {
        console.warn(`Failed to fetch prompt for ${key}:`, e);
    }
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

/**
 * AI 신당(神堂) 채팅 - 천지인 데이터 기반 심도 있는 상담
 * Pro 멤버십 전용 / 3턴 제한
 */
export async function sendShamanChatMessage(
    message: string,
    conversationHistory: ShamanChatMessage[],
    turnCount: number
): Promise<ShamanChatResponse> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "로그인이 필요합니다." };
        }

        // Check Pro Membership (멤버십 확인)
        const { isSubscribed } = await getSubscriptionStatus();
        if (!isSubscribed) {
            return {
                success: false,
                error: "AI 신당은 Pro 멤버십 전용 서비스입니다. 멤버십을 구독해주세요."
            };
        }

        // Check Turn Limit (3턴 제한)
        if (turnCount >= 3) {
            return {
                success: false,
                error: "대화 횟수가 초과되었습니다. (최대 3회)"
            };
        }

        // Deduct Talisman (부적 차감)
        const deductResult = await deductTalisman("SHAMAN_CHAT");
        if (!deductResult.success) {
            return { success: false, error: deductResult.error };
        }

        // Fetch User 천지인 Data (사주, 관상, 손금)
        const { data: profile } = await supabase
            .from('profiles')
            .select('name, gender, birth_date, job, hobbies, marital_status, life_philosophy')
            .eq('id', user.id)
            .single();

        // Fetch stored analysis data (if exists)
        // Note: These tables may not exist yet, so we handle errors gracefully
        let sajuData = null;
        let faceData = null;
        let palmData = null;

        try {
            const { data } = await supabase
                .from('saju_records')
                .select('analysis_data')
                .eq('member_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data?.analysis_data) {
                sajuData = data.analysis_data;
            }
        } catch (e) {
            console.log("No saju data found:", e);
        }

        // Face and palm analysis tables don't exist yet, so we skip them for now
        // They will be added in future updates

        // Construct Context String (천지인 통합 컨텍스트)
        const contextParts: string[] = [];

        if (profile) {
            contextParts.push(`## 기본 정보
- 이름: ${profile.name || "정보 없음"}
- 성별: ${profile.gender || "정보 없음"}
- 생년월일: ${profile.birth_date || "정보 없음"}
- 직업: ${profile.job || "정보 없음"}
- 취미: ${profile.hobbies || "정보 없음"}
- 결혼 상태: ${profile.marital_status || "정보 없음"}
- 인생 철학: ${profile.life_philosophy || "정보 없음"}`);
        }

        if (sajuData && typeof sajuData === 'object') {
            const saju = sajuData as Record<string, unknown>;
            contextParts.push(`## 천(天) - 사주 정보
- 핵심 성격: ${saju.core_character || "분석 데이터 없음"}
- 오행 분포: ${JSON.stringify(saju.five_elements) || "분석 데이터 없음"}
- 상세 분석: ${typeof saju.detailed_analysis === 'string' ? saju.detailed_analysis.substring(0, 300) : "분석 데이터 없음"}...`);
        }

        // Note: Face and palm analysis will be added in future updates
        if (faceData) {
            contextParts.push(`## 인(人) - 관상 정보
- 분석 데이터가 준비 중입니다.`);
        }

        if (palmData) {
            contextParts.push(`## 지(地) - 손금 정보
- 분석 데이터가 준비 중입니다.`);
        }

        const userContext = contextParts.length > 0
            ? contextParts.join('\n\n')
            : "사용자의 천지인 데이터가 아직 없습니다. 일반적인 조언을 제공해주세요.";

        // Fetch Dynamic System Prompt
        const systemPrompt = await getSystemPrompt('shaman_chat', {
            name: profile?.name || "손님",
            context: userContext
        }) || `당신은 30년 경력의 역술인이자 심리 상담가입니다. 사용자의 천지인(사주, 관상, 손금) 정보를 바탕으로 심도 있는 상담을 제공합니다.`;

        // Build conversation for Gemini
        const model = getGeminiModel();

        // Create chat session with history
        const chat = model.startChat({
            history: conversationHistory.map(msg => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }]
            })),
            generationConfig: {
                temperature: 0.9,
                topP: 0.95,
                maxOutputTokens: 1000,
            },
        });

        // Construct the final prompt
        const fullPrompt = `${systemPrompt}

# 사용자 천지인 정보
${userContext}

# 현재 대화 턴: ${turnCount + 1}/3

# 사용자 질문
${message}

**중요 지침**:
1. 사용자의 천지인 정보를 적극 활용하여 맞춤형 조언을 제공하세요.
2. 존댓말을 사용하고, 따뜻하고 지혜로운 톤을 유지하세요.
3. 구체적이고 실천 가능한 조언을 제공하세요.
4. 의학적 진단이나 법적 조언은 하지 마세요.
5. 응답은 200-300자 이내로 간결하게 작성하세요.`;

        const result = await chat.sendMessage(fullPrompt);
        const responseText = result.response.text();

        // Generate suggested questions for next turn (if not last turn)
        let suggestedQuestions: string[] | undefined;
        if (turnCount < 2) {
            suggestedQuestions = generateSuggestedQuestions(sajuData, faceData, palmData);
        }

        return {
            success: true,
            response: responseText,
            turnsRemaining: 3 - (turnCount + 1),
            suggestedQuestions
        };

    } catch (error: unknown) {
        console.error("Shaman Chat Error:", error);
        const errorMessage = error instanceof Error ? error.message : "AI 신당 상담 중 오류가 발생했습니다.";
        return { success: false, error: errorMessage };
    }
}

/**
 * Generate personalized suggested questions based on user data
 */
function generateSuggestedQuestions(sajuData: unknown, faceData: unknown, palmData: unknown): string[] {
    const questions: string[] = [];

    // Always include some default questions
    const defaults = [
        "올해 나의 운세는 어떤가요?",
        "직장에서의 인간관계 개선 방법을 알려주세요.",
        "건강 관리를 위한 조언을 주세요."
    ];

    // Personalize based on available data
    if (sajuData) {
        questions.push("제 사주에서 보이는 재물운을 어떻게 활용하면 좋을까요?");
    }

    if (faceData) {
        questions.push("관상 분석 결과를 바탕으로 인상 관리 팁을 알려주세요.");
    }

    if (palmData) {
        questions.push("손금에서 보이는 건강 운세를 개선하려면 어떻게 해야 하나요?");
    }

    // Return 3 questions
    const finalQuestions = questions.length >= 3 ? questions.slice(0, 3) : [...questions, ...defaults].slice(0, 3);
    return finalQuestions;
}

/**
 * Get starter questions for first conversation
 */
export async function getShamanChatStarters(): Promise<{ success: boolean; questions?: string[]; error?: string }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "로그인이 필요합니다." };
        }

        // Check Pro Membership
        const { isSubscribed } = await getSubscriptionStatus();
        if (!isSubscribed) {
            return {
                success: false,
                error: "AI 신당은 Pro 멤버십 전용 서비스입니다."
            };
        }

        // Fetch user data to personalize questions
        let sajuData = null;
        let faceData = null;
        let palmData = null;

        try {
            const { data } = await supabase
                .from('saju_records')
                .select('analysis_data')
                .eq('member_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data?.analysis_data) {
                sajuData = data.analysis_data;
            }
        } catch (e) {
            console.log("No saju data for starters:", e);
        }

        // Face and palm data not yet available

        const questions = generateSuggestedQuestions(sajuData, faceData, palmData);

        return { success: true, questions };

    } catch (error: unknown) {
        console.error("Get Starters Error:", error);
        return { success: false, error: "예시 질문을 불러오는 중 오류가 발생했습니다." };
    }
}
