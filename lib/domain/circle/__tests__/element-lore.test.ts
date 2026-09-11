import { ELEMENTS, EL_KO } from '@/lib/domain/shrine/energy'
import {
  CHILD_OF,
  CONTROLS,
  ELEMENT_LORE,
  HANJA_OF,
  LORE_BANNED_WORDS,
  MOTHER_OF,
  bannedWordsIn,
  elementFromHanja,
} from '@/lib/domain/circle/element-lore'

describe('오행 결 사전', () => {
  it('다섯 오행 모두 여섯 칸이 비어 있지 않다', () => {
    for (const el of ELEMENTS) {
      const lore = ELEMENT_LORE[el]
      expect(lore.lacking.length).toBeGreaterThan(10)
      expect(lore.gains.length).toBeGreaterThan(3)
      expect(lore.deskItem.length).toBeGreaterThan(2)
      expect(lore.gifts).toHaveLength(3)
      for (const gift of lore.gifts) expect(gift.length).toBeGreaterThan(1)
      expect(lore.excess.length).toBeGreaterThan(3)
      expect(lore.together.length).toBeGreaterThan(8)
    }
  })

  it('🔴 효능·채용 금지어가 한 글자도 없다 (표시광고법 §9-1 · 채용절차법 §9-2)', () => {
    for (const el of ELEMENTS) {
      const lore = ELEMENT_LORE[el]
      const texts = [lore.lacking, lore.gains, lore.deskItem, lore.excess, lore.together, ...lore.gifts]
      for (const text of texts) expect({ text, hits: bannedWordsIn(text) }).toEqual({ text, hits: [] })
    }
  })

  it('«금지»가 아니라 정도의 말로 쓴다', () => {
    for (const el of ELEMENTS) {
      expect(ELEMENT_LORE[el].excess).not.toMatch(/절대|금지|하지 마/)
      expect(ELEMENT_LORE[el].lacking).not.toMatch(/절대|금지|하지 마/)
    }
  })
})

describe('상생 고리', () => {
  it('水→木→火→土→金→水 — 어머니 표와 자식 표가 서로 역이다', () => {
    for (const el of ELEMENTS) {
      expect(CHILD_OF[MOTHER_OF[el]]).toBe(el)
      expect(MOTHER_OF[CHILD_OF[el]]).toBe(el)
      expect(MOTHER_OF[el]).not.toBe(el)
    }
    expect(MOTHER_OF.wood).toBe('water')
    expect(MOTHER_OF.fire).toBe('wood')
    expect(MOTHER_OF.earth).toBe('fire')
    expect(MOTHER_OF.metal).toBe('earth')
    expect(MOTHER_OF.water).toBe('metal')
  })

  it('상극 표 — 木克土·土克水·水克火·火克金·金克木, 다섯이 한 고리', () => {
    expect(CONTROLS).toEqual({ wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' })
    let cur: (typeof ELEMENTS)[number] = 'wood'
    const seen = new Set<string>()
    for (let i = 0; i < 5; i++) {
      seen.add(cur)
      cur = CONTROLS[cur]
    }
    expect(cur).toBe('wood')
    expect(seen.size).toBe(5)
  })

  it('다섯을 한 바퀴 돌면 제자리다(고리가 끊기지 않는다)', () => {
    let cur: (typeof ELEMENTS)[number] = 'wood'
    const seen = new Set<string>()
    for (let i = 0; i < 5; i++) {
      seen.add(cur)
      cur = CHILD_OF[cur]
    }
    expect(cur).toBe('wood')
    expect(seen.size).toBe(5)
  })
})

describe('영문 키 ↔ 한자 키', () => {
  it('HANJA_OF 는 신당의 EL_KO 와 같은 값이다 — 두 표가 갈리면 처방이 엉뚱한 오행을 읽는다', () => {
    for (const el of ELEMENTS) expect(HANJA_OF[el]).toBe(EL_KO[el])
  })

  it('한자 → 영문 왕복', () => {
    for (const el of ELEMENTS) expect(elementFromHanja(HANJA_OF[el])).toBe(el)
    expect(elementFromHanja('日')).toBeNull()
    expect(elementFromHanja(null)).toBeNull()
  })
})

describe('금지어 목록', () => {
  it('효능·채용 두 갈래가 모두 들어 있고, 검사 함수가 걸린 말을 돌려준다', () => {
    expect(LORE_BANNED_WORDS.efficacy).toContain('보장')
    expect(LORE_BANNED_WORDS.efficacy).toContain('무제한')
    expect(LORE_BANNED_WORDS.hiring).toContain('채용')
    expect(bannedWordsIn('이 물건은 성공을 보장합니다')).toEqual(['보장', '성공'])
    expect(bannedWordsIn('시작하는 힘, 뻗어 나가는 결')).toEqual([])
  })
})
