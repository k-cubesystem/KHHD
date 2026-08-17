import { classifyReply, needsAiClassification, normalizeThreadsUsername } from '../classify'

describe('classifyReply — 규칙 분류', () => {
  it.each([
    ['저요!', 'apply'],
    ['신청합니다', 'apply'],
    ['궁합 봐주세요', 'apply'],
    ['저도 궁금해요', 'apply'],
    ['재물운 부탁드려요', 'apply'],
    ['참여하고 싶어요', 'apply'],
  ])('신청 의사: %s → %s', (t, want) => {
    expect(classifyReply(t).classification).toBe(want)
  })

  it.each([
    ['사주는 어떻게 보는 건가요?', 'question'],
    ['가격이 얼마예요', 'question'],
    ['언제 발표해요?', 'question'],
  ])('질문: %s → %s', (t, want) => {
    expect(classifyReply(t).classification).toBe(want)
  })

  it.each([
    ['감사합니다', 'chat'],
    ['대박 멋지네요', 'chat'],
    ['ㅋㅋㅋ', 'chat'],
    ['👍', 'chat'],
    ['안녕하세요', 'chat'],
  ])('잡담: %s → %s', (t, want) => {
    expect(classifyReply(t).classification).toBe(want)
  })

  it.each([
    ['https://bit.ly/xxxx 여기서 무료 수익', 'spam'],
    ['카톡: money999 연락주세요', 'spam'],
    ['텔레그램 리딩방 100% 수익 보장', 'spam'],
    ['토토 사이트 추천', 'spam'],
  ])('스팸: %s → %s', (t, want) => {
    expect(classifyReply(t).classification).toBe(want)
  })

  it('자사 도메인 링크는 스팸이 아니다', () => {
    expect(classifyReply('https://k-haehwadang.com/event/w1 여기서 신청했어요').classification).not.toBe('spam')
  })

  it('스팸이 신청 표지보다 우선한다', () => {
    expect(classifyReply('저요! 카톡: abcd1234 연락주세요').classification).toBe('spam')
  })

  it('«궁합 봐주세요?» 는 질문 표지가 있어도 신청이다', () => {
    expect(classifyReply('궁합 봐주세요?').classification).toBe('apply')
  })

  it('빈 댓글·판정 불가는 other 이고 AI 2차 대상', () => {
    const r = classifyReply('음 그렇군요 그러게 말입니다 참 신기한 세상')
    expect(r.classification).toBe('other')
    expect(needsAiClassification(r)).toBe(true)
    expect(classifyReply('').classification).toBe('other')
  })

  it('확신 있는 규칙 분류는 AI 로 안 넘긴다', () => {
    expect(needsAiClassification(classifyReply('저요 신청합니다 부탁드려요'))).toBe(false)
  })
})

describe('normalizeThreadsUsername', () => {
  it('@·대소문자·공백을 정규화하고 허용 문자만 남긴다', () => {
    expect(normalizeThreadsUsername(' @Hae_Hwa.Dang ')).toBe('hae_hwa.dang')
    expect(normalizeThreadsUsername('user!!name')).toBe('username')
  })
})
