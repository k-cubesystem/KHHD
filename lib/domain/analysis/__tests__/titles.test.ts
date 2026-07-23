import {
  getAnalysisTitle,
  scoreToBand,
  GOALS,
  CATEGORIES,
  BANDS,
  type AnalysisCategory,
  type AnalysisGoal,
} from '../titles'

describe('scoreToBand', () => {
  it.each([
    [100, 'high'],
    [80, 'high'],
    [79, 'mid'],
    [60, 'mid'],
    [59, 'growth'],
    [0, 'growth'],
  ] as Array<[number, string]>)('score=%s → %s', (n, expected) => {
    expect(scoreToBand(n)).toBe(expected)
  })

  it('비정상 입력(NaN/Infinity)은 finite 아님 → growth', () => {
    expect(scoreToBand(Number.NaN)).toBe('growth')
    expect(scoreToBand(Number.POSITIVE_INFINITY)).toBe('growth')
    expect(scoreToBand(Number.NEGATIVE_INFINITY)).toBe('growth')
  })
})

describe('getAnalysisTitle — 대표 조합(발주서 예시 고정)', () => {
  it('관상 wealth 80+ → 金錢貴相', () => {
    expect(getAnalysisTitle('face', 'wealth', 85).hanja).toBe('金錢貴相')
  })
  it('관상 love 80+ → 桃花明相', () => {
    expect(getAnalysisTitle('face', 'love', 90).hanja).toBe('桃花明相')
  })
  it('관상 authority 80+ → 將帥之相', () => {
    expect(getAnalysisTitle('face', 'authority', 80).hanja).toBe('將帥之相')
  })
  it('관상 general 80+ → 福德圓相', () => {
    expect(getAnalysisTitle('face', 'general', 100).hanja).toBe('福德圓相')
  })
})

describe('getAnalysisTitle — 전 조합 커버리지 + 무결성', () => {
  it('모든 category×goal×band 조합이 hanja/ko/desc 를 채운다', () => {
    for (const cat of CATEGORIES) {
      for (const goal of GOALS) {
        const scores = { high: 85, mid: 70, growth: 40 }
        for (const band of BANDS) {
          const t = getAnalysisTitle(cat, goal, scores[band])
          expect(scoreToBand(scores[band])).toBe(band)
          expect(t.hanja).toMatch(/[가-힣一-鿕]/) // 한자 포함
          expect(t.hanja.length).toBeGreaterThanOrEqual(4)
          expect(t.ko.length).toBeGreaterThan(0)
          expect(t.desc.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('칭호(hanja)는 카테고리 내에서 고유하다 (조합 누락/중복 방지)', () => {
    for (const cat of CATEGORIES) {
      const seen = new Set<string>()
      for (const goal of GOALS) {
        for (const band of BANDS) {
          const score = band === 'high' ? 85 : band === 'mid' ? 70 : 40
          const { hanja } = getAnalysisTitle(cat, goal, score)
          expect(seen.has(hanja)).toBe(false)
          seen.add(hanja)
        }
      }
      expect(seen.size).toBe(GOALS.length * BANDS.length) // 12
    }
  })

  it('growth 구간 부연은 부정 표현을 쓰지 않는다', () => {
    const negativeWords = ['나쁜', '흉', '불행', '실패', '최악', '망']
    for (const cat of CATEGORIES) {
      for (const goal of GOALS) {
        const { desc, ko } = getAnalysisTitle(cat, goal, 30)
        for (const w of negativeWords) {
          expect(desc).not.toContain(w)
          expect(ko).not.toContain(w)
        }
      }
    }
  })
})

describe('getAnalysisTitle — 방어적 폴백', () => {
  it('알 수 없는 goal 은 general 로 대체', () => {
    const unknown = 'xyz' as unknown as AnalysisGoal
    expect(getAnalysisTitle('face', unknown, 85)).toEqual(getAnalysisTitle('face', 'general', 85))
  })

  it('알 수 없는 category 는 face 로 대체', () => {
    const unknown = 'foot' as unknown as AnalysisCategory
    expect(getAnalysisTitle(unknown, 'wealth', 70)).toEqual(getAnalysisTitle('face', 'wealth', 70))
  })

  it('손금과 관상은 서로 다른 칭호 체계를 쓴다', () => {
    expect(getAnalysisTitle('palm', 'wealth', 85).hanja).not.toBe(getAnalysisTitle('face', 'wealth', 85).hanja)
    expect(getAnalysisTitle('palm', 'wealth', 85).hanja).toContain('掌')
  })
})
