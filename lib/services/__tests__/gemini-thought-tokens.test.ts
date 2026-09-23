/**
 * 🔴 **생각(thinking) 토큰 원가 계상** 게이트.
 *
 * ## 무엇이 틀려 있었나
 * 생각 토큰은 **출력 단가로 과금**된다 — "Response pricing is the sum of output tokens and thinking
 * tokens"(https://ai.google.dev/gemini-api/docs/pricing · 확인일 2026-09-23). 그런데 응답의
 * `usageMetadata.candidatesTokenCount` 에는 생각이 **없다**. 우리는 그 값만 출력으로 세고 있었으니
 * `gemini_api_logs.estimated_cost_usd` 가 통째로 과소계상됐다 —
 * /admin/analytics 의 원가도, 광고 리워드 일일 예산 브레이커(`ai_daily_budget_usd`)도 그 값을 본다.
 *
 * 2026-09-23 실측: 유료 테마 풀이 한 건에 생각 2,851 + 본문 1,781(생각이 본문의 1.6배),
 * 대화 요약은 생각 386 + 본문 10. 즉 «빠뜨린 쪽»이 더 큰 경우가 흔하다.
 *
 * ## 이 게이트가 지키는 것
 * 1. 생각 토큰이 원가와 `thought_tokens` 칸까지 실제로 흘러간다(ai-client · withGeminiRateLimit).
 * 2. Claude 는 출력 토큰에 생각이 이미 포함돼 오므로 **더하지 않는다**(이중 계상 금지).
 * 3. 새로 생기는 호출부가 `candidatesTokenCount` 만 세고 지나가지 못한다(소스 스캔).
 */
import { sourceFiles, codeLines } from '../../../test/source-scan'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@google/generative-ai', () => {
  const generateContent = jest.fn()
  const getGenerativeModel = jest.fn(() => ({ generateContent }))
  return {
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel })),
    FinishReason: { STOP: 'STOP', MAX_TOKENS: 'MAX_TOKENS' },
    __testMocks: { generateContent },
  }
})
jest.mock('@/lib/services/claude-client', () => ({ generateWithClaude: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { generateWithClaude } from '@/lib/services/claude-client'
import { generateAIContent } from '@/lib/services/ai-client'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { MODEL_FLASH, CLAUDE_SONNET } from '@/lib/config/ai-models'
import { MODEL_PRICING } from '@/lib/domain/gemini/pricing'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockClaude = generateWithClaude as jest.MockedFunction<typeof generateWithClaude>
const { generateContent: mockGenerateContent } = (
  jest.requireMock('@google/generative-ai') as { __testMocks: { generateContent: jest.Mock } }
).__testMocks

interface LogRow {
  input_tokens: number | null
  output_tokens: number | null
  thought_tokens: number | null
  total_tokens: number | null
  estimated_cost_usd: number | null
}

function adminStub() {
  const insert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn(() => ({ insert }))
  const rpc = jest.fn().mockResolvedValue({
    data: { allowed: true, remaining: 5, model: MODEL_FLASH },
    error: null,
  })
  mockCreateAdminClient.mockReturnValue({ from, rpc } as unknown as ReturnType<typeof createAdminClient>)
  return { insert, from, rpc, row: () => insert.mock.calls.at(-1)?.[0] as LogRow }
}

const FLASH = MODEL_PRICING[MODEL_FLASH]
/** 2026-09-23 실측 — 유료 테마 풀이 한 건. */
const REAL = { input: 6000, body: 1781, thought: 2851 }

describe('🔴 생각 토큰이 원가에 들어간다', () => {
  beforeEach(() => jest.clearAllMocks())

  it('ai-client: 생각 토큰이 칸·합계·원가에 모두 반영된다', async () => {
    const stub = adminStub()
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '본문',
        usageMetadata: {
          promptTokenCount: REAL.input,
          candidatesTokenCount: REAL.body,
          thoughtsTokenCount: REAL.thought,
        },
        candidates: [{ finishReason: 'STOP' }],
      },
    })

    await generateAIContent({ featureKey: 'daily', userPrompt: '테스트' })

    expect(stub.from).toHaveBeenCalledWith('gemini_api_logs')
    expect(stub.row()).toMatchObject({
      input_tokens: REAL.input,
      output_tokens: REAL.body,
      thought_tokens: REAL.thought,
      total_tokens: REAL.input + REAL.body + REAL.thought,
    })
    expect(stub.row().estimated_cost_usd).toBeCloseTo(
      (REAL.input * FLASH.input + (REAL.body + REAL.thought) * FLASH.output) / 1_000_000,
      10
    )
  })

  it('생각을 빼면 원가가 절반 아래로 내려간다 — 이 차이가 회귀를 눈에 띄게 한다', async () => {
    const stub = adminStub()
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '본문',
        usageMetadata: {
          promptTokenCount: REAL.input,
          candidatesTokenCount: REAL.body,
          thoughtsTokenCount: REAL.thought,
        },
        candidates: [{ finishReason: 'STOP' }],
      },
    })

    await generateAIContent({ featureKey: 'daily', userPrompt: '테스트' })

    const oldBasis = (REAL.input * FLASH.input + REAL.body * FLASH.output) / 1_000_000
    expect(Number(stub.row().estimated_cost_usd) / oldBasis).toBeGreaterThan(1.5)
  })

  it('생각이 없는 응답은 0 으로 기록된다 — 값이 없다고 집계가 멈추지 않는다', async () => {
    const stub = adminStub()
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '본문',
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
        candidates: [{ finishReason: 'STOP' }],
      },
    })

    await generateAIContent({ featureKey: 'daily', userPrompt: '테스트' })

    expect(stub.row()).toMatchObject({ thought_tokens: 0, total_tokens: 150 })
  })

  it('Claude 는 생각을 더하지 않는다 — output_tokens 에 이미 들어 있어 이중 계상이 된다', async () => {
    const stub = adminStub()
    mockClaude.mockResolvedValue({ text: '본문', inputTokens: 1000, outputTokens: 2000 })

    await generateAIContent({
      featureKey: 'daily',
      userPrompt: '테스트',
      providerOverride: 'claude',
      modelOverride: CLAUDE_SONNET,
    })

    const claude = MODEL_PRICING[CLAUDE_SONNET]
    expect(stub.row().thought_tokens).toBe(0)
    expect(stub.row().estimated_cost_usd).toBeCloseTo((1000 * claude.input + 2000 * claude.output) / 1_000_000, 10)
  })

  it('withGeminiRateLimit(ai-client 를 거치지 않는 경로)도 생각을 읽는다', async () => {
    const stub = adminStub()

    await withGeminiRateLimit(
      async () => ({
        response: { usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 30 } },
      }),
      { model: MODEL_FLASH, actionType: 'deity_oracle' }
    )

    expect(stub.row()).toMatchObject({ output_tokens: 20, thought_tokens: 30, total_tokens: 60 })
  })
})

