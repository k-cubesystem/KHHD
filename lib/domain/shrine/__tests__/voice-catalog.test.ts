import { VOICE_CATALOG, isKnownVoice, parsePitchHz, formatPitchHz, PITCH_MIN_HZ, PITCH_MAX_HZ } from '../voice-catalog'
import { VOICE_ARCHETYPES, ALL_DEITY_CODES, DEITY_ARCHETYPE } from '../voice-profiles'

/**
 * 어드민 음성 설정의 방어선.
 * 카탈로그는 «서버가 임의 보이스 주입을 막는 허용 목록»이라 코드 상수와 어긋나면 안 된다 —
 * 기본값이 목록 밖이면 화면 드롭다운에 «현재 값»이 없어 저장 순간 딴 목소리로 바뀐다.
 */
describe('VOICE_CATALOG', () => {
  it('코드 기본값(아키타입)의 보이스가 전부 카탈로그 안에 있다', () => {
    for (const [name, profile] of Object.entries(VOICE_ARCHETYPES)) {
      expect({ name, ok: isKnownVoice(profile.edgeVoice) }).toEqual({ name, ok: true })
    }
  })

  it('모든 신위가 아키타입에 매여 있다 — 새 신위가 조용히 기본값으로 새지 않게', () => {
    for (const code of ALL_DEITY_CODES) {
      expect(DEITY_ARCHETYPE[code]).toBeDefined()
    }
  })

  it('id 는 중복되지 않는다 (드롭다운 key 충돌 방지)', () => {
    const ids = VOICE_CATALOG.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('한국어 전용 보이스가 최소 한 종은 남아 있다 — 폴백 발음의 마지노선', () => {
    expect(VOICE_CATALOG.some((v) => v.native)).toBe(true)
  })

  it('목록 밖 보이스는 거절한다', () => {
    expect(isKnownVoice('ko-KR-EvilNeural')).toBe(false)
    expect(isKnownVoice('')).toBe(false)
  })
})

describe('음높이 파싱·직렬화', () => {
  it('왕복해도 값이 보존된다', () => {
    for (const hz of [-50, -22, 0, 8, 28, 50]) {
      expect(parsePitchHz(formatPitchHz(hz))).toBe(hz)
    }
  })

  it('부호를 항상 붙인다 (SSML 문법)', () => {
    expect(formatPitchHz(28)).toBe('+28Hz')
    expect(formatPitchHz(-22)).toBe('-22Hz')
    expect(formatPitchHz(0)).toBe('+0Hz')
  })

  it('한계를 넘으면 잘라낸다 — 사람 목소리로 안 들리는 구간을 막는다', () => {
    expect(formatPitchHz(9999)).toBe(`+${PITCH_MAX_HZ}Hz`)
    expect(formatPitchHz(-9999)).toBe(`${PITCH_MIN_HZ}Hz`)
    expect(parsePitchHz('+9999Hz')).toBe(PITCH_MAX_HZ)
  })

  it('깨진 문자열은 0 으로 (저장된 값이 이상해도 소리는 나야 한다)', () => {
    expect(parsePitchHz('없음')).toBe(0)
    expect(parsePitchHz('')).toBe(0)
    expect(parsePitchHz('28')).toBe(0)
  })
})
