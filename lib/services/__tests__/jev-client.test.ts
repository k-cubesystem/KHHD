/** @jest-environment node */
import { askJev, confidentChoice, isJevEnabled, type JevQuestion } from '@/lib/services/jev-client'
import { logUsage } from '@/lib/services/gemini-rate-limiter'

jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/utils/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() } }))

const INTENT: JevQuestion = {
  type: 'choice',
  instructions: '댓글의 의도',
  criteria: { apply: '신청', chat: '잡담' },
}

function respondWith(status: number, body: unknown) {
  const fetchMock = jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  global.fetch = fetchMock
  return fetchMock
}

const okBody = (answer: unknown) => ({
  model: 'jev-latest',
  answers: { intent: answer },
  usage: { input_tokens: 120, output_tokens: 8 },
})

describe('askJev', () => {
  const realFetch = global.fetch
  beforeEach(() => {
    process.env.TYPESAFE_API_KEY = 'test-key'
    jest.mocked(logUsage).mockClear()
  })
  afterEach(() => {
    delete process.env.TYPESAFE_API_KEY
    global.fetch = realFetch
  })

  it('키가 없으면 부르지 않고 null — 기존 경로가 그대로 돈다', async () => {
    delete process.env.TYPESAFE_API_KEY
    const fetchMock = respondWith(200, okBody({}))
    expect(isJevEnabled()).toBe(false)
    expect(
      await askJev({ state: '저요', questions: { intent: INTENT }, actionType: 'threads_classify_jev' })
    ).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(logUsage).not.toHaveBeenCalled()
  })

  it('공식 API 모양대로 보내고, 답을 타입 그대로 돌려주며, 사용량을 jev-latest 로 남긴다', async () => {
    const fetchMock = respondWith(
      200,
      okBody({ type: 'choice', choice: 'apply', probabilities: { apply: 0.93, chat: 0.07 }, confidence: 0.88 })
    )
    const answers = await askJev({ state: '저요', questions: { intent: INTENT }, actionType: 'threads_classify_jev' })

    expect(answers?.intent).toEqual({
      type: 'choice',
      choice: 'apply',
      probabilities: { apply: 0.93, chat: 0.07 },
      confidence: 0.88,
    })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.typesafe.ai/v1/systemone')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer test-key')
    // 본문에 댓글 원문이 실린다 — 리다이렉트를 따라가 다른 출처로 다시 보내지 않는다
    expect(init.redirect).toBe('error')
    // 🔴 크론 60초 예산을 지키는 유일한 장치 — 신호를 빼도 다른 테스트는 전부 통과한다
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(String(init.body))).toEqual({ model: 'jev-latest', state: '저요', questions: { intent: INTENT } })
    expect(logUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'jev-latest',
        actionType: 'threads_classify_jev',
        status: 'success',
        inputTokens: 120,
      })
    )
  })

  it('state 는 4,000자에서 자른다', async () => {
    const fetchMock = respondWith(200, okBody({ type: 'choice', choice: 'chat', probabilities: {}, confidence: 0.9 }))
    await askJev({ state: '가'.repeat(9000), questions: { intent: INTENT }, actionType: 'threads_classify_jev' })
    const sent = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as { state: string }
    expect(sent.state).toHaveLength(4000)
  })

  it.each([
    ['선택지에 없는 답', { type: 'choice', choice: 'refund', probabilities: {}, confidence: 0.9 }],
    [
      '🔴 프로토타입 키(constructor) — `in` 검사는 통과시키던 값',
      { type: 'choice', choice: 'constructor', probabilities: {}, confidence: 0.9 },
    ],
    ['🔴 프로토타입 키(toString)', { type: 'choice', choice: 'toString', probabilities: {}, confidence: 0.9 }],
    ['질문과 다른 타입', { type: 'noul', noul: 0.9 }],
    ['범위를 벗어난 확신', { type: 'choice', choice: 'apply', probabilities: {}, confidence: 1.4 }],
    ['답이 빠짐', undefined],
  ])('응답 모양이 계약과 다르면 null — %s', async (_label, answer) => {
    respondWith(200, okBody(answer))
    expect(
      await askJev({ state: '저요', questions: { intent: INTENT }, actionType: 'threads_classify_jev' })
    ).toBeNull()
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', errorCode: 'bad_shape' }))
  })

  it.each([
    [429, 'rate_limited'],
    [529, 'rate_limited'],
    [401, 'error'],
  ])('HTTP %i 이면 null, 로그 상태는 %s', async (status, logged) => {
    respondWith(status, { error: 'x' })
    expect(
      await askJev({ state: '저요', questions: { intent: INTENT }, actionType: 'threads_classify_jev' })
    ).toBeNull()
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ status: logged, errorCode: String(status) }))
  })

  it('시간 초과·네트워크 예외도 던지지 않고 null', async () => {
    global.fetch = jest.fn().mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))
    expect(
      await askJev({ state: '저요', questions: { intent: INTENT }, actionType: 'threads_classify_jev' })
    ).toBeNull()
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ status: 'timeout' }))
  })

  it('noul 은 0~1 확률 하나', async () => {
    respondWith(200, { answers: { urgent: { type: 'noul', noul: 0.97 } }, usage: {} })
    const answers = await askJev({
      state: '오늘 안에 꼭 답 주세요',
      questions: { urgent: { type: 'noul', instructions: '급한 요청인가' } },
      actionType: 'threads_classify_jev',
    })
    expect(answers?.urgent).toEqual({ type: 'noul', noul: 0.97 })
  })
})

describe('confidentChoice', () => {
  const allowed = ['apply', 'chat'] as const
  const answer = { type: 'choice', choice: 'apply', probabilities: {}, confidence: 0.8 } as const

  it('기준 이상이면 그 선택지', () => {
    expect(confidentChoice(answer, allowed, 0.75)).toBe('apply')
  })
  it('기준에 못 미치면 null — 부르는 쪽이 기존 경로로 넘긴다', () => {
    expect(confidentChoice(answer, allowed, 0.9)).toBeNull()
  })
  it('답이 없거나 choice 가 아니면 null', () => {
    expect(confidentChoice(undefined, allowed, 0.5)).toBeNull()
    expect(confidentChoice({ type: 'noul', noul: 0.99 }, allowed, 0.5)).toBeNull()
  })
})
