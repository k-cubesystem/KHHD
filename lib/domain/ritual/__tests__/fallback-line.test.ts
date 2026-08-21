import { ritualFallbackLine } from '../fallback-line'
import { ILGAN, ILGAN_SLUGS } from '@/lib/domain/saju/ilgan'

describe('ritualFallbackLine — 결정론 폴백', () => {
  it('같은 (일간, 서수)면 항상 같은 문장', () => {
    expect(ritualFallbackLine('甲', 314)).toBe(ritualFallbackLine('甲', 314))
  })

  it('서수가 바뀌면 3변주 안에서 순환한다', () => {
    const a = ritualFallbackLine('甲', 0)
    const b = ritualFallbackLine('甲', 1)
    const c = ritualFallbackLine('甲', 2)
    const d = ritualFallbackLine('甲', 3)
    expect(new Set([a, b, c]).size).toBe(3)
    expect(d).toBe(a)
  })

  it('10천간 전부 문장이 존재하고 일간 이름이 접두된다', () => {
    for (const slug of ILGAN_SLUGS) {
      const line = ritualFallbackLine(ILGAN[slug].han, 100)
      expect(line.length).toBeGreaterThan(10)
      expect(line.startsWith(`${ILGAN[slug].name}의 달 문안`)).toBe(true)
    }
  })

  it('일간을 모르면 범용 문장으로 조용히 폴백 (throw 금지)', () => {
    expect(ritualFallbackLine(null, 5)).toContain('무탈')
    expect(ritualFallbackLine('?', 5)).toContain('무탈')
  })
})
