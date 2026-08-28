import { getSajuData, calculateDaeun } from '@/lib/domain/saju/saju'
import {
  buildSaju3,
  buildChildReading,
  rolesOf,
  dominantRole,
  supportCount,
  isTypeSlug,
  typeBySlug,
  shareText,
  ageOn,
  TYPE_SLUGS,
  ELEMENT_KO,
  ELEMENTS,
  UNKNOWN_TIME_FALLBACK,
  type Element,
  type Saju3Input,
} from '../saju3'

/** 만세력 실엔진 → 3초 사주 입력으로 옮기는 어댑터(서버 액션과 같은 변환). */
function fromBirth(date: string, time = UNKNOWN_TIME_FALLBACK): Saju3Input {
  const s = getSajuData(date, time, true)
  return {
    me: s.dayMasterElement as Element,
    elements: s.elementsDistribution as Record<Element, number>,
    spouseSeat: s.pillars.day.zhiElement as Element,
  }
}

describe('오행 관계', () => {
  it('나를 기준으로 다섯 자리가 서로 겹치지 않는다', () => {
    for (const me of ELEMENTS) {
      const r = rolesOf(me)
      expect(new Set(Object.values(r)).size).toBe(5)
    }
  })

  it('쇠(金)의 자리 배정 — 금생수·금극목·토생금·화극금', () => {
    expect(rolesOf('金')).toEqual({
      sibling: '金',
      resource: '土',
      output: '水',
      wealth: '木',
      officer: '火',
    })
  })
})

describe('유형 판정', () => {
  it('열 가지 유형이 있고 slug 가 전부 다르다', () => {
    expect(TYPE_SLUGS).toHaveLength(10)
    expect(new Set(TYPE_SLUGS).size).toBe(10)
    for (const s of TYPE_SLUGS) expect(isTypeSlug(s)).toBe(true)
  })

  it('모르는 slug 는 throw 하지 않고 false', () => {
    expect(isTypeSlug('gyeong')).toBe(false)
  })

  it('🔴 동점은 «밖으로 드러나는 자리»부터 — 순서가 바뀌면 판정이 통째로 달라진다', () => {
    // 나=金. 같은 것(金) 3 · 나를 누르는 것(火) 3 동점 → officer 가 이긴다
    const input: Saju3Input = {
      me: '金',
      elements: { 木: 0, 火: 3, 土: 1, 金: 3, 水: 1 },
      spouseSeat: '土',
    }
    expect(dominantRole(input)).toBe('officer')
  })

  it('나를 세우는 힘이 4 이상이면 센 쪽 유형이 나온다', () => {
    const input: Saju3Input = { me: '金', elements: { 木: 0, 火: 3, 土: 1, 金: 3, 水: 1 }, spouseSeat: '土' }
    expect(supportCount(input)).toBe(4)
    expect(buildSaju3(input).type.slug).toBe('anchor')
  })

  it('같은 자리라도 세우는 힘이 적으면 다른 유형이 나온다', () => {
    const strong: Saju3Input = { me: '金', elements: { 木: 0, 火: 3, 土: 2, 金: 2, 水: 1 }, spouseSeat: '土' }
    const weak: Saju3Input = { me: '金', elements: { 木: 0, 火: 4, 土: 1, 金: 1, 水: 2 }, spouseSeat: '火' }
    expect(buildSaju3(strong).type.slug).toBe('anchor')
    expect(buildSaju3(weak).type.slug).toBe('tempered')
  })
})

