import type { Element } from '@/lib/domain/shrine/types'
import { COMPLEMENT_MIN_GAP } from '@/lib/domain/shrine/energy-map'
import { bannedWordsIn } from '@/lib/domain/circle/element-lore'
import {
  allPairs,
  buildCircleEnergy,
  circleEnergyTexts,
  circleRoles,
  holdersOf,
  pairRelation,
  PAIR_LABEL_KO,
  type CircleMemberEnergy,
} from '@/lib/domain/circle/team-energy'

function energy(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 40, fire: 40, earth: 40, metal: 40, water: 40, ...partial }
}

function member(
  id: string,
  name: string,
  e: Record<Element, number>,
  over: Partial<CircleMemberEnergy> = {}
): CircleMemberEnergy {
  const els: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
  let low = els[0]
  let high = els[0]
  for (const el of els) {
    if (e[el] < e[low]) low = el
    if (e[el] > e[high]) high = el
  }
  return {
    targetId: id,
    name,
    relation: '동료',
    avatarId: null,
    energy: e,
    yongsin: low,
    strongest: high,
    dayMaster: null,
    mansikYongsin: null,
    mansikGisin: null,
    sipseong: null,
    ...over,
  }
}

const MINSU = member('a', '민수', energy({ wood: 75, fire: 30 }))
const JIYOUNG = member('b', '지영', energy({ wood: 20, fire: 60 }))
const HYUNWOO = member('c', '현우', energy({ water: 70, metal: 25 }))

describe('pairRelation — 라벨 하나, 숫자 없음', () => {
  it('오행 보완(지도와 같은 규칙) → 채워 주는 사이', () => {
    const r = pairRelation(MINSU, JIYOUNG)
    expect(r.label).toBe('complement')
    expect(r.element).toBe('wood')
    expect(r.reason).toBe('민수님의 넘치는 목(木) 기운이 지영님의 모자란 자리를 메웁니다.')
  })

  it('격차가 COMPLEMENT_MIN_GAP 미만이면 각자 서는 사이', () => {
    // 수진: wood 34 가 가장 옅고 나머지 40 — 지영의 모자란 wood(20) 를 채울 넘치는 기운이 아니다
    const near = member('d', '수진', energy({ wood: 20 + COMPLEMENT_MIN_GAP - 1 }))
    expect(near.yongsin).toBe('wood')
    expect(pairRelation(near, JIYOUNG).label).toBe('independent')
  })

  it('상대 일간이 내 용신이면 끌어 주는 사이', () => {
    const me = member('a', '민수', energy({ wood: 45 }), { mansikYongsin: 'fire' })
    const other = member('b', '지영', energy({ fire: 45 }), { dayMaster: 'fire' })
    const r = pairRelation(me, other)
    expect(r.label).toBe('lift')
    expect(r.reason).toContain('지영님 곁에서 민수님의 기운이 트입니다')
  })

  it('🔴 상대 일간이 내 기신이면 «거리가 약» — 끌어 줌보다 먼저 선다', () => {
    const me = member('a', '민수', energy({ wood: 45 }), { mansikYongsin: 'fire', mansikGisin: 'fire' })
    const other = member('b', '지영', energy({ fire: 45 }), { dayMaster: 'fire' })
    const r = pairRelation(me, other)
    expect(r.label).toBe('distance')
    expect(r.reason).toContain('적당한 거리가 약입니다')
  })

  it('반대 방향도 같은 라벨(둘 중 한쪽이라도 걸리면)', () => {
    const me = member('a', '민수', energy({ wood: 45 }), { dayMaster: 'water' })
    const other = member('b', '지영', energy({ fire: 45 }), { mansikGisin: 'water' })
    expect(pairRelation(me, other).label).toBe('distance')
    expect(pairRelation(other, me).label).toBe('distance')
  })
})

