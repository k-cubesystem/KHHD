/**
 * 고를 수 있는 목소리 목록 — 어드민 음성 설정의 선택지(순수 상수).
 *
 * edge-tts(Microsoft Edge 읽어주기)가 실제로 내주는 보이스 중 **한국어를 읽을 수 있는 것**만 담는다.
 * 한국어 전용은 3종뿐이지만, 다국어(Multilingual) 보이스도 한국어를 읽는다 — 그래서 남성 목소리가
 * 2종에서 5종으로 늘어난다(2026-08-24 실측 확인: 8종 전부 한국어 음성 생성 성공).
 *
 * 🔴 여기 없는 보이스는 어드민에서 고를 수 없다 — 서버가 이 목록으로 검증한다.
 *    임의 문자열을 그대로 edge 에 넘기면 오픈 TTS 프록시가 된다(app/api/tts 주석 참조).
 */

export interface VoiceOption {
  /** edge-tts ShortName */
  id: string
  /** 어드민 화면 표시명 */
  label: string
  gender: 'male' | 'female'
  /** 한국어 전용 보이스인지 — 다국어 보이스는 발음이 약간 이질적일 수 있다 */
  native: boolean
}

export const VOICE_CATALOG: readonly VoiceOption[] = [
  // 한국어 전용 — 발음이 가장 자연스럽다
  { id: 'ko-KR-SunHiNeural', label: '선히 (한국어·여)', gender: 'female', native: true },
  { id: 'ko-KR-InJoonNeural', label: '인준 (한국어·남)', gender: 'male', native: true },
  { id: 'ko-KR-HyunsuMultilingualNeural', label: '현수 (한국어·남·다국어)', gender: 'male', native: true },
  // 다국어 — 한국어도 읽는다. 목소리 결이 달라 신위를 갈라 쓰기 좋다.
  { id: 'en-US-AndrewMultilingualNeural', label: '앤드류 (다국어·남)', gender: 'male', native: false },
  { id: 'en-US-BrianMultilingualNeural', label: '브라이언 (다국어·남)', gender: 'male', native: false },
  { id: 'en-AU-WilliamMultilingualNeural', label: '윌리엄 (다국어·남)', gender: 'male', native: false },
  { id: 'fr-FR-RemyMultilingualNeural', label: '레미 (다국어·남)', gender: 'male', native: false },
  { id: 'de-DE-FlorianMultilingualNeural', label: '플로리안 (다국어·남)', gender: 'male', native: false },
  { id: 'it-IT-GiuseppeMultilingualNeural', label: '주세페 (다국어·남)', gender: 'male', native: false },
  { id: 'en-US-AvaMultilingualNeural', label: '에이바 (다국어·여)', gender: 'female', native: false },
  { id: 'en-US-EmmaMultilingualNeural', label: '엠마 (다국어·여)', gender: 'female', native: false },
  { id: 'fr-FR-VivienneMultilingualNeural', label: '비비안 (다국어·여)', gender: 'female', native: false },
  { id: 'de-DE-SeraphinaMultilingualNeural', label: '세라피나 (다국어·여)', gender: 'female', native: false },
  { id: 'pt-BR-ThalitaMultilingualNeural', label: '탈리타 (다국어·여)', gender: 'female', native: false },
]

export function isKnownVoice(id: string): boolean {
  return VOICE_CATALOG.some((v) => v.id === id)
}

/** 음높이 오프셋 한계 — 넘어가면 사람 목소리로 안 들린다(로봇·괴물). */
export const PITCH_MIN_HZ = -50
export const PITCH_MAX_HZ = 50

/** '+28Hz' → 28 / 잘못된 값이면 0 */
export function parsePitchHz(pitch: string): number {
  const m = /^([+-]?\d+)Hz$/.exec(pitch.trim())
  if (!m) return 0
  const n = Number(m[1])
  return Number.isFinite(n) ? Math.max(PITCH_MIN_HZ, Math.min(PITCH_MAX_HZ, n)) : 0
}

/** 28 → '+28Hz' (edge SSML 문법) */
export function formatPitchHz(hz: number): string {
  const clamped = Math.round(Math.max(PITCH_MIN_HZ, Math.min(PITCH_MAX_HZ, hz)))
  return `${clamped >= 0 ? '+' : ''}${clamped}Hz`
}
