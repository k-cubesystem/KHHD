import type { Element } from '@/lib/domain/shrine/types'
import { LORE_BANNED_WORDS, bannedWordsIn } from '@/lib/domain/circle/element-lore'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import {
  NARRATIVE_MAX_CHARS_TOGETHER,
  narrativeRequestFor,
  systemPromptFor,
  validateNarrative,
} from '@/lib/domain/circle/narrative'
import {
  TOGETHER_GENERATION,
  TOGETHER_JARGON_MAX,
  TOGETHER_SECTIONS,
  PLAIN_SWAPS,
  TOGETHER_SYSTEM_PROMPT,
  togetherJargonHits,
  togetherPrompt,
  togetherRetryNote,
} from '@/lib/domain/circle/together-prompt'

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
    sipseong: { 식신: 2, 정관: 1 },
    ...over,
  }
}

describe('togetherJargonHits — 읽는 사람이 모르는 말', () => {
  it('홀로 쓰인 «결»·옅다·두텁다·일간·한자를 잡는다', () => {
    expect(togetherJargonHits('나무의 결이 두텁고 옅은 물, 일간은 木')).toEqual(
      expect.arrayContaining(['결이', '옅', '두텁', '일간', '木'])
    )
  })

  it('🔴 결정·해결·결단력·결산·상관없어요 같은 보통 낱말은 잡지 않는다', () => {
    expect(togetherJargonHits('결정이 빨라요. 해결해요. 결단력이 있어요. 결산을 같이 해요. 상관없어요.')).toEqual([])
  })

  it('사람 이름은 먼저 지우고 센다 — «정재»님처럼 용어와 겹치는 이름', () => {
    expect(togetherJargonHits('정재님이 걸어요')).toEqual(['정재'])
    expect(togetherJargonHits('정재님이 걸어요', ['정재'])).toEqual([])
  })
})

describe('TOGETHER_SYSTEM_PROMPT — 해요체 이야기꾼 한 목소리', () => {
  it('옛 «신당 상담가»·문장 공예(합니다체) 레이어를 섞지 않는다 — 실서비스 호출이 이 프롬프트 하나만 쓴다', () => {
    expect(TOGETHER_SYSTEM_PROMPT).toContain('해요체')
    expect(TOGETHER_SYSTEM_PROMPT).not.toContain('신당에서 마주 앉은 상담가')
    expect(systemPromptFor('together')).toBe(TOGETHER_SYSTEM_PROMPT)
    const req = narrativeRequestFor('together')
    expect(req.systemPrompt).toBe(TOGETHER_SYSTEM_PROMPT)
    expect(req.systemPrompt).not.toContain('[서술 품질 규율')
  })

  it('비유 규칙·✗/○ 대비 예시·여섯 머리말 순서·금지어 전량을 싣는다', () => {
    expect(TOGETHER_SYSTEM_PROMPT).toContain('<비유>')
    expect(TOGETHER_SYSTEM_PROMPT).toContain('✗ 이렇게 쓰지 않아요')
    expect(TOGETHER_SYSTEM_PROMPT).toContain('○ 이렇게 써요')
    expect(TOGETHER_SYSTEM_PROMPT).toContain(TOGETHER_SECTIONS.join(' / '))
    for (const w of [...LORE_BANNED_WORDS.efficacy, ...LORE_BANNED_WORDS.hiring]) {
      expect(TOGETHER_SYSTEM_PROMPT).toContain(w)
    }
  })

  it('🔴 물건은 «떠올리는 신호»로만 — 효과를 약속하지 않게 하는 규칙과 짧은 문장 기준을 싣는다(v2b)', () => {
    expect(TOGETHER_SYSTEM_PROMPT).toContain('<물건>')
    expect(TOGETHER_SYSTEM_PROMPT).toContain("'뽑다'→'빼다'")
    expect(TOGETHER_SYSTEM_PROMPT).toContain(`자주 새는 말은 이렇게 바꿔요: ${PLAIN_SWAPS}\n`)
    expect(TOGETHER_SYSTEM_PROMPT).toContain('물건이 기운·마음·분위기·운을 바꿔 준다고 말하지 않아요')
    expect(TOGETHER_SYSTEM_PROMPT).toContain('40자 안팎')
  })

  it('🔴 모델이 따라 쓰는 ○ 예시 문장에는 금지어·어려운 말이 없다', () => {
    const good = TOGETHER_SYSTEM_PROMPT.split('○ 이렇게 써요')[1] ?? ''
    expect(good.length).toBeGreaterThan(100)
    expect(bannedWordsIn(good)).toEqual([])
    expect(togetherJargonHits(good)).toEqual([])
  })
})

describe('narrativeRequestFor — 생각 토큰에 본문이 잘리지 않게', () => {
  it('🔴 모든 갈래의 한도가 넉넉하다 — 처방전 1,200 은 생각에 먹혀 78자에서 끊겼다(2026-09-14 실측)', () => {
    for (const kind of ['prescription', 'circle', 'together'] as const) {
      expect(narrativeRequestFor(kind).maxTokens).toBeGreaterThanOrEqual(8192)
    }
  })

  it('함께 보기는 Gemini 3 권고 온도(1.0)', () => {
    expect(TOGETHER_GENERATION.temperature).toBe(1)
    expect(narrativeRequestFor('together').temperature).toBe(1)
  })
})

