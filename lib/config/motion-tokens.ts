/**
 * Motion Tokens — Framer Motion 애니메이션 표준값
 * DESIGN.md의 Motion 스펙 기반. 새 애니메이션은 이 토큰을 사용할 것.
 * tailwind.config.ts의 transitionDuration과 동기화 유지.
 */

/** 지속 시간(초) — Framer Motion transition.duration용 */
export const DURATION = {
  micro: 0.075, // 50~100ms: 미세 상태 변화
  short: 0.2, // 150~250ms: 입장/호버
  medium: 0.3, // 250~400ms: 카드/모달 전환
  long: 0.5, // 400~700ms: 큰 전환
} as const

/** 이징 — enter(입장) / exit(퇴장) / move(이동) */
export const EASING = {
  enter: 'easeOut',
  exit: 'easeIn',
  move: 'easeInOut',
} as const

/** 표준 진입 애니메이션: 아래에서 페이드업 */
export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
} as const

/** 표준 페이드 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
} as const

/** 스태거 지연 헬퍼: 리스트 index → transition delay(초) */
export function stagger(index: number, step: number = 0.04): { delay: number } {
  return { delay: index * step }
}

/** 표준 transition 프리셋 */
export const TRANSITION = {
  enter: { duration: DURATION.short, ease: EASING.enter },
  move: { duration: DURATION.medium, ease: EASING.move },
} as const
