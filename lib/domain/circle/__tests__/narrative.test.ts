import type { Element } from '@/lib/domain/shrine/types'
import { GEMINI_OUTPUT_TOKENS_FLOOR } from '@/lib/config/ai-models'
import { LORE_BANNED_WORDS, bannedWordsIn } from '@/lib/domain/circle/element-lore'
import { WORK_NOTICE } from '@/lib/domain/circle/circle'
import { buildPrescription, type PrescriptionInput } from '@/lib/domain/circle/prescription'
import { buildCircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import { PLAIN_SWAPS, togetherRetryNote } from '@/lib/domain/circle/together-prompt'
import {
  NARRATIVE_MIN_CHARS,
  NARRATIVE_SYSTEM_PROMPT,
  circleFingerprint,
  circleNames,
  circlePrompt,
  NARRATIVE_MAX_CHARS_TOGETHER,
  TOGETHER_JARGON_MAX,
  TOGETHER_SECTIONS,
  narrativeCheckOptionsFor,
  narrativeRequestFor,
  parseTogetherSections,
  prescriptionFingerprint,
  prescriptionNames,
  prescriptionPrompt,
  systemPromptFor,
  togetherFingerprint,
  togetherJargonHits,
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
  catalog: [{ id: 'a', name: '인등', element: 'fire', energyPower: 12, emoji: '🪔', spriteUrl: null }],
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

/** 물건이 기운·마음을 바꿔 준다는 말(표시광고법) — 41차에서 원문을 읽고 잡은 모양들. */
const EFFECT_CLAIM = /살아나|살아납|채워 줘|채워 줍|잡아 줘|잡아 줍|붙어요|붙습니다|트여요|트입니다|곁에 둡니다/

/** 시스템 프롬프트에서 «쓰지 말라고 보여 주는 자리»(✗ 예시·금지 목록·금지 문구 인용)를 뺀 나머지 — 모델이 따라 쓰는 몸통. */
function promptBody(prompt: string): string {
  const lines = prompt.replace(/<쓰지 않는 말>[\s\S]*?<\/쓰지 않는 말>/, '').split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes('✗')) {
      if (line.trim() === '✗ 이렇게 쓰지 않아요') i++
      continue
    }
    if (line.includes('" 대신,')) continue
    out.push(line)
  }
  return out.join('\n')
}

