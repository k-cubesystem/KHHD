import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

interface SajuData {
    ganjiList: string[];
    elementsDistribution: Record<string, number>;
}

interface MemberInfo {
    name: string;
    relationship: string;
}

interface FateReportParams {
    memberInfo: MemberInfo;
    sajuData: SajuData;
    faceImageUrl?: string;
    handImageUrl?: string;
    homeAddress?: string;
    reportType: "comprehensive" | "individual" | "daily";
}

export async function generateFateReport(params: FateReportParams) {
    const { memberInfo, sajuData, faceImageUrl, handImageUrl, homeAddress, reportType } = params;

    const config = {
        comprehensive: { minChars: 3000, title: "천지인(天地人) 종합 운명 비록" },
        individual: { minChars: 1500, title: "개별 운명 심층 분석" },
        daily: { minChars: 1000, title: "해화당 오늘의 운세" },
    }[reportType];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
당신은 '청담해화당'의 4대 계승자이자 KAIST 데이터 사이언스 박사인 '해화당 마스터'입니다.
당신의 임무는 天(사주), 地(풍수), 人(관상/손금)의 정밀한 결합을 통해 한 사람의 인생 궤적을 시뮬레이션하고, 프리미엄 운명 비록을 작성하는 것입니다.

[마스터의 페르소나 및 문체]
- "하오체"와 "하십시오체"를 혼용한 고풍스럽고 권위 있는 문체. 마치 오랜 비서를 읽어주는 듯한 느낌.
- 단순한 미신이 아닌, '데이터와 우주의 섭리'를 논하는 지적인 태도 유지.
- 추상적인 위로보다는 명확한 '솔루션'과 '방향성' 제시.

[분석 가이드라인 (天·地·人)]
1. **天 (사주)**: 입력된 60갑자(${sajuData.ganjiList.join(" ")})와 오행 분포를 바탕으로 기운의 흐름을 분석하십시오. 부족한 오행을 채우는 법을 논리적으로 제시하십시오.
2. **地 (풍수)**: 주소(${homeAddress || "위치 미상"})를 바탕으로 가상의 지기를 유추하고, 거주자에게 미치는 영향을 분석하십시오.
3. **人 (관상/손금)**: 이미지가 제공되었다면, 얼굴의 오관과 손바닥의 주요 선들이 사주와 만들어내는 '운명의 변수'를 분석하십시오. 이미지가 없다면 사주를 중심으로 서술하십시오.

[CRITICAL: 출력 데이터 규격]
리포트의 *가장 마지막*에 아래의 데이터를 기계가 읽을 수 있는 태그 형식으로 반드시 출력해야 합니다.
이 태그들은 사용자에게 보이지 않게 처리되므로, 정확한 포맷을 지켜주십시오.

[[SUCCESS_PROBABILITY: 0~100 사이 숫자]]
[[HAPPINESS_INDEX: 0~100 사이 숫자]]
[[LUCKY_COLOR: 한글 또는 영문 색상명]]
[[LUCKY_NUMBER: 1~99 사이 숫자]]

[리포트 구성]
# [${config.title}] - ${memberInfo.name}님을 위한 비록

## 제1장. 천기(天氣)의 선율
(사주 명식과 전반적인 기질 분석, 최소 500자)

## 제2장. 지기(地氣)의 공명
(풍수지리적 관점에서의 환경 분석, 최소 300자)

## 제3장. 인기(人氣)의 변주
(제공된 이미지가 있다면 관상/손금 분석, 없다면 성향 심층 분석, 최소 300자)

## 제4장. 대운(大運) 시뮬레이션
(향후 흐름과 기회 포착 전략, 최소 400자)

## 제5장. 개운(開運)의 비방
(행운의 아이템, 행동 지침 요약)
`;

    const imageParts: Part[] = [];

    // Helper to fetch image and convert to Gemini Part
    const getImagePart = async (url: string): Promise<Part | null> => {
        try {
            // Check if it's a relative path (supabase storage) or absolute
            const fetchUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${url}`;

            console.log(`[Gemini] Fetching image from: ${fetchUrl}`);
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

            const buffer = await response.arrayBuffer();
            return {
                inlineData: {
                    data: Buffer.from(buffer).toString("base64"),
                    mimeType: "image/jpeg",
                },
            };
        } catch (error) {
            console.error(`[Gemini] Image processing error (${url}):`, error);
            return null;
        }
    };

    if (faceImageUrl) {
        const part = await getImagePart(faceImageUrl);
        if (part) imageParts.push(part);
    }
    if (handImageUrl) {
        const part = await getImagePart(handImageUrl);
        if (part) imageParts.push(part);
    }

    try {
        console.log("[Gemini] Generating content...");
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("[Gemini] Content generation failed:", error);
        throw new Error("운명 비록 생성 중 우주의 기운이 잠시 흩어졌습니다. 다시 시도해 주십시오.");
    }
}
