/**
 * 신위별 TTS 음성 프로파일 (무료 Web Speech API — rate/pitch/voiceHint).
 *
 * 17신위를 원형(archetype) 5군으로 묶어 튜닝한다(전 신위 개별 튜닝은 과잉).
 * 음성 파라미터는 UI 관심사라 시드가 아닌 코드 상수로 관리한다.
 * 아키타입 분류는 shrine_deities 시드의 tier/계열/tone 을 근거로 확정.
 *
 * voiceHint: 브라우저 보이스 목록에서 성별 휴리스틱 선택 시도 → 실패 시 기본 한국어 보이스(우아한 폴백).
 * (예: "Google 한국의" 단일 보이스 환경에선 rate/pitch 만으로 차등 — 이것이 실질 차별화)
 */

export type VoiceArchetype = 'general' | 'child' | 'maternal' | 'heavenly' | 'default'

export interface VoiceProfile {
  /** 발화 속도 0.5~2.0 (Web Speech · edge-tts 공용) */
  rate: number
  /** 음높이 0~2 (Web Speech 전용 — edge-tts 는 edgePitch 사용) */
  pitch: number
  /** 성별 힌트(브라우저 보이스 선택용) — 단일 보이스 환경이면 무시(null 허용) */
  voiceHint: 'male' | 'female' | null
  /**
   * 서버 뉴럴 TTS(edge-tts) 보이스. Microsoft Edge Read Aloud 한국어 3종:
   * SunHi(여) · InJoon(남) · HyunsuMultilingual(남). 남성 2종을 갈라 써서
   * 브라우저 TTS 로는 불가능한 "실제 다른 목소리"를 낸다.
   */
  edgeVoice: string
  /** edge-tts 음높이 오프셋 (SSML prosody, 예 '+25Hz' '-20Hz') */
  edgePitch: string
}

export const VOICE_ARCHETYPES: Record<VoiceArchetype, VoiceProfile> = {
  // 장군신(최영·백마신장·관성제군): 낮고 묵직 — 남성(InJoon) 저음
  general: { rate: 0.92, pitch: 0.75, voiceHint: 'male', edgeVoice: 'ko-KR-InJoonNeural', edgePitch: '-22Hz' },
  // 동자신: 맑고 높게 — 여성(SunHi) 고음·빠르게
  child: { rate: 1.12, pitch: 1.35, voiceHint: null, edgeVoice: 'ko-KR-SunHiNeural', edgePitch: '+28Hz' },
  // 선녀·모성신(선녀·삼신·바리·조왕): 부드럽게 — 여성(SunHi) 소폭 상향
  maternal: { rate: 0.98, pitch: 1.15, voiceHint: 'female', edgeVoice: 'ko-KR-SunHiNeural', edgePitch: '+8Hz' },
  // 천신·칠성신(옥황·칠성·산신·용왕): 느리고 장중 — 남성(Hyunsu) 저속
  heavenly: {
    rate: 0.88,
    pitch: 0.95,
    voiceHint: 'male',
    edgeVoice: 'ko-KR-HyunsuMultilingualNeural',
    edgePitch: '-8Hz',
  },
  // 기본(대감·터주·성주·도깨비·업신 등) — 여성(SunHi) 기본값
  default: { rate: 0.98, pitch: 1.0, voiceHint: null, edgeVoice: 'ko-KR-SunHiNeural', edgePitch: '+0Hz' },
}

/** 17신위 code → archetype. shrine_deities 시드 전 code 커버(누락 시 default). */
export const DEITY_ARCHETYPE: Record<string, VoiceArchetype> = {
  // 장군·무장 계열
  choiyoung: 'general', // 최영 장군
  baekma: 'general', // 백마신장
  gwanseong: 'general', // 관성제군
  // 동자
  dongja: 'child', // 동자신
  // 선녀·모성
  seonnyeo: 'maternal', // 선녀신
  samsin: 'maternal', // 삼신할매
  bari: 'maternal', // 바리공주
  jowang: 'maternal', // 조왕신(부엌 여신)
  // 천신·칠성
  okhwang: 'heavenly', // 옥황상제
  chilseong: 'heavenly', // 칠성신
  sansin: 'heavenly', // 산신령
  yongwang: 'heavenly', // 용왕신
  // 기본(대감·터주 등)
  daegam: 'default', // 대감신
  teoju: 'default', // 터주대감
  seongju: 'default', // 성주신
  dokkaebi: 'default', // 도깨비 대장
  eopsin: 'default', // 업신
}

/** 시드 전 신위 코드(테스트 커버리지 기준) */
export const ALL_DEITY_CODES = Object.keys(DEITY_ARCHETYPE) as ReadonlyArray<string>

/** 좌정 신위 코드 → 음성 프로파일. 미지정/미등록이면 기본 프로파일(우아한 폴백). */
export function voiceProfileFor(deityCode: string | null | undefined): VoiceProfile {
  const arch = (deityCode && DEITY_ARCHETYPE[deityCode]) || 'default'
  return VOICE_ARCHETYPES[arch]
}