describe('세 줄', () => {
  const base: Saju3Input = { me: '金', elements: { 木: 0, 火: 2, 土: 2, 金: 2, 水: 2 }, spouseSeat: '土' }

  it('돈 줄은 «내가 다루는 자리» 개수를 따라간다 — 0개면 비었다고 말한다', () => {
    const r = buildSaju3(base) // 나=金 → 돈=木, 0개
    expect(r.lines.money).toContain('돈 자리가 비었어')
  })

  it('돈 자리가 셋 이상이면 «문이 많다»로 뒤집는다 (많다 ≠ 부자)', () => {
    const rich: Saju3Input = { me: '金', elements: { 木: 3, 火: 1, 土: 2, 金: 1, 水: 1 }, spouseSeat: '木' }
    expect(buildSaju3(rich).lines.money).toContain('나가는 길도 그만큼')
  })

  it('인연 줄은 배우자 자리가 나에게 어떤 자리인지로 갈린다', () => {
    const byOfficer = buildSaju3({ ...base, spouseSeat: '火' }) // 火가 金을 누른다
    const byOutput = buildSaju3({ ...base, spouseSeat: '水' }) // 金이 水를 낳는다
    expect(byOfficer.lines.love).toContain('알아봐 주는')
    expect(byOutput.lines.love).toContain('먼저 주고 먼저 연락해')
    expect(byOfficer.lines.love).not.toBe(byOutput.lines.love)
  })

  it('때 줄은 세우는 힘에 따라 세 갈래', () => {
    const late = buildSaju3({ me: '金', elements: { 木: 2, 火: 3, 土: 1, 金: 1, 水: 1 }, spouseSeat: '木' })
    const mid = buildSaju3({ me: '金', elements: { 木: 2, 火: 2, 土: 2, 金: 1, 水: 1 }, spouseSeat: '木' })
    const early = buildSaju3({ me: '金', elements: { 木: 1, 火: 1, 土: 3, 金: 2, 水: 1 }, spouseSeat: '木' })
    expect(late.lines.timing).toContain('늦게 트여')
    expect(mid.lines.timing).toContain('지름길 찾다가')
    expect(early.lines.timing).toContain('일찍 판을 벌이는')
  })
})

/**
 * 열 유형을 실제로 만들어내는 분포표(나=쇠 기준). 규칙을 바꾸면 여기가 먼저 깨진다 —
 * 어떤 사주가 어떤 유형이 되는지의 살아있는 문서이기도 하다. 각 행의 합은 8.
 */
const TYPE_FIXTURES: Array<{ slug: string; elements: Record<Element, number> }> = [
  { slug: 'anchor', elements: { 木: 0, 火: 3, 土: 1, 金: 3, 水: 1 } },
  { slug: 'tempered', elements: { 木: 0, 火: 4, 土: 1, 金: 1, 水: 2 } },
  { slug: 'roller', elements: { 木: 3, 火: 1, 土: 1, 金: 3, 水: 0 } },
  { slug: 'gate', elements: { 木: 4, 火: 1, 土: 1, 金: 1, 水: 1 } },
  { slug: 'builder', elements: { 木: 1, 火: 0, 土: 2, 金: 2, 水: 3 } },
  { slug: 'giver', elements: { 木: 1, 火: 1, 土: 1, 金: 1, 水: 4 } },
  { slug: 'late-bloom', elements: { 木: 1, 火: 1, 土: 4, 金: 1, 水: 1 } },
  { slug: 'learner', elements: { 木: 2, 火: 2, 土: 3, 金: 0, 水: 1 } },
  { slug: 'solo', elements: { 木: 1, 火: 1, 土: 1, 金: 4, 水: 1 } },
  { slug: 'crew', elements: { 木: 2, 火: 2, 土: 0, 金: 3, 水: 1 } },
]

describe('화면 규율', () => {
  it('분포표가 열 유형을 하나씩 정확히 만들어낸다', () => {
    const got = TYPE_FIXTURES.map((f) => buildSaju3({ me: '金', elements: f.elements, spouseSeat: '土' }).type.slug)
    expect(got).toEqual(TYPE_FIXTURES.map((f) => f.slug))
    expect(new Set(got).size).toBe(10)
    for (const f of TYPE_FIXTURES) {
      expect(ELEMENTS.reduce((a, e) => a + f.elements[e], 0)).toBe(8)
    }
  })

  it('🔴 한자·「일간」·전문용어가 결과 문장에 새어 나오지 않는다', () => {
    for (const f of TYPE_FIXTURES) {
      for (const seat of ELEMENTS) {
        const r = buildSaju3({ me: '金', elements: f.elements, spouseSeat: seat })
        const text = [r.type.title, r.type.tagline, r.lines.money, r.lines.love, r.lines.timing].join(' ')
        expect(text).not.toMatch(/[一-鿿]/) // 한자
        expect(text).not.toMatch(/일간|십성|재성|관성|인성|식상|비겁|신강|신약/)
        expect(text).not.toMatch(/반드시|무조건|틀림없이/) // 단정
      }
    }
  })

  it('오행 칸은 항상 다섯 개이고 우리말 이름이 붙는다', () => {
    const r = buildSaju3({ me: '火', elements: { 木: 3, 火: 3, 土: 1, 金: 0, 水: 1 }, spouseSeat: '木' })
    expect(r.bars).toHaveLength(5)
    expect(r.bars.map((b) => b.ko)).toEqual(['나무', '불', '흙', '쇠', '물'])
    expect(r.most.ko).toBe('나무') // 3 동점이면 목·화 순서에서 앞선 것
    expect(r.missing.map((m) => m.ko)).toEqual(['쇠'])
    expect(ELEMENT_KO['水']).toBe('물')
  })

  it('공유 문구는 짧고 칭호와 주소를 담는다', () => {
    const t = typeBySlug('late-bloom')
    const s = shareText(t, 'https://k-haehwadang.com/saju3/late-bloom')
    expect(s.length).toBeLessThan(200)
    expect(s).toContain('아직 안 터진 사람')
    expect(s).toContain('/saju3/late-bloom')
  })
})

