'use client'

import { useState, useEffect } from 'react'
import { getFeatureConfig } from '@/app/actions/core/feature-flags'
import type { FeatureKey, FeatureConfig } from '@/lib/domain/feature-flags/keys'

export type { FeatureKey, FeatureConfig }

/**
 * 화면에서 기능 스위치를 읽는다.
 *
 * 🔴 **브라우저에서 `system_settings` 를 직접 읽지 않는다(2026-08-22 수복).** 그 표의 RLS 는
 *    `is_admin()` 정책 하나뿐이라 일반 사용자에게는 0행이 오고, 그때 이 훅은 기본값 «켜짐» 을
 *    그대로 써서 **스위치를 내려도 화면이 안 꺼졌다.** 읽기는 서버액션(`getFeatureConfig`)이
 *    service_role 로 지고, 여기서는 결과만 받는다.
 *
 * 🔴 키·타입을 여기서 다시 적지 않는다 — 정본은 `lib/domain/feature-flags/keys.ts` 다.
 *    목록이 갈리면 스위치가 조용히 빠진다(2026-08-19 실증).
 *
 * 로딩 중에는 «켜짐» 을 쓴다: 판정 전에 화면을 깜빡 가렸다가 여는 편보다, 잠깐 보이고
 * 닫히는 편이 덜 거슬린다. 차단이 중요한 자리라면 `loading` 을 보고 직접 가릴 것.
 */
const LOADING_CONFIG: FeatureConfig = { isActive: true, accessLevel: 'all' }

export function useFeatureFlag(key: FeatureKey) {
  const [config, setConfig] = useState<FeatureConfig>(LOADING_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    getFeatureConfig(key)
      .then((next) => {
        if (active) setConfig(next)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [key])

  return { ...config, loading }
}
