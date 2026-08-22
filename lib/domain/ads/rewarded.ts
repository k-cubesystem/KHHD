/**
 * 보상형 광고 — 공용 상수·타입 (P1-A, ARCH-counsel-sokpuri-v1 §6-1).
 *
 * 챗(속풀이) 광고 리워드가 첫 사용처지만, 배경화면 하우스 광고 등 다른 보상 경로도
 * 이 파일의 고지 문구·타입을 쓴다(단일 출처 — 같은 문구를 화면마다 다르게 쓰는 사고 방지).
 *
 * 🔴 일일 상한의 KST 날짜 판정은 SQL(supabase/migrations/20260822_ad_reward_ledger.sql)이
 *    정본이다 — JS 에서 재구현하지 말 것. 여기의 KST 헬퍼는 «AI 예산 브레이커»의 비용 집계
 *    경계에만 쓴다(다른 규칙).
 */

export type AdRewardProvider = 'coupang_visit' | 'gam_rewarded'

/** 쿠팡 파트너스 대가성 고지 — 노출 의무. 광고 리워드 UI 는 어디서든 이 상수만 쓴다. */
export const AD_DISCLOSURE_COUPANG = '해화당은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'

/** 클라 안내용 최소 체류 초 힌트 — 서버(grant_ad_reward)가 최종 강제하는 값의 기본치와 동일하게 유지 */
export const CLIENT_DWELL_HINT_SECONDS = 15

export interface AdRewardAvailability {
  enabled: boolean
  /** enabled=false 사유 — disabled(스위치)·no_inventory(키·링크 없음)·budget(예산 브레이커)·daily_limit */
  reason?: 'disabled' | 'no_inventory' | 'budget' | 'daily_limit'
  /** 오늘 남은 지급 세트 수 */
  setsLeftToday: number
  /** 세트(방문 1회)당 지급 질문권 수 */
  reward: number
}

/**
 * KST 하루의 시작을 UTC ISO 로 — AI 일일 예산(브레이커) 비용 집계 경계 전용.
 * (광고 지급 상한의 날짜 판정은 SQL 정본 — 위 헤더 참조)
 */
export function kstDayStartUtcIso(now: Date): string {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  const dayStartKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
  return new Date(dayStartKst - KST_OFFSET_MS).toISOString()
}