describe('프롬프트 v2 — 엔진 값을 쉬운 말로 바꿔 싣고 풀어 쓰라고만 한다', () => {
  it('처방전 프롬프트에 다섯 블록의 값이 쉬운 말로 전부 들어가고, 데이터가 먼저·부탁이 끝이다', () => {
    const p = buildPrescription(input)
    const prompt = prescriptionPrompt(p)
    expect(prompt.startsWith('<데이터>')).toBe(true)
    expect(prompt).toContain('- 넉넉한 기운: 나무 기운(시작하는 힘·추진력)')
    expect(prompt).toContain('- 모자란 기운: 불 기운(활기·표현력) — 활기와 표현이 부족해요.')
    expect(prompt).toContain('생년월일시로 따로 본 사주에서는 흙 기운(안정감·약속을 지키는 힘)도 챙기면 좋다고 나와요')
    expect(prompt).toContain('[모자란 힘을 챙기는 길]')
    expect(prompt).toContain('- 바로 챙기기: 불 기운 쪽을')
    expect(prompt).toContain('- 바탕부터 키우기: 나무 기운(시작하는 힘·추진력) — 나무 기운은 불 기운을 낳아 키우는 쪽')
    expect(prompt).toContain('- 사람 곁: 민수님')
    expect(prompt).toContain('- 앱 속 내 신당에 올릴 살림: 인등')
    expect(prompt).toContain('- 책상에 둘 것: 따뜻한 빛의 작은 스탠드')
    expect(prompt).toContain('- 앉는 방향: 남쪽을 보고 앉기')
    expect(prompt).toContain('- 그 힘이 도는 시간: 오전 11시~오후 1시')
    expect(prompt).toContain('- 먹을거리와 움직임: ')
    expect(prompt).toContain('[덜어낼 것 — 물 기운(쉬어 가는 여유·들어 주는 힘)은 지금 더 늘리지 않아요]')
    expect(prompt.indexOf('</데이터>')).toBeLessThan(prompt.indexOf('세 문단으로 써 주세요'))
    expect(prompt.trim().endsWith('설명과 비유는 새로 써요.')).toBe(true)
  })

  it('🔴 처방전 데이터에 한자·명리 용어·금지어·점수·효과 주장이 없다 — 엔진 문장(火·명식·옅은·木生火)을 그대로 싣지 않는다', () => {
    const variants = [
      buildPrescription(input),
      buildPrescription({ ...input, mansik: { yongsin: 'fire', huisin: 'wood', gisin: 'water' } }),
      buildPrescription({
        ...input,
        energy: energy({ water: 10, metal: 80 }),
        mates: [{ targetId: 'm', name: '민수', strongest: 'water', energy: energy({ water: 90 }) }],
      }),
    ]
    for (const p of variants) {
      const prompt = prescriptionPrompt(p)
      expect(prompt).not.toMatch(/[一-鿿]/)
      expect(togetherJargonHits(prompt, prescriptionNames(p))).toEqual([])
      expect(bannedWordsIn(prompt)).toEqual([])
      expect(prompt).not.toMatch(/\d+\s*점|\d+\s*%/)
      expect(prompt).not.toMatch(EFFECT_CLAIM)
      expect(prompt).not.toMatch(/니다/)
    }
  })

  it('같은 기운이 몰리는 사람이 있으면 [조심할 것]을 쉬운 말로 싣는다', () => {
    const p = buildPrescription({
      ...input,
      mansik: { yongsin: 'fire', huisin: 'wood', gisin: 'water' },
      mates: [{ targetId: 'm', name: '민수', strongest: 'water', energy: energy({ water: 80 }) }],
    })
    expect(p.cautionWith).toBe('민수')
    const prompt = prescriptionPrompt(p)
    expect(prompt).toContain('[조심할 것]')
    expect(prompt).toContain('- 민수님은 물 기운(쉬어 가는 여유·들어 주는 힘)이 넉넉한 편이에요.')
    expect(prescriptionNames(p)).toEqual(['지영', '민수'])
  })

  it('그룹 프롬프트는 관계를 쉬운 말 한 줄로 싣고, 직장 고지 대신 «이미 함께 일하는 사람끼리»의 맥락을 준다', () => {
    const prompt = circlePrompt('마케팅팀', CIRCLE)
    expect(prompt.startsWith('<데이터>')).toBe(true)
    expect(prompt).toContain('「마케팅팀」 2명 · 직장 동료예요.')
    expect(prompt).toContain('- 민수님 (동료): 넉넉한 기운: 나무 기운(시작하는 힘·추진력) · 모자란 기운: ')
    expect(prompt).toContain('거리가 약인 사이')
    expect(prompt).toContain('[같이 있을 때 조심할 것 — 이 목록 밖의 갈등은 지어내지 않아요]')
    expect(prompt).toContain('두 목록에 없는 갈등은 지어내지 않아요')
    expect(prompt).toContain('[곁에 둘 물건과 자리 — 이 목록에 있는 것만 써요]')
    expect(prompt).toContain('사람을 새로 들이라는 말은 쓰지 않아요')
    // 고지 문장은 «채용·평가»를 싣는다 — 모델이 따라 쓰면 거르기에 걸린다.
    expect(prompt).not.toContain(WORK_NOTICE)
    expect(prompt).not.toMatch(/[一-鿿]/)
    expect(togetherJargonHits(prompt, circleNames(CIRCLE))).toEqual([])
    expect(bannedWordsIn(prompt)).toEqual([])
    expect(prompt).not.toMatch(/\d+\s*점|\d+\s*%/)
    expect(prompt).not.toMatch(EFFECT_CLAIM)
    expect(circleNames(CIRCLE)).toEqual(['민수', '지영'])
  })

  it('함께 보기 프롬프트는 쉬운 말로 바꾼 데이터를 먼저 싣고 지시를 끝에 둔다 — 한자·점수 없음', () => {
    const prompt = togetherPrompt(CIRCLE)
    expect(prompt.startsWith('<데이터>')).toBe(true)
    expect(prompt).toContain('함께 보는 사람: 민수님·지영님 (2명)')
    for (const block of ['[사람마다]', '[둘씩 보면]', '[같이 있을 때 조심할 것', '[다 같이 있을 때]']) {
      expect(prompt).toContain(block)
    }
    expect(prompt).toContain('[곁에 둘 물건과 자리 — 이 목록에 있는 것만 써요]')
    expect(prompt).toContain('같이 있을 때 맞는 방법:')
    expect(prompt).toContain('거리가 약인 사이')
    expect(prompt).toContain('책상에 둘 것:')
    expect(prompt.trim().endsWith('첫 토막은 이 사람들을 생활 속 한 장면에 빗대어 시작해요.')).toBe(true)
    expect(prompt).not.toMatch(/[一-鿿]/)
    expect(prompt).not.toMatch(/\d+\s*점|\d+\s*%/)
    // 시스템 프롬프트도 갈래에 따라 형식이 갈린다
    expect(systemPromptFor('together')).toContain('여섯 토막')
    expect(systemPromptFor('prescription')).toContain('세 문단')
    expect(systemPromptFor('circle')).toBe(NARRATIVE_SYSTEM_PROMPT)
  })
})

