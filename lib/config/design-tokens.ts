/**
 * Design Tokens — Tailwind config 값을 JS/TS에서 참조할 때 사용
 * tailwind.config.ts 동기화 유지
 */
export const COLORS = {
  gold: {
    300: '#F4E4BA',
    400: '#E2D5B5',
    500: '#C9A84C',
    600: '#A8903F',
    700: '#8C7B50',
  },
  background: '#0A0A08',
  surface: '#16140F',
  charcoalDeep: '#0A0A08',
  seal: '#9E2B2B',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const

export const SEMANTIC = {
  error: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.20)', text: '#FCA5A5', solid: '#EF4444' },
  success: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.20)', text: '#86EFAC', solid: '#22C55E' },
  warning: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.20)', text: '#FCD34D', solid: '#F59E0B' },
  info: { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.20)', text: '#93C5FD', solid: '#3B82F6' },
} as const

/** 오방색 (五方色) — 한국 전통 컬러 시스템 */
export const OBANGSAEK = {
  red: '#9E2B2B', // 朱 (주) — CTA, 강조, 도장 레드 통일
  blue: '#2D5F8A', // 靑 (청) — 정보, 링크, 차분한 UI
  yellow: '#D4A017', // 黃 (황) — 골드 (기존 유지), 프리미엄
  white: '#F5F0E8', // 白 (백) — 한지 질감 배경
  black: '#1A1714', // 玄 (현) — 배경, 텍스트
} as const

/** 복 등급 컬러 */
export const BOK_TIER_COLORS = {
  SEED: '#8C7B50',
  SPROUT: '#22C55E',
  FLOWER: '#F472B6',
  TREE: '#10B981',
  FOREST: '#6EE7B7',
} as const

/** 가장 많이 쓰이는 메인 골드 hex — SVG, Chart, OG 이미지용 */
export const GOLD_500 = COLORS.gold[500]
export const GOLD_300 = COLORS.gold[300]
