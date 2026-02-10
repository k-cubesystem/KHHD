import { Sun, User2, Hand, Home, Heart, Coins, Sparkles, Calendar } from "lucide-react";

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

// Mission Categories for Family Management (Legacy - kept for compatibility)
export const MISSION_CATEGORIES = [
  { value: "SAJU", label: "사주", icon: Sun, cost: 1, path: "/protected/analysis/cheonjiin" },
  { value: "FACE", label: "관상", icon: User2, cost: 5, path: "/protected/saju/face" },
  { value: "HAND", label: "손금", icon: Hand, cost: 3, path: "/protected/saju/hand" },
  { value: "FENGSHUI", label: "풍수", icon: Home, cost: 2, path: "/protected/saju/fengshui" },
  { value: "COMPATIBILITY", label: "궁합", icon: Heart, cost: 2, path: "/protected/analysis" },
  { value: "TODAY", label: "오늘의운세", icon: Sun, cost: 0, path: "/protected/saju/today" },
  { value: "WEALTH", label: "재물운", icon: Coins, cost: 5, path: "/protected/analysis/wealth" },
  { value: "NEW_YEAR", label: "신년운세", icon: Sparkles, cost: 1, path: "/protected/analysis/new-year" },
] as const;

// Fortune Missions (8 categories with fortune context)
export const FORTUNE_MISSIONS = [
  {
    category: "SAJU",
    label: "사주",
    fortuneLabel: "운명의 기초",
    description: "운명의 기초를 다지는 사주 분석",
    icon: Sun,
    cost: 1,
    path: "/protected/analysis/cheonjiin",
  },
  {
    category: "FACE",
    label: "관상",
    fortuneLabel: "얼굴의 복",
    description: "얼굴에 담긴 복을 읽어내는 관상 분석",
    icon: User2,
    cost: 5,
    path: "/protected/saju/face",
  },
  {
    category: "HAND",
    label: "손금",
    fortuneLabel: "미래의 실마리",
    description: "손금으로 미래를 엿보는 수상 분석",
    icon: Hand,
    cost: 3,
    path: "/protected/saju/hand",
  },
  {
    category: "FENGSHUI",
    label: "풍수",
    fortuneLabel: "공간의 기운",
    description: "공간에 기운을 채우는 풍수 분석",
    icon: Home,
    cost: 2,
    path: "/protected/saju/fengshui",
  },
  {
    category: "COMPATIBILITY",
    label: "궁합",
    fortuneLabel: "인연의 조화",
    description: "인연의 조화를 확인하는 궁합 분석",
    icon: Heart,
    cost: 2,
    path: "/protected/analysis",
  },
  {
    category: "TODAY",
    label: "오늘의운세",
    fortuneLabel: "하루의 흐름",
    description: "하루의 흐름을 읽는 일진 분석",
    icon: Sun,
    cost: 0,
    path: "/protected/saju/today",
  },
  {
    category: "WEALTH",
    label: "재물운",
    fortuneLabel: "재물의 기운",
    description: "재물의 기운을 끌어오는 재운 분석",
    icon: Coins,
    cost: 5,
    path: "/protected/analysis/wealth",
  },
  {
    category: "NEW_YEAR",
    label: "신년운세",
    fortuneLabel: "새해의 운",
    description: "새해의 운을 미리 보는 연운 분석",
    icon: Sparkles,
    cost: 1,
    path: "/protected/analysis/new-year",
  },
] as const;
