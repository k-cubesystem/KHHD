import type { Element } from '@/lib/domain/shrine/types'
import { COMPLEMENT_MIN_GAP } from '@/lib/domain/shrine/energy-map'
import { bannedWordsIn, MOTHER_OF } from '@/lib/domain/circle/element-lore'
import {
  buildPrescription,
  pickShrineItems,
  prescriptionTeaser,
  prescriptionTexts,
  LIFE_KINDS,
  SHRINE_PICK,
  type PrescriptionCatalogItem,
  type PrescriptionInput,
  type PrescriptionMate,
} from '@/lib/domain/circle/prescription'

function energy(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 40, fire: 40, earth: 40, metal: 40, water: 40, ...partial }
}

function item(id: string, element: Element, energyPower: number, name = `신물-${id}`): PrescriptionCatalogItem {
  return { id, name, element, energyPower, priceBokchae: 1000, emoji: '🕯️', spriteUrl: null }
}

const CATALOG: PrescriptionCatalogItem[] = [
  item('f1', 'fire', 8, '화로'),
  item('f2', 'fire', 12, '인등'),
  item('f3', 'fire', 12, '촛대 한 쌍'),
  item('f4', 'fire', 5, '부싯돌'),
  item('w1', 'wood', 9, '대나무'),
  item('e1', 'earth', 7, '도자기'),
]

const MOM: PrescriptionMate = { targetId: 'm1', name: '어머니', strongest: 'fire', energy: energy({ fire: 78 }) }
const DAD: PrescriptionMate = { targetId: 'm2', name: '아버지', strongest: 'water', energy: energy({ water: 70 }) }

function input(over: Partial<PrescriptionInput> = {}): PrescriptionInput {
  return {
    targetId: 'self',
    name: '지영',
    energy: energy({ wood: 72, fire: 24, earth: 48, metal: 55, water: 61 }),
    energyLive: energy({ wood: 65, fire: 30 }),
    mansik: null,
    catalog: CATALOG,
    mates: [MOM, DAD],
    ...over,
  }
}

