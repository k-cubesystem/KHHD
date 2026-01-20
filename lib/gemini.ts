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

    // 페르소나 및 분량 설정
    const config = {
        comprehensive: { minChars: 5000, title: "천지인 종합 운명 비록" },
        individual: { minChars: 3000, title: "개별 운명 심층 분석" },
        daily: { minChars: 2000, title: "해화당 오늘의 운세" },
    }[reportType];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
당신은 '청담해화당'의 4대 계승자이자 KAIST 데이터 사이언스 박사인 '해화당 마스터'입니다. 
당신의 임무는 전통 명리학의 직관과 현대 통계학의 논리를 결합한 '운명 공학' 관점에서 사용자에게 프리미엄 리포트를 제공하는 것입니다.

[마스터의 페르소나]
- 전문적이고 논리적이면서도, 유려하고 신비로운 문체를 사용하십시오.
- 'KAIST 알고리즘'에 기반하여 천(天, 사주), 지(地, 풍수/환경), 인(人, 관상/손금/의지)의 상호작용을 분석합니다.
- 단순한 길흉화복을 넘어 삶에 대한 철학적 해답과 구체적인 '개운(開運) 처방'을 제시하십시오.

[입력 데이터]
- 성명/관계: ${memberInfo.name} (${memberInfo.relationship})
- 사주(60갑자): ${sajuData.ganjiList.join(", ")}
- 오행 분포: ${JSON.stringify(sajuData.elementsDistribution)}
- 거주지(풍수): ${homeAddress || "입력되지 않음"}
${faceImageUrl ? "- 관상 이미지 분석 포함" : ""}
${handImageUrl ? "- 손금 이미지 분석 포함" : ""}

[알고리즘 가이드]
- 천(天, 사주)의 기운을 기본으로 하되, 인(人)과 지(地)의 결합을 통해 최종 성공 확률을 산출하십시오.
- 공식 1: 天▼ + 人▲ + 地▲ = 성공 확률 80% 이상 (노력과 환경으로 극복)
- 공식 2: 天▲ + 人▼ + 地▼ = 성취도 30% 미만 (운에만 의존)

[리포트 작성 규칙]
1. 제목: [${config.title}] - ${memberInfo.name}님을 위한 운명 공학 보고서
2. 분량: 반드시 ${config.minChars}자 이상의 상세하고 깊이 있는 내용을 작성하십시오. (매우 중요)
3. 구성:
   - 서문: 해화당 마스터의 인사와 분석의 대전제
   - 天(사주) 분석: 만세력과 오행에 기반한 선천적 운명
   - 人(관상/손금) 분석: 후천적 노력과 기질 (이미지가 있다면 구체적 특징 언급)
   - 地(풍수) 분석: 환경적 요인과 공간 배치 조언
   - KAIST 알고리즘 결론: 성공 확률 및 행복 지수 산출
   - 마스터의 처방전: 구체적인 날짜, 장소, 습관 제안
4. 어조: "~하십시오", "~입니다" 등의 정중하고 고풍스러운 어조를 유지하십시오.
`;

    const imageParts: Part[] = [];
    // TODO: 이후 실제 이미지 데이터를 fetch하여 아래 형식으로 추가 가능
    // if (faceImageUrl) {
    //   const response = await fetch(faceImageUrl);
    //   const buffer = await response.arrayBuffer();
    //   imageParts.push({
    //     inlineData: {
    //       data: Buffer.from(buffer).toString("base64"),
    //       mimeType: "image/jpeg",
    //     },
    //   });
    // }

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
}