describe('실제 만세력과 이어 붙였을 때 (골든)', () => {
  it('1990-05-15 — 쇠 일간, 불·쇠가 셋씩', () => {
    const input = fromBirth('1990-05-15')
    expect(input.me).toBe('金')
    expect(input.elements).toEqual({ 木: 0, 火: 3, 土: 1, 金: 3, 水: 1 })
    const r = buildSaju3(input)
    expect(r.type.slug).toBe('anchor')
    expect(r.missing.map((m) => m.ko)).toEqual(['나무'])
    expect(r.lines.money).toContain('돈 자리가 비었어') // 돈 자리(木)가 0
  })

  it('오행 여덟 칸의 합은 언제나 8이다', () => {
    for (const d of ['1990-05-15', '2000-01-01', '1985-11-23', '1977-08-09']) {
      const input = fromBirth(d)
      const sum = ELEMENTS.reduce((a, e) => a + (input.elements[e] ?? 0), 0)
      expect(sum).toBe(8)
    }
  })

  it('🔴 태어난 시간을 모를 때 기준은 정오 — 23시 경계에 안 걸린다', () => {
    expect(UNKNOWN_TIME_FALLBACK).toBe('12:00')
    expect(fromBirth('1985-11-23').me).toBe(fromBirth('1985-11-23', '00:30').me)
  })
})

describe('아이 버전', () => {
  const daeun = calculateDaeun('2012-03-05', '12:00', 'M', true).map((d) => ({
    age: d.age,
    element: d.element as Element,
  }))

  it('대운이 나이순으로 나오고 오행이 붙는다 (시작 나이는 0일 수도 있다)', () => {
    expect(daeun.length).toBeGreaterThan(0)
    expect(daeun[0].age).toBeGreaterThanOrEqual(0)
    for (let i = 1; i < daeun.length; i++) expect(daeun[i].age).toBeGreaterThan(daeun[i - 1].age)
    for (const d of daeun) expect(ELEMENTS).toContain(d.element)
  })

  it('공부 글자가 없으면 «몸으로 익히는 쪽»으로 말한다', () => {
    const r = buildChildReading({ me: '金', elements: { 木: 2, 火: 2, 土: 0, 金: 2, 水: 2 }, daeun, currentAge: 8 })
    expect(r.studyCount).toBe(0)
    expect(r.studyLine).toContain('몸으로 익히는')
  })

  it('🔴 0살에서 시작하는 대운을 그대로 집지 않는다 — «0살 무렵부터 불이 켜져»는 쓸모없는 말이다', () => {
    // 실측(2012-03-05 남)에서 첫 대운이 0살이었고, 그대로 나가면 헛말이 된다
    const zeroStart = [
      { age: 0, element: '水' as Element },
      { age: 10, element: '木' as Element },
      { age: 20, element: '木' as Element },
    ]
    const r = buildChildReading({
      me: '木',
      elements: { 木: 2, 火: 1, 土: 1, 金: 2, 水: 2 },
      daeun: zeroStart,
      currentAge: 3,
    })
    expect(r.headline).not.toContain('0살')
    if (r.decisive) expect(r.decisive.fromAge).toBeGreaterThanOrEqual(7)
  })

  it('아직 안 온 구간이면 «몇 살 무렵부터»로, 10년 폭으로 말한다', () => {
    const future = [{ age: 14, element: '土' as Element }]
    const r = buildChildReading({
      me: '金',
      elements: { 木: 1, 火: 1, 土: 3, 金: 2, 水: 1 },
      daeun: future,
      currentAge: 9,
    })
    expect(r.decisive).toEqual({ fromAge: 14, toAge: 23, now: false })
    expect(r.headline).toBe('14살 무렵부터 불이 켜져')
    expect(r.decisiveLine).toContain('그 전에 태워버리면')
    expect(r.decisiveLine).not.toMatch(/반드시|확실히/)
  })

  it('이미 그 구간 안에 있으면 «지금이 바로 그 구간»이라고 말한다', () => {
    const current = [{ age: 10, element: '土' as Element }]
    const r = buildChildReading({
      me: '金',
      elements: { 木: 1, 火: 1, 土: 3, 金: 2, 水: 1 },
      daeun: current,
      currentAge: 14,
    })
    expect(r.decisive?.now).toBe(true)
    expect(r.headline).toContain('지금이 바로 그 구간')
    expect(r.decisiveLine).toContain('19살까지')
  })

  it('이미 끝난 구간은 앞으로 온다고 말하지 않는다', () => {
    const past = [{ age: 8, element: '土' as Element }]
    const r = buildChildReading({
      me: '金',
      elements: { 木: 1, 火: 1, 土: 3, 金: 2, 水: 1 },
      daeun: past,
      currentAge: 30,
    })
    expect(r.decisive).toBeNull()
    expect(r.headline).toContain('안 잡혀')
  })

  it('해당 구간이 없으면 지어내지 않고 «안 잡힌다»고 말한다', () => {
    const r = buildChildReading({
      me: '金',
      elements: { 木: 2, 火: 2, 土: 1, 金: 2, 水: 1 },
      daeun: [],
      currentAge: 10,
    })
    expect(r.decisive).toBeNull()
    expect(r.decisiveLine).toContain('안 잡혀')
  })

  it('만 나이는 생일 전이면 한 살 적다', () => {
    expect(ageOn('2012-03-05', new Date('2026-03-04T00:00:00'))).toBe(13)
    expect(ageOn('2012-03-05', new Date('2026-03-05T00:00:00'))).toBe(14)
  })
})

