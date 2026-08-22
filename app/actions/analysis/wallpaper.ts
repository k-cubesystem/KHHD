'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { buildJourney } from '@/lib/domain/analysis/journey'
import { isElement } from '@/lib/domain/shrine/types'
import type { WallpaperElement } from '@/lib/domain/analysis/wallpaper'

export interface WallpaperStatus {
  /** 사용자의 용신 오행 — 「내 오행」 추천 기준. 없으면 null. */
  element: WallpaperElement | null
  /** 본인 사주 풀이 1회 이상(analysis_history SAJU). */
  hasSaju: boolean
  /** 복주머니 5단계 완주(SAJU·FACE·HAND·FENGSHUI·SAMHAP). */
  journeyComplete: boolean
}

/**
 * 복 배경화면 열람 자격 — 용신 오행 · 사주 보유 · 완주 여부. 비로그인 null(카드 미렌더).
 *
 * 판정은 전부 서버에서 한다(클라 값 미신뢰). 근거는 본인 데이터뿐 —
 * analysis_history 는 user_id·target_id 를 모두 본인으로 못박아 RLS 위에서 한 번 더 좁힌다.
 * 완주 재판정은 `journey-reward.ts` 와 같은 계보다(카테고리 DISTINCT → buildJourney).
 *
 * 🔴 잠금은 «표시»까지다. 이미지가 `public/wallpapers/` 에 있어 URL 을 직접 치면 잠긴 장도
 *    받을 수 있다. 복채가 걸린 상품이 아니라 완주 선물이라 수용한 위험이며, 유료화하려면
 *    파일을 Supabase Storage 서명 URL 뒤로 옮기고 이 액션이 URL 을 발급하는 구조로 바꿔야 한다.
 */
export async function getWallpaperStatus(): Promise<WallpaperStatus | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: history, error: historyError }, { data: energy, error: energyError }] = await Promise.all([
    supabase.from('analysis_history').select('category').eq('user_id', user.id).eq('target_id', user.id),
    supabase.from('user_energy_profile').select('yongsin_element').eq('user_id', user.id).maybeSingle(),
  ])

  if (historyError) logger.warn('[wallpaper] history load failed:', historyError)
  // 용신은 부가 정보 — 없으면 「내 오행」 배지만 빠지고 화면은 성립한다.
  if (energyError) logger.warn('[wallpaper] energy profile load failed:', energyError)

  const categories = Array.from(
    new Set(
      (history ?? [])
        .map((r) => (r as { category: string | null }).category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  )

  const yongsin = energy?.yongsin_element
  return {
    element: isElement(yongsin) ? yongsin : null,
    hasSaju: categories.includes('SAJU'),
    journeyComplete: buildJourney(categories).allComplete,
  }
}
