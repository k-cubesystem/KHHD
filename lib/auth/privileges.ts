/**
 * 마스터(관리자) 권한 단일 기준.
 *
 * 이전에는 `role === 'admin'` 검사가 6곳에 흩어져 있었고, 정작 소비·한도 경로에는 빠져 있었다.
 * 그 결과 마스터가 구매·풀이에서 막히고, 가족은 무료 회원과 같은 3명에서 막혔다.
 * 우회 판정은 반드시 이 파일만 쓴다.
 *
 * 🔴 통과 신호는 잔액 숫자(옛 UNLIMITED_BALANCE)가 아니다 — 이용권 요약의 `unlimited`,
 *    과금의 `refundOnFailure === null` 이다(2026-09-18 이용권 전환).
 */

/** 무제한 권한 보유 여부 — 마스터(admin) 전용. 가족 한도·기록 보관·손실 상한 면제의 기준. */
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

/** 마스터용 티어 한도 — 가족·기록 전부 개방. 999 는 «상한 없음» 내부 관례다. */
export const UNLIMITED_TIER_LIMITS = {
  tier: 'MASTER',
  relationship_limit: 999,
  storage_limit: 999,
  is_subscribed: true,
} as const
