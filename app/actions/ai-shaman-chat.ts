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
    upgradeRequired?: boolean;
    insufficientTalisman?: boolean;
    isProUser?: boolean;
    talismanUsed?: number;
}

// 무료/PRO 사용자 제한 설정
const FREE_USER_LIMITS = {
  dailySessions: 1,
  turnsPerSession: 3,
  talismanCost: 100,
  responseDelay: 3000 // 3초
};

const PRO_USER_LIMITS = {
  dailySessions: Infinity,
  turnsPerSession: 3,
  talismanCost: 50,
  responseDelay: 0
};

// 일일 사용 횟수 체크
async function checkDailyUsage(userId: string) {
  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await adminSupabase
    .from('ai_chat_usage')
    .select('session_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error(error);
    return { count: 0 };
  }

  return { count: data?.session_count || 0 };
}

async function incrementDailyUsage(userId: string) {
  const adminSupabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { error } = await adminSupabase.rpc('increment_ai_chat_usage', {
    p_user_id: userId,
    p_date: today
  });

  if (error) console.error(error);
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

        // 1. 구독 상태 확인
        const { isSubscribed } = await getSubscriptionStatus();
        const limits = isSubscribed ? PRO_USER_LIMITS : FREE_USER_LIMITS;

        // 2. 무료 사용자는 일일 사용 횟수 체크
        if (!isSubscribed) {
          const usage = await checkDailyUsage(user.id);
          if (usage.count >= limits.dailySessions) {
            return {
              success: false,
              error: "오늘의 무료 사용 횟수를 모두 사용했습니다. 프리미엄으로 업그레이드하시면 무제한 이용하실 수 있습니다.",
              upgradeRequired: true
            };
          }

          // 첫 메시지인 경우 세션 카운트 증가
          if (turnCount === 0) {
            await incrementDailyUsage(user.id);
          }
        }

        // 3. 턴 수 제한 체크
        if (turnCount >= limits.turnsPerSession) {
          return { success: false, error: "대화 횟수 초과" };
        }

        // 4. 부적 차감 (차등 적용)
        const deductResult = await deductTalisman("SHAMAN_CHAT", limits.talismanCost);
        if (!deductResult.success) {
          return {
            success: false,
            error: deductResult.error,
            insufficientTalisman: true
          };
        }

        // 5. 무료 사용자는 응답 지연 (남용 방지 + PRO 유도)
        if (!isSubscribed && limits.responseDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, limits.responseDelay));
        }

        // 6. Fetch Context Data (Profile + Analysis History)
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
            turnsRemaining: limits.turnsPerSession - turnCount - 1,
            suggestedQuestions: questions.slice(0, 3),
            isProUser: isSubscribed,
            talismanUsed: limits.talismanCost
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

// 일일 사용 가능 횟수 조회
export async function getAIChatUsageStatus() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "로그인 필요" };

    const { isSubscribed } = await getSubscriptionStatus();
    const limits = isSubscribed ? PRO_USER_LIMITS : FREE_USER_LIMITS;

    if (isSubscribed) {
      return {
        success: true,
        isPro: true,
        remaining: "무제한",
        total: "무제한"
      };
    }

    const usage = await checkDailyUsage(user.id);

    return {
      success: true,
      isPro: false,
      remaining: limits.dailySessions - usage.count,
      total: limits.dailySessions,
      used: usage.count
    };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