describe('togetherPrompt — 쉬운 말 데이터를 먼저, 지시는 끝에', () => {
  const work = buildCircleEnergy('work', [
    member('self', '수진', share({ metal: 40, wood: 5 }), { dayMaster: 'metal', vitality: 'strong' }),
    member('b', '민호', share({ wood: 40, fire: 5 }), { dayMaster: 'wood', vitality: 'weak' }),
  ])

  it('🔴 데이터도 물건이 기운을 «채운다»고 말하지 않는다 — 모델이 그 말을 효과 주장으로 키웠다(v2b 실측)', () => {
    const prompt = togetherPrompt(work)
    expect(work.holders).toEqual([])
    expect(prompt).toContain('이 힘이 넉넉한 사람은 없어요. 다 같이 쓰는 자리에 둘 물건: ')
    expect(prompt).not.toMatch(/물건으로 채워/)
  })

  it('사람마다·둘씩·조심할 것·다 같이·곁에 둘 것 블록이 서고, 맨 끝은 지시다', () => {
    const prompt = togetherPrompt(work)
    expect(prompt.startsWith('<데이터>')).toBe(true)
    for (const block of [
      '[사람마다]',
      '[둘씩 보면]',
      '[같이 있을 때 조심할 것',
      '[다 같이 있을 때]',
      '[곁에 둘 물건과 자리',
    ]) {
      expect(prompt).toContain(block)
    }
    expect(prompt).toContain('체력 타입: 쉽게 지치는 편')
    expect(prompt).toContain('같이 있을 때 맞는 방법:')
    expect(prompt.indexOf('</데이터>')).toBeLessThan(prompt.indexOf('여섯 토막으로 써 주세요'))
    expect(prompt.trim().endsWith('첫 토막은 이 사람들을 생활 속 한 장면에 빗대어 시작해요.')).toBe(true)
  })

  it('🔴 데이터에 한자·명리 용어·금지어·점수가 없다 — 모델이 따라 쓰지 않게', () => {
    const prompt = togetherPrompt(work)
    expect(prompt).not.toMatch(/[一-鿿]/)
    expect(togetherJargonHits(prompt, ['수진', '민호'])).toEqual([])
    expect(bannedWordsIn(prompt)).toEqual([])
    expect(prompt).not.toMatch(/\d+\s*점|\d+\s*%/)
    // 금이 목을 누르는 짝이라 조심할 문장이 실린다
    expect(prompt).toContain('쇠가 나무를 치듯')
  })

  it('같은 기운이 둘 다 넘치는 짝의 조심 문장도 한자 없이 싣는다', () => {
    const hot = buildCircleEnergy('family', [
      member('a', '가온', share({ fire: 40, water: 5 })),
      member('b', '나래', share({ fire: 35, metal: 5 })),
    ])
    // 칸 이름을 붙이고, 물 기운 물건 이름의 «책상 위에»는 떼어 «책상 위 책상 위»가 되지 않게 한다
    expect(togetherPrompt(hot)).toContain('- 가온님 (모자란 물 기운): 책상에 둘 것: 늘 두는 물컵 · 집 안 자리: ')
    expect(togetherPrompt(hot)).not.toContain('책상 위 책상 위')
    expect(hot.cautions.some((c) => /[一-鿿]/.test(c.text))).toBe(true)
    expect(togetherPrompt(hot)).not.toMatch(/[一-鿿]/)
  })
})

describe('togetherRetryNote — 다시 쓰라는 말도 해요체', () => {
  it('걸린 까닭을 쉬운 말로 알려 주고 합니다체를 쓰지 않는다', () => {
    const note = togetherRetryNote('JARGON:결이,옅')
    expect(note).toContain('어려운 명리 용어가 들어갔어요: 결이,옅')
    expect(note).not.toMatch(/니다/)
    expect(togetherRetryNote('HEADINGS')).toContain('머리말 여섯 개')
    expect(togetherRetryNote('UNKNOWN')).toContain('규칙에 맞지 않았어요')
  })

  it('세 갈래 모두 이 말을 쓴다 — 처방전·그룹도 해요체 v2(2026-09-25)', () => {
    for (const kind of ['together', 'prescription', 'circle'] as const) {
      expect(narrativeRequestFor(kind).retryNote('SCORE')).toBe(togetherRetryNote('SCORE'))
    }
  })
})

describe('validateNarrative — 함께 보기 쉬운 말 문지기', () => {
  const opts = { headings: TOGETHER_SECTIONS, maxChars: NARRATIVE_MAX_CHARS_TOGETHER, jargonMax: TOGETHER_JARGON_MAX }
  const para = (h: string, name: string, extra = '') =>
    `${h}\n${name}님은 걷는 시간이 힘이 돼요. 같이 걸으면 좋아요.${extra} 오늘은 저녁에 같이 걸어요.`

  it('어려운 말이 한도를 넘으면 JARGON 으로 다시 쓰게 하고, 쉬운 글은 통과한다', () => {
    const clean = TOGETHER_SECTIONS.map((h) => para(h, '민호')).join('\n\n')
    expect(validateNarrative(clean, opts).ok).toBe(true)
    const dirty = TOGETHER_SECTIONS.map((h, i) => para(h, '민호', i < 3 ? ' 나무의 결이 좋아요.' : '')).join('\n\n')
    const res = validateNarrative(dirty, opts)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason.startsWith('JARGON')).toBe(true)
  })

  it('이름이 용어와 겹쳐도(정재) ignore 로 넘기면 통과한다', () => {
    const named = TOGETHER_SECTIONS.map((h) => para(h, '정재')).join('\n\n')
    expect(validateNarrative(named, opts).ok).toBe(false)
    expect(validateNarrative(named, { ...opts, ignore: ['정재'] }).ok).toBe(true)
  })
})
