/**
 * 마스터(관리자) 무제한 권한 단일 기준.
 *
 * 이전에는 `role === 'admin'` 검사가 6곳에 흩어져 있었고, 정작 소비·한도 경로
 * (spendBokchae·getUserTierLimits·신당 일일질문)에는 빠져 있었다. 그 결과 마스터는
 * 잔액 999를 보면서도 테마 구매는 INSUFFICIENT_BOKCHAE 로 실패하고, 가족은
 * 무료 회원과 같은 3명에서 막혔다. 우회 판정은 반드시 이 파일만 쓴다.
 */

/** 잔액 표시·차감 우회 시 쓰는 사실상 무한 값. */
export const UNLIMITED_BALANCE = 99_999_999

/** 무제한 권한 보유 여부 — 마스터(admin) 전용. tester 는 실제 잔액을 쓴다. */
export function hasUnlimitedAccess(role: string | null | undefined): boolean {
  return role === 'admin'
}

/**
 * 이용권을 쓰지 않고 풀이를 통과하는 계정 — 마스터 + 검수(tester).
 *
 * 복채 시절 검수 계정은 하루 50만냥을 자동으로 받았다(잔액이 쌓이는 경로 하나 더).
 * 이용권 전환 뒤에는 그 경로를 없애고 역할로 통과시킨다. 🔴 소비 판정에만 쓴다 —
 * 가족 한도·기록 보관 같은 다른 한도는 여전히 hasUnlimitedAccess(마스터 전용)가 기준이다.
 */
export function hasPassBypass(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'tester'
}

/** 마스터용 티어 한도 — 가족·기록 전부 개방. */
export const UNLIMITED_TIER_LIMITS = {
  tier: 'MASTER',
  daily_talisman_limit: UNLIMITED_BALANCE,
  relationship_limit: 999,
  storage_limit: 999,
  is_subscribed: true,
} as const
