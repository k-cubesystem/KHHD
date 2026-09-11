import type { Element } from '@/lib/domain/shrine/types'
import { COMPLEMENT_MIN_GAP } from '@/lib/domain/shrine/energy-map'
import { bannedWordsIn } from '@/lib/domain/circle/element-lore'
import {
  STRONG_SHARE,
  allPairs,
  buildCircleEnergy,
  circleEnergyTexts,
  circleRoles,
  holdersOf,
  pairRelation,
  PAIR_LABEL_KO,
  type CircleMemberEnergy,
} from '@/lib/domain/circle/team-energy'

/** 비율 기본 20 씩(합 100) — 바꾼 값만큼 다른 오행에서 뺀다고 가정하지 않고 그대로 둔다(판정은 상대 비교라 상관없다). */
function share(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20, ...partial }
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

const MINSU = member('a', '민수', share({ wood: 38, fire: 10 }))
const JIYOUNG = member('b', '지영', share({ wood: 6, fire: 34 }))
const HYUNWOO = member('c', '현우', share({ water: 36, metal: 8 }))

describe('pairRelation — 라벨 하나, 이치와 실천 한 벌, 숫자 없음', () => {
  it('오행 보완(지도와 같은 규칙) → 채워 주는 사이 · 누가 누구에게 · 왜 · 함께 무엇을', () => {
    // 민수→지영: 목(木) · 지영→민수: 화(火) — 양쪽이 메우면 «서로» 한 문장
    const r = pairRelation(MINSU, JIYOUNG)
    expect(r.label).toBe('complement')
    expect(r.giverId).toBeNull()
    expect(r.reason).toContain('서로 채워 주는 사이입니다')
    expect(r.reason).toContain('민수님의 넉넉한 목(木) 기운이 지영님의 옅은 자리를')
    expect(r.reason).toContain('지영님의 넉넉한 화(火) 기운이 민수님의 옅은 자리를')
    expect(r.how.length).toBeGreaterThan(10)

    // 한쪽만 메우면 누가 누구에게 · 왜 · 함께 무엇을
    const taker = member('t', '수민', share({ wood: 6, fire: 22 }))
    const one = pairRelation(MINSU, taker)
    expect(one.label).toBe('complement')
    expect(one.element).toBe('wood')
    expect(one.giverId).toBe('a')
    expect(one.receiverId).toBe('t')
    expect(one.reason).toContain('수민님은 목(木) 기운이 옅어')
    expect(one.reason).toContain('민수님은 그 기운이 넉넉합니다')
    expect(one.how).toContain('작은 관엽 화분')
    expect(one.how).toContain('수민님 자리에')
  })

  it('격차가 COMPLEMENT_MIN_GAP 미만이면 각자 서는 사이 — 실천 한 줄은 그래도 있다', () => {
    const near = member('d', '수진', share({ wood: 6 + COMPLEMENT_MIN_GAP - 1 }))
    const r = pairRelation(near, JIYOUNG)
    expect(r.label).toBe('independent')
    expect(r.giverId).toBeNull()
    expect(r.how.length).toBeGreaterThan(10)
  })

  it('상대 일간이 내 옅은 기운을 낳으면(상생) 끌어 주는 사이 — 木生火 를 문장에 적는다', () => {
    const me = member('a', '민수', share({ fire: 6, earth: 30 }))
    const other = member('b', '지영', share({ water: 30 }), { dayMaster: 'wood' })
    const r = pairRelation(me, other)
    expect(r.label).toBe('lift')
    expect(r.element).toBe('fire')
    expect(r.reason).toContain('木生火')
    expect(r.reason).toContain('드러내는 힘')
    expect(r.receiverId).toBe('a')
  })

  it('상대 일간이 명식 용신이면 끌어 주는 사이', () => {
    const me = member('a', '민수', share({ wood: 30, earth: 6 }), { mansikYongsin: 'metal' })
    const other = member('b', '지영', share({ fire: 30 }), { dayMaster: 'metal' })
    const r = pairRelation(me, other)
    expect(r.label).toBe('lift')
    expect(r.reason).toContain('명식이 채우라 하는 기운 그대로')
  })

  it('상대 일간이 내 옅은 기운을 누르면(상극) 지켜 줄 사이 — 金克木', () => {
    const me = member('a', '민수', share({ wood: 6, fire: 30 }))
    const other = member('b', '지영', share({ earth: 30 }), { dayMaster: 'metal' })
    const r = pairRelation(me, other)
    expect(r.label).toBe('guard')
    expect(r.element).toBe('wood')
    expect(r.reason).toContain('金克木')
    expect(r.how).toContain('작은 관엽 화분')
  })

  it('🔴 상대 일간이 내 기신이면 «거리가 약» — 끌어 줌보다 먼저 서고, 거리 두기가 아니라 균형 잡기를 말한다', () => {
    const me = member('a', '민수', share({ wood: 6, fire: 30 }), { mansikYongsin: 'water', mansikGisin: 'water' })
    const other = member('b', '지영', share({ fire: 30 }), { dayMaster: 'water' })
    const r = pairRelation(me, other)
    expect(r.label).toBe('distance')
    expect(r.reason).toContain('이미 넘치는 쪽')
    expect(r.how).toContain('거리를 두라는 말이 아닙니다')
    expect(r.how).toContain('작은 관엽 화분')
  })

  it('같은 기운을 둘 다 넘치게 들면 거리가 약인 사이(과열)', () => {
    const a = member('a', '민수', share({ fire: STRONG_SHARE + 4, wood: 6 }))
    const b = member('b', '지영', share({ fire: STRONG_SHARE + 2, metal: 6 }))
    const r = pairRelation(a, b)
    expect(r.label).toBe('distance')
    expect(r.element).toBe('fire')
    expect(r.reason).toContain('두 사람 다 화(火) 기운이 두껍습니다')
  })

  it('반대 방향도 같은 라벨(둘 중 한쪽이라도 걸리면), 급한 쪽이 이긴다', () => {
    const me = member('a', '민수', share({ wood: 30, fire: 6 }), { dayMaster: 'water' })
    const other = member('b', '지영', share({ fire: 30, wood: 6 }), { mansikGisin: 'water', dayMaster: 'wood' })
    // a→b: b 일간 wood 가 a 의 옅은 fire 를 낳는다(lift) · b→a: a 일간 water 가 b 의 기신(distance) → distance
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
    const a = member('a', '민수', share({ wood: 38, fire: 10, metal: 12 }))
    const smith = member('d', '수진', share({ metal: 36 }))
    const ce = buildCircleEnergy('friends', [a, JIYOUNG, HYUNWOO, smith])
    expect(ce.lowest).toBe('metal')
    expect(ce.holders).toEqual([{ targetId: 'd', name: '수진' }])
    expect(ce.scoreMode).toBe('full')
    expect(ce.notice).toBeNull()
  })

  it('holdersOf 는 평균보다 넉넉할 때만 든 사람으로 친다', () => {
    const weak = member('e', '민지', share({ metal: 21 }))
    expect(holdersOf([weak], 'metal', 25)).toEqual([])
    expect(holdersOf([weak], 'metal', 20)).toEqual([{ targetId: 'e', name: '민지' }])
  })

  it('🔴 화면 문자열 전량 — 효능·채용 금지어 없음, 점수·퍼센트 없음', () => {
    const ce = buildCircleEnergy('work', [
      member('a', '민수', share({ wood: 38, fire: 10 }), {
        mansikYongsin: 'fire',
        dayMaster: 'wood',
        sipseong: { 정관: 2, 식신: 1 },
      }),
      member('b', '지영', share({ wood: 6, fire: 34 }), {
        mansikGisin: 'wood',
        dayMaster: 'fire',
        sipseong: { 상관: 2, 정재: 1 },
      }),
      member('c', '현우', share({ water: 36, metal: 8 }), { dayMaster: 'water', sipseong: { 비견: 1 } }),
      member('d', '수진', share({ earth: 34, wood: 6 }), { dayMaster: 'metal' }),
    ])
    for (const text of circleEnergyTexts(ce)) {
      expect({ text, hits: bannedWordsIn(text) }).toEqual({ text, hits: [] })
      expect(text).not.toMatch(/\d+\s*점|\d+\s*%/)
    }
    for (const label of Object.values(PAIR_LABEL_KO)) expect(bannedWordsIn(label)).toEqual([])
    // 모든 짝이 이치와 실천 한 벌을 갖는다
    for (const p of ce.pairs) {
      expect(p.reason.length).toBeGreaterThan(10)
      expect(p.how.length).toBeGreaterThan(10)
    }
  })

  it('🔴 결정론 — 같은 입력이면 같은 출력', () => {
    const a = buildCircleEnergy('custom', [MINSU, JIYOUNG, HYUNWOO])
    const b = buildCircleEnergy('custom', [MINSU, JIYOUNG, HYUNWOO])
    expect(a).toEqual(b)
    expect(allPairs([MINSU, JIYOUNG])).toEqual(allPairs([MINSU, JIYOUNG]))
  })
})

