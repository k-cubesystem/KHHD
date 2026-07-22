import { KNOWLEDGE_TIPS, todayTipIndex } from '../knowledge-tips'

describe('지식 팁 풀 (오늘의 상식)', () => {
  it('충분한 개수의 팁을 갖는다', () => {
    expect(KNOWLEDGE_TIPS.length).toBeGreaterThanOrEqual(20)
  })

  it('모든 팁은 비어있지 않은 term·plain·category 를 가진다', () => {
    for (const t of KNOWLEDGE_TIPS) {
      expect(t.term.trim().length).toBeGreaterThan(0)
      expect(t.plain.trim().length).toBeGreaterThan(0)
      expect(t.category.trim().length).toBeGreaterThan(0)
    }
  })

  it('plain 한 줄은 길이 상한(바에 들어가도록)을 넘지 않는다', () => {
    for (const t of KNOWLEDGE_TIPS) {
      expect(t.plain.length).toBeLessThanOrEqual(60)
    }
  })

  it('term 은 중복되지 않는다', () => {
    const terms = KNOWLEDGE_TIPS.map((t) => t.term)
    expect(new Set(terms).size).toBe(terms.length)
  })

  it('풍수 기초 팁이 10개 내외 포함된다', () => {
    const fengshui = KNOWLEDGE_TIPS.filter((t) => t.category === '풍수')
    expect(fengshui.length).toBeGreaterThanOrEqual(8)
  })

  it('todayTipIndex 는 같은 날 결정적, 범위 내', () => {
    const day = 1_770_000_000_000 // 임의 고정 시각
    expect(todayTipIndex(day)).toBe(todayTipIndex(day))
    expect(todayTipIndex(day + 1000)).toBe(todayTipIndex(day)) // 같은 날
    const idx = todayTipIndex(day)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(KNOWLEDGE_TIPS.length)
  })

  it('todayTipIndex 는 하루 뒤 다른 인덱스로 회전한다', () => {
    const day = 1_770_000_000_000
    const next = day + 86_400_000
    // 팁 개수가 1보다 크면 인접 두 날 인덱스는 서로 다르다(+1 회전)
    expect(todayTipIndex(next)).not.toBe(todayTipIndex(day))
  })
})
