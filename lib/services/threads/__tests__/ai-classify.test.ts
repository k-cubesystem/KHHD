/** @jest-environment node */
import { createReplyAiClassifier } from '@/lib/services/threads/ai-classify'
import { generateAIContent } from '@/lib/services/ai-client'
import { askJev, isJevEnabled } from '@/lib/services/jev-client'

jest.mock('@/lib/services/ai-client', () => ({ generateAIContent: jest.fn() }))
jest.mock('@/lib/services/jev-client', () => ({
  ...jest.requireActual('@/lib/services/jev-client'),
  askJev: jest.fn(),
  isJevEnabled: jest.fn(),
}))
jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() } }))

const gemini = jest.mocked(generateAIContent)
const jev = jest.mocked(askJev)
const jevEnabled = jest.mocked(isJevEnabled)

const geminiSays = (c: string) =>
  gemini.mockResolvedValue({
    text: JSON.stringify({ c }),
    provider: 'gemini',
    model: 'm',
    inputTokens: 1,
    outputTokens: 1,
  })
const jevSays = (choice: string, confidence: number) =>
  jev.mockResolvedValue({ intent: { type: 'choice', choice, probabilities: {}, confidence } })

describe('Threads 댓글 AI 2차 분류 — 크론 한 번의 예산', () => {
  beforeEach(() => {
    gemini.mockReset()
    jev.mockReset()
    jevEnabled.mockReset().mockReturnValue(true)
  })

  it('Jev 가 확신하면 그 답을 쓰고 Gemini 는 부르지 않는다', async () => {
    jevSays('apply', 0.9)
    expect(await createReplyAiClassifier(15).classify('저도 봐주세요 88년생')).toBe('apply')
    expect(gemini).not.toHaveBeenCalled()
  })

  it('Jev 의 확신이 낮으면 Gemini 로 넘긴다', async () => {
    jevSays('apply', 0.4)
    geminiSays('question')
    expect(await createReplyAiClassifier(15).classify('이건 어떻게 하는 건지')).toBe('question')
  })

  it('키가 없으면 Jev 를 부르지 않는다 — 종전과 같은 Gemini 한 번', async () => {
    jevEnabled.mockReturnValue(false)
    geminiSays('chat')
    expect(await createReplyAiClassifier(15).classify('잘 보고 갑니다')).toBe('chat')
    expect(jev).not.toHaveBeenCalled()
    expect(gemini).toHaveBeenCalledTimes(1)
  })

  it('🔴 상한은 시도로 센다 — 둘 다 못 정하는 날에도 외부 호출이 상한에서 멈춘다', async () => {
    jevSays('other', 0.1)
    gemini.mockRejectedValue(new Error('truncated'))
    const ai = createReplyAiClassifier(3)

    for (let i = 0; i < 10; i += 1) expect(await ai.classify(`뜻 모를 댓글 ${i}`)).toBeNull()

    expect(jev).toHaveBeenCalledTimes(3)
    expect(gemini).toHaveBeenCalledTimes(3)
  })

  it('🔴 Jev 가 한 번 실패하면 그 실행에서는 다시 부르지 않는다 — 멎은 상대를 댓글마다 기다리지 않는다', async () => {
    jev.mockResolvedValue(null)
    geminiSays('chat')
    const ai = createReplyAiClassifier(15)

    for (let i = 0; i < 5; i += 1) expect(await ai.classify(`댓글 ${i}`)).toBe('chat')

    expect(jev).toHaveBeenCalledTimes(1)
    expect(gemini).toHaveBeenCalledTimes(5)
  })

  it('실행이 바뀌면 Jev 를 다시 시도한다 — 끊는 것은 한 실행 안에서만이다', async () => {
    jev.mockResolvedValueOnce(null)
    geminiSays('chat')
    await createReplyAiClassifier(15).classify('댓글')

    jevSays('spam', 0.95)
    expect(await createReplyAiClassifier(15).classify('프로필 링크 확인')).toBe('spam')
  })

  it.each([null, undefined, '', '   '])('글자가 없는 댓글(%p)은 부르지 않고 예산도 쓰지 않는다', async (text) => {
    geminiSays('chat')
    jevSays('chat', 0.99)
    const ai = createReplyAiClassifier(1)

    expect(await ai.classify(text)).toBeNull()
    expect(jev).not.toHaveBeenCalled()
    expect(gemini).not.toHaveBeenCalled()
    expect(await ai.classify('안녕하세요')).toBe('chat')
  })

  it('댓글은 500자에서 잘라 보낸다', async () => {
    jevSays('chat', 0.99)
    await createReplyAiClassifier(1).classify('가'.repeat(900))
    expect(jev.mock.calls[0]?.[0].state).toHaveLength(500)
  })

  it.each(['refund', 42, null])('Gemini 가 분류값이 아닌 답(%p)을 주면 null', async (c) => {
    jevEnabled.mockReturnValue(false)
    gemini.mockResolvedValue({
      text: JSON.stringify({ c }),
      provider: 'gemini',
      model: 'm',
      inputTokens: 1,
      outputTokens: 1,
    })
    expect(await createReplyAiClassifier(15).classify('댓글')).toBeNull()
  })
})
