/**
 * 속풀이 위기 신호 감지 — 판정표.
 *
 * 이 표가 규칙의 계약이다. 규칙을 고치면 표에 사례를 먼저 더하고, 기존 줄이 뒤집히면 그 이유를 적는다.
 * 🔴 crisis 줄이 none 으로 떨어지는 회귀가 가장 비싸다 — 「죽고 싶다」에 운세 풀이가 나가던 상태로 돌아간다.
 */
import {
  CHAT_SAFETY_INSTRUCTION,
  CONCERN_FOOTER,
  CRISIS_HOTLINES,
  CRISIS_HOTLINES_VERIFIED_ON,
  CRISIS_REPLY,
  detectCrisis,
  detectCrisisInTurn,
  splitHotlineLinks,
  withConcernFooter,
  type CrisisLevel,
  type CrisisReason,
} from '@/lib/domain/chat/crisis'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

type Row = [text: string, level: CrisisLevel, reason: CrisisReason]

const CRISIS: Row[] = [
  // 직접 표현
  ['죽고 싶다', 'crisis', 'desire'],
  ['죽고싶어요', 'crisis', 'desire'],
  ['그냥 죽고 싶습니다', 'crisis', 'desire'],
  ['죽 고 싶 다...', 'crisis', 'desire'],
  ['죽고싶다ㅠㅠㅠ', 'crisis', 'desire'],
  ['죽고만 싶어요', 'crisis', 'desire'],
  ['죽구싶다', 'crisis', 'desire'],
  ['죽고 시퍼', 'crisis', 'desire'],
  ['요즘 너무 힘들어서 죽고 싶다는 생각이 들어요', 'crisis', 'desire'],
  ['죽고 싶을 만큼 힘들어요', 'crisis', 'desire'],
  ['죽어버리고 싶어', 'crisis', 'desire'],
  ['콱 죽어버릴까', 'crisis', 'desire'],
  ['나 같은 건 죽어야지', 'crisis', 'desire'],
  ['차라리 죽는 게 낫겠어요', 'crisis', 'desire'],
  ['죽으면 편해질까요', 'crisis', 'desire'],
  ['내가 죽었으면 좋겠어', 'crisis', 'desire'],
  ['자다가 그냥 죽었으면', 'crisis', 'desire'],
  ['누가 나 좀 죽여줬으면', 'crisis', 'desire'],
  ['살고 싶지 않아요', 'crisis', 'desire'],
  ['이제 그만 살고 싶어요', 'crisis', 'desire'],
  ['이 세상에 살고 싶지 않아요', 'crisis', 'desire'],
  ['이런 세상 살기 싫어요', 'crisis', 'desire'],
  ['생을 마감하고 싶습니다', 'crisis', 'desire'],
  ['영원히 잠들고 싶어요', 'crisis', 'desire'],
  ['I want to die', 'crisis', 'desire'],
  ['thinking about killing myself', 'crisis', 'desire'],
  // 부정문처럼 생겼지만 뜻은 정반대
  ['죽고 싶지 않은 날이 없어요', 'crisis', 'desire'],
  ['죽고 싶지 않다면 거짓말이에요', 'crisis', 'desire'],
  ['죽고 싶은 생각이 없어지질 않아요', 'crisis', 'desire'],
  // 부정·딴 주제와 섞여도 남은 말이 걸린다
  ['죽고 싶지 않았는데 이제는 죽고 싶어요', 'crisis', 'desire'],
  ['남편이랑 살기 싫고 그냥 죽고 싶어요', 'crisis', 'desire'],
  ['엄마가 죽으라고 해서 죽고 싶어', 'crisis', 'desire'],
  ['죽고 싶어 하루하루가 지옥이에요', 'crisis', 'desire'],
  ['죽고 싶다고 했더니 엄마가 화냈어요', 'crisis', 'desire'],
  // 방법·계획
  ['자살하고 싶어요', 'crisis', 'plan'],
  ['자살 생각이 자꾸 나요', 'crisis', 'plan'],
  ['자살 방법 알려줘', 'crisis', 'plan'],
  ['극단적 선택을 하고 싶어요', 'crisis', 'plan'],
  ['옥상에서 뛰어내리고 싶어', 'crisis', 'plan'],
  ['한강에 뛰어들고 싶다', 'crisis', 'plan'],
  ['목을 매려고 했어요', 'crisis', 'plan'],
  ['목숨을 끊고 싶어요', 'crisis', 'plan'],
  ['유서를 써놨어요', 'crisis', 'plan'],
  ['번개탄 샀어요', 'crisis', 'plan'],
  ['수면제를 모으고 있어요', 'crisis', 'plan'],
  ['수면제를 한꺼번에 다 먹었어요', 'crisis', 'plan'],
  ['약을 몽땅 털어 먹었어요', 'crisis', 'plan'],
  ['동반자살 하자고 해요', 'crisis', 'plan'],
  ['인생을 다 끝내고 싶어요', 'crisis', 'desire'],
  // 「꿈」이 장래 희망일 때 — 해몽으로 낮추지 않는다
  ['가수의 꿈을 꾸었지만 이제 자살 생각만 나요', 'crisis', 'plan'],
  ['꿈도 희망도 없어요 자살 생각만 나요', 'crisis', 'plan'],
  // 자해
  ['자해했어요', 'crisis', 'self-harm'],
  ['딸이 자해를 해요', 'crisis', 'self-harm'],
  ['손목을 그었어요', 'crisis', 'self-harm'],
]

