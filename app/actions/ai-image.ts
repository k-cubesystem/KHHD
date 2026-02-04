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
    confidence?: number; // 신뢰도 점수 (0-100)
    improvementPrompt?: string;
    recommendations?: string[];
    facialFeatures?: {
        // 오관(五官) 분석
        ears?: { score: number; description: string };
        eyebrows?: { score: number; description: string };
        eyes?: { score: number; description: string };
        nose?: { score: number; description: string };
        mouth?: { score: number; description: string };
        // 삼정(三停) 분석
        upperStop?: { score: number; description: string }; // 상정(이마)
        middleStop?: { score: number; description: string }; // 중정(눈~코)
        lowerStop?: { score: number; description: string }; // 하정(입~턱)
    };
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
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const goalConfig = GOAL_PROMPTS[goal];

    const analysisPrompt = `당신은 30년 경력의 관상학 전문가입니다.
동양의 전통 명리학과 관상학을 깊이 연구했으며, 수천 명의 관상을 분석한 경험이 있습니다.

아래 얼굴 이미지를 전문가적 시각으로 정확히 분석하여 "${goalConfig.name}"에 대한 평가를 제공하세요.

[1단계: 오관(五官) 분석]
전통 관상학의 오관을 각각 10점 만점으로 평가하세요:

1. **귀(耳)** - 지혜와 장수의 상징
   - 형태, 크기, 위치, 색택 평가
   - 점수와 특징 기술

2. **눈썹(眉)** - 형제운과 사회성
   - 형태, 굵기, 농도, 균형 평가
   - 점수와 특징 기술

3. **눈(目)** - 정신과 지혜의 창
   - 크기, 형태, 눈빛, 쌍꺼풀 평가
   - 점수와 특징 기술

4. **코(鼻)** - 재물운과 권력운
   - 콧대 높이, 코끝 모양, 콧방울 크기 평가
   - 점수와 특징 기술

5. **입(口)** - 식복과 언변
   - 입술 두께, 입 크기, 치아 상태 평가
   - 점수와 특징 기술

[2단계: 삼정(三停) 분석]
얼굴을 3등분하여 균형을 평가하세요:

1. **상정(上停)** - 헤어라인부터 눈썹까지 (초년운 0-30세)
   - 이마의 넓이, 높이, 주름, 빛깔 평가
   - 점수: X/10

2. **중정(中停)** - 눈썹부터 코끝까지 (중년운 30-60세)
   - 눈, 코의 조화와 비율 평가
   - 점수: X/10

3. **하정(下停)** - 코끝부터 턱끝까지 (말년운 60세 이후)
   - 입, 턱의 견고함과 형태 평가
   - 점수: X/10

[3단계: 피부 찰색(察色) - 기색과 혈색]
- 현재 피부 광택, 혈색, 기운 상태 평가
- 건강 상태 및 운기(運氣) 흐름 파악

[4단계: ${goalConfig.name} 종합 평가]
- 현재 ${goalConfig.name} 점수: 0-100점
- 잠재력 점수: 0-100점
- 강화할 핵심 특징: ${goalConfig.traits}

[5단계: 구체적 개선 방법]
- 메이크업 기법 3가지
- 헤어스타일 조언
- 표정 및 자세 관리
- 일상 관리법 (수면, 운동, 식습관)

[CRITICAL: 출력 형식]
반드시 다음 태그들을 모두 포함하세요:
[[CURRENT_SCORE: 숫자]]
[[CONFIDENCE: 숫자]]
[[EARS: 숫자, 설명]]
[[EYEBROWS: 숫자, 설명]]
[[EYES: 숫자, 설명]]
[[NOSE: 숫자, 설명]]
[[MOUTH: 숫자, 설명]]
[[UPPER_STOP: 숫자, 설명]]
[[MIDDLE_STOP: 숫자, 설명]]
[[LOWER_STOP: 숫자, 설명]]

목표: ${goalConfig.desc}
강화할 특징: ${goalConfig.traits}

※ 긍정적이고 건설적인 톤을 유지하세요.
※ 의학적/성형 관련 조언은 절대 하지 마세요.
※ 관상학적 전문 용어를 사용하되, 이해하기 쉽게 설명하세요.`;

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

        // Extract scores with improved parsing
        const currentScoreMatch = analysisText.match(/\[\[CURRENT_SCORE:\s*(\d+)\]\]/);
        const currentScore = currentScoreMatch ? parseInt(currentScoreMatch[1]) : 65;

        const confidenceMatch = analysisText.match(/\[\[CONFIDENCE:\s*(\d+)\]\]/);
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;

        // Extract 오관(五官) scores
        const parseFeature = (tag: string) => {
            const regex = new RegExp(`\\[\\[${tag}:\\s*(\\d+),\\s*(.+?)\\]\\]`);
            const match = analysisText.match(regex);
            if (match) {
                return { score: parseInt(match[1]), description: match[2].trim() };
            }
            return { score: 7, description: "분석 중" };
        };

        const facialFeatures = {
            ears: parseFeature("EARS"),
            eyebrows: parseFeature("EYEBROWS"),
            eyes: parseFeature("EYES"),
            nose: parseFeature("NOSE"),
            mouth: parseFeature("MOUTH"),
            upperStop: parseFeature("UPPER_STOP"),
            middleStop: parseFeature("MIDDLE_STOP"),
            lowerStop: parseFeature("LOWER_STOP"),
        };

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
            confidence,
            facialFeatures,
            improvementPrompt,
            recommendations,
        };
    } catch (error: unknown) {
        console.error("Face Destiny Analysis Error:", error);
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return {
            success: false,
            error: errorMessage,
        };
    }
}

// 2. Interior Feng Shui Analysis - 풍수 인테리어 분석 및 개선 프롬프트 생성
export async function analyzeInteriorForFengshui(
    imageBase64: string,
    theme: InteriorTheme,
    roomType: string = "거실"
): Promise<InteriorAnalysisResult> {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
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
    } catch (error: unknown) {
        console.error("Interior Fengshui Analysis Error:", error);
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return {
            success: false,
            error: errorMessage,
        };
    }
}

// 3. Generate Image (Placeholder - 실제 이미지 생성 API 연동 필요)
export async function generateDestinyImage(
    originalImageBase64: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _prompt: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type: "face" | "interior"
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
    } catch (error: unknown) {
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

