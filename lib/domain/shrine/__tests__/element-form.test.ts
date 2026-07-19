import { parseElementForm, elementFormToModifier, ELEMENT_FORM_BONUS } from '../element-form'

describe('parseElementForm', () => {
  it('표준 형식을 파싱한다', () => {
    const r = parseElementForm('[[ELEMENT_FORM: 木, 얼굴이 길고 곧아 木形에 가깝습니다]]')
    expect(r).toEqual({ element: 'wood', reason: '얼굴이 길고 곧아 木形에 가깝습니다' })
  })

  it('形 접미사가 붙어도 받아들인다', () => {
    expect(parseElementForm('[[ELEMENT_FORM: 火形, 끝이 뾰족함]]')?.element).toBe('fire')
  })

  it('근거가 없어도 파싱한다', () => {
    expect(parseElementForm('[[ELEMENT_FORM: 水]]')).toEqual({ element: 'water', reason: null })
  })

  it('오행 5종을 모두 매핑한다', () => {
    const map = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' } as const
    for (const [hanja, el] of Object.entries(map)) {
      expect(parseElementForm(`[[ELEMENT_FORM: ${hanja}, x]]`)?.element).toBe(el)
    }
  })

  it('태그가 없으면 null — 모델이 확신 없어 생략한 경우', () => {
    expect(parseElementForm('[[EYES: 좋음, 맑습니다]]\n[[NOSE: 보통, 무난]]')).toBeNull()
    expect(parseElementForm('')).toBeNull()
  })

  it('오행이 아닌 값은 무시한다', () => {
    expect(parseElementForm('[[ELEMENT_FORM: 風, 바람]]')).toBeNull()
  })

  it('다른 태그들 사이에 섞여 있어도 찾는다 (후방호환 확인)', () => {
    const text = `[[FIRST_IMPRESSION: 단정함]]
[[EARS: 좋음, 귀가 큽니다]]
[[ELEMENT_FORM: 土, 두텁고 안정적입니다]]
[[IMPROVEMENT_TIP_1: 미소, 인상 개선]]`
    expect(parseElementForm(text)?.element).toBe('earth')
  })
})

describe('elementFormToModifier', () => {
  it('해당 오행만 보정한다', () => {
    expect(elementFormToModifier({ element: 'metal', reason: null })).toEqual({ metal: ELEMENT_FORM_BONUS })
  })

  it('null 이면 빈 보정 — 사주만으로 기운을 잡는다', () => {
    expect(elementFormToModifier(null)).toEqual({})
  })
})
