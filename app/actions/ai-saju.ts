"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

interface BirthData {
    name: string;
    birthDate: string;
    birthTime: string;
    calendarType: "solar" | "lunar";
    gender: "male" | "female";
}

// 1. 사주 풀이 (Deep Analysis)
export async function analyzeSajuDetail(birthData: BirthData, concern?: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `당신은 40년 경력의 정통 명리학 전문가입니다.

다음 사주 정보를 바탕으로 심층 분석을 제공하세요:
- 이름: ${birthData.name}
- 생년월일: ${birthData.birthDate} (${birthData.calendarType === "solar" ? "양력" : "음력"})
- 생시: ${birthData.birthTime}
- 성별: ${birthData.gender === "male" ? "남성" : "여성"}

${concern ? `특별히 다음 고민에 대해 집중적으로 답변해주세요: ${concern}` : ""}

다음 항목을 포함하여 분석하세요:
1. **사주 구성**: 천간, 지지, 음양오행 분석
2. **용신과 격국**: 가장 필요한 오행과 사주의 격국
3. **성격과 재능**: 타고난 성향과 강점
4. **직업운**: 적합한 직업군과 커리어 방향
5. **재물운**: 재물 획득 방식과 재테크 조언
6. **인간관계**: 대인관계 패턴과 조화로운 관계 형성법
7. **건강**: 주의해야 할 건강 부위
8. **개운법**: 실천 가능한 구체적인 개운 방법

전문적이면서도 따뜻하고 희망적인 톤으로 작성하세요.`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        return {
            success: true,
            analysis: response.text(),
        };
    } catch (error: any) {
        console.error("Saju Detail Analysis Error:", error);
        return {
            success: false,
            error: error.message || "분석 중 오류가 발생했습니다.",
        };
    }
}

// 2. 오늘의 운세
export async function getTodayFortune(birthData: BirthData) {
    const today = new Date().toLocaleDateString("ko-KR");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `당신은 친근한 운세 전문가입니다.

오늘 날짜: ${today}

다음 사람의 오늘 운세를 분석하세요:
- 생년월일: ${birthData.birthDate}
- 성별: ${birthData.gender === "male" ? "남성" : "여성"}

다음 형식으로 JSON 응답하세요:
{
  "overall": { "score": 75, "message": "전반적으로 좋은 하루입니다..." },
  "love": { "score": 80, "message": "연애운이 상승하는 날..." },
  "money": { "score": 65, "message": "재물운은 평범합니다..." },
  "career": { "score": 70, "message": "업무에서 좋은 성과가..." },
  "health": { "score": 85, "message": "건강 상태가 좋습니다..." },
  "luckyColor": "파란색",
  "luckyNumber": 7,
  "advice": "오늘은 새로운 도전을 시작하기 좋은 날입니다."
}

점수는 0-100 사이로, 메시지는 2-3문장으로 작성하세요.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // JSON 추출 (마크다운 코드블록 제거)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const fortune = JSON.parse(jsonMatch[0]);
            return { success: true, fortune };
        }

        return {
            success: false,
            error: "운세 데이터 파싱 실패",
        };
    } catch (error: any) {
        console.error("Today Fortune Error:", error);
        return {
            success: false,
            error: error.message || "운세 생성 중 오류가 발생했습니다.",
        };
    }
}

// 3. 관상 분석 (Vision AI)
export async function analyzeFace(imageBase64: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `당신은 전통 관상학 전문가입니다.

이 사진 속 얼굴을 분석하여 다음을 제공하세요:

1. **얼굴형과 기본 특징**: 얼굴형, 이목구비의 특징
2. **성격 분석**: 관상학적 성격 해석
3. **재물운**: 이마, 코, 턱선을 통한 재물운 분석
4. **대인운**: 눈, 입을 통한 인간관계 운세
5. **건강**: 얼굴색, 윤기를 통한 건강 상태
6. **조언**: 관상 개선을 위한 실천 가능한 조언

긍정적이고 건설적인 톤으로 작성하세요.`;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                },
            },
        ]);

        return {
            success: true,
            analysis: result.response.text(),
        };
    } catch (error: any) {
        console.error("Face Analysis Error:", error);
        return {
            success: false,
            error: error.message || "관상 분석 중 오류가 발생했습니다.",
        };
    }
}

// 4. 손금 분석 (Vision AI)
export async function analyzePalm(imageBase64: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `당신은 전통 수상학(손금) 전문가입니다.

이 손금 사진을 분석하여 다음을 제공하세요:

1. **주요 선 분석**:
   - 생명선: 건강과 생명력
   - 지능선: 사고방식과 재능
   - 감정선: 감정 표현과 연애운
   - 운명선: 커리어와 인생 방향

2. **특수 문양**: 별, 삼각형, 섬 등 특별한 표시

3. **손 모양**: 손가락 길이, 손바닥 형태

4. **종합 운세**: 재물, 건강, 사랑, 성공운

5. **조언**: 손금 개선을 위한 실천 방법

희망적이고 구체적으로 작성하세요.`;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                },
            },
        ]);

        return {
            success: true,
            analysis: result.response.text(),
        };
    } catch (error: any) {
        console.error("Palm Analysis Error:", error);
        return {
            success: false,
            error: error.message || "손금 분석 중 오류가 발생했습니다.",
        };
    }
}

// 5. 풍수 분석 (Vision AI)
export async function analyzeFengshui(imageBase64: string, roomType: string = "거실") {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `당신은 전통 풍수 인테리어 전문가입니다.

이 ${roomType} 사진을 풍수 관점에서 분석하세요:

1. **현재 상태 진단**:
   - 기의 흐름 (氣의 순환)
   - 음양 균형
   - 오행 배치

2. **문제점 지적**:
   - 풍수적으로 좋지 않은 배치
   - 개선이 필요한 부분

3. **개선 방안**:
   - 가구 재배치 제안
   - 색상 조화
   - 소품 추천 (식물, 거울, 조명 등)

4. **방위별 조언**:
   - 재물운을 높이는 방향
   - 건강운을 높이는 배치

5. **즉시 실천 가능한 팁**: 3가지

실용적이고 구체적으로 작성하세요.`;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                },
            },
        ]);

        return {
            success: true,
            analysis: result.response.text(),
        };
    } catch (error: any) {
        console.error("Fengshui Analysis Error:", error);
        return {
            success: false,
            error: error.message || "풍수 분석 중 오류가 발생했습니다.",
        };
    }
}
