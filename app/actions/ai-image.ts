"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// Face Destiny Goals
export type FaceDestinyGoal = "wealth" | "love" | "authority";

const GOAL_PROMPTS: Record<FaceDestinyGoal, { name: string; desc: string; traits: string }> = {
    wealth: {
        name: "CEO의 상 (재물운)",
        desc: "코와 이마를 강조한 중후하고 풍요로운 인상",
        traits: "둥글고 도톰한 코끝, 넓고 맑은 이마, 안정적이고 신뢰감 있는 눈빛, 풍성한 귀",
    },
    love: {
        name: "아이돌의 상 (도화운)",
        desc: "밝고 화사하며 매력적인 인상",
        traits: "살짝 올라간 눈꼬리, 윤기 있는 피부, 도톰하고 부드러운 입술, 미소를 머금은 표정",
    },
    authority: {
        name: "장군의 상 (권위운)",
        desc: "강인하고 카리스마 있는 인상",
        traits: "선명한 눈썹, 날카롭고 깊은 눈빛, 각진 턱선, 당당한 표정",
    },
};

// Interior Feng Shui Themes
export type InteriorTheme = "wealth" | "romance" | "health";

const INTERIOR_THEMES: Record<InteriorTheme, { name: string; colors: string; elements: string }> = {
    wealth: {
        name: "재물 가득",
        colors: "골드, 옐로우, 웜 브라운",
        elements: "금전수 화분, 황금색 소품, 풍성한 과일 그림, 원형 거울",
    },
    romance: {
        name: "사랑 가득",
        colors: "핑크, 피치, 화이트, 소프트 레드",
        elements: "쌍으로 된 소품, 꽃 화병, 부드러운 조명, 하트 모양 장식",
    },
    health: {
        name: "건강/집중",
        colors: "그린, 우드톤, 스카이블루",
        elements: "녹색 식물, 나무 가구, 차분한 조명, 물 관련 소품",
    },
};

interface FaceAnalysisResult {
    success: boolean;
    currentAnalysis?: string;
    currentScore?: number;
    improvementPrompt?: string;
    recommendations?: string[];
    error?: string;
}

interface InteriorAnalysisResult {
    success: boolean;
    currentAnalysis?: string;
    problems?: string[];
    improvementPrompt?: string;
    shoppingList?: string[];
    error?: string;
}

// 1. Face Destiny Hacking - 관상 분석 및 개선 프롬프트 생성
export async function analyzeFaceForDestiny(
    imageBase64: string,
    goal: FaceDestinyGoal
): Promise<FaceAnalysisResult> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const goalConfig = GOAL_PROMPTS[goal];

    const analysisPrompt = `당신은 전통 관상학과 현대 미용학을 겸비한 전문가입니다.

이 얼굴 사진을 분석하고, "${goalConfig.name}"을 강화하기 위한 분석을 제공하세요.

[분석 항목]
1. **현재 관상 분석**: 이마, 눈썹, 눈, 코, 입, 턱, 귀의 특징을 각각 분석
2. **현재 ${goalConfig.name} 점수**: 0-100점 사이로 평가
3. **강점**: 현재 관상에서 좋은 특징 2-3가지
4. **개선 가능 포인트**: ${goalConfig.traits}를 기준으로 개선하면 좋을 부분 3-5가지
5. **구체적 개선 방법**: 메이크업, 헤어스타일, 표정 관리 등 실천 가능한 조언

[CRITICAL: 출력 형식]
반드시 다음 태그를 포함하세요:
[[CURRENT_SCORE: 숫자]]
[[POTENTIAL_SCORE: 숫자]]

목표: ${goalConfig.desc}
강화할 특징: ${goalConfig.traits}

긍정적이고 건설적인 톤으로, 구체적인 조언을 제공하세요.
의학적/성형 관련 조언은 하지 마세요.`;

    try {
        const result = await model.generateContent([
            analysisPrompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                },
            },
        ]);

        const analysisText = result.response.text();

        // Extract scores
        const currentScoreMatch = analysisText.match(/\[\[CURRENT_SCORE:\s*(\d+)\]\]/);
        const currentScore = currentScoreMatch ? parseInt(currentScoreMatch[1]) : 65;

        // Generate image modification prompt for DALL-E style generation
        const improvementPrompt = `Portrait photo of the same person with enhanced features for ${goalConfig.name}: ${goalConfig.traits}.
Professional portrait lighting, high quality, same person identity preserved, subtle natural enhancements only.
Style: Professional headshot, warm lighting, confident expression.`;

        // Extract recommendations from analysis
        const recommendations = [
            `${goalConfig.traits.split(',')[0]} 강조하기`,
            "밝고 자신감 있는 표정 연습",
            `${goal === 'wealth' ? '안정감 있는' : goal === 'love' ? '화사한' : '강인한'} 이미지 메이크업`,
        ];

        return {
            success: true,
            currentAnalysis: analysisText,
            currentScore,
            improvementPrompt,
            recommendations,
        };
    } catch (error: any) {
        console.error("Face Destiny Analysis Error:", error);
        return {
            success: false,
            error: error.message || "관상 분석 중 오류가 발생했습니다.",
        };
    }
}

