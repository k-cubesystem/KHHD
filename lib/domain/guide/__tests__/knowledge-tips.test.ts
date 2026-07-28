import { KNOWLEDGE_TIPS, todayTipIndex, tipForPath, nextTipInPath } from '../knowledge-tips'

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

describe('tipForPath — 경로별 상식', () => {
  const NOW = Date.parse('2026-07-28T00:00:00.000Z')
  const NEXT_DAY = NOW + 86_400_000

  it('같은 경로·같은 날이면 항상 같은 상식 (결정론)', () => {
    expect(tipForPath('/protected/analysis', NOW)).toEqual(tipForPath('/protected/analysis', NOW + 5000))
  })

  it('페이지를 옮기면 다른 상식이 뜬다', () => {
    const terms = ['/protected/analysis', '/protected/family', '/protected/history', '/protected/store'].map(
      (p) => tipForPath(p, NOW)?.term
    )
    // 경로별 분류 풀이 서로 겹치지 않으므로 최소 3종은 달라야 한다
    expect(new Set(terms).size).toBeGreaterThanOrEqual(3)
  })

  it('날이 바뀌면 같은 페이지라도 상식이 바뀐다', () => {
    expect(tipForPath('/protected/analysis', NOW)?.term).not.toBe(tipForPath('/protected/analysis', NEXT_DAY)?.term)
  })

  it('경로 성격에 맞는 분류에서 고른다', () => {
    expect(['궁합', '관계']).toContain(tipForPath('/protected/family', NOW)?.category)
    expect(['풍수', '오행']).toContain(tipForPath('/protected/store', NOW)?.category)
    expect(['십성', '오행', '용신']).toContain(tipForPath('/protected/analysis', NOW)?.category)
  })

  it('매핑 없는 경로도 항상 무언가를 준다', () => {
    const tip = tipForPath('/protected/unknown-page', NOW)
    expect(tip).not.toBeNull()
    expect(KNOWLEDGE_TIPS).toContainEqual(tip)
  })
})

describe('nextTipInPath — 같은 풀 안 회전', () => {
  const NOW = Date.parse('2026-07-28T00:00:00.000Z')

  it('다음 항목으로 넘어가고 분류는 유지된다', () => {
    const first = tipForPath('/protected/family', NOW)!
    const second = nextTipInPath('/protected/family', first, NOW)!
    expect(second.term).not.toBe(first.term)
    expect(['궁합', '관계']).toContain(second.category)
  })

  it('한 바퀴 돌면 처음으로 — 소진되지 않는다', () => {
    const start = tipForPath('/protected/family', NOW)!
    let cur = start
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      seen.add(cur.term)
      cur = nextTipInPath('/protected/family', cur, NOW)!
      if (cur.term === start.term) break
    }
    expect(cur.term).toBe(start.term)
    expect(seen.size).toBeGreaterThan(1)
  })

  it('풀에 없는 항목을 주면 그 경로의 기본 상식으로 복귀한다', () => {
    const orphan = { term: '없는용어', plain: 'x', category: '풍수' }
    expect(nextTipInPath('/protected/family', orphan, NOW)?.term).toBe(tipForPath('/protected/family', NOW)?.term)
  })
})
