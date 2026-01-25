import { SajuData } from "./saju";

/**
 * 고급 궁합 계산 - 실제 명리학 기반
 * Phase 21에서 추가됨
 */

// 천간 합 (天干合)
const TIANGAN_HE: Record<string, string> = {
    "甲": "己", // 갑기합토
    "己": "甲",
    "乙": "庚", // 을경합금
    "庚": "乙",
    "丙": "辛", // 병신합수
    "辛": "丙",
    "丁": "壬", // 정임합목
    "壬": "丁",
    "戊": "癸", // 무계합화
    "癸": "戊",
};

// 지지 합 (地支合)
const DIZHI_HE: Record<string, string> = {
    "子": "丑", // 자축합토
    "丑": "子",
    "寅": "亥", // 인해합목
    "亥": "寅",
    "卯": "戌", // 묘술합화
    "戌": "卯",
    "辰": "酉", // 진유합금
    "酉": "辰",
    "巳": "申", // 사신합수
    "申": "巳",
    "午": "未", // 오미합화
    "未": "午",
};

// 지지 충 (地支沖)
const DIZHI_CHONG: Record<string, string> = {
    "子": "午", // 자오충
    "午": "子",
    "丑": "未", // 축미충
    "未": "丑",
    "寅": "申", // 인신충
    "申": "寅",
    "卯": "酉", // 묘유충
    "酉": "卯",
    "辰": "戌", // 진술충
    "戌": "辰",
    "巳": "亥", // 사해충
    "亥": "巳",
};

// 오행 상생 (相生)
const WUXING_SHENG: Record<string, string> = {
    "木": "火", // 목생화
    "火": "土", // 화생토
    "土": "金", // 토생금
    "金": "水", // 금생수
    "水": "木", // 수생목
};

// 오행 상극 (相剋)
const WUXING_KE: Record<string, string> = {
    "木": "土", // 목극토
    "土": "水", // 토극수
    "水": "火", // 수극화
    "火": "金", // 화극금
    "金": "木", // 금극목
};

/**
 * 고급 궁합 점수 계산
 */
export function calculateAdvancedCompatibility(
    saju1: SajuData,
    saju2: SajuData
): {
    score: number;
    type: string;
    reasons: string[];
    description: string;
    advice: string[];
} {
    let score = 70; // 기본 점수
    const reasons: string[] = [];

    // 1. 일간(日干) 천간 합 체크 (+15점)
    const dayGan1 = saju1.pillars.day.gan;
    const dayGan2 = saju2.pillars.day.gan;

    if (TIANGAN_HE[dayGan1] === dayGan2) {
        score += 15;
        reasons.push(`천간합(${dayGan1}${dayGan2}) +15점`);
    }

    // 2. 일지(日支) 지지 합 체크 (+10점)
    const dayZhi1 = saju1.pillars.day.zhi;
    const dayZhi2 = saju2.pillars.day.zhi;

    if (DIZHI_HE[dayZhi1] === dayZhi2) {
        score += 10;
        reasons.push(`지지합(${dayZhi1}${dayZhi2}) +10점`);
    }

    // 3. 일지(日支) 지지 충 체크 (-20점)
    if (DIZHI_CHONG[dayZhi1] === dayZhi2) {
        score -= 20;
        reasons.push(`지지충(${dayZhi1}${dayZhi2}) -20점`);
    }

    // 4. 일간(日干) 오행 상생 체크 (+10점)
    const dayElement1 = saju1.dayMasterElement;
    const dayElement2 = saju2.dayMasterElement;

    if (WUXING_SHENG[dayElement1] === dayElement2) {
        score += 10;
        reasons.push(`오행상생(${dayElement1}→${dayElement2}) +10점`);
    } else if (WUXING_SHENG[dayElement2] === dayElement1) {
        score += 10;
        reasons.push(`오행상생(${dayElement2}→${dayElement1}) +10점`);
    }

    // 5. 일간(日干) 오행 상극 체크 (-10점)
    if (WUXING_KE[dayElement1] === dayElement2) {
        score -= 10;
        reasons.push(`오행상극(${dayElement1}→${dayElement2}) -10점`);
    } else if (WUXING_KE[dayElement2] === dayElement1) {
        score -= 10;
        reasons.push(`오행상극(${dayElement2}→${dayElement1}) -10점`);
    }

    // 6. 오행 균형 체크 (±10점)
    const balance = calculateElementBalance(saju1, saju2);
    if (balance > 0) {
        score += balance;
        reasons.push(`오행균형보완 +${balance}점`);
    } else if (balance < 0) {
        score += balance; // balance가 음수이므로
        reasons.push(`오행불균형 ${balance}점`);
    }

    // 점수 범위 제한 (0-100)
    score = Math.max(0, Math.min(100, score));

    // 궁합 타입 결정
    const type = getCompatibilityType(score);

    // 설명 생성
    const description = generateDescription(score, type);

    // 조언 생성
    const advice = generateAdvice(score, reasons);

    return {
        score,
        type,
        reasons,
        description,
        advice,
    };
}

