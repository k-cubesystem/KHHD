"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSajuData } from "@/lib/domain/saju/saju";
import { calculateDaewoon } from "@/lib/domain/saju/manse";
import { deductTalisman } from "./wallet-actions";
import { logger } from "@/lib/utils/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface WealthAnalysisParams {
    memberId: string;
}

interface WealthAnalysisResult {
    success: boolean;
    analysis?: string;
    error?: string;
}

/**
 * 재물운 심층 분석
 * 사주 기반으로 재물운의 흐름, 시기, 방향을 AI가 분석
 */
export async function analyzeWealth(params: WealthAnalysisParams): Promise<WealthAnalysisResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "로그인이 필요합니다." };
        }

        // 1. 부적 차감 (재물운 분석 비용: 5 부적)
        const WEALTH_ANALYSIS_COST = 5;
        const deductResult = await deductTalisman("wealth_analysis", WEALTH_ANALYSIS_COST);

        if (!deductResult.success) {
            return {
                success: false,
                error: "부적이 부족합니다. 멤버십 페이지에서 충전해주세요."
            };
        }

        // 2. 가족 구성원 정보 조회
        const { data: member, error: memberError } = await supabase
            .from("family_members")
            .select("*")
            .eq("id", params.memberId)
            .single();

        if (memberError || !member) {
            return { success: false, error: "대상 정보를 찾을 수 없습니다." };
        }

        // 3. 사주 데이터 계산
        const sajuData = getSajuData(
            member.birth_date,
            member.birth_time || "00:00",
            member.calendar_type === "solar"
        );

        // 4. 대운 계산 (현재 나이 추정)
        const birthYear = new Date(member.birth_date).getFullYear();
        const currentYear = new Date().getFullYear();
        const currentAge = currentYear - birthYear;

        const daewoonData = calculateDaewoon(
            member.birth_date,
            member.birth_time || "00:00",
            member.gender || "male",
            currentAge
        );

        // 5. AI 프롬프트 생성
        const prompt = `
당신은 30년 경력의 사주명리 전문가이자 재물운 컨설턴트입니다.
아래 사주 정보를 바탕으로 ${member.name}님의 재물운을 심층 분석해주세요.

【기본 정보】
- 이름: ${member.name}
- 생년월일: ${member.birth_date}
- 생시: ${member.birth_time || "미상"}
- 성별: ${member.gender === "male" ? "남성" : "여성"}
- 현재 나이: 만 ${currentAge}세

【사주팔자】
- 년주(年柱): ${sajuData.pillars.year.ganji} (${sajuData.pillars.year.element})
- 월주(月柱): ${sajuData.pillars.month.ganji} (${sajuData.pillars.month.element})
- 일주(日柱): ${sajuData.pillars.day.ganji} (${sajuData.pillars.day.element})
- 시주(時柱): ${sajuData.pillars.time.ganji} (${sajuData.pillars.time.element})

【오행 분포】
- 木: ${sajuData.elementsDistribution.木}
- 火: ${sajuData.elementsDistribution.火}
- 土: ${sajuData.elementsDistribution.土}
- 金: ${sajuData.elementsDistribution.金}
- 水: ${sajuData.elementsDistribution.水}

【현재 대운】
${daewoonData.find(d => d.isCurrent) ?
                `${daewoonData.find(d => d.isCurrent)!.pillar.korean} (${daewoonData.find(d => d.isCurrent)!.startAge}-${daewoonData.find(d => d.isCurrent)!.endAge}세)` :
                "정보 없음"}

【분석 요청사항】
다음 형식으로 재물운을 분석해주세요:

# ${member.name}님의 재물운 심층 분석

## 📊 재물운의 흐름

재물은 쫓는 것이 아니라, 길목을 지키는 것입니다. ${member.name}님의 사주를 분석한 결과, 다음과 같은 재물운의 특징을 발견했습니다.

[사주 구조상 재물운의 전반적인 특징을 설명해주세요]

### 🌟 주요 재물운 시기

[향후 10년간의 재물운 흐름을 3-4개 시기로 나누어 설명]

**상승기 (YYYY-YYYY)**
- [해당 시기의 재물운 특징]
- [주의할 점]
- [실천 방안]

**안정기 (YYYY-YYYY)**
- [해당 시기의 재물운 특징]
- [주의할 점]
- [실천 방안]

### 💰 재물 획득 방식

당신의 사주 구조상:
- **정재(正財)**: [안정적 수입에 대한 분석]
- **편재(偏財)**: [예상치 못한 재물에 대한 분석]
- **식상(食傷)**: [창의적 활동을 통한 수익에 대한 분석]

### 🎯 재물운 향상 조언

1. **인맥 관리**: [구체적인 조언]
2. **전문성 강화**: [구체적인 조언]
3. **투자 타이밍**: [구체적인 조언 - 계절, 월별]
4. **방위**: [길한 방위 안내]
5. **색상**: [재물운 상승 색상]

### ⚠️ 주의사항

- [과도한 욕심에 대한 경고]
- [충동적 투자 주의]
- [금전 거래 주의사항]

### 💎 특별 조언

[이 사람만의 특별한 재물운 특성과 활용법]

---

※ 이 분석은 전통 명리학을 바탕으로 한 AI 참고 자료이며, 실제 재정 결정은 전문가와 상담 후 진행하시기 바랍니다.

【중요】
- 구체적인 연도는 현재 연도(${currentYear})를 기준으로 작성
- 추상적인 표현보다는 실천 가능한 구체적인 조언 제공
- 긍정적이면서도 현실적인 톤 유지
- 한국어 존댓말 사용
- 명리학 용어는 한글과 한자를 병기
`;

        // 6. Gemini AI 호출
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const analysis = result.response.text();

        // 7. 분석 결과 저장 (선택사항 - 향후 히스토리 기능)
        // TODO: wealth_analysis 테이블에 저장

        return {
            success: true,
            analysis
        };

    } catch (error) {
        logger.error("[WealthAnalysis] Error:", error);
        const message = error instanceof Error ? error.message : "재물운 분석 중 오류가 발생했습니다.";
        return {
            success: false,
            error: message
        };
    }
}
