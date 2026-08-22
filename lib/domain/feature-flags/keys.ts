/**
 * 기능 스위치 키 **단일 출처** — 서버·클라이언트가 함께 쓰는 순수 상수.
 *
 * ## 🔴 왜 파일을 갈랐나
 * 이 상수는 원래 `lib/feature-flags.ts` 에 있었는데, 그 파일은 첫 줄에서
 * `@/lib/supabase/server` 를 가져온다. 어드민 **서비스 제어 화면은 클라이언트 컴포넌트**라
 * 거기서 `FEATURE_KEYS` 를 부르는 순간 서버 전용 모듈이 브라우저 번들로 끌려 들어가
 * `next build` 가 죽었다(타입만 가져올 때는 지워지므로 멀쩡했고, `tsc` 와 `dev` 도 통과한다).
 *
 * 🔴 그렇다고 화면이 키 목록을 다시 적으면 안 된다 — 목록이 갈리면 스위치가 조용히 빠진다
 *    (2026-08-19 에 실제로 겪었다). 그래서 «목록은 하나»를 지키면서 **서버 의존만 떼어낸다.**
 */

export const FEATURE_KEYS = [
  'feat_saju_today',
  'feat_saju_compat',
  'feat_face_analysis',
  'feat_fengshui',
  'feat_payment_pg',
  'global_maintenance',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

/**
 * 바깥에서 들어온 문자열이 «스위치 키»인지 판정한다.
 *
 * 🔴 이 판정이 없으면 서버액션이 `system_settings` **아무 행이나** 읽어 주는 창구가 된다 —
 *    그 표에는 쿠팡 파트너스 설정·의례 지급액 같은 운영값이 함께 산다. 키는 반드시
 *    이 목록으로 좁힌 뒤에만 조회할 것.
 */
export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value)
}

export interface FeatureConfig {
  isActive: boolean
  accessLevel: 'all' | 'member' | 'tester' | 'admin'
  message?: string
}