describe('아이 버전 — 학창 시절 밖의 구간', () => {
  it('🔴 불이 20살 넘어 켜지면 «학창 시절엔 크게 안 와»로 말하고, 등수 대신 취향을 남기라고 한다', () => {
    const late = [{ age: 30, element: '土' as Element }]
    const r = buildChildReading({
      me: '金',
      elements: { 木: 1, 火: 1, 土: 3, 金: 2, 水: 1 },
      daeun: late,
      currentAge: 14,
    })
    expect(r.headline).toBe('학창 시절엔 크게 안 와')
    expect(r.decisiveLine).toContain('30살 무렵')
    expect(r.decisiveLine).toContain('등수보다')
    // 나쁜 소식으로 겁주지 않는다
    expect(r.decisiveLine).not.toMatch(/안 됩니다|늦었|포기/)
  })
})

describe('🔴 페르소나 규율 (2026-08-21 CEO 반려 후 신설)', () => {
  it('유형 이름은 설명문이 아니라 부를 수 있는 이름이다 — 전부 «~하는 사람»', () => {
    for (const slug of TYPE_SLUGS) {
      const t = typeBySlug(slug)
      expect(t.title.endsWith('사람')).toBe(true)
      // 「~형」은 설명문 냄새가 나서 반려됐다. 되돌아오면 여기서 걸린다
      expect(t.title).not.toMatch(/형$/)
      expect(t.title.length).toBeLessThanOrEqual(16)
    }
  })

  it('열 이름이 서로 겹치지 않는다 — 「거절을 못 하는」과 「다 내가 하고 마는」은 다른 사람이다', () => {
    const titles = TYPE_SLUGS.map((s) => typeBySlug(s).title)
    expect(new Set(titles).size).toBe(10)
    expect(typeBySlug('anchor').title).toBe('거절을 못 하는 사람') // 남이 맡긴 걸 못 거절
    expect(typeBySlug('solo').title).toBe('다 내가 하고 마는 사람') // 남을 못 믿어 내가 함
  })

  it('설명 구절은 찔리되 판단하지 않는다', () => {
    for (const slug of TYPE_SLUGS) {
      const t = typeBySlug(slug)
      expect(t.tagline.length).toBeGreaterThan(20) // 한 줄로 끝내면 찔림이 안 산다
      expect(t.tagline).not.toMatch(/문제야|잘못|고쳐야|나쁜 사람/)
    }
  })

  it('세 줄은 두루뭉술하지 않다 — 겪어봤을 장면이 들어간다', () => {
    const seen: string[] = []
    for (const f of TYPE_FIXTURES) {
      for (const seat of ELEMENTS) {
        const r = buildSaju3({ me: '金', elements: f.elements, spouseSeat: seat })
        seen.push(r.lines.money, r.lines.love, r.lines.timing)
      }
    }
    for (const line of seen) expect(line.length).toBeGreaterThan(25)
  })
})