describe('buildCircleEnergy', () => {
  it('짝은 i<j 순서로 전부, 함께 채울 기운은 평균 최저, 든 사람은 넘치는 기운이 그것인 사람', () => {
    const ce = buildCircleEnergy('work', [MINSU, JIYOUNG, HYUNWOO])
    expect(ce.pairs).toHaveLength(3)
    expect(ce.pairs.map((p) => `${p.aName}-${p.bName}`)).toEqual(['민수-지영', '민수-현우', '지영-현우'])
    expect(ce.scoreMode).toBe('bands')
    expect(ce.notice).not.toBeNull()
    expect(ce.lowest).toBe('metal')
    expect(ce.holders).toEqual([])
    expect(ce.fallbackItem).toBe('금속 펜 한 자루')
  })

  it('든 사람이 있으면 이름이 서고 물건 대신 사람이 답이다', () => {
    const a = member('a', '민수', energy({ wood: 75, fire: 30, metal: 20 }))
    const b = member('b', '지영', energy({ wood: 20, fire: 60, metal: 20 }))
    const smith = member('d', '수진', energy({ metal: 70 }))
    const ce = buildCircleEnergy('friends', [a, b, HYUNWOO, smith])
    expect(ce.lowest).toBe('metal')
    expect(ce.holders).toEqual([{ targetId: 'd', name: '수진' }])
    expect(ce.scoreMode).toBe('full')
    expect(ce.notice).toBeNull()
  })

  it('holdersOf 는 평균보다 넉넉할 때만 든 사람으로 친다', () => {
    const weak = member('e', '민지', energy({ metal: 41 }))
    expect(holdersOf([weak], 'metal', 45)).toEqual([])
    expect(holdersOf([weak], 'metal', 40)).toEqual([{ targetId: 'e', name: '민지' }])
  })

  it('🔴 화면 문자열 전량 — 효능·채용 금지어 없음, 점수·퍼센트 없음', () => {
    const ce = buildCircleEnergy('work', [
      member('a', '민수', energy({ wood: 75, fire: 30 }), {
        mansikYongsin: 'fire',
        dayMaster: 'wood',
        sipseong: { 정관: 2, 식신: 1 },
      }),
      member('b', '지영', energy({ wood: 20, fire: 60 }), {
        mansikGisin: 'wood',
        dayMaster: 'fire',
        sipseong: { 상관: 2, 정재: 1 },
      }),
      member('c', '현우', energy({ water: 70, metal: 25 }), { dayMaster: 'water', sipseong: { 비견: 1 } }),
    ])
    for (const text of circleEnergyTexts(ce)) {
      expect({ text, hits: bannedWordsIn(text) }).toEqual({ text, hits: [] })
      expect(text).not.toMatch(/\d+\s*점|\d+\s*%/)
    }
    for (const label of Object.values(PAIR_LABEL_KO)) expect(bannedWordsIn(label)).toEqual([])
  })

  it('🔴 결정론 — 같은 입력이면 같은 출력', () => {
    const a = buildCircleEnergy('custom', [MINSU, JIYOUNG, HYUNWOO])
    const b = buildCircleEnergy('custom', [MINSU, JIYOUNG, HYUNWOO])
    expect(a).toEqual(b)
    expect(allPairs([MINSU, JIYOUNG])).toEqual(allPairs([MINSU, JIYOUNG]))
  })
})

describe('circleRoles — 십성 다섯 무리 합산', () => {
  it('두꺼운 결·옅은 결을 무리 단위로 합쳐 말하고, 분포가 없으면 null', () => {
    const roles = circleRoles([
      member('a', '민수', energy({}), { sipseong: { 식신: 2, 상관: 1, 정관: 1, 비견: 1 } }),
      member('b', '지영', energy({}), { sipseong: { 식신: 1, 정인: 1 } }),
      member('c', '현우', energy({}), { sipseong: null }),
    ])
    expect(roles).not.toBeNull()
    expect(roles?.thick.key).toBe('siksang')
    expect(roles?.thin.key).toBe('jaeseong')
    expect(roles?.sentence).toContain('만들어 내는 결이 두껍고')
    expect(roles?.sentence).toContain('벌이고 거두는 결이 옅습니다')
    expect(roles?.sentence).not.toMatch(/뽑|채용/)
    expect(circleRoles([member('c', '현우', energy({}))])).toBeNull()
  })

  it('동수면 선언 순서가 이긴다(결정론)', () => {
    const roles = circleRoles([member('a', '민수', energy({}), { sipseong: { 정관: 1, 식신: 1 } })])
    expect(roles?.thick.key).toBe('gwan')
    expect(roles?.thin.key).toBe('bigyeop')
  })
})
