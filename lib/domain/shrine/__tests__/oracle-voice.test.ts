import { oracleVoiceFor, ORACLE_ANGLES } from '../oracle-voice'

/**
 * 신탁이 매일 같은 말을 하던 원인은 «넣어준 것이 넷뿐»이었다(실측 34건 전부 같은 감정·같은 위로문).
 * 여기서 지키는 계약은 두 개다 — 날이 바뀌면 결이 바뀔 것, 같은 날엔 흔들리지 말 것.
 */
describe('oracleVoiceFor', () => {
  it('같은 날엔 같은 결 (재생성해도 흔들리지 않는다)', () => {
    expect(oracleVoiceFor('2026-08-23', 'support')).toEqual(oracleVoiceFor('2026-08-23', 'support'))
  })

  it('날이 바뀌면 결이 돈다 — 한 주 안에 최소 3가지', () => {
    const week = ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29']
    const angles = new Set(week.map((d) => oracleVoiceFor(d, 'same').angle))
    expect(angles.size).toBeGreaterThanOrEqual(3)
  })

  it('결은 항상 정의된 목록 안에서 나온다', () => {
    for (const d of ['2026-01-01', '2026-06-15', '2026-12-31']) {
      expect(ORACLE_ANGLES).toContain(oracleVoiceFor(d, null).angle)
    }
  })

  it('흐름에 따라 표정 후보가 갈린다 — 늘 bless 만 짓지 않게', () => {
    const support = oracleVoiceFor('2026-08-23', 'support').emotionHint
    const pressure = oracleVoiceFor('2026-08-23', 'pressure').emotionHint
    expect(support).not.toBe(pressure)
    expect(support).toContain('bless')
    expect(pressure).toContain('sad')
  })

  it('흐름을 모르면 무난한 기본으로 (신탁은 어떤 날도 나와야 한다)', () => {
    expect(oracleVoiceFor('2026-08-23').emotionHint).toBe('neutral 이나 smile')
  })
})
