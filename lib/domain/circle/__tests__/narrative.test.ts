import type { Element } from '@/lib/domain/shrine/types'
import { buildPrescription, type PrescriptionInput } from '@/lib/domain/circle/prescription'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import {
  NARRATIVE_MIN_CHARS,
  NARRATIVE_SYSTEM_PROMPT,
  circleFingerprint,
  circlePrompt,
  NARRATIVE_MAX_CHARS_TOGETHER,
  TOGETHER_SECTIONS,
  parseTogetherSections,
  prescriptionFingerprint,
  prescriptionPrompt,
  systemPromptFor,
  togetherFingerprint,
  togetherPrompt,
  validateNarrative,
} from '@/lib/domain/circle/narrative'

function energy(partial: Partial<Record<Element, number>>): Record<Element, number> {
  return { wood: 40, fire: 40, earth: 40, metal: 40, water: 40, ...partial }
}

const input: PrescriptionInput = {
  targetId: 'b',
  name: '지영',
  energy: energy({ wood: 72, fire: 24 }),
  energyLive: null,
  mansik: { yongsin: 'earth', huisin: 'metal', gisin: 'water' },
  catalog: [
    { id: 'a', name: '인등', element: 'fire', energyPower: 12, priceBokchae: 1500, emoji: '🪔', spriteUrl: null },
  ],
  mates: [{ targetId: 'self', name: '민수', strongest: 'fire', energy: energy({ fire: 78 }) }],
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
    sipseong: { 식신: 1 },
    ...over,
  }
}

const CIRCLE = buildCircleEnergy('work', [
  member('self', '민수', energy({ wood: 75, fire: 30 }), { dayMaster: 'wood' }),
  member('b', '지영', energy({ wood: 20, fire: 60 }), { mansikGisin: 'wood', dayMaster: 'fire' }),
])

describe('프롬프트 — 엔진 값만 싣고 풀어 쓰라고만 한다', () => {
  it('처방전 프롬프트에 다섯 블록의 값이 전부 들어간다', () => {
    const p = buildPrescription(input)
    const prompt = prescriptionPrompt(p)
    expect(prompt).toContain('모자란 기운: 화(火)')
    expect(prompt).toContain('[채워 주는 기운과 이유]')
    expect(prompt).toContain('민수님 곁')
    expect(prompt).toContain('인등')
    expect(prompt).toContain('[덜어낼 것')
    expect(prompt).toContain('명식 메모')
    expect(prompt).toContain('세 문단으로 풀어 쓰세요')
  })

  it('그룹 프롬프트는 라벨·문장만 싣고 점수가 없다', () => {
    const prompt = circlePrompt('마케팅팀', CIRCLE)
    expect(prompt).toContain('「마케팅팀」 그룹')
    expect(prompt).toContain('거리가 약인 사이')
    expect(prompt).toContain('고지:')
    expect(prompt).not.toMatch(/\d+\s*점/)
    expect(prompt).toContain('사람을 새로 들이라는 말은 쓰지 않습니다')
  })

  it('함께 보기 프롬프트는 사람·관계의 이치·필요한 것(물건·자리)·다섯 머리말 지시를 싣고 점수가 없다', () => {
    const prompt = togetherPrompt(CIRCLE)
    expect(prompt).toContain('민수·지영 함께 보기(2명)')
    expect(prompt).toContain('[서로의 관계 — 엔진 판정]')
    expect(prompt).toContain('이치:')
    expect(prompt).toContain('[필요한 것 — 사람마다]')
    expect(prompt).toContain('[서로에게 맞는 풍수·물건')
    expect(prompt).toContain('책상 위')
    // 사람마다 밥·움직임·쉼 판정과 이유, 조심할 것(상극)이 재료로 들어간다
    expect(prompt).toContain('[사람마다 — 함께 있을 때 어떻게')
    expect(prompt).toContain('함께할 때 좋은 것 =')
    expect(prompt).toContain('[같은 팀·가족이라도 조심할 것 — 상극]')
    expect(prompt).toContain('여섯 토막으로 풀어 쓰세요')
    for (const h of TOGETHER_SECTIONS) expect(prompt).toContain(`「${h}」`)
    expect(prompt).toContain('사람을 고르거나 재는 말은 쓰지 않습니다')
    expect(prompt).not.toMatch(/\d+\s*점|\d+\s*%/)
    // 시스템 프롬프트도 갈래에 따라 형식이 갈린다
    expect(systemPromptFor('together')).toContain('여섯 토막')
    expect(systemPromptFor('prescription')).toContain('세 문단')
  })

  it('시스템 프롬프트가 돌봄 규율(채용·효능·점수 금지)을 명시한다', () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('새로 판정하지 않습니다')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('«돌봄»')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('숫자 점수')
  })
})

