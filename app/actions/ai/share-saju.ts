'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'

interface ShareSajuResult {
  success: boolean
  token?: string
  shareUrl?: string
  error?: string
}

/**
 * 사주 분석 결과 공유 토큰 생성 (analysisId 직접 지정)
 * - 인증된 사용자만 자신의 분석에 대해 토큰 생성 가능
 * - 이미 토큰이 있으면 기존 토큰 반환 (중복 생성 방지)
 * - 사주 전용 공유 URL: /share/saju/[token]
 */
export async function createSajuShareToken(analysisId: string): Promise<ShareSajuResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    // 1. 해당 분석이 본인 소유 + SAJU 카테고리인지 확인
    const { data: record, error: fetchError } = await supabase
      .from('analysis_history')
      .select('id, share_token, category')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !record) {
      logger.error('[ShareSaju] Analysis not found or access denied:', fetchError)
      return { success: false, error: '분석 기록을 찾을 수 없습니다.' }
    }

    // 카테고리가 SAJU가 아닌 경우에도 공유는 허용 (범용성)
    // 단, 공유 URL은 사주 전용 경로 사용

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com').trim().replace(/\/+$/, '')

    // 2. 이미 토큰이 있으면 재사용
    if (record.share_token) {
      return {
        success: true,
        token: record.share_token,
        shareUrl: `${siteUrl}/share/saju/${record.share_token}`,
      }
    }

    // 3. 새 토큰 생성 (URL-safe UUID)
    const token = crypto.randomUUID()

    const { error: updateError } = await supabase
      .from('analysis_history')
      .update({ share_token: token })
      .eq('id', analysisId)
      .eq('user_id', user.id)

    if (updateError) {
      logger.error('[ShareSaju] Failed to save share token:', updateError)
      return { success: false, error: '공유 링크 생성에 실패했습니다.' }
    }

    revalidatePath('/protected/history')

    return {
      success: true,
      token,
      shareUrl: `${siteUrl}/share/saju/${token}`,
    }
  } catch (error) {
    logger.error('[ShareSaju] Unexpected error:', error)
    return { success: false, error: '공유 링크 생성 중 오류가 발생했습니다.' }
  }
}

/**
 * targetId 기반으로 최근 SAJU 분석의 공유 토큰을 생성
 * - 클라이언트에서 analysisId를 모를 때 사용
 * - 가장 최근 SAJU 분석을 자동으로 찾아 공유 토큰 발급
 */
export async function createSajuShareTokenByTarget(targetId: string): Promise<ShareSajuResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    // 최근 SAJU 분석 기록 조회 (해당 target의)
    const { data: record, error: fetchError } = await supabase
      .from('analysis_history')
      .select('id, share_token')
      .eq('user_id', user.id)
      .eq('target_id', targetId)
      .eq('category', 'SAJU')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !record) {
      logger.error('[ShareSaju] No SAJU analysis found for target:', fetchError)
      return { success: false, error: '사주 분석 기록을 찾을 수 없습니다.' }
    }

    // 기존 함수 위임
    return createSajuShareToken(record.id)
  } catch (error) {
    logger.error('[ShareSaju] Unexpected error in byTarget:', error)
    return { success: false, error: '공유 링크 생성 중 오류가 발생했습니다.' }
  }
}