describe('buildPrescription — 다섯 블록', () => {
  it('모자란 기운은 지도의 막대와 같은 값(energy 최저)이고, 넘치는 기운은 최고다', () => {
    const p = buildPrescription(input())
    expect(p.lacking).toBe('fire')
    expect(p.strongest).toBe('wood')
    expect(p.lore.lacking).toContain('자리가 식고')
  })

  it('채워 주는 기운 세 갈래 — 직접(용신)·낳아줌(상생)·사람(무리)', () => {
    const p = buildPrescription(input())
    expect(p.fillers.map((f) => f.kind)).toEqual(['direct', 'mother', 'person'])
    expect(p.fillers[0].element).toBe('fire')
    expect(p.fillers[1].element).toBe(MOTHER_OF.fire)
    expect(p.fillers[1].title).toContain('木生火')
    expect(p.fillers[2].personName).toBe('어머니')
    expect(p.fillers[2].reason).toContain('지영님의 모자란 자리')
  })

  it('사람 갈래는 격차가 COMPLEMENT_MIN_GAP 미만이면 서지 않는다', () => {
    const weak: PrescriptionMate = { ...MOM, energy: energy({ fire: 24 + COMPLEMENT_MIN_GAP - 1 }) }
    const p = buildPrescription(input({ mates: [weak, DAD] }))
    expect(p.fillers.map((f) => f.kind)).toEqual(['direct', 'mother'])
  })

  it('사람 갈래는 그 기운을 가장 넉넉히 든 사람 하나만 고른다', () => {
    const aunt: PrescriptionMate = { targetId: 'm3', name: '이모', strongest: 'fire', energy: energy({ fire: 85 }) }
    const p = buildPrescription(input({ mates: [MOM, aunt] }))
    expect(p.fillers[2].personName).toBe('이모')
  })

  it('곁에 둘 것 세 층 — 신당 살림 셋(세기순)·실물(책상·집·선물 셋)·생활 셋', () => {
    const p = buildPrescription(input())
    expect(p.items.shrine.map((s) => s.name)).toEqual(['인등', '촛대 한 쌍', '화로'])
    expect(p.items.shrine.every((s) => s.element === 'fire')).toBe(true)
    expect(p.items.real.desk).toContain('스탠드')
    expect(p.items.real.home).toBe('남쪽 자리에 밝은 조명')
    expect(p.items.real.gifts).toHaveLength(3)
    expect(p.items.life).toHaveLength(LIFE_KINDS.length)
    expect(p.items.life[0].value).toBe('남쪽을 보고 앉기')
  })

  it('덜어낼 것 — 명식 기신이 없으면 지금 가장 넘치는 기운을, 있으면 기신을 덜어낸다', () => {
    const p = buildPrescription(input())
    expect(p.avoid.element).toBe('wood')
    expect(p.avoid.items).toHaveLength(2)
    expect(p.avoid.items[0].value).toBe('초록·청록 일색')

    const withGisin = buildPrescription(input({ mansik: { yongsin: 'fire', huisin: 'wood', gisin: 'water' } }))
    expect(withGisin.avoid.element).toBe('water')
  })

  it('같은 기운이 몰리는 사람이 있으면 주의 한 줄, 없으면 null', () => {
    const p = buildPrescription(input({ mansik: { yongsin: 'fire', huisin: 'wood', gisin: 'water' } }))
    expect(p.caution).toContain('아버지님과는 수(水) 기운이 함께 몰립니다')
    const alone = buildPrescription(input({ mates: [] }))
    expect(alone.caution).toBeNull()
  })

  it('명식의 용신이 지도의 모자란 기운과 다를 때만 한 줄을 더 말한다', () => {
    const same = buildPrescription(input({ mansik: { yongsin: 'fire', huisin: 'wood', gisin: 'water' } }))
    expect(same.mansikNote).toBeNull()
    expect(same.sideNote).toBeNull()

    const differ = buildPrescription(input({ mansik: { yongsin: 'earth', huisin: 'metal', gisin: 'water' } }))
    expect(differ.mansikNote).toContain('토(土)')
    expect(differ.mansikNote).toContain('화(火)')
    expect(differ.sideNote).toContain('금(金)')
  })

  it('🔴 결정론 — 같은 입력이면 깊은 비교로 같은 처방이다', () => {
    const a = buildPrescription(input())
    const b = buildPrescription(input())
    expect(a).toEqual(b)
  })

  it('🔴 처방전 문자열 전량에 효능·채용 금지어가 없고, 점수·퍼센트를 말하지 않는다', () => {
    const variants = [
      input(),
      input({ mansik: { yongsin: 'earth', huisin: 'metal', gisin: 'water' } }),
      input({ energy: energy({ water: 12, metal: 80 }), mates: [MOM] }),
      input({ energy: energy({ earth: 15, fire: 75 }), mates: [] }),
      input({ energy: energy({ metal: 18, water: 70 }) }),
      input({ energy: energy({ wood: 20, earth: 66 }) }),
    ]
    for (const v of variants) {
      for (const text of prescriptionTexts(buildPrescription(v))) {
        expect({ text, hits: bannedWordsIn(text) }).toEqual({ text, hits: [] })
        expect(text).not.toMatch(/\d+\s*점|\d+\s*%/)
      }
    }
  })
})

describe('pickShrineItems', () => {
  it('세기 내림차순, 동률이면 이름순 — 정렬이 흔들리지 않는다', () => {
    expect(pickShrineItems(CATALOG, 'fire').map((s) => s.id)).toEqual(['f2', 'f3', 'f1'])
    expect(pickShrineItems(CATALOG, 'fire')).toHaveLength(SHRINE_PICK)
    expect(pickShrineItems(CATALOG, 'metal')).toEqual([])
  })

  it('입력 배열을 바꾸지 않는다', () => {
    const copy = CATALOG.map((c) => ({ ...c }))
    pickShrineItems(CATALOG, 'fire')
    expect(CATALOG).toEqual(copy)
  })
})

describe('prescriptionTeaser — 무료 맛보기', () => {
  it('①·② 만 남기고, 숨긴 개수는 실제 배열 길이에서 센다', () => {
    const p = buildPrescription(input())
    const t = prescriptionTeaser(p)
    expect(t.lacking).toBe('fire')
    expect(t.lore).toEqual(p.lore)
    expect(t.hiddenCount).toBe(
      p.fillers.length +
        p.items.shrine.length +
        2 +
        p.items.real.gifts.length +
        p.items.life.length +
        p.avoid.items.length
    )
    expect(Object.keys(t)).not.toContain('fillers')
    expect(Object.keys(t)).not.toContain('items')
  })
})