describe('지문(fingerprint) — 같은 입력이면 같고, 화면이 바뀌면 달라진다', () => {
  it('처방전', () => {
    const a = prescriptionFingerprint(buildPrescription(input))
    const b = prescriptionFingerprint(buildPrescription(input))
    const c = prescriptionFingerprint(
      buildPrescription({ ...input, energy: energy({ wood: 72, fire: 24, water: 10 }) })
    )
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('함께 보기 — 사람 순서를 바꿔도 같은 조합이면 같은 지문', () => {
    const reversed = buildCircleEnergy('work', [
      member('b', '지영', energy({ wood: 20, fire: 60 }), { mansikGisin: 'wood', dayMaster: 'fire' }),
      member('self', '민수', energy({ wood: 75, fire: 30 }), { dayMaster: 'wood' }),
    ])
    expect(togetherFingerprint(reversed)).toBe(togetherFingerprint(CIRCLE))
    const other = buildCircleEnergy('work', [
      member('self', '민수', energy({ wood: 75, fire: 30 }), { dayMaster: 'wood' }),
      member('c', '현우', energy({ water: 70 }), { dayMaster: 'water' }),
    ])
    expect(togetherFingerprint(other)).not.toBe(togetherFingerprint(CIRCLE))
  })

  it('그룹', () => {
    expect(circleFingerprint(CIRCLE)).toBe(circleFingerprint(CIRCLE))
    const other = buildCircleEnergy('work', [member('self', '민수', energy({ wood: 75, fire: 30 }))])
    expect(circleFingerprint(CIRCLE)).not.toBe(circleFingerprint(other))
  })
})

describe('parseTogetherSections — 다섯 토막 가르기', () => {
  const body = (h: string) => `${h} 토막의 본문입니다. 두 문장으로 씁니다.`
  const five = TOGETHER_SECTIONS.map((h) => `${h}\n${body(h)}`).join('\n\n')

  it('머리말 줄로 갈라 다섯 토막이 나온다', () => {
    const sections = parseTogetherSections(five)
    expect(sections.map((s) => s.heading)).toEqual([...TOGETHER_SECTIONS])
    expect(sections[1].body).toBe(body('장점'))
  })

  it('「장점: …」「단점 — …」처럼 한 줄에 붙은 것과 괄호 머리말도 가르고, 띄어쓰기만으로는 머리말로 보지 않는다', () => {
    const sections = parseTogetherSections(
      '「서로의 오행」\n둘의 결.\n\n장점: 채워 주는 사이.\n장점 하나가 더 있습니다.\n\n단점 — 지치는 자리.'
    )
    expect(sections.map((s) => s.heading)).toEqual(['서로의 오행', '장점', '단점'])
    expect(sections[0].body).toBe('둘의 결.')
    expect(sections[1].body).toBe('채워 주는 사이.\n장점 하나가 더 있습니다.')
    expect(sections[2].body).toBe('지치는 자리.')
  })

  it('머리말이 없으면 본문 한 덩이(옛 풀이 캐시 호환)', () => {
    const sections = parseTogetherSections('첫 문단.\n\n둘째 문단.')
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('')
    expect(sections[0].body).toBe('첫 문단.\n둘째 문단.')
  })

  it('validateNarrative 는 함께 보기 머리말이 넷 미만이면 거른다(하나는 봐준다)', () => {
    const long = (h: string) => `${h}\n${'곁에 둘 것을 함께 살핍니다. '.repeat(4)}`
    const allButOne = TOGETHER_SECTIONS.slice(0, TOGETHER_SECTIONS.length - 1)
      .map(long)
      .join('\n\n')
    expect(
      validateNarrative(allButOne, { headings: TOGETHER_SECTIONS, maxChars: NARRATIVE_MAX_CHARS_TOGETHER }).ok
    ).toBe(true)
    const three = TOGETHER_SECTIONS.slice(0, TOGETHER_SECTIONS.length - 2)
      .map(long)
      .join('\n\n')
    const res = validateNarrative(three, { headings: TOGETHER_SECTIONS, maxChars: NARRATIVE_MAX_CHARS_TOGETHER })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('HEADINGS')
  })
})

describe('validateNarrative — 모델 출력 거르기', () => {
  const clean = Array.from(
    { length: 6 },
    (_, i) => `자리가 식는 아침이 잦다면 ${i}번째 관찰입니다. 남쪽 창가에 스탠드를 두고 오전에 큰 일을 둡니다.`
  ).join(' ')

  it('깨끗한 본문은 통과하고 앞뒤 기호를 걷어낸다', () => {
    const r = validateNarrative(`> ${clean}\n\n\n\n${clean}`)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.text.startsWith('자리가')).toBe(true)
      expect(r.text).not.toContain('\n\n\n')
      expect(r.text.length).toBeGreaterThanOrEqual(NARRATIVE_MIN_CHARS)
    }
  })

  it('짧으면 TOO_SHORT', () => {
    expect(validateNarrative('짧다.')).toEqual({ ok: false, reason: 'TOO_SHORT' })
  })

  it('효능·채용 금지어가 있으면 거른다', () => {
    const r = validateNarrative(`${clean} 이렇게 하면 성공이 보장됩니다.`)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/^BANNED:/)
    const r2 = validateNarrative(`${clean} 이 사람을 채용하면 좋습니다.`)
    expect(r2.ok).toBe(false)
  })

  it('점수·퍼센트가 있으면 거른다', () => {
    expect(validateNarrative(`${clean} 궁합은 85점입니다.`)).toEqual({ ok: false, reason: 'SCORE' })
    expect(validateNarrative(`${clean} 확률은 70%입니다.`)).toEqual({ ok: false, reason: 'SCORE' })
  })
})
