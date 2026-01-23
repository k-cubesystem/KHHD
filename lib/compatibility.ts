import { SajuData } from "./saju";

// 천간 상생/상극 관계 맵
const GAN_RELATION: Record<string, Record<string, number>> = {
    // 0: 상극(나쁨), 1: 평범, 2: 상생(좋음)
    "甲": { "甲": 1, "乙": 1, "丙": 2, "丁": 2, "戊": 0, "己": 2, "庚": 0, "辛": 0, "壬": 2, "癸": 2 },
    // ... (간략화: 무작위보다는 오행 생극 원리에 따름. 목생화, 화생토...)
};

// 간단한 점수 계산 (Mock Logic for now due to complexity of real Saju)
export function calculateCompatibilityScore(saju1: SajuData, saju2: SajuData): { score: number, comment: string } {
    const dayGan1 = saju1.pillars.day.gan;
    const dayGan2 = saju2.pillars.day.gan;

    // TODO: 실제 명리학 로직 고도화 필요 (합, 충, 원진, 귀문 등)
    // 현재는 예시로 랜덤성 + 기본 점수 반환
    // 실제로는 오행의 균형이 중요함

    let baseScore = 70;

    // 오행 분포 비교
    // 예: 1번이 불이 많고, 2번이 물이 많으면 조후 균형 고려... (복잡하므로 간략화)

    const randomVar = Math.floor(Math.random() * 20); // 0~20
    const finalScore = Math.min(100, Math.max(0, baseScore + randomVar));

    let comment = "서로의 기운이 무난하게 어우러지는 관계입니다.";
    if (finalScore >= 90) comment = "천생연분의 기운이 느껴집니다. 서로 부족한 오행을 완벽히 채워줍니다.";
    else if (finalScore >= 80) comment = "매우 긍정적인 관계입니다. 함께하면 시너지가 발생합니다.";
    else if (finalScore < 60) comment = "서로 다름을 인정하고 배려가 필요한 관계입니다.";

    return { score: finalScore, comment };
}
