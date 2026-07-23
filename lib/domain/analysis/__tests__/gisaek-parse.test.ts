import { parseGisaek } from '../gisaek-parse'

describe('parseGisaek — 전용 태그 우선', () => {
  it('한줄평 + 조언 두 값 파싱', () => {
    const r = parseGisaek('앞 [[GISAEK: 오늘 안색이 맑고 화사합니다, 수분 크림으로 광택을 유지하세요]] 뒤')
    expect(r).toEqual({
      reading: '오늘 안색이 맑고 화사합니다',
      advice: '수분 크림으로 광택을 유지하세요',
    })
  })

  it('한줄평만 있고 조언 없으면 advice 미포함', () => {
    const r = parseGisaek('[[GISAEK: 혈색이 다소 창백합니다]]')
    expect(r).toEqual({ reading: '혈색이 다소 창백합니다' })
    expect(r?.advice).toBeUndefined()
  })

  it('조언에 콤마가 있어도 한줄평/조언 경계는 첫 콤마', () => {
    const r = parseGisaek('[[GISAEK: 기색이 밝습니다, 물을 자주 마시고, 충분히 주무세요]]')
    expect(r?.reading).toBe('기색이 밝습니다')
    expect(r?.advice).toBe('물을 자주 마시고, 충분히 주무세요')
  })
})

describe('parseGisaek — 휴리스틱 폴백(구프롬프트 하위호환)', () => {
  it('태그 없으면 기색 키워드 라인을 한줄평으로', () => {
    const text = '[4단계: 기색 분석]\n현재 피부 광택이 좋고 혈색이 붉어 건강한 기운입니다.\n다음 단계'
    const r = parseGisaek(text)
    expect(r?.reading).toContain('광택')
    expect(r?.advice).toBeUndefined()
  })

  it('키워드조차 없으면 undefined', () => {
    expect(parseGisaek('전혀 관련 없는 문장입니다.')).toBeUndefined()
  })

  it('빈 문자열 방어', () => {
    expect(parseGisaek('')).toBeUndefined()
  })
})
