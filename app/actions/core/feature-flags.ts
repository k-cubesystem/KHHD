'use server'

import { getFeatureStatus } from '@/lib/feature-flags'
import { isFeatureKey, type FeatureConfig } from '@/lib/domain/feature-flags/keys'

/** 판정 불가·미등록 키의 안전값 — 닫힌 쪽으로 넘어진다. */
const CLOSED: FeatureConfig = { isActive: false, accessLevel: 'admin' }

/**
 * 브라우저가 기능 스위치를 묻는 **유일한 창구**.
 *
 * ## 🔴 왜 서버액션인가
 * 예전에는 `hooks/use-feature-flag.ts` 가 **브라우저에서 `system_settings` 를 직접** 읽었다.
 * 그 표의 RLS 는 정책이 `is_admin()` 하나뿐이라 일반 사용자에게는 언제나 0행이 왔고,
 * 훅의 기본값이 «켜짐» 이라 **스위치를 내려도 화면이 안 꺼지는** 상태였다(서버 쪽
 * `getFeatureStatus` 는 반대로 «꺼짐» 으로 넘어져 기능이 통째로 숨었다 — 같은 표를 두 곳에서
 * 반대 방향으로 잘못 읽고 있었다). 읽기를 서버로 모으고 클라이언트의 직접 조회를 끊는다.
 *
 * ## 🔴 키를 반드시 좁힌다
 * `system_settings` 에는 쿠팡 파트너스 설정·의례 지급액 같은 **운영값이 함께 산다.** 키를
 * 검증하지 않으면 이 액션이 그 표 아무 행이나 읽어 주는 창구가 된다. `isFeatureKey` 로
 * 스위치 목록에 든 키만 통과시킨다 — 목록 밖이면 조회조차 하지 않고 닫힌 값을 준다.
 */
export async function getFeatureConfig(key: string): Promise<FeatureConfig> {
  if (!isFeatureKey(key)) return CLOSED
  return getFeatureStatus(key)
}
