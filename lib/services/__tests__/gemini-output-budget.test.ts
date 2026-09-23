/**
 * 🔴 Gemini 3.x **출력 예산** 게이트.
 *
 * ## 왜 이 게이트가 필요한가
 * `maxOutputTokens` 는 «본문 한도»가 아니라 **«생각 토큰 + 본문»의 합**이다. gemini-3.8-flash 는 생각이
 * 기본으로 켜져 있고 우리는 그것을 끄지 않으므로, 한도가 작으면 생각이 한도를 먹고
 * **본문이 잘린 채** 돌아온다. 오류가 아니라 «짧은 답»으로 오기 때문에 아무도 모른다 —
 * 실제로 대화 요약(한도 400)은 **13자짜리 요약**을 DB 에 써 넣고 있었다(2026-09-23 실측).
 *
 * 그래서 숫자 하나를 못 박는다: `GEMINI_OUTPUT_TOKENS_FLOOR`. 새 호출이 그 아래로 내려가면 여기서 막힌다.
 * (3.x 가 아닌 «생각 없는» 모델로 갈아타면 이 게이트의 전제가 사라진다 — 첫 번째 테스트가 그것을 지킨다.)
 */
import { sourceFiles } from '../../../test/source-scan'
import { GEMINI_FLASH, GEMINI_OUTPUT_TOKENS_FLOOR, GEMINI_PRO } from '@/lib/config/ai-models'

jest.mock('@google/generative-ai', () => {
  const generateContent = jest.fn()
  const getGenerativeModel = jest.fn(() => ({ generateContent }))
  return {
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel })),
    FinishReason: { STOP: 'STOP', MAX_TOKENS: 'MAX_TOKENS' },
    __testMocks: { generateContent, getGenerativeModel },
  }
})
jest.mock('@/lib/services/claude-client', () => ({ generateWithClaude: jest.fn() }))
jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn(async () => undefined) }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { generateAIContent } from '@/lib/services/ai-client'

const { generateContent: mockGenerateContent, getGenerativeModel: mockGetGenerativeModel } = (
  jest.requireMock('@google/generative-ai') as {
    __testMocks: { generateContent: jest.Mock; getGenerativeModel: jest.Mock }
  }
).__testMocks
const { logger: mockLogger } = jest.requireMock('@/lib/utils/logger') as { logger: { warn: jest.Mock } }

const SOURCES = sourceFiles()

interface Cap {
  where: string
  value: number
}

/**
 * `generateAIContent({ … })` 한 덩이 안의 **숫자 리터럴** maxTokens.
 * 상수 참조(`GEMINI_OUTPUT_TOKENS_FLOOR`·`request.maxTokens`)는 숫자가 아니므로 잡히지 않는다 —
 * 그쪽은 상수의 정의가, 또는 그 도메인의 테스트가 진다.
 */
function literalCaps(): Cap[] {
  const found: Cap[] = []
  for (const { file, src } of SOURCES) {
    for (const call of src.matchAll(/generateAIContent\(\{[\s\S]*?\n\s*\}\)/g)) {
      const hit = call[0].match(/maxTokens:\s*(\d+)/)
      if (hit) found.push({ where: file, value: Number(hit[1]) })
    }
  }
  return found
}

/** SDK·REST 를 직접 부르는 자리(ai-client 를 거치지 않는 경로)의 숫자 리터럴 한도. */
function directCaps(): Cap[] {
  const found: Cap[] = []
  for (const { file, src } of SOURCES) {
    for (const hit of src.matchAll(/maxOutputTokens:\s*(\d+)/g)) {
      found.push({ where: file, value: Number(hit[1]) })
    }
  }
  return found
}

describe('🔴 Gemini 출력 예산 — 한도는 «생각 + 본문»의 합이다', () => {
  it('텍스트 모델이 Gemini 3.x 다 (이 게이트의 전제)', () => {
    expect(GEMINI_PRO).toMatch(/^gemini-3/)
    expect(GEMINI_FLASH).toMatch(/^gemini-3/)
  })

  it('스캐너가 실제 호출부를 본다 — 조용히 0건이 되면 게이트가 아니다', () => {
    const callCount = SOURCES.reduce((n, { src }) => n + [...src.matchAll(/generateAIContent\(\{/g)].length, 0)

    expect(callCount).toBeGreaterThanOrEqual(10)
  })

  it('generateAIContent 호출부의 maxTokens 는 안전선 이상이다', () => {
    const tooSmall = literalCaps().filter((c) => c.value < GEMINI_OUTPUT_TOKENS_FLOOR)

    // 실패하면 그 자리의 답이 «생각에 밀려» 잘린다. 분량은 한도가 아니라 프롬프트로 줄일 것.
    expect(tooSmall.map((c) => `${c.where}: maxTokens ${c.value} < ${GEMINI_OUTPUT_TOKENS_FLOOR}`)).toEqual([])
  })

  it('SDK 를 직접 부르는 자리의 maxOutputTokens 도 안전선 이상이다', () => {
    const tooSmall = directCaps().filter((c) => c.value < GEMINI_OUTPUT_TOKENS_FLOOR)

    expect(tooSmall.map((c) => `${c.where}: maxOutputTokens ${c.value} < ${GEMINI_OUTPUT_TOKENS_FLOOR}`)).toEqual([])
  })
})

describe('🔴 ai-client 의 기본값과 잘림 경보', () => {
  const okResponse = {
    response: {
      text: () => '{}',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 30 },
      candidates: [{ finishReason: 'STOP' }],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('maxTokens 를 안 주면 기본값이 안전선이다', async () => {
    mockGenerateContent.mockResolvedValue(okResponse)

    await generateAIContent({ featureKey: 'daily', userPrompt: '테스트' })

    const params = mockGetGenerativeModel.mock.calls.at(-1)?.[0] as { generationConfig: { maxOutputTokens: number } }
    expect(params.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(GEMINI_OUTPUT_TOKENS_FLOOR)
  })

  it('한도에서 잘리면 경보가 남는다 — 잘림은 예외로 오지 않는다', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '잘린 답',
        usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 10, thoughtsTokenCount: 386 },
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      },
    })

    await generateAIContent({ featureKey: 'shaman-chat', actionType: 'summarizer', userPrompt: '테스트' })

    expect(mockLogger.warn).toHaveBeenCalledTimes(1)
    expect(mockLogger.warn.mock.calls[0][1]).toMatchObject({
      actionType: 'summarizer',
      thoughtsTokenCount: 386,
      candidatesTokenCount: 10,
    })
  })

  it('정상 종료엔 경보가 없다', async () => {
    mockGenerateContent.mockResolvedValue(okResponse)

    await generateAIContent({ featureKey: 'daily', userPrompt: '테스트' })

    expect(mockLogger.warn).not.toHaveBeenCalled()
  })
})