describe('NARRATIVE_SYSTEM_PROMPT v2 — 처방전·그룹도 해요체 이야기꾼 한 목소리', () => {
  it('🔴 옛 «신당 상담가»·«결의 말»·용어 사전·문장 공예(합니다체) 레이어를 싣지 않는다', () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('해요체')
    for (const old of ['신당에서 마주 앉은 상담가', '결의 말로', '[서술 품질 규율', '[사주 용어를 다루는 법]']) {
      expect(NARRATIVE_SYSTEM_PROMPT).not.toContain(old)
      expect(narrativeRequestFor('prescription').systemPrompt).not.toContain(old)
      expect(narrativeRequestFor('circle').systemPrompt).not.toContain(old)
    }
  })

  it('🔴 따라 쓰는 몸통(✗ 예시·금지 목록 밖)에 합니다체·효과 주장·어려운 말·금지어가 없다', () => {
    const body = promptBody(NARRATIVE_SYSTEM_PROMPT)
    expect(body.length).toBeGreaterThan(1500)
    expect(body).not.toMatch(/니다[.?!]/)
    expect(body).not.toMatch(EFFECT_CLAIM)
    expect(togetherJargonHits(body)).toEqual([])
    expect(bannedWordsIn(body)).toEqual([])
  })

  it('🔴 모델이 따라 쓰는 ○ 문장에는 금지어·어려운 말·효과 주장이 없다', () => {
    const good = [
      ...NARRATIVE_SYSTEM_PROMPT.split('\n').filter((l) => l.trim().startsWith('○ ') && l.trim() !== '○ 이렇게 써요'),
      NARRATIVE_SYSTEM_PROMPT.split('○ 이렇게 써요')[1] ?? '',
    ].join('\n')
    expect(good.length).toBeGreaterThan(150)
    expect(bannedWordsIn(good)).toEqual([])
    expect(togetherJargonHits(good)).toEqual([])
    expect(good).not.toMatch(EFFECT_CLAIM)
  })

  it('물건은 «떠올리는 신호» — ✗/○ 대비 예시와 효과 주장 금지 규칙을 싣는다', () => {
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('<물건>')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('생활 속 신호예요')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('기운·마음·몸·분위기·운을 바꿔 준다고 말하지 않아요')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('✗ 이렇게 쓰지 않아요')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('○ 이렇게 써요')
    expect(NARRATIVE_SYSTEM_PROMPT).toContain('40자 안팎')
  })

  it('🔴 금지어 전량과 바꿔 쓰기 표(부분 문자열 함정 포함)·쓰지 않는 명리 용어를 싣는다', () => {
    for (const w of [...LORE_BANNED_WORDS.efficacy, ...LORE_BANNED_WORDS.hiring]) {
      expect(NARRATIVE_SYSTEM_PROMPT).toContain(w)
    }
    expect(NARRATIVE_SYSTEM_PROMPT).toContain(PLAIN_SWAPS)
    const swaps = [
      "'매일'→'아침마다'",
      "'낫다'→'좋다'",
      "'낫는'→'좋은'",
      "'반드시'·'무조건'→'꼭'",
      "'뽑다'→'빼다'",
      "'부자'",
    ]
    for (const swap of swaps) expect(NARRATIVE_SYSTEM_PROMPT).toContain(swap)
    const terms = [
      '결',
      '옅다',
      '두껍다',
      '두텁다',
      '용신',
      '기신',
      '일간',
      '상생',
      '상극',
      '십성',
      '신강',
      '신약',
      '명식',
    ]
    for (const term of terms) expect(NARRATIVE_SYSTEM_PROMPT).toContain(term)
  })
})

