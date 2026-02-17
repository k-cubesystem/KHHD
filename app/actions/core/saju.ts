'use server'

import { createClient } from '@/lib/supabase/server'
import { getSajuData, analyzeElementBalance } from '@/lib/domain/saju/saju'
import { logger } from '@/lib/utils/logger'

/**
 * 사용자의 오행 분포를 백분율로 계산하여 반환
 * 프리미엄 대시보드 및 오행 차트에서 사용
 */
export async function getUserFiveElements() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인 필요' }

  // 프로필에서 생년월일 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('birth_date, birth_time, calendar_type')
    .eq('id', user.id)
    .single()

  if (!profile?.birth_date) {
    return {
      success: false,
      error: '사주 정보가 없습니다. 프로필을 먼저 설정해주세요.',
    }
  }

  try {
    // 사주 계산
    const sajuData = getSajuData(
      profile.birth_date,
      profile.birth_time || '12:00',
      profile.calendar_type === 'solar'
    )

    // 오행 분석
    const balance = analyzeElementBalance(sajuData.elementsDistribution)

    // 백분율 변환 (Recharts 형식)
    const total = Object.values(sajuData.elementsDistribution).reduce((a, b) => a + b, 0)
    const percentages = {
      wood: Math.round(((sajuData.elementsDistribution['木'] ?? 0) / total) * 100),
      fire: Math.round(((sajuData.elementsDistribution['火'] ?? 0) / total) * 100),
      earth: Math.round(((sajuData.elementsDistribution['土'] ?? 0) / total) * 100),
      metal: Math.round(((sajuData.elementsDistribution['金'] ?? 0) / total) * 100),
      water: Math.round(((sajuData.elementsDistribution['水'] ?? 0) / total) * 100),
    }

    return {
      success: true,
      data: percentages,
      balance,
      raw: sajuData.elementsDistribution,
    }
  } catch (error: unknown) {
    logger.error('[Saju Actions] Error calculating five elements:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '오행 계산 중 오류가 발생했습니다.',
    }
  }
}
