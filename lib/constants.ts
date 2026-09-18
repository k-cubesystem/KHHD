import { Sun, User2, Hand, Home, Heart, Coins, Sparkles } from 'lucide-react'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'

// Feature Keys (for dynamic pricing from DB)
export const FEATURE_KEYS = {
  SAJU_BASIC: 'SAJU_BASIC',
  SAJU_PREMIUM: 'SAJU_PREMIUM',
  COMPATIBILITY: 'COMPATIBILITY',
  FACE_AI: 'FACE_AI',
  PALM_AI: 'PALM_AI',
  FENGSHUI_AI: 'FENGSHUI_AI',
  IMAGE_GEN: 'IMAGE_GEN',
} as const

export type FaceDestinyGoal = 'wealth' | 'love' | 'authority'
export type InteriorTheme = 'wealth' | 'romance' | 'health'

// 이용권 1장의 대표 원화가 — 어드민 원가율 계산 전용. 판매가의 정본은 DB price_plans(product_kind='pass')다.
// 5장 팩(19,800원) 기준 → 3,960원/장. 가격 개편 시 이 기준 팩만 바꾼다.
const REFERENCE_PASS_PACK = { passes: 5, priceKrw: 19_800 } as const
export const KRW_PER_PASS = Math.round(REFERENCE_PASS_PACK.priceKrw / REFERENCE_PASS_PACK.passes)

// Mission Categories for Family Management (Legacy - kept for compatibility)
// Mission Categories with Updated Paths
// cost 는 단일 소스(feature-costs.ts)에서 파생 — 표시 = 실차감. 하드코딩 금지.
export const MISSION_CATEGORIES = [
  { value: 'SAJU', label: '사주', icon: Sun, cost: FEATURE_COST.saju.display, path: '/protected/analysis/cheonjiin' },
  { value: 'FACE', label: '관상', icon: User2, cost: FEATURE_COST.face.display, path: '/protected/studio/face' },
  { value: 'HAND', label: '손금', icon: Hand, cost: FEATURE_COST.palm.display, path: '/protected/studio/palm' },
  {
    value: 'FENGSHUI',
    label: '풍수',
    icon: Home,
    cost: FEATURE_COST.fengshui.display,
    path: '/protected/studio/fengshui',
  },
  {
    value: 'COMPATIBILITY',
    label: '궁합',
    icon: Heart,
    cost: FEATURE_COST.compatibility.display,
    path: '/protected/analysis/compatibility',
  },
  {
    value: 'TODAY',
    label: '오늘의운세',
    icon: Sun,
    cost: FEATURE_COST.today.display,
    path: '/protected/analysis/today',
  },
  {
    value: 'WEALTH',
    label: '재물운',
    icon: Coins,
    cost: FEATURE_COST.wealth.display,
    path: '/protected/analysis/wealth',
  },
  {
    value: 'NEW_YEAR',
    label: '신년운세',
    icon: Sparkles,
    cost: FEATURE_COST.newYear.display,
    path: '/protected/analysis/new-year',
  },
] as const

// Fortune Missions (8 categories with fortune context)
export const FORTUNE_MISSIONS = [
  {
    category: 'SAJU',
    label: '사주',
    fortuneLabel: '운명의 기초',
    description: '운명의 기초를 다지는 사주 분석',
    icon: Sun,
    cost: FEATURE_COST.saju.display,
    path: '/protected/analysis/cheonjiin',
  },
  {
    category: 'FACE',
    label: '관상',
    fortuneLabel: '얼굴의 복',
    description: '얼굴에 담긴 복을 읽어내는 관상 분석',
    icon: User2,
    cost: FEATURE_COST.face.display,
    path: '/protected/studio/face',
  },
  {
    category: 'HAND',
    label: '손금',
    fortuneLabel: '미래의 실마리',
    description: '손금으로 미래를 엿보는 수상 분석',
    icon: Hand,
    cost: FEATURE_COST.palm.display,
    path: '/protected/studio/palm',
  },
  {
    category: 'FENGSHUI',
    label: '풍수',
    fortuneLabel: '공간의 기운',
    description: '공간에 기운을 채우는 풍수 분석',
    icon: Home,
    cost: FEATURE_COST.fengshui.display,
    path: '/protected/studio/fengshui',
  },
  {
    category: 'COMPATIBILITY',
    label: '궁합',
    fortuneLabel: '인연의 조화',
    description: '인연의 조화를 확인하는 궁합 분석',
    icon: Heart,
    cost: FEATURE_COST.compatibility.display,
    path: '/protected/analysis/compatibility',
  },
  {
    category: 'TODAY',
    label: '오늘의운세',
    fortuneLabel: '하루의 흐름',
    description: '하루의 흐름을 읽는 일진 분석',
    icon: Sun,
    cost: FEATURE_COST.today.display,
    path: '/protected/analysis/fortune',
  },
  {
    category: 'WEALTH',
    label: '재물운',
    fortuneLabel: '재물의 기운',
    description: '재물의 기운을 끌어오는 재운 분석',
    icon: Coins,
    cost: FEATURE_COST.wealth.display,
    path: '/protected/analysis/wealth',
  },
  {
    category: 'NEW_YEAR',
    label: '신년운세',
    fortuneLabel: '새해의 운',
    description: '새해의 운을 미리 보는 연운 분석',
    icon: Sparkles,
    cost: FEATURE_COST.newYear.display,
    path: '/protected/analysis/new-year',
  },
] as const
