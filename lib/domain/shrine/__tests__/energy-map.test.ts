import {
  averageEnergy,
  buildEnergyMap,
  buildFamilyEnergySummary,
  findComplements,
  highestElement,
  lowestElement,
  COMPLEMENT_MIN_GAP,
  type EnergyMapEntry,
  type EnergySummarySource,
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

/**
 * 허브 배너 요약 — 지도 전체를 계산하지 않고 «타고난 기운»만 보고 한 줄을 고른다.
 * 배너는 한 문장만 말할 수 있으므로, **가장 할 말이 있는 짝**(격차 최대)이 그 자리를 가져가야 한다.
 */
describe('buildFamilyEnergySummary — 배너 한 줄', () => {
  const src = (id: string, name: string, energy: Record<Element, number>): EnergySummarySource => ({
    targetId: id,
    name,
    avatarId: null,
    energy,
  })

  it('사람 수·넘치는 기운·부족한 기운을 사람마다 뽑는다', () => {
    const summary = buildFamilyEnergySummary([
      src('self', '나', { wood: 80, fire: 20, earth: 50, metal: 50, water: 50 }),
      src('m1', '어머니', { wood: 20, fire: 80, earth: 50, metal: 50, water: 50 }),
    ])

    expect(summary.count).toBe(2)
    expect(summary.members.map((m) => m.name)).toEqual(['나', '어머니'])
    expect(summary.members[0].strongest).toBe('wood')
    expect(summary.members[0].yongsin).toBe('fire')
    expect(summary.members[1].strongest).toBe('fire')
    expect(summary.members[1].yongsin).toBe('wood')
  })

  it('★ 짝이 여럿이면 격차가 가장 큰 하나를 고른다 — 배너는 한 줄뿐이다', () => {
    // 나 → 어머니(木 80 vs 20 = 60), 아버지 → 나(火 70 vs 20 = 50). 큰 쪽이 뽑혀야 한다.
    const summary = buildFamilyEnergySummary([
      src('self', '나', { wood: 80, fire: 20, earth: 50, metal: 50, water: 50 }),
      src('m1', '어머니', { wood: 20, fire: 55, earth: 50, metal: 50, water: 50 }),
      src('m2', '아버지', { wood: 45, fire: 70, earth: 50, metal: 50, water: 50 }),
    ])

    expect(summary.complement).not.toBeNull()
    expect(summary.complement?.fromName).toBe('나')
    expect(summary.complement?.toName).toBe('어머니')
    expect(summary.complement?.element).toBe('wood')
  })

  it('메워줄 짝이 없으면 null — 그때 배너는 가족 평균의 부족한 기운을 말한다', () => {
    const summary = buildFamilyEnergySummary([
      src('self', '나', { ...BALANCED, water: 20 }),
      src('m1', '동생', { ...BALANCED, water: 22 }),
    ])

    expect(summary.complement).toBeNull()
    expect(summary.familyYongsin).toBe('water')
  })

  it('혼자면 견줄 것이 없다 — 화면이 «가족 등록» 상태로 갈리는 근거', () => {
    const summary = buildFamilyEnergySummary([src('self', '나', BALANCED)])

    expect(summary.count).toBe(1)
    expect(summary.complement).toBeNull()
  })
})
