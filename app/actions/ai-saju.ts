"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { type FaceDestinyGoal, type InteriorTheme } from "@/lib/constants";
import { deductTalisman } from "./wallet-actions";

// Helper: Get Model Instance Safely
const getGeminiModel = () => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("Google Generative AI API Key is missing");
    const genAI = new GoogleGenerativeAI(apiKey);
    // User requested "Gemini 2.5 Flash-Lite" (gemini-2.5-flash-lite)
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
};

// 0. Saju Detail Analysis
export async function analyzeSajuDetail(
    name: string,
    gender: string,
    birthDate: string,
    birthTime: string,
    calendarType: string
) {
    try {
        const model = getGeminiModel();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "로그인이 필요합니다." };

        // Fetch User Extended Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('job, hobbies, specialties, life_philosophy, marital_status, religion')
            .eq('id', user.id)
            .single();

        const deductResult = await deductTalisman("SAJU_BASIC");
        if (!deductResult.success) return deductResult;

        // Construct Context String
        const userContext = profile ? `
        User Background Context:
        - Job: ${profile.job || "Unknown"}
        - Hobbies: ${profile.hobbies || "None"}
        - Marital Status: ${profile.marital_status || "Unknown"}
        - Life Philosophy: ${profile.life_philosophy || "None"}
        - Religion: ${profile.religion || "None"}

        * IMPORTANT: Please incorporate this user background into your advice. For example, relate their career luck to their actual job '${profile.job}', or suggest hobbies compatible with '${profile.hobbies}'.
        ` : "";

        const prompt = `
        Analyze the Saju (Four Pillars of Destiny) for:
        Name: ${name}, Gender: ${gender}
        Birth: ${birthDate} ${birthTime} (${calendarType})

        ${userContext}

        Provide a deep, insightful analysis covering:
        1. Core Energy (Il-gan) & Personality (relate to their life philosophy if provided)
        2. Career & Wealth (Jae-seong, Gwan-seong) - tailored to their job '${profile?.job || "current path"}'
        3. Relationships (Gwan-seong/Jae-seong) - considering they are '${profile?.marital_status || "single"}'
        4. Health & Advice (suggest tailored activities)

        Format: Returns JSON strictly.
        {
            "coreCharacter": "String summary of personality",
            "fiveElements": {"wood": 20, "fire": 10, "earth": 30, "metal": 10, "water": 30},
            "detailedAnalysis": "Markdown formatted long text in Korean (honorifics). Use headers like ### for sections."
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON Parse Error");

        return { success: true, ...JSON.parse(jsonMatch[0]) };

    } catch (error: unknown) {
        console.error("Saju Error:", error);
        const errorMessage = error instanceof Error ? error.message : "사주 분석 중 오류가 발생했습니다.";
        return { success: false, error: errorMessage };
    }
}

// 0.1 Today's Fortune
export async function getTodayFortune(birthDate: string) {
    try {
        const model = getGeminiModel();
        const today = new Date().toISOString().split('T')[0];
        const prompt = `
        Provide a daily fortune for someone born on ${birthDate}.
        Today is ${today}.
        Focus on: Specific advice for today, lucky color, lucky time.
        Format: JSON.
        {
            "score": 85,
            "summary": "One sentence summary",
            "content": "Markdown detailed daily fortune in Korean",
            "luckyColor": "Red",
            "luckyTime": "13:00-15:00"
        }
        `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return { success: false, error: "Parse Error" };
        return { success: true, ...JSON.parse(jsonMatch[0]) };
    } catch {
        return { success: false, error: "운세 조회 실패" };
    }
}

// 관상 분석 결과 인터페이스
interface FaceAnalysisResult {
    success: boolean;
    currentScore?: number;
    confidence?: number;
    currentAnalysis?: string;
    fiveOrgans?: {
        ear: { score: number; analysis: string };
        eyebrow: { score: number; analysis: string };
        eye: { score: number; analysis: string };
        nose: { score: number; analysis: string };
        mouth: { score: number; analysis: string };
    };
    threeZones?: {
        upper: { score: number; analysis: string };
        middle: { score: number; analysis: string };
        lower: { score: number; analysis: string };
    };
    skinColor?: {
        complexion: string;
        healthIndicator: string;
    };
    faceDescription?: string;
    improvementPoint?: string;
    recommendations?: string[];
    imagePrompt?: string;
    acupressure?: Array<{
        name: string;
        effect: string;
        location: string;
        method: string;
    }>;
    error?: string;
}

// 1. Face Analysis (Vision) - 고도화된 관상 분석
export async function analyzeFaceForDestiny(imageBase64: string, goal: FaceDestinyGoal): Promise<FaceAnalysisResult> {
    try {
        const model = getGeminiModel();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "로그인이 필요합니다." };

        const deductResult = await deductTalisman("FACE_AI");
        if (!deductResult.success) return { success: false, error: deductResult.error };

        const goalPrompts = {
            wealth: "재물운 (財物運) - 코의 형태, 이마의 맑음, 귓볼의 두께에 집중",
            love: "도화운 (桃花運) - 눈의 생기, 피부 윤기, 입술의 형태에 집중",
            authority: "관운 (官運) - 눈썹의 형태, 턱선의 각도, 이마의 너비에 집중",
        };

        const prompt = `
당신은 30년 경력의 관상학 대가이자 한의학 전문가입니다.
아래 얼굴 이미지를 분석하여 **${goalPrompts[goal]}**에 초점을 맞추어 정밀 분석하세요.

## 분석 항목

### 1. 오관(五官) 분석 - 각 부위별 10점 만점
- **귀(耳)**: 귓볼 두께, 귀 위치, 귀 색상
- **눈썹(眉)**: 눈썹 형태, 농도, 흐름
- **눈(目)**: 눈의 크기, 생기, 흑백 대비
- **코(鼻)**: 콧대 높이, 콧방울 크기, 콧등 선명도
- **입(口)**: 입술 두께, 입꼬리 각도, 인중 선명도

### 2. 삼정(三停) 분석 - 각 영역별 10점 만점
- **상정(上停)**: 이마 영역 (지혜, 초년운)
- **중정(中停)**: 눈~코 영역 (의지, 중년운)
- **하정(下停)**: 입~턱 영역 (실행력, 말년운)

### 3. 피부 찰색(察色) 분석
- **기색(氣色)**: 현재 건강 상태와 운기를 피부 색상으로 판단
- **혈색(血色)**: 혈액 순환 상태 (홍조, 창백 등)

### 4. 종합 운세 예측
- 재물운, 건강운, 인연운 각각 평가

### 5. 얼굴 특징 상세 묘사 (영어)
이 사람의 외모를 영어로 상세히 묘사하세요 (이후 이미지 생성에 활용).

### 6. 개선을 위한 혈자리 추천
${goal === 'wealth' ? '재물운' : goal === 'love' ? '도화운' : '관운'} 향상을 위한 얼굴 혈자리 3-5개 추천.

## 출력 형식 (JSON)
{
    "currentScore": number (0-100, 종합 점수),
    "confidence": number (0-100, 분석 신뢰도 - 이미지 품질, 얼굴 노출 정도에 따라),
    "currentAnalysis": "### 종합 분석\\n마크다운 형식의 상세 분석 (한국어, 존칭)",
    "fiveOrgans": {
        "ear": { "score": number, "analysis": "귀 분석 결과" },
        "eyebrow": { "score": number, "analysis": "눈썹 분석 결과" },
        "eye": { "score": number, "analysis": "눈 분석 결과" },
        "nose": { "score": number, "analysis": "코 분석 결과" },
        "mouth": { "score": number, "analysis": "입 분석 결과" }
    },
    "threeZones": {
        "upper": { "score": number, "analysis": "상정(이마) 분석" },
        "middle": { "score": number, "analysis": "중정(눈~코) 분석" },
        "lower": { "score": number, "analysis": "하정(입~턱) 분석" }
    },
    "skinColor": {
        "complexion": "피부 기색 설명",
        "healthIndicator": "건강 지표 설명"
    },
    "fortunePrediction": {
        "wealth": { "score": number, "comment": "재물운 평가" },
        "health": { "score": number, "comment": "건강운 평가" },
        "relationship": { "score": number, "comment": "인연운 평가" }
    },
    "faceDescription": "A detailed physical description in English...",
    "improvementPoint": "Specific improvement instruction in English for ${goal}...",
    "recommendations": ["구체적 개선 조언 1", "구체적 개선 조언 2", "구체적 개선 조언 3"],
    "imagePrompt": "Portrait generation prompt in English...",
    "acupressure": [
        {
            "name": "혈자리 한글명",
            "effect": "기대 효능",
            "location": "정확한 위치 설명",
            "method": "지압 방법 (횟수, 강도 포함)"
        }
    ]
}

**중요**: 반드시 위 JSON 형식을 정확히 지켜서 응답하세요. 의학적/성형 관련 조언은 하지 마세요.
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI 응답 파싱 실패 (JSON 형식 아님)");
        return { success: true, ...JSON.parse(jsonMatch[0]) };

    } catch (error: unknown) {
        console.error("Face Analysis Error:", error);
        const errorMessage = error instanceof Error ? error.message : "분석 실패 (상세 로그 확인)";
        return { success: false, error: errorMessage };
    }
}

