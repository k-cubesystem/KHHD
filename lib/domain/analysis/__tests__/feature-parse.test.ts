import { parseFeatureTag, scoreToAssessment } from '../feature-parse'

describe('scoreToAssessment', () => {
  it.each([
    [85, '좋음'],
    [70, '좋음'],
    [50, '보통'],
    [40, '보통'],
    [30, '주의'],
    [8, '좋음'], // 0~10 스케일: ×10=80
    [5, '보통'], // 50
    [3, '주의'], // 30
  ] as Array<[number, string]>)('score=%s → %s', (n, expected) => {
    expect(scoreToAssessment(n)).toBe(expected)
  })
})

describe('parseFeatureTag — 숫자·등급 양쪽 허용', () => {
  it('숫자 형식(프롬프트 실제 출력): [[EARS: 8, 설명]]', () => {
    const r = parseFeatureTag('앞부분 [[EARS: 8, 귀가 크고 복스럽다]] 뒷부분', 'EARS')
    expect(r.assessment).toBe('좋음')
    expect(r.description).toBe('귀가 크고 복스럽다')
    expect(r.score).toBe(8)
    expect(r.found).toBe(true)
  })

  it('100점 스케일 숫자: [[EYES: 45, 설명]] → 보통', () => {
    const r = parseFeatureTag('[[EYES: 45, 눈매가 서글서글]]', 'EYES')
    expect(r.assessment).toBe('보통')
    expect(r.score).toBe(45)
  })

  it('등급 형식(하위호환): [[NOSE: 좋음, 설명]]', () => {
    const r = parseFeatureTag('[[NOSE: 좋음, 코가 오똑]]', 'NOSE')
    expect(r.assessment).toBe('좋음')
    expect(r.description).toBe('코가 오똑')
    expect(r.score).toBeNull()
  })

  it('주의 등급: [[MOUTH: 주의, 설명]]', () => {
    expect(parseFeatureTag('[[MOUTH: 주의, 입술이 얇다]]', 'MOUTH').assessment).toBe('주의')
  })

  it('여러 태그 중 해당 태그만 매칭', () => {
    const text = '[[EARS: 7, 귀]] [[EYES: 3, 눈]]'
    expect(parseFeatureTag(text, 'EYES').assessment).toBe('주의')
    expect(parseFeatureTag(text, 'EARS').assessment).toBe('좋음')
  })

  it('태그 없으면 명시적 미스 신호(found:false, 빈 설명)', () => {
    const r = parseFeatureTag('아무 태그 없음', 'EARS')
    expect(r).toEqual({ description: '', assessment: '보통', score: null, found: false })
  })

  it('값 형식이 예상 밖이어도 태그는 찾았고 설명은 보존(found:true)', () => {
    const r = parseFeatureTag('[[EARS: 아주좋음, 귀 설명]]', 'EARS')
    expect(r.description).toBe('귀 설명')
    expect(r.assessment).toBe('보통')
    expect(r.found).toBe(true)
  })

  it('소수점 점수: [[EYEBROWS: 7.5, 설명]]', () => {
    const r = parseFeatureTag('[[EYEBROWS: 7.5, 눈썹 짙음]]', 'EYEBROWS')
    expect(r.score).toBe(7.5)
    expect(r.assessment).toBe('좋음')
  })
})
