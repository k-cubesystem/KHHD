'use server'

import { resolveVoiceProfile } from '@/lib/services/voice-profile-store'

/**
 * 좌정 신위의 «지금 적용 중인» 음성 파라미터 — 브라우저 폴백(Web Speech)용.
 *
 * 서버 뉴럴 TTS(/api/tts)는 자기가 DB 를 읽으므로 이 액션이 필요 없지만, edge 가 실패해
 * 브라우저 음성으로 넘어갈 때는 클라이언트가 속도·음높이를 알아야 한다. 그 값이 코드 상수로
 * 고정돼 있으면 어드민에서 조절한 값이 폴백 경로에서만 딴판이 된다.
 */
export async function getVoiceProfileForDeity(deityCode: string | null): Promise<{
  rate: number
  pitch: number
  voiceHint: 'male' | 'female' | null
}> {
  const p = await resolveVoiceProfile(deityCode)
  return { rate: p.rate, pitch: p.pitch, voiceHint: p.voiceHint }
}