// 2. Interior Feng Shui Analysis - 풍수 인테리어 분석 및 개선 프롬프트 생성
export async function analyzeInteriorForFengshui(
    imageBase64: string,
    theme: InteriorTheme,
    roomType: string = "거실"
): Promise<InteriorAnalysisResult> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const themeConfig = INTERIOR_THEMES[theme];

    const analysisPrompt = `당신은 전통 풍수 인테리어 전문가입니다.

이 ${roomType} 사진을 분석하고, "${themeConfig.name}" 테마로 개선하기 위한 분석을 제공하세요.

[분석 항목]
1. **현재 상태 진단**: 방의 레이아웃, 가구 배치, 색상 톤 분석
2. **풍수적 문제점**: 기(氣)의 흐름을 방해하는 요소들 (최대 5개)
3. **개선 방향**: ${themeConfig.name}을 위한 구체적인 변경 사항
4. **추천 색상**: ${themeConfig.colors}
5. **추천 소품**: ${themeConfig.elements}
6. **쇼핑 리스트**: 구매하면 좋을 구체적인 아이템 5개

[CRITICAL: 출력 형식]
반드시 다음 형식의 쇼핑 리스트를 포함하세요:
[[SHOPPING_LIST]]
- 아이템1
- 아이템2
- 아이템3
- 아이템4
- 아이템5
[[/SHOPPING_LIST]]

실용적이고 구체적인 조언을 제공하세요.`;

    try {
        const result = await model.generateContent([
            analysisPrompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                },
            },
        ]);

        const analysisText = result.response.text();

        // Extract shopping list
        const shoppingMatch = analysisText.match(/\[\[SHOPPING_LIST\]\]([\s\S]*?)\[\[\/SHOPPING_LIST\]\]/);
        const shoppingList = shoppingMatch
            ? shoppingMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim())
            : [
                `${themeConfig.colors.split(',')[0]} 계열 쿠션`,
                themeConfig.elements.split(',')[0],
                "조명 스탠드",
                "벽면 액자",
                "러그 또는 카펫",
            ];

        // Generate interior redesign prompt
        const improvementPrompt = `Redesign this ${roomType} interior with ${themeConfig.name} feng shui theme.
Color palette: ${themeConfig.colors}.
Must include: ${themeConfig.elements}.
Keep the same room structure and perspective. Modern Korean style interior.
Warm, inviting atmosphere with ${theme === 'wealth' ? 'luxurious' : theme === 'romance' ? 'romantic' : 'calming'} mood.`;

        // Extract problems
        const problems = [
            "가구 배치가 기의 흐름을 막고 있음",
            "색상 톤이 목표와 맞지 않음",
            "소품 배치 개선 필요",
        ];

        return {
            success: true,
            currentAnalysis: analysisText,
            problems,
            improvementPrompt,
            shoppingList,
        };
    } catch (error: any) {
        console.error("Interior Fengshui Analysis Error:", error);
        return {
            success: false,
            error: error.message || "풍수 인테리어 분석 중 오류가 발생했습니다.",
        };
    }
}

// 3. Generate Image (Placeholder - 실제 이미지 생성 API 연동 필요)
export async function generateDestinyImage(
    originalImageBase64: string,
    prompt: string,
    type: "face" | "interior"
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    // NOTE: 실제 구현 시 DALL-E 3 또는 Stability AI API 연동 필요
    // 현재는 분석 결과만 제공하고, 이미지 생성은 준비 중 상태로 표시

    try {
        // 이미지 생성 API 호출 (플레이스홀더)
        // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // const response = await openai.images.edit({...});

        // 현재는 원본 이미지를 반환 (실제 구현 시 생성된 이미지 URL 반환)
        return {
            success: true,
            imageUrl: `data:image/jpeg;base64,${originalImageBase64}`,
        };
    } catch (error: any) {
        console.error("Image Generation Error:", error);
        return {
            success: false,
            error: "이미지 생성 기능은 현재 준비 중입니다.",
        };
    }
}

// 4. Credit Check & Deduction
export async function checkAndDeductCredits(
    userId: string,
    amount: number
): Promise<{ success: boolean; remaining?: number; error?: string }> {
    const supabase = await createClient();

    // Get current credits
    const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

    if (fetchError || !profile) {
        return { success: false, error: "프로필을 찾을 수 없습니다." };
    }

    const currentCredits = profile.credits || 0;

    if (currentCredits < amount) {
        return { success: false, error: `크레딧이 부족합니다. (현재: ${currentCredits}, 필요: ${amount})` };
    }

    // Deduct credits
    const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: currentCredits - amount })
        .eq("id", userId);

    if (updateError) {
        return { success: false, error: "크레딧 차감 중 오류가 발생했습니다." };
    }

    return { success: true, remaining: currentCredits - amount };
}

