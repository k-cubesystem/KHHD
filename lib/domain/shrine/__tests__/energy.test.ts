import { computeEnergy, detectResonance, indexCatalog, ELEMENTS } from '../energy'
import type { CatalogItem, Element, Placement } from '../types'

function item(id: string, element: Element, energyPower = 10): CatalogItem {
  return {
    id,
    name: id,
    description: null,
    type: 'candle',
    rarity: 'common',
    emoji: '🕯️',
    spriteUrl: null,
    element,
    energyPower,
    layer: 'altar',
    size: 'sm',
    behavior: {},
    priceBok: 0,
    priceKrw: 0,
    priceBokchae: 0,
    unlockEffect: null,
    matters: [],
    originNote: null,
  }
}

function place(id: string, catalogItemId: string, x: number, y: number): Placement {
  return { id, catalogItemId, layer: 'altar', x, y, flip: false, state: {} }
}

const BASE: Record<Element, number> = { wood: 40, fire: 40, earth: 40, metal: 40, water: 40 }

describe('computeEnergy', () => {
  it('빈 방은 기본 프로필을 그대로 반환한다', () => {
    const catalog = indexCatalog([])
    const { energy, yongsin } = computeEnergy(BASE, [], catalog)
    expect(energy).toEqual(BASE)
    // 모두 동일하면 ELEMENTS 순서상 첫 번째(wood)가 용신
    expect(yongsin).toBe('wood')
  })

  it('배치 아이템의 energy_power를 해당 오행에 더한다', () => {
    const catalog = indexCatalog([item('c-metal', 'metal', 15)])
    const { energy } = computeEnergy(BASE, [place('p1', 'c-metal', 50, 48)], catalog)
    expect(energy.metal).toBe(55)
    expect(energy.wood).toBe(40)
  })

  it('기운은 100을 넘지 않는다 (상한 클램프)', () => {
    const catalog = indexCatalog([item('c', 'fire', 50)])
    const base = { ...BASE, fire: 80 }
    const { energy } = computeEnergy(base, [place('p1', 'c', 50, 48)], catalog)
    expect(energy.fire).toBe(100)
  })

  it('가장 낮은 기운을 용신으로 선택한다', () => {
    const catalog = indexCatalog([])
    const base = { ...BASE, metal: 8 }
    const { yongsin } = computeEnergy(base, [], catalog)
    expect(yongsin).toBe('metal')
  })

  it('element이 없는 아이템은 기운에 영향을 주지 않는다', () => {
    const noEl: CatalogItem = { ...item('x', 'wood'), element: null }
    const catalog = indexCatalog([noEl])
    const { energy } = computeEnergy(BASE, [place('p1', 'x', 50, 48)], catalog)
    expect(energy.wood).toBe(40)
  })
})

describe('detectResonance', () => {
  const catalog = indexCatalog([item('metal', 'metal'), item('fire', 'fire')])

  it('같은 오행 2개로는 공명하지 않는다', () => {
    const placements = [place('a', 'metal', 50, 45), place('b', 'metal', 52, 47)]
    expect(detectResonance(placements, catalog)).toHaveLength(0)
  })

  it('같은 오행 3개가 반경 내에 모이면 공명한다', () => {
    const placements = [place('a', 'metal', 50, 45), place('b', 'metal', 55, 48), place('c', 'metal', 52, 50)]
    const hits = detectResonance(placements, catalog)
    expect(hits).toHaveLength(1)
    expect(hits[0].element).toBe('metal')
  })

  it('멀리 흩어진 3개는 공명하지 않는다', () => {
    const placements = [place('a', 'metal', 10, 10), place('b', 'metal', 90, 90), place('c', 'metal', 50, 50)]
    expect(detectResonance(placements, catalog)).toHaveLength(0)
  })

  it('서로 다른 오행은 함께 공명하지 않는다', () => {
    const placements = [place('a', 'metal', 50, 45), place('b', 'fire', 52, 47), place('c', 'metal', 51, 49)]
    expect(detectResonance(placements, catalog)).toHaveLength(0)
  })

  it('공명 시 computeEnergy가 +5 보너스를 적용한다', () => {
    const placements = [place('a', 'metal', 50, 45), place('b', 'metal', 55, 48), place('c', 'metal', 52, 50)]
    const { energy } = computeEnergy(BASE, placements, catalog)
    // 3 × 10(power) + 5(공명) = 35 증가
    expect(energy.metal).toBe(40 + 30 + 5)
  })
})

describe('ELEMENTS', () => {
  it('오행 5개를 정확한 순서로 노출한다', () => {
    expect(ELEMENTS).toEqual(['wood', 'fire', 'earth', 'metal', 'water'])
  })
})
