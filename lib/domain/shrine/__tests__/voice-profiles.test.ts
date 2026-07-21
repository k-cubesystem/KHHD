import { ALL_DEITY_CODES, DEITY_ARCHETYPE, VOICE_ARCHETYPES, voiceProfileFor } from '@/lib/domain/shrine/voice-profiles'

describe('신위 음성 프로파일', () => {
  it('시드 17신위 전 코드가 아키타입에 매핑된다', () => {
    expect(ALL_DEITY_CODES.length).toBe(17)
    for (const code of ALL_DEITY_CODES) {
      const arch = DEITY_ARCHETYPE[code]
      expect(arch).toBeTruthy()
      expect(VOICE_ARCHETYPES[arch]).toBeDefined()
    }
  })

  it('모든 프로파일 rate/pitch 안전 범위 (rate 0.5~2.0, pitch 0~2)', () => {
    for (const p of Object.values(VOICE_ARCHETYPES)) {
      expect(p.rate).toBeGreaterThanOrEqual(0.5)
      expect(p.rate).toBeLessThanOrEqual(2.0)
      expect(p.pitch).toBeGreaterThanOrEqual(0)
      expect(p.pitch).toBeLessThanOrEqual(2)
    }
  })

  it('미지정/미등록 코드는 기본 프로파일로 폴백', () => {
    expect(voiceProfileFor(null)).toEqual(VOICE_ARCHETYPES.default)
    expect(voiceProfileFor(undefined)).toEqual(VOICE_ARCHETYPES.default)
    expect(voiceProfileFor('does_not_exist')).toEqual(VOICE_ARCHETYPES.default)
  })

  it('아키타입 차등: 장군(최영)은 동자보다 낮고, 천신(옥황)은 가장 느리다', () => {
    expect(voiceProfileFor('choiyoung').pitch).toBeLessThan(voiceProfileFor('dongja').pitch)
    expect(voiceProfileFor('choiyoung').rate).toBeLessThan(voiceProfileFor('dongja').rate)
    expect(voiceProfileFor('okhwang').rate).toBeLessThanOrEqual(voiceProfileFor('daegam').rate)
  })

  it('voiceHint 는 male/female/null 만 허용', () => {
    for (const p of Object.values(VOICE_ARCHETYPES)) {
      expect([null, 'male', 'female']).toContain(p.voiceHint)
    }
  })
})
