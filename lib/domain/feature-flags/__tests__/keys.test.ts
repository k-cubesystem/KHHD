/**
 * 기능 스위치 키 판정 — 서버액션이 `system_settings` 를 아무 행이나 읽어 주는 창구가 되지
 * 않게 막는 자물쇠다. 이 테스트가 지키는 것은 «목록 밖은 통과하지 못한다» 하나다.
 */
import { FEATURE_KEYS, isFeatureKey } from '@/lib/domain/feature-flags/keys'

describe('isFeatureKey — 스위치 키만 통과시킨다', () => {
  it('목록에 있는 키는 전부 통과한다', () => {
    for (const key of FEATURE_KEYS) {
      expect(isFeatureKey(key)).toBe(true)
    }
  })

  it('🔴 같은 표에 사는 운영값 키는 막는다', () => {
    // system_settings 에는 스위치 말고도 이런 것들이 함께 산다 — 새어 나가면 안 된다.
    const 운영값 = [
      'coupang_partners_url',
      'chat_ad_reward_enabled',
      'ritual_bok_amount',
      'threads_automation_enabled',
      'usd_krw_rate',
    ]
    for (const key of 운영값) {
      expect(isFeatureKey(key)).toBe(false)
    }
  })

  it('빈 값·이상한 입력도 막는다', () => {
    for (const key of ['', ' ', 'FEAT_SAJU_TODAY', 'feat_saju_today ', '*']) {
      expect(isFeatureKey(key)).toBe(false)
    }
  })

  it('키 목록에 중복이 없다', () => {
    expect(new Set(FEATURE_KEYS).size).toBe(FEATURE_KEYS.length)
  })
})