describe('narrativeRequestFor · narrativeCheckOptionsFor — 처방전·그룹', () => {
  it('함께 보기와 같은 온도(1.0), 한도는 생각 토큰 안전선 이상, 다시 쓰라는 말도 해요체', () => {
    for (const kind of ['prescription', 'circle'] as const) {
      const req = narrativeRequestFor(kind)
      expect(req.systemPrompt).toBe(NARRATIVE_SYSTEM_PROMPT)
      expect(req.temperature).toBe(1)
      expect(req.maxTokens).toBeGreaterThanOrEqual(GEMINI_OUTPUT_TOKENS_FLOOR)
      expect(req.retryNote('JARGON:결이')).toBe(togetherRetryNote('JARGON:결이'))
      expect(req.retryNote('SCORE')).not.toMatch(/니다/)
    }
  })

  it('🔴 어려운 말 문지기가 처방전·그룹 출력에도 걸린다(허용 2) — 이름은 먼저 지운다', () => {
    const para = (extra = '') =>
      `지영님은 새 일 앞에서 한참 머무는 편이에요.${extra} 아침마다 할 일 하나를 적어 봐요. 점심에는 같이 걸어요. 저녁엔 오늘 한 일을 돌아봐요.`
    const clean = [para(), para(), para()].join('\n\n')
    const dirty = [para(' 나무의 결이 옅어요.'), para(' 일간이 약해요.'), para()].join('\n\n')
    for (const kind of ['prescription', 'circle'] as const) {
      const opts = narrativeCheckOptionsFor(kind, ['지영'])
      expect(opts.jargonMax).toBe(TOGETHER_JARGON_MAX)
      expect(opts.headings).toBeUndefined()
      expect(validateNarrative(clean, opts).ok).toBe(true)
      const res = validateNarrative(dirty, opts)
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.reason.startsWith('JARGON')).toBe(true)
    }
    const named = clean.replace(/지영/g, '정재')
    expect(validateNarrative(named, narrativeCheckOptionsFor('prescription', [])).ok).toBe(false)
    expect(validateNarrative(named, narrativeCheckOptionsFor('prescription', ['정재'])).ok).toBe(true)
  })

  it('함께 보기는 머리말·긴 한도까지 같이 건다', () => {
    const opts = narrativeCheckOptionsFor('together', ['민수'])
    expect(opts.headings).toEqual(TOGETHER_SECTIONS)
    expect(opts.maxChars).toBe(NARRATIVE_MAX_CHARS_TOGETHER)
    expect(opts.ignore).toEqual(['민수'])
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

  it('🔴 v2 — 처방전·그룹 지문에 판 번호가 붙어 옛 판(합니다체) 풀이를 캐시로 내주지 않는다', () => {
    expect(JSON.parse(prescriptionFingerprint(buildPrescription(input)))).toMatchObject({ v: 2 })
    expect(JSON.parse(circleFingerprint(CIRCLE))).toMatchObject({ v: 2 })
    expect(JSON.parse(togetherFingerprint(CIRCLE))).toMatchObject({ v: 7 })
  })

  it('그룹', () => {
    expect(circleFingerprint(CIRCLE)).toBe(circleFingerprint(CIRCLE))
    const other = buildCircleEnergy('work', [member('self', '민수', energy({ wood: 75, fire: 30 }))])
    expect(circleFingerprint(CIRCLE)).not.toBe(circleFingerprint(other))
  })
})

describe('parseTogetherSections — 여섯 토막 가르기', () => {
  const body = (h: string) => `${h} 토막의 본문이에요. 두 문장으로 써요.`
  const six = TOGETHER_SECTIONS.map((h) => `${h}\n${body(h)}`).join('\n\n')

  it('머리말 줄로 갈라 여섯 토막이 나온다', () => {
    const sections = parseTogetherSections(six)
    expect(sections.map((s) => s.heading)).toEqual([...TOGETHER_SECTIONS])
    expect(sections[1].body).toBe(body('잘 맞는 점'))
  })

  it('「잘 맞는 점: …」「부딪히기 쉬운 점 — …」·**굵은 머리말**도 가르고, 띄어쓰기만으로는 머리말로 보지 않는다', () => {
    const sections = parseTogetherSections(
      '**한눈에 보면**\n둘의 장면.\n\n잘 맞는 점: 채워 주는 사이.\n잘 맞는 점 하나가 더 있어요.\n\n부딪히기 쉬운 점 — 지치는 자리.'
    )
    expect(sections.map((s) => s.heading)).toEqual(['한눈에 보면', '잘 맞는 점', '부딪히기 쉬운 점'])
    expect(sections[0].body).toBe('둘의 장면.')
    expect(sections[1].body).toBe('채워 주는 사이.\n잘 맞는 점 하나가 더 있어요.')
    expect(sections[2].body).toBe('지치는 자리.')
  })

  it('🔴 39차까지의 옛 머리말(서로의 오행·장점·필요한 것·이번 주 한 가지)은 새 이름으로 읽는다 — 30일 캐시에 남은 풀이', () => {
    const sections = parseTogetherSections(
      '「서로의 오행」\n둘의 장면.\n\n장점: 채워 주는 사이.\n\n필요한 것\n물컵.\n\n이번 주 한 가지\n같이 걷기.'
    )
    expect(sections.map((s) => s.heading)).toEqual([
      '한눈에 보면',
      '잘 맞는 점',
      '곁에 두면 좋은 것',
      '이번 주에 해 볼 것',
    ])
    expect(sections[1].body).toBe('채워 주는 사이.')
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
