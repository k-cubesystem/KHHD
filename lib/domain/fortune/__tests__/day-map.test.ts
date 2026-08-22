import { deriveDayMap, dayMapGreetingLine } from '../day-map'

/**
 * 골든 케이스는 스레드 1주차 원고(TEAM_A_PM/threads-week1-mon-wed.md)의 「오늘의 지도」 3편이다.
 * 사람이 손으로 쓴 그 판정과 엔진 판정이 갈리면, 같은 세계관의 두 화면이 다른 말을 하게 된다.
 */
describe('deriveDayMap — 스레드 「오늘의 지도」 원고와 같은 판정', () => {
  it('경오(庚午) — 쇠가 불을 만나는 날 · 단련이되 성급하면 덴다', () => {
    const map = deriveDayMap('Metal', 'Fire', '午')
    expect(map?.headline).toBe('쇠가 불을 만나는 날')
    expect(map?.flow).toBe('pressure')
    expect(map?.doLine).toContain('결단')
    expect(map?.avoidLine).toContain('성급')
  })

  it('신미(辛未) — 흙이 쇠를 기르는 날 · 새로 벌이기보다 다듬기', () => {
    const map = deriveDayMap('Metal', 'Earth', '未')
    expect(map?.headline).toBe('흙이 쇠를 기르는 날')
    expect(map?.flow).toBe('support')
    expect(map?.doLine).toContain('다듬')
  })

  it('임신(壬申) — 물꼬가 트이는 날 · 지갑도 함께 트인다', () => {
    const map = deriveDayMap('Water', 'Metal', '申')
    expect(map?.headline).toBe('쇠가 물꼬를 트는 날')
    expect(map?.flow).toBe('support')
    expect(map?.doLine).toContain('연락')
    expect(map?.avoidLine).toContain('지갑')
  })
})

describe('deriveDayMap — 입력 형식', () => {
  it('한자 오행으로도 같은 결과 (영문/한자 모두 받는다)', () => {
    expect(deriveDayMap('金', '土', '未')?.headline).toBe(deriveDayMap('Metal', 'Earth', '未')?.headline)
  })

  it('25조합이 모두 채워져 있다 — 어떤 날도 빈손으로 두지 않는다', () => {
    const els = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
    for (const gan of els) {
      for (const ji of els) {
        const map = deriveDayMap(gan, ji)
        expect(map).not.toBeNull()
        expect(map?.headline.endsWith('날')).toBe(true)
        expect(map?.doLine.length).toBeGreaterThan(0)
        expect(map?.avoidLine.length).toBeGreaterThan(0)
      }
    }
  })

  it('지지를 주면 계절 이미지가 붙어 같은 조합도 날마다 달라진다', () => {
    const a = deriveDayMap('Metal', 'Earth', '未')
    const b = deriveDayMap('Metal', 'Earth', '丑')
    expect(a?.headline).toBe(b?.headline)
    expect(a?.avoidLine).not.toBe(b?.avoidLine)
  })

  it('모르는 오행이면 null — 화면은 지도 없이도 서야 한다', () => {
    expect(deriveDayMap('Plasma', 'Fire', '午')).toBeNull()
  })
})

describe('dayMapGreetingLine — 선문안에 얹는 한 문장', () => {
  it('신위 화법(존댓말)이고 두 줄을 넘지 않는다', () => {
    const map = deriveDayMap('Metal', 'Fire', '午')!
    const line = dayMapGreetingLine(map)
    expect(line.startsWith('오늘은 ')).toBe(true)
    expect(line.split('\n')).toHaveLength(2)
    expect(line).toContain('이에요')
  })

  it('사주 용어를 노출하지 않는다 (독자의 말로 — 마케팅 v3 원칙)', () => {
    const els = ['Wood', 'Fire', 'Earth', 'Metal', 'Water']
    const banned = ['일간', '일진', '천간', '지지', '상관', '편관', '식신', '비겁', '오행']
    for (const gan of els) {
      for (const ji of els) {
        const line = dayMapGreetingLine(deriveDayMap(gan, ji, '午')!)
        for (const word of banned) expect(line).not.toContain(word)
      }
    }
  })
})