// 1.5 Palm Analysis (Vision)
export async function analyzePalm(imageBase64: string) {
    try {
        const model = getGeminiModel();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "로그인이 필요합니다." };

        const deductResult = await deductTalisman("PALM_AI");
        if (!deductResult.success) return deductResult;

        const prompt = `
        You are a Master of Palmistry & Oriental Medicine (Acupuncture).
        Analyze the uploaded palm image.
        Identify weak energy points or health issues visible in the palm lines (e.g., weak stomach, stress, circulation).

        **CRITICAL TASK**: Recommend specific HAND Acupressure points (손 혈자리) to balance the user's energy and improve their destiny/health.
        Common points: Hap-gok (합곡), No-gung (노궁), Shin-mun (신문).

        Output JSON:
        {
            "currentScore": number (0-100),
            "currentAnalysis": "Markdown detailed analysis in Korean",
            "majorLines": {
                "life": "string description",
                "head": "string description",
                "heart": "string description",
                "fate": "string description"
            },
            "acupressure": [
                {
                    "name": "혈자리 이름 (e.g. 합곡혈)",
                    "effect": "효능",
                    "location": "위치 설명",
                    "method": "지압 방법"
                }
            ]
        }
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI 응답 파싱 실패 (JSON 형식 아님)");
        return { success: true, ...JSON.parse(jsonMatch[0]) };

    } catch (error: unknown) {
        console.error("Palm Analysis Error:", error);
        const errorMessage = error instanceof Error ? error.message : "손금 분석 실패";
        return { success: false, error: errorMessage };
    }
}

// 2. Feng Shui Analysis (Vision)
export async function analyzeInteriorForFengshui(imageBase64: string, theme: InteriorTheme, roomType: string) {
    try {
        const model = getGeminiModel();
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "로그인이 필요합니다." };

        const deductResult = await deductTalisman("FENGSHUI_AI");
        if (!deductResult.success) return deductResult;

        const prompt = `
        Feng Shui Master Analysis.
        Room: ${roomType}, Theme: ${theme}
        Analyze image.
        Output JSON:
        {
            "currentAnalysis": "Markdown details in Korean",
            "problems": ["string"],
            "shoppingList": ["string", "string"],
            "imagePrompt": "A photorealistic interior design of a ${roomType} themed for ${theme}. Bright natural lighting, modern aesthetics, feng shui optimized. 8k resolution."
        }
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
        ]);

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON Parse Error");
        return { success: true, ...JSON.parse(jsonMatch[0]) };

    } catch (error: unknown) {
        console.error("Feng Shui Error:", error);
        const errorMessage = error instanceof Error ? error.message : "분석 실패";
        return { success: false, error: errorMessage };
    }
}