const CONCERN: Row[] = [
  // 완곡 표현
  ['살기 싫다', 'concern', 'weariness'],
  ['빚 때문에 살기 싫어요', 'concern', 'weariness'],
  ['사는 게 의미가 없어요', 'concern', 'weariness'],
  ['살아서 뭐 하나 싶어요', 'concern', 'weariness'],
  ['살 이유가 없어요', 'concern', 'weariness'],
  ['그냥 사라지고 싶어요', 'concern', 'weariness'],
  ['다 끝내고 싶어요', 'concern', 'weariness'],
  ['내가 없어지면 다들 편하겠죠', 'concern', 'weariness'],
  ['더는 못 버티겠어요', 'concern', 'weariness'],
  ['태어나지 말았어야 했어요', 'concern', 'weariness'],
  ['아침에 눈 안 떴으면 좋겠어요', 'concern', 'weariness'],
  ['이렇게 살고 싶지 않아요', 'concern', 'weariness'],
  ['이러고 살기 싫어요', 'concern', 'weariness'],
  // 남의 이야기를 옮긴 말
  ['친구가 죽고 싶대요', 'concern', 'third-person'],
  ['남편이 요즘 죽고 싶다고 해요', 'concern', 'third-person'],
  ['딸이 자꾸 사라지고 싶어해요', 'concern', 'third-person'],
  // 낱말만 나온 경우(사별·속어)
  ['아버지가 자살로 돌아가셨어요', 'concern', 'mention'],
  ['시험 망쳐서 자살각', 'concern', 'mention'],
  ['자살하는 꿈을 꿨어요', 'concern', 'mention'],
  // 꿈 해몽
  ['손목을 긋는 꿈을 꿨어요 해몽해주세요', 'concern', 'dream'],
  ['꿈에서 제가 유서를 쓰고 있었어요', 'concern', 'dream'],
  ['번개탄을 피우는 꿈', 'concern', 'dream'],
  ['나만 없어지면 되는 걸까요', 'concern', 'weariness'],
]

