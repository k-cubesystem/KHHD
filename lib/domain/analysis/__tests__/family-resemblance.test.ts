import { buildFamilyResemblance, withGwaWa } from '../family-resemblance'
import type { PartAssessments } from '../family-resemblance'

describe('withGwaWa — 받침 조사', () => {
  it('받침 없는 단어 → 와', () => {
    expect(withGwaWa('아버지')).toBe('아버지와')
    expect(withGwaWa('어머니')).toBe('어머니와')
    expect(withGwaWa('누나')).toBe('누나와')
  })
  it('받침 있는 단어 → 과', () => {
    expect(withGwaWa('본인')).toBe('본인과')
    expect(withGwaWa('형')).toBe('형과')
    expect(withGwaWa('아들')).toBe('아들과')
  })
})

describe('buildFamilyResemblance', () => {
  const base: PartAssessments = {
    forehead: '좋음',
    eyes: '좋음',
    nose: '좋음',
    mouth: '보통',
    ears: '보통',
    chin: '주의',
  }

  it('공통 부위 2곳 미만이면 null', () => {
    const r = buildFamilyResemblance({ nose: '좋음' }, { eyes: '좋음' }, '아버지')
    expect(r).toBeNull()
  })

  it('일부 닮고 일부 다른 경우 분류 + 스토리', () => {
    const other: PartAssessments = {
      forehead: '좋음', // 같음
      eyes: '보통', // 다름
      nose: '좋음', // 같음
      mouth: '보통', // 같음
      ears: '주의', // 다름
      chin: '주의', // 같음
    }
    const r = buildFamilyResemblance(base, other, '아버지')
    expect(r).not.toBeNull()
    const similarKeys = r!.similar.map((p) => p.key)
    expect(similarKeys).toContain('nose')
    expect(similarKeys).toContain('forehead')
    expect(r!.different.map((p) => p.key)).toContain('eyes')
    // 코가 최우선(priority 1)이라 스토리 첫 부위는 코
    expect(r!.story).toContain('코(財帛宮)')
    expect(r!.story).toContain('아버지와')
    expect(r!.matchRatio).toBeCloseTo(4 / 6)
  })

  it('부정 표현이 없다(품질)', () => {
    const other: PartAssessments = { ...base }
    const r = buildFamilyResemblance(base, other, '어머니')
    expect(r).not.toBeNull()
    expect(r!.story).not.toMatch(/나쁘|흉|불행|약점|안 좋/)
  })

  it('전부 닮으면 matchRatio 1, 다른 부위 없음', () => {
    const r = buildFamilyResemblance(base, { ...base }, '본인')
    expect(r!.matchRatio).toBe(1)
    expect(r!.different).toHaveLength(0)
    expect(r!.story).toContain('본인과')
  })

  it('전부 다르면 개성 프레임 스토리(긍정)', () => {
    const self: PartAssessments = { nose: '좋음', eyes: '좋음', forehead: '좋음' }
    const other: PartAssessments = { nose: '보통', eyes: '주의', forehead: '보통' }
    const r = buildFamilyResemblance(self, other, '아들')
    expect(r!.similar).toHaveLength(0)
    expect(r!.story).toContain('개성')
    expect(r!.story).not.toMatch(/나쁘|흉|불행/)
  })
})
