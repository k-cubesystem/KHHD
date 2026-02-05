// Feature Keys (for dynamic pricing from DB)
export const FEATURE_KEYS = {
    SAJU_BASIC: 'SAJU_BASIC',
    SAJU_PREMIUM: 'SAJU_PREMIUM',
    COMPATIBILITY: 'COMPATIBILITY',
    FACE_AI: 'FACE_AI',
    PALM_AI: 'PALM_AI',
    FENGSHUI_AI: 'FENGSHUI_AI',
    IMAGE_GEN: 'IMAGE_GEN',
} as const;

// Approximate costs for UI display (actual costs are fetched from DB)
export const TALISMAN_COSTS_DISPLAY = {
    sajuAnalysis: 1,
    faceAnalysis: 2,
    palmAnalysis: 2,
    interiorAnalysis: 3,
    imageGeneration: 5,
} as const;

export type FaceDestinyGoal = "wealth" | "love" | "authority";
export type InteriorTheme = "wealth" | "romance" | "health";

// Talisman Package Pricing
export const TALISMAN_PACKAGES = [
    {
        id: 'small',
        name: '소원 성취 팩',
        talismans: 3,
        price: 9900,
        description: '급할 때 딱 좋은 기본 팩',
    },
    {
        id: 'medium',
        name: '만사 형통 팩',
        talismans: 10,
        price: 29900,
        description: '가장 인기 있는 실속형 팩',
        badge: 'BEST',
    },
    {
        id: 'large',
        name: '운수 대통 팩',
        talismans: 30,
        price: 79000,
        description: '최고의 가성비 대용량 팩',
        badge: 'PRO',
    },
] as const;