/**
 * 오행 균형 계산
 * 두 사람의 오행 분포를 비교하여 서로 보완하는지 확인
 */
function calculateElementBalance(saju1: SajuData, saju2: SajuData): number {
    const elements1 = saju1.elementsDistribution;
    const elements2 = saju2.elementsDistribution;

    let balanceScore = 0;

    // 각 오행별로 비교
    for (const element of ["木", "火", "土", "金", "水"]) {
        const count1 = elements1[element] || 0;
        const count2 = elements2[element] || 0;

        // 한쪽이 부족하고 다른 쪽이 많으면 보완 (+점수)
        if (count1 <= 1 && count2 >= 3) {
            balanceScore += 5;
        } else if (count2 <= 1 && count1 >= 3) {
            balanceScore += 5;
        }

        // 둘 다 많거나 둘 다 부족하면 불균형 (-점수)
        if ((count1 >= 3 && count2 >= 3) || (count1 <= 1 && count2 <= 1)) {
            balanceScore -= 3;
        }
    }

    return Math.max(-10, Math.min(10, balanceScore));
}

/**
 * 궁합 타입 결정
 */
function getCompatibilityType(score: number): string {
    if (score >= 90) return "천생연분";
    if (score >= 80) return "대길";
    if (score >= 70) return "상생";
    if (score >= 60) return "평화";
    if (score >= 50) return "조화필요";
    return "주의";
}

/**
 * 설명 생성
 */
function generateDescription(score: number, type: string): string {
    if (score >= 90) {
        return "두 분은 서로 없어서는 안 될 존재입니다. 천간과 지지가 조화를 이루며, 오행의 균형이 완벽합니다.";
    }
    if (score >= 80) {
        return "매우 긍정적인 관계입니다. 서로의 장점을 살려주고 단점을 보완하는 궁합입니다.";
    }
    if (score >= 70) {
        return "서로 상생하는 관계입니다. 자연스러운 조화를 이루며 함께 발전할 수 있습니다.";
    }
    if (score >= 60) {
        return "평화로운 관계입니다. 큰 충돌 없이 무난하게 지낼 수 있으나, 특별한 시너지를 위해서는 노력이 필요합니다.";
    }
    if (score >= 50) {
        return "서로 다른 에너지를 가지고 있어 조화가 필요합니다. 서로의 차이를 인정하고 배려할 때 관계가 개선됩니다.";
    }
    return "기운의 충돌이 있을 수 있습니다. 서로를 이해하려는 노력과 인내가 필요하며, 적절한 거리 유지가 도움이 됩니다.";
}

/**
 * 조언 생성
 */
function generateAdvice(score: number, reasons: string[]): string[] {
    const advice: string[] = [];

    if (score >= 80) {
        advice.push("현재의 좋은 관계를 유지하세요");
        advice.push("함께하는 시간을 더 늘려보세요");
        advice.push("서로의 성과를 축하하고 격려하세요");
    } else if (score >= 60) {
        advice.push("정기적인 대화 시간을 가지세요");
        advice.push("서로의 관심사를 공유해보세요");
        advice.push("작은 배려와 감사 표현을 실천하세요");
    } else {
        advice.push("서로의 차이점을 인정하고 존중하세요");
        advice.push("감정적인 대화는 잠시 쉬어가세요");
        advice.push("공통의 목표를 설정해보세요");
    }

    // 충(沖)이 있는 경우 추가 조언
    if (reasons.some(r => r.includes("지지충"))) {
        advice.push("⚠️ 지지충이 있으므로 의견 차이 시 감정 조절에 유의하세요");
    }

    // 합(合)이 있는 경우 추가 조언
    if (reasons.some(r => r.includes("천간합")) || reasons.some(r => r.includes("지지합"))) {
        advice.push("✨ 천연 궁합으로 자연스러운 교감이 가능합니다");
    }

    return advice;
}

/**
 * 간단한 궁합 점수만 계산 (레거시 호환)
 */
export function calculateSimpleCompatibility(
    saju1: SajuData,
    saju2: SajuData
): { score: number; comment: string } {
    const result = calculateAdvancedCompatibility(saju1, saju2);
    return {
        score: result.score,
        comment: result.description,
    };
}
