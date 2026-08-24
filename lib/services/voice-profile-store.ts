/**
 * 신위 음성 프로파일 로더 — DB(어드민 설정) 우선, 없으면 코드 상수 폴백.
 *
 * 🔴 폴백이 핵심이다: `deity_voice_profiles` 에 행이 없으면 종전 값(voice-profiles.ts) 그대로 난다.
 *    그래서 표를 비우면 원상복구되고, DB 가 잠시 안 열려도 목소리는 계속 나온다.
 * 🔴 서버 전용 — 'use server' 가 아니므로 여기 함수들이 공개 엔드포인트가 되지 않는다.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { voiceProfileFor, type VoiceProfile } from '@/lib/domain/shrine/voice-profiles'
import { isKnownVoice } from '@/lib/domain/shrine/voice-catalog'

interface VoiceRow {
  deity_code: string
  edge_voice: string
  edge_pitch: string
  rate: number | string
  browser_pitch: number | string
  voice_hint: string | null
}

function toProfile(row: VoiceRow, fallback: VoiceProfile): VoiceProfile {
  // 목록에 없는 보이스가 저장돼 있으면(카탈로그에서 뺀 뒤 등) 코드 상수로 되돌린다.
  const edgeVoice = isKnownVoice(row.edge_voice) ? row.edge_voice : fallback.edgeVoice
  const rate = Number(row.rate)
  const browserPitch = Number(row.browser_pitch)
  return {
    edgeVoice,
    edgePitch: row.edge_pitch || fallback.edgePitch,
    rate: Number.isFinite(rate) ? rate : fallback.rate,
    pitch: Number.isFinite(browserPitch) ? browserPitch : fallback.pitch,
    voiceHint: row.voice_hint === 'male' || row.voice_hint === 'female' ? row.voice_hint : null,
  }
}

/** 한 신위의 실제 적용 프로파일. 조회 실패·행 없음 → 코드 상수. */
export async function resolveVoiceProfile(deityCode: string | null | undefined): Promise<VoiceProfile> {
  const fallback = voiceProfileFor(deityCode)
  if (!deityCode) return fallback
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('deity_voice_profiles')
      .select('deity_code, edge_voice, edge_pitch, rate, browser_pitch, voice_hint')
      .eq('deity_code', deityCode)
      .maybeSingle()
    return data ? toProfile(data as VoiceRow, fallback) : fallback
  } catch (e) {
    logger.warn('[resolveVoiceProfile] DB 조회 실패 — 코드 상수로', e)
    return fallback
  }
}

/** 어드민 화면용 — 저장된 행 전부(신위코드 → 프로파일). 없는 신위는 호출측이 코드 상수로 채운다. */
export async function loadAllVoiceOverrides(): Promise<Record<string, VoiceProfile>> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('deity_voice_profiles')
      .select('deity_code, edge_voice, edge_pitch, rate, browser_pitch, voice_hint')
    const out: Record<string, VoiceProfile> = {}
    for (const row of (data ?? []) as VoiceRow[]) {
      out[row.deity_code] = toProfile(row, voiceProfileFor(row.deity_code))
    }
    return out
  } catch (e) {
    logger.warn('[loadAllVoiceOverrides] 실패', e)
    return {}
  }
}
