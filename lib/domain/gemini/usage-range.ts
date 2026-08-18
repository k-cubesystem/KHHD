/**
 * 사용량 조회 기간 — 화면 버튼과 서버 집계가 **같은 목록**을 쓴다.
 *
 * 🔴 이 상수들이 원래 `app/actions/admin/gemini-usage.ts`(`'use server'`) 에 있었는데
 *    **서버 액션 파일은 async 함수만 export 할 수 있다.** 상수를 두면 `next build` 가
 *    「Failed to collect page data」로 죽는다(이 프로젝트에서 두 번째로 밟은 함정 —
 *    종합사주 프롬프트도 같은 이유로 분리했다).
 *
 * 🔴 「오늘」은 KST 자정 기준이다. UTC 로 자르면 0~9시 호출이 어제로 밀린다.
 */
export const USAGE_RANGES = [0, 7, 30, 90, 180] as const
export type UsageRange = (typeof USAGE_RANGES)[number]

export const USAGE_RANGE_LABEL: Record<UsageRange, string> = {
  0: '오늘',
  7: '7일',
  30: '30일',
  90: '90일',
  180: '180일',
}

export function isUsageRange(value: number): value is UsageRange {
  return (USAGE_RANGES as readonly number[]).includes(value)
}
