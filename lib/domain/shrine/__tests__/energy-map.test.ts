import {
  averageEnergy,
  buildEnergyMap,
  findComplements,
  highestElement,
  lowestElement,
  COMPLEMENT_MIN_GAP,
  type EnergyMapEntry,
} from '../energy-map'
import type { Element } from '../types'

function entry(id: string, name: string, energy: Record<Element, number>): EnergyMapEntry {
  return {
    targetId: id,
    name,
    relation: '본인',
    avatarId: null,
    category: 'family' as const,
    hasShrine: true,
    itemCount: 0,
    deityName: null,
    energy,
    yongsin: lowestElement(energy),
    strongest: highestElement(energy),
  }
}

const BALANCED = { wood: 50, fire: 50, earth: 50, metal: 50, water: 50 }

describe('lowest/highestElement', () => {
  it('최약·최강 기운을 고른다', () => {
    const e = { wood: 80, fire: 20, earth: 50, metal: 50, water: 50 }
    expect(lowestElement(e)).toBe('fire')
    expect(highestElement(e)).toBe('wood')
  })

  it('동점이면 오행 순서상 앞선 것 — 결과가 흔들리지 않게', () => {
    expect(lowestElement(BALANCED)).toBe('wood')
    expect(highestElement(BALANCED)).toBe('wood')
  })
})

describe('averageEnergy', () => {
  it('구성원 평균을 반올림해 낸다', () => {
    const avg = averageEnergy([entry('a', 'A', { ...BALANCED, wood: 60 }), entry('b', 'B', { ...BALANCED, wood: 30 })])
    expect(avg.wood).toBe(45)
    expect(avg.fire).toBe(50)
  })

  it('구성원이 없으면 0 — 나눗셈 폭발 방지', () => {
    expect(averageEnergy([])).toEqual({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })
  })
})

describe('findComplements', () => {
  it('A 의 최강이 B 의 최약이면 보완 관계 (단방향)', () => {
    // A 의 火(55)를 넉넉히 둬 B→A 역방향은 성립하지 않게 만든다 (A 의 용신은 土)
    const a = entry('a', '아버지', { wood: 85, fire: 55, earth: 40, metal: 40, water: 40 })
    const b = entry('b', '딸', { wood: 20, fire: 60, earth: 60, metal: 60, water: 60 })
    expect(a.strongest).toBe('wood')
    expect(b.yongsin).toBe('wood')
    const found = findComplements([a, b])
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ fromName: '아버지', toName: '딸', element: 'wood' })
  })

  it('격차가 기준 미만이면 제외 — 억지 해석 금지', () => {
    const a = entry('a', 'A', { wood: 55, fire: 50, earth: 50, metal: 50, water: 50 })
    const b = entry('b', 'B', { wood: 45, fire: 50, earth: 50, metal: 50, water: 50 })
    expect(a.energy.wood - b.energy.wood).toBeLessThan(COMPLEMENT_MIN_GAP)
    expect(findComplements([a, b])).toHaveLength(0)
  })

  it('자기 자신과는 짝지어지지 않는다', () => {
    const a = entry('a', 'A', { wood: 90, fire: 10, earth: 50, metal: 50, water: 50 })
    expect(findComplements([a])).toHaveLength(0)
  })

  it('서로 메워주면 양방향 2건', () => {
    const a = entry('a', 'A', { wood: 85, fire: 15, earth: 50, metal: 50, water: 50 })
    const b = entry('b', 'B', { wood: 15, fire: 85, earth: 50, metal: 50, water: 50 })
    const found = findComplements([a, b])
    expect(found).toHaveLength(2)
    expect(found.map((c) => c.element).sort()).toEqual(['fire', 'wood'])
  })
})

describe('buildEnergyMap', () => {
  it('평균·가족 용신·보완을 함께 낸다', () => {
    const a = entry('a', 'A', { wood: 80, fire: 30, earth: 50, metal: 50, water: 50 })
    const b = entry('b', 'B', { wood: 60, fire: 20, earth: 50, metal: 50, water: 50 })
    const map = buildEnergyMap([a, b])
    expect(map.average.wood).toBe(70)
    expect(map.familyYongsin).toBe('fire') // 둘 다 火 가 모자라면 가족 전체의 숙제
    expect(map.entries).toHaveLength(2)
  })

  it('빈 가족도 터지지 않는다', () => {
    const map = buildEnergyMap([])
    expect(map.entries).toHaveLength(0)
    expect(map.complements).toHaveLength(0)
  })
})