// 3. Image Generation (Identity Preservation Logic)
export async function generateDestinyImage(basePrompt: string, style: "face" | "interior", originalDescription?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "로그인이 필요합니다." };

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) return { success: false, error: "API Key Missing" };

        const deductResult = await deductTalisman("IMAGE_GEN");
        if (!deductResult.success) return deductResult;

        // Step 1: Construct Identity-Preserving Prompt using Gemini 2.5
        const model = getGeminiModel();

        let systemInstruction = "";
        if (style === "face") {
            systemInstruction = `
            You are an Expert Aesthetic Surgeon and Physiognomist.
            Your task is to create a prompt for an image generator (Flux) that modifies a person's appearance to improve their physiognomy (luck) while maintaining their original identity as much as possible.
            
            Original Appearance Description: "${originalDescription || "A person"}"
            Target Improvement Goal: "${basePrompt}"
            
            Output a highly detailed image generation prompt that:
            1. Starts with the Original Appearance Description to anchor the identity.
            2. Applies the target improvement subtly (e.g., "with slightly clearer eyes", "a more defined jawline").
            3. Uses high-quality parameters: "photorealistic, 8k, highly detailed, soft studio lighting, shot on 85mm lens, sharp focus".
            4. Output ONLY the raw English prompt string.
            `;
        } else {
            systemInstruction = `
            You are a Feng Shui Interior Architect.
            Create a prompt that keeps the room's structure described but optimizes lighting and furniture for Feng Shui.
            User Request: "${basePrompt}"
            Output ONLY the raw English prompt.
            `;
        }

        const enhancementResult = await model.generateContent(systemInstruction);
        const finalPrompt = enhancementResult.response.text();

        console.log("[Gemini 2.5] Identity-Preserving Prompt:", finalPrompt);

        // Step 2: Use Pollinations.ai (Flux Model) to render the image with the enhanced prompt
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("이미지 생성 서버 응답 오류");

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const imageData = `data:image/jpeg;base64,${base64}`;

        return { success: true, imageData };

    } catch (error: unknown) {
        console.error("Image Gen Error:", error);
        const errorMessage = error instanceof Error ? error.message : "이미지 생성 실패";
        return { success: false, error: errorMessage };
    }
}
