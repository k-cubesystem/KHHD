/**
 * Design Tokens — Tailwind config 값을 JS/TS에서 참조할 때 사용
 * tailwind.config.ts의 gold palette과 동기화 유지
 */
export const COLORS = {
  gold: {
    300: '#F4E4BA',
    400: '#E2D5B5',
    500: '#D4AF37',
    600: '#C8B273',
    700: '#8C7B50',
  },
  background: '#0D0D0D',
  surface: '#1A1917',
  charcoalDeep: '#0F0F0F',
  seal: '#8E2828',
} as const

/** 가장 많이 쓰이는 메인 골드 hex — SVG, Chart, OG 이미지용 */
export const GOLD_500 = COLORS.gold[500]
export const GOLD_300 = COLORS.gold[300]
