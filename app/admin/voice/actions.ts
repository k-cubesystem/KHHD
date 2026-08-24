'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/require-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/utils/logger'
import { isKnownVoice, formatPitchHz } from '@/lib/domain/shrine/voice-catalog'
import { ALL_DEITY_CODES } from '@/lib/domain/shrine/voice-profiles'

/**
 * 신위 음성 저장 — 어드민 전용.
 *
 * 🔴 service-control 이 두 번 틀렸던 자리를 그대로 피한다(그 파일 주석 참조):
 *    ①허용 목록을 손으로 다시 적지 않는다 — 신위코드는 `ALL_DEITY_CODES`, 보이스는 `VOICE_CATALOG`가 정본.
 *    ②저장은 행 통째 upsert 라 부분 유실이 없다(이 표는 열이 전부 음성 파라미터 하나뿐).
 */
export interface SaveVoiceInput {
  deityCode: string
  edgeVoice: string
  /** SSML pitch 오프셋(Hz) — 숫자로 받아 서버가 '+28Hz' 형식으로 만든다 */
  pitchHz: number
  rate: number
  browserPitch: number
  voiceHint: 'male' | 'female' | null
}

export async function saveVoiceProfile(input: SaveVoiceInput): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  if (!(ALL_DEITY_CODES as readonly string[]).includes(input.deityCode)) {
    return { success: false, error: '알 수 없는 신위입니다.' }
  }
  if (!isKnownVoice(input.edgeVoice)) return { success: false, error: '고를 수 없는 목소리입니다.' }
  if (!(input.rate >= 0.5 && input.rate <= 2)) return { success: false, error: '속도는 0.5~2.0 사이여야 합니다.' }
  if (!(input.browserPitch >= 0 && input.browserPitch <= 2)) {
    return { success: false, error: '브라우저 음높이는 0~2 사이여야 합니다.' }
  }

  try {
    const client = createAdminClient()
    const { error } = await client.from('deity_voice_profiles').upsert(
      {
        deity_code: input.deityCode,
        edge_voice: input.edgeVoice,
        edge_pitch: formatPitchHz(input.pitchHz),
        rate: input.rate,
        browser_pitch: input.browserPitch,
        voice_hint: input.voiceHint,
        updated_at: new Date().toISOString(),
        updated_by: actor.actorId,
      },
      { onConflict: 'deity_code' }
    )
    if (error) {
      logger.error('[saveVoiceProfile]', error)
      return { success: false, error: '저장 중 오류가 발생했습니다.' }
    }
    await logAdminAction({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: 'voice_profile_save',
      detail: { deityCode: input.deityCode, voice: input.edgeVoice, rate: input.rate, pitchHz: input.pitchHz },
    })
    revalidatePath('/admin/voice')
    return { success: true }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), '[saveVoiceProfile]')
    return { success: false, error: '저장 중 오류가 발생했습니다.' }
  }
}

/** 되돌리기 — 행을 지우면 코드 상수(종전 값)로 돌아간다. */
export async function resetVoiceProfile(deityCode: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }
  try {
    const client = createAdminClient()
    const { error } = await client.from('deity_voice_profiles').delete().eq('deity_code', deityCode)
    if (error) return { success: false, error: '되돌리기 실패' }
    await logAdminAction({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: 'voice_profile_reset',
      detail: { deityCode },
    })
    revalidatePath('/admin/voice')
    return { success: true }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), '[resetVoiceProfile]')
    return { success: false, error: '되돌리기 실패' }
  }
}
