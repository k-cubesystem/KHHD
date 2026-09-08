import { JINMAEK_SLOTS, WU_XING_ORDER, balanceComment, themeComment, validBirthDate, type WuXing } from '../jinmaek'

describe('간이 진맥 — 슬롯 설정', () => {
  it('등재 슬롯은 5분할 범위 안(1~5)에, 도입부·화자를 갖춘다', () => {
    for (const [no, slot] of Object.entries(JINMAEK_SLOTS)) {
      expect(Number.isInteger(Number(no))).toBe(true)
      expect(slot.after).toBeGreaterThanOrEqual(1)
      expect(slot.after).toBeLessThanOrEqual(5)
      expect(slot.hook.trim().length).toBeGreaterThan(5)
      expect(['해수', '해화지기']).toContain(slot.speaker)
      if (slot.element !== null) expect(WU_XING_ORDER).toContain(slot.element)
    }
  })

  it('라이브 0~5화가 전부 등재되어 있다', () => {
    for (const no of [0, 1, 2, 3, 4, 5]) expect(JINMAEK_SLOTS[no]).toBeDefined()
  })
})

describe('간이 진맥 — 해설 문장', () => {
  const counts = (over: Partial<Record<WuXing, number>>): Record<WuXing, number> => ({
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0,
    ...over,
  })

  it('테마 해설은 개수 3단(0 / 1~2 / 3+)이 서로 다른 문장이다', () => {
    const zero = themeComment('土', 0, 8)
    const some = themeComment('土', 2, 8)
    const many = themeComment('土', 3, 8)
    expect(new Set([zero, some, many]).size).toBe(3)
    expect(some).toContain('2개')
  })

  it('시 모름(여섯 글자)이면 그 사실을 밝힌다', () => {
    expect(themeComment('火', 1, 6)).toContain('여섯 글자')
    expect(balanceComment(counts({ 木: 3, 火: 3 }), 6)).toContain('여섯 글자')
  })

  it('문장 규율 — 단정 대신 «~로 봅니다/읽습니다», 표시광고 금지어 없음', () => {
    const all = [
      themeComment('木', 0, 8),
      themeComment('金', 2, 8),
      themeComment('水', 4, 8),
      balanceComment(counts({ 火: 8 }), 8),
      balanceComment(counts({ 木: 2, 火: 2, 土: 2, 金: 1, 水: 1 }), 8),
    ]
    for (const s of all) {
      expect(/봅니다|읽습니다/.test(s)).toBe(true)
      expect(/무제한|평생|반드시|100%/.test(s)).toBe(false)
    }
  })

  it('전체 균형 — 빈 오행이 없으면 «고르게», 있으면 그 이름을 부른다', () => {
    expect(balanceComment(counts({ 木: 2, 火: 2, 土: 2, 金: 1, 水: 1 }), 8)).toContain('고르게')
    expect(balanceComment(counts({ 木: 4, 火: 4 }), 8)).toContain('토(土)')
  })
})

describe('간이 진맥 — 조사(은/는)', () => {
  it('받침에 따라 조사가 맞는다 — 토(土)는 / 금(金)은', () => {
    expect(themeComment('土', 1, 8)).toContain('토(土)는')
    expect(themeComment('金', 1, 8)).toContain('금(金)은')
  })
})

describe('간이 진맥 — 생년월일 검증', () => {
  it.each(['1993-04-15', '1900-01-01'])('유효: %s', (d) => expect(validBirthDate(d)).toBe(true))
  it.each(['1899-12-31', '2050-01-01', '1993-13-01', '1993-00-10', '93-04-15', ''])('무효: %s', (d) =>
    expect(validBirthDate(d)).toBe(false)
  )
})
