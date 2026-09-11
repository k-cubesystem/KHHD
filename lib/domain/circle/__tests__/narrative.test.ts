import type { Element } from '@/lib/domain/shrine/types'
import { buildPrescription, type PrescriptionInput } from '@/lib/domain/circle/prescription'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import {
  NARRATIVE_MIN_CHARS,
  NARRATIVE_SYSTEM_PROMPT,
  circleFingerprint,
  circlePrompt,
  prescriptionFingerprint,
  prescriptionPrompt,
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

  it('그룹', () => {
    expect(circleFingerprint(CIRCLE)).toBe(circleFingerprint(CIRCLE))
    const other = buildCircleEnergy('work', [member('self', '민수', energy({ wood: 75, fire: 30 }))])
    expect(circleFingerprint(CIRCLE)).not.toBe(circleFingerprint(other))
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