describe('circleRoles — 십성 다섯 무리 합산', () => {
  it('두꺼운 결·옅은 결을 그룹 단위로 합쳐 말하고, 분포가 없으면 null', () => {
    const roles = circleRoles([
      member('a', '민수', share({}), { sipseong: { 식신: 2, 상관: 1, 정관: 1, 비견: 1 } }),
      member('b', '지영', share({}), { sipseong: { 식신: 1, 정인: 1 } }),
      member('c', '현우', share({}), { sipseong: null }),
    ])
    expect(roles).not.toBeNull()
    expect(roles?.thick.key).toBe('siksang')
    expect(roles?.thin.key).toBe('jaeseong')
    expect(roles?.sentence).toContain('만들어 내는 결이 두껍고')
    expect(roles?.sentence).toContain('벌이고 거두는 결이 옅습니다')
    expect(roles?.sentence).not.toMatch(/뽑|채용/)
    expect(circleRoles([member('c', '현우', share({}))])).toBeNull()
  })

  it('동수면 선언 순서가 이긴다(결정론)', () => {
    const roles = circleRoles([member('a', '민수', share({}), { sipseong: { 정관: 1, 식신: 1 } })])
    expect(roles?.thick.key).toBe('gwan')
    expect(roles?.thin.key).toBe('bigyeop')
  })
})