describe('🔴 새 호출부가 생각을 빠뜨리지 못한다 (소스 스캔)', () => {
  const SOURCES = sourceFiles()

  /** `logUsage({ … })` 한 덩이. 한 줄짜리 호출(토큰이 없는 rate_limited·error 기록)은 대상이 아니다. */
  const usageLogBlocks = SOURCES.flatMap(({ file, src }) =>
    [...src.matchAll(/logUsage\(\{[\s\S]*?\n\s*\}\)/g)].map((m) => ({ file, body: m[0] }))
  )
  const countsBody = usageLogBlocks.filter(({ body }) => body.includes('candidatesTokenCount'))

  /** `candidatesTokenCount` 를 **코드에서** 읽는 파일 — 규칙을 설명하는 주석은 위반이 아니다. */
  const readerFiles = SOURCES.filter(({ src }) => codeLines(src).some((line) => line.includes('candidatesTokenCount')))

  it('스캐너가 실제 호출부를 본다 — 조용히 0건이 되면 게이트가 아니다', () => {
    expect(countsBody.length).toBeGreaterThanOrEqual(3)
    expect(readerFiles.length).toBeGreaterThanOrEqual(5)
  })

  it('본문 토큰을 세는 logUsage 호출부는 생각 토큰도 함께 넘긴다', () => {
    const offenders = countsBody.filter(({ body }) => !body.includes('thoughtTokens')).map(({ file }) => file)

    // 실패하면 그 자리의 원가가 과소계상된다 — thoughtTokens: thoughtTokensOf(usage) 를 함께 넘길 것.
    expect(offenders).toEqual([])
  })

  it('토큰을 변수로 빼내 세는 파일도 생각을 읽는다 — import 만 해 두고 안 쓰는 것은 통과가 아니다', () => {
    const usesHelper = (src: string) =>
      codeLines(src).some((line) => !line.trim().startsWith('import') && line.includes('thoughtTokensOf('))
    const offenders = readerFiles.filter(({ src }) => !usesHelper(src)).map(({ file }) => file)

    expect(offenders).toEqual([])
  })
})
