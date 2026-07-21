import { formatKstDateTime } from '@/lib/utils'

describe('formatKstDateTime', () => {
  it('UTC 타임스탬프를 KST(+9)로 포맷한다', () => {
    expect(formatKstDateTime('2026-07-13T05:33:12.000Z')).toBe('2026.07.13 14:33')
  })

  it('Supabase timestamptz(+00:00 오프셋) 문자열을 동일하게 처리한다', () => {
    expect(formatKstDateTime('2026-07-13T05:33:12+00:00')).toBe('2026.07.13 14:33')
  })

  it('KST 자정을 넘는 날짜 전환을 처리한다', () => {
    expect(formatKstDateTime('2026-07-13T15:30:00Z')).toBe('2026.07.14 00:30')
  })

  it('연도 전환을 처리한다', () => {
    expect(formatKstDateTime('2025-12-31T15:01:00Z')).toBe('2026.01.01 00:01')
  })

  it('Date 객체 입력을 지원한다', () => {
    expect(formatKstDateTime(new Date('2026-07-13T05:33:12Z'))).toBe('2026.07.13 14:33')
  })

  it('파싱 불가 입력은 빈 문자열을 반환한다', () => {
    expect(formatKstDateTime('not-a-date')).toBe('')
  })
})