const NONE: Row[] = [
  // 부정문
  ['죽고 싶지 않다', 'none', 'negated'],
  ['죽고 싶지는 않아요 오래 살고 싶어요', 'none', 'negated'],
  ['죽고 싶은 건 아니에요', 'none', 'negated'],
  ['죽을 생각은 전혀 없어요', 'none', 'negated'],
  ['자살 생각은 없습니다', 'none', 'negated'],
  ['굶어 죽고 싶지 않으면 일해야죠', 'none', 'negated'],
  // 관용·과장
  ['죽을 만큼 맛있다', 'none', 'clear'],
  ['죽고 싶을 만큼 맛있어요', 'none', 'figurative'],
  ['어제 경기에서 자살골 넣었어요', 'none', 'figurative'],
  ['그건 자살행위야', 'none', 'figurative'],
  ['자살예방센터에서 일하는데 이직운이 궁금해요', 'none', 'figurative'],
  ['남편이 "너 죽고 싶냐"고 소리쳐요', 'none', 'figurative'],
  ['「죽고 싶지만 떡볶이는 먹고 싶어」 읽었어요', 'none', 'figurative'],
  ['배고파 죽겠다', 'none', 'clear'],
  ['좋아 죽겠어요', 'none', 'clear'],
  ['힘들어 죽을 것 같아요', 'none', 'clear'],
  ['웃겨 죽는 줄 알았어요', 'none', 'clear'],
  ['I want to diet', 'none', 'clear'],
  // 속풀이 단골 주제 — 같이 사는 일·일·꿈·수명
  ['남편이랑 더는 살기 싫어요', 'none', 'other-topic'],
  ['시어머니와 같이 살고 싶지 않아요', 'none', 'other-topic'],
  ['혼자 살고 싶지 않아요', 'none', 'other-topic'],
  ['이 집에서 살기 싫어요', 'none', 'other-topic'],
  ['사업에 뛰어들고 싶어요', 'none', 'clear'],
  ['정계에 투신한 지 10년입니다', 'none', 'clear'],
  ['유서 깊은 가문이라고 들었어요', 'none', 'clear'],
  ['죽는 꿈을 꿨어요', 'none', 'clear'],
  ['높은 데서 뛰어내리는 꿈을 꿨어요', 'none', 'clear'],
  ['할아버지가 돌아가셨어요', 'none', 'clear'],
  ['저는 언제 죽나요?', 'none', 'clear'],
  ['저는 그 사람이 죽었으면 좋겠어요', 'none', 'clear'],
  ['올해 재물운이 궁금해요', 'none', 'clear'],
  // 🔴 빈칸을 지우면 생기는 가짜 낱말 — 재물·독립 질문이 안내문을 받으면 안 된다
  ['이혼하고 혼자 살고 싶어요', 'none', 'clear'],
  ['혼자살고싶어요', 'none', 'clear'],
  ['내년에는 혼자 살 생각이에요', 'none', 'clear'],
  ['주식 투자해도 될까요', 'none', 'clear'],
  ['이 일은 저 혼자 해요', 'none', 'clear'],
  ['같이 가자 해서 따라갔어요', 'none', 'clear'],
  ['회사에 사유서를 썼어요', 'none', 'clear'],
  ['항목을 매달 아침마다 확인해요', 'none', 'clear'],
  ['뱃살 이유 없이 쪄요', 'none', 'clear'],
  ['이거 하나만 없으면 완벽한데요', 'none', 'clear'],
  // 끝내려는 것이 삶이 아닐 때
  ['이 관계를 다 끝내고 싶어요', 'none', 'other-topic'],
  ['밀린 일을 빨리 끝내고 싶어요', 'none', 'other-topic'],
  ['극단적인 선택지밖에 없나요', 'none', 'clear'],
  ['다이어트 약을 한꺼번에 먹어도 되나요', 'none', 'clear'],
  ['강에 뛰어들어 아이를 구한 꿈', 'none', 'clear'],
  ['죽자 살자 매달렸는데 떨어졌어요', 'none', 'figurative'],
  ['살아서 뭐라도 해보려고요', 'none', 'clear'],
  ['', 'none', 'clear'],
  ['   ', 'none', 'clear'],
]

describe('detectCrisis — 판정표', () => {
  it.each([...CRISIS, ...CONCERN, ...NONE])('%s → %s (%s)', (text, level, reason) => {
    expect(detectCrisis(text)).toEqual({ level, reason })
  })

  it('문자열이 아닌 값이 들어와도 던지지 않는다', () => {
    expect(detectCrisis(undefined as unknown as string)).toEqual({ level: 'none', reason: 'clear' })
  })

  it('입력 상한(2,000자) 길이에서도 바로 끝난다', () => {
    const started = Date.now()
    detectCrisis('이랑 더는 같이 살기 '.repeat(200))
    expect(Date.now() - started).toBeLessThan(200)
  })
})

describe('detectCrisisInTurn — 직전 대화의 위기 신호', () => {
  const user = (content: string) => ({ role: 'user', content, timestamp: '' })
  const bot = (content: string) => ({ role: 'assistant', content, timestamp: '' })

  it('직전에 위기 신호가 있었다면 평범한 다음 질문도 concern 이다', () => {
    const history = [user('죽고 싶어요'), bot(CRISIS_REPLY)]
    expect(detectCrisisInTurn('그래도 제 사주나 봐 주세요', history)).toEqual({ level: 'concern', reason: 'history' })
  })

  it('🔴 안내문 자체(assistant)는 신호로 세지 않는다 — 세면 안내가 나간 뒤 모든 턴이 concern 이 된다', () => {
    expect(detectCrisisInTurn('올해 재물운이 궁금해요', [bot(CRISIS_REPLY), bot(CONCERN_FOOTER)]).level).toBe('none')
  })

  it('직전 신호가 concern 이면 끌어올리지 않는다 — 안내 한 줄이 계속 따라붙지 않게', () => {
    expect(detectCrisisInTurn('올해 재물운이 궁금해요', [user('살기 싫다')]).level).toBe('none')
  })

  it('창(8턴) 밖으로 밀려난 신호는 잊는다', () => {
    const history = [user('죽고 싶어요'), ...Array.from({ length: 8 }, () => user('재물운은요?'))]
    expect(detectCrisisInTurn('직장운은요?', history).level).toBe('none')
  })

  it('이번 메시지의 판정이 더 무거우면 그대로 둔다', () => {
    expect(detectCrisisInTurn('죽고 싶어요', [])).toEqual({ level: 'crisis', reason: 'desire' })
  })

  it('클라이언트가 보낸 히스토리 모양을 믿지 않는다', () => {
    const broken: unknown[] = [null, 'text', 42, { role: 'user' }, { role: 'user', content: 7 }]
    expect(detectCrisisInTurn('올해 재물운이 궁금해요', broken).level).toBe('none')
  })
})

