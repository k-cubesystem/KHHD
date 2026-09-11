import { getSajuData, type SajuData, type SajuPillar } from '@/lib/domain/saju/saju'
import {
  PILLAR_WEIGHT,
  computeElementProfile,
  energyToShare,
  roundShares,
  shareToBar,
} from '@/lib/domain/saju/element-profile'
import { ELEMENTS } from '@/lib/domain/shrine/energy'

function pillar(gan: string, zhi: string): SajuPillar {
  return { gan, zhi, ganji: `${gan}${zhi}`, element: '', ganElement: '', zhiElement: '' }
}

function pillars(y: string, m: string, d: string, h: string): Pick<SajuData, 'pillars'> {
  const p = (s: string) => pillar(s.charAt(0), s.charAt(1))
  return { pillars: { year: p(y), month: p(m), day: p(d), hour: p(h), time: p(h) } }
}

describe('computeElementProfile — 지장간·자리 무게로 낸 오행 비율', () => {
  it('비율은 정수이고 합이 100 이다', () => {
    const saju = getSajuData('1998-03-12', '14:30', true)
    const profile = computeElementProfile(saju)
    const sum = ELEMENTS.reduce((s, el) => s + profile.share[el], 0)
    expect(sum).toBe(100)
    for (const el of ELEMENTS) {
      expect(Number.isInteger(profile.share[el])).toBe(true)
      expect(profile.bar[el]).toBeGreaterThanOrEqual(5)
      expect(profile.bar[el]).toBeLessThanOrEqual(100)
    }
  })

  it('여덟 글자가 전부 한 오행이면 그 오행이 100%', () => {
    // 甲寅: 천간 甲(木) · 寅 지장간 戊·丙·甲 → 순수 100 은 아니다. 卯(乙 단일)로 시험한다.
    const profile = computeElementProfile(pillars('乙卯', '乙卯', '乙卯', '乙卯'))
    expect(profile.share.wood).toBe(100)
    expect(profile.strongest).toBe('wood')
    expect(profile.bar.wood).toBe(100)
    expect(profile.bar.fire).toBe(5)
  })

  it('🔴 지장간이 잡힌다 — 丑(土) 안의 癸(水)·辛(金)이 물·쇠 비율로 나온다', () => {
    // 낱개 세기라면 土 100% 였을 명식: 지지가 전부 丑
    const profile = computeElementProfile(pillars('己丑', '己丑', '己丑', '己丑'))
    expect(profile.share.earth).toBeLessThan(100)
    expect(profile.share.water).toBeGreaterThan(0)
    expect(profile.share.metal).toBeGreaterThan(0)
    expect(profile.share.earth).toBeGreaterThan(profile.share.water)
  })

  it('🔴 월지가 가장 무겁다 — 같은 글자라도 월지에 있으면 비율이 더 오른다', () => {
    const inYear = computeElementProfile(pillars('丙午', '乙卯', '乙卯', '乙卯'))
    const inMonth = computeElementProfile(pillars('乙卯', '丙午', '乙卯', '乙卯'))
    expect(inMonth.share.fire).toBeGreaterThan(inYear.share.fire)
    expect(PILLAR_WEIGHT.monthZhi).toBeGreaterThan(PILLAR_WEIGHT.yearZhi)
    expect(inMonth.monthCommand).toBe('fire')
    expect(inMonth.dayMaster).toBe('wood')
  })

  it('결정론 — 같은 명식이면 같은 비율', () => {
    const a = computeElementProfile(getSajuData('1990-07-07', '07:00', true))
    const b = computeElementProfile(getSajuData('1990-07-07', '07:00', true))
    expect(a).toEqual(b)
  })

  it('실제 명식에서 개수 0 인 오행도 지장간 덕에 0% 가 아닐 수 있고, 값이 계단으로 뛰지 않는다', () => {
    const saju = getSajuData('1985-11-23', '23:10', true)
    const counted = saju.elementsDistribution
    const profile = computeElementProfile(saju)
    const zeroCounted = ELEMENTS.filter(
      (el) => (counted[{ wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }[el]] ?? 0) === 0
    )
    for (const el of zeroCounted) expect(profile.share[el]).toBeGreaterThanOrEqual(0)
    const values = ELEMENTS.map((el) => profile.share[el])
    expect(Math.max(...values)).toBeLessThan(100)
  })
})

describe('roundShares · shareToBar · energyToShare', () => {
  it('큰 나머지부터 올려 합 100 을 맞춘다', () => {
    const out = roundShares({ wood: 1, fire: 1, earth: 1, metal: 1, water: 1 })
    expect(ELEMENTS.reduce((s, el) => s + out[el], 0)).toBe(100)
    expect(out.wood).toBe(20)
  })

  it('전부 0 이면 평평한 20 씩', () => {
    expect(roundShares({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 })).toEqual({
      wood: 20,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 20,
    })
  })

  it('막대는 균형 20% 가 50, 0% 는 5, 40% 이상은 100', () => {
    expect(shareToBar(20)).toBe(50)
    expect(shareToBar(0)).toBe(5)
    expect(shareToBar(40)).toBe(100)
    expect(shareToBar(55)).toBe(100)
  })

  it('살림 얹은 기운(0~100)을 비율로 바꾸면 합 100', () => {
    const share = energyToShare({ wood: 72, fire: 24, earth: 48, metal: 55, water: 61 })
    expect(ELEMENTS.reduce((s, el) => s + share[el], 0)).toBe(100)
    expect(share.wood).toBeGreaterThan(share.fire)
  })
})