describe('안내 문구', () => {
  it('🔴 상담 번호 — 고치려면 공식 출처를 다시 확인하고 확인일을 함께 바꾼다', () => {
    expect(CRISIS_HOTLINES.map((h) => `${h.label} ${h.number}`)).toEqual([
      '자살예방상담전화 109',
      '정신건강 위기상담전화 1577-0199',
      '청소년상담 1388',
    ])
    expect(CRISIS_HOTLINES_VERIFIED_ON).toBe('2026-09-20')
  })

  it('고정 안내와 안내 한 줄에 세 번호가 모두 들어 있다', () => {
    for (const { number } of CRISIS_HOTLINES) {
      expect(CRISIS_REPLY).toContain(number)
      expect(CONCERN_FOOTER).toContain(number)
    }
  })

  it('고정 안내는 질문 횟수를 쓰지 않았다고 알린다', () => {
    expect(CRISIS_REPLY).toContain('질문 횟수를 쓰지 않았습니다')
  })

  it('안내 한 줄은 정말 한 줄이다', () => {
    expect(CONCERN_FOOTER).not.toContain('\n')
    expect(withConcernFooter('답변입니다.\n')).toBe(`답변입니다.\n\n${CONCERN_FOOTER}`)
  })

  it('🔴 효과를 약속하지 않는다 — 치료·완치·나아진다 같은 말은 회원에게 나가는 문구에 없다', () => {
    const promises = /치료|완치|낫게|낫습니다|나아집니다|좋아집니다|해결됩니다|극복|힐링|효과|보장/
    expect(CRISIS_REPLY).not.toMatch(promises)
    expect(CONCERN_FOOTER).not.toMatch(promises)
  })

  it('이용권 문구 규율의 금지어를 쓰지 않는다', () => {
    expect(findBannedPassTerms(CRISIS_REPLY)).toEqual([])
    expect(findBannedPassTerms(CONCERN_FOOTER)).toEqual([])
  })

  it('안내 문구 스스로는 본인 발화로 다시 들어와도 crisis 로 판정되지 않는다', () => {
    expect(detectCrisis(CONCERN_FOOTER).level).not.toBe('crisis')
  })

  it('모델 안전 지침은 방법을 말하지 말 것·유료 권유 금지를 담는다', () => {
    expect(CHAT_SAFETY_INSTRUCTION).toContain('방법이나 수단은 어떤 경우에도 말하지 마십시오')
    expect(CHAT_SAFETY_INSTRUCTION).toContain('권하지 마십시오')
  })
})

describe('splitHotlineLinks — 바로 걸기 조각', () => {
  it('공식 이름 바로 뒤의 번호만 링크가 된다', () => {
    const links = splitHotlineLinks(CRISIS_REPLY).filter((s) => s.tel)
    expect(links).toEqual([
      { text: '109', tel: '109' },
      { text: '1577-0199', tel: '15770199' },
    ])
  })

  it('🔴 1388 은 링크가 아니다 — 휴대전화에서는 지역번호를 붙여야 걸린다', () => {
    expect(splitHotlineLinks(CRISIS_REPLY).some((s) => s.text.includes('1388') && s.tel)).toBe(false)
  })

  it('조각을 이으면 원문 그대로다', () => {
    for (const text of [CRISIS_REPLY, CONCERN_FOOTER, '109세까지 사신 할머니 이야기', '']) {
      expect(
        splitHotlineLinks(text)
          .map((s) => s.text)
          .join('')
      ).toBe(text)
    }
  })

  it('이름 없이 나온 숫자는 건드리지 않는다', () => {
    expect(splitHotlineLinks('109세까지 사신 할머니 이야기')).toEqual([{ text: '109세까지 사신 할머니 이야기' }])
  })
})
