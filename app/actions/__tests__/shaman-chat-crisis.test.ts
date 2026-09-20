/**
 * 속풀이 위기 신호 — 두 입력 경로(서버 액션 · SSE 파이프라인)의 계약.
 *
 * 못 박는 것:
 *  1. crisis 면 질문권 RPC 도 모델도 부르지 않고 고정 안내를 돌려준다.
 *  2. 로그인하지 않은 요청에는 안내도 나가지 않는다(인증·레이트리밋 뒤에서 본다).
 *  3. concern 이면 평소처럼 차감·응답하되 안전 지침이 시스템 지시문의 «맨 뒤»에 얹히고, 답 끝에 안내 한 줄이 붙는다.
 *  4. 건수 기록에는 등급·규칙 라벨·경로만 넘어간다 — 원문이 인자로 새지 않는다.
 *
 * 🔴 두 경로는 의도된 중복이다(파이프라인 파일 머리말) — 한쪽만 고쳐지면 이 파일이 잡는다.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordChatSafetyEvent } from '@/lib/services/chat-safety'
import { CHAT_SAFETY_INSTRUCTION, CONCERN_FOOTER, CRISIS_REPLY } from '@/lib/domain/chat/crisis'

jest.mock('next/server', () => ({ after: jest.fn() }))
jest.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/supabase/helpers', () => ({ getUserRole: jest.fn().mockResolvedValue('user') }))
jest.mock('@/lib/services/feature-charge', () => ({ chargeFeature: jest.fn() }))
jest.mock('@/lib/services/chat-safety', () => ({ recordChatSafetyEvent: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getActiveMembership: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue({ success: true }) }))
jest.mock('@/lib/ai/memory', () => ({
  recallMemories: jest.fn().mockResolvedValue(''),
  recallMemoryList: jest.fn(),
  extractAndSaveMemories: jest.fn(),
}))
jest.mock('@/lib/ai/summarizer', () => ({ maybeSummarizeSession: jest.fn() }))
jest.mock('@/app/actions/shrine/scene', () => ({ getSceneData: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/services/deity-bond', () => ({ awardDeityBondForUser: jest.fn() }))
jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/supabase/invoke-edge', () => ({ invokeEdgeSafe: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn(), info: jest.fn() },
}))

import { sendShamanChatMessage } from '../ai/shaman-chat'
import { finalizeShamanChat, prepareShamanChat, type PreparedChat } from '@/lib/services/shaman-chat-pipeline'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRecord = recordChatSafetyEvent as jest.MockedFunction<typeof recordChatSafetyEvent>
const mockGenAI = GoogleGenerativeAI as unknown as jest.Mock

const CRISIS_TEXT = '요즘 너무 힘들어서 죽고 싶어요'
const CONCERN_TEXT = '사는 게 의미가 없어요'
const PLAIN_TEXT = '올해 재물운이 궁금해요'

const rpc = jest.fn()
const sendMessage = jest.fn()
let lastSystemInstruction = ''

const ROWS: Record<string, unknown> = {
  shaman_question_credits: {
    purchased_credits: 3,
    expires_at: null,
    onboarding_credits: 0,
    onboarding_granted_at: '2026-01-01T00:00:00Z',
  },
  profiles: { full_name: '홍길동', gender: null, birth_date: null, birth_time: null, calendar_type: 'solar' },
}

/** 어떤 질의가 와도 받아 주는 체인 — 단건은 표의 행, 목록은 빈 배열. */
function tableChain(table: string) {
  const result = { data: ROWS[table] ?? null, error: null }
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is', 'gt', 'order', 'limit']) chain[method] = () => chain
  chain.maybeSingle = () => Promise.resolve(result)
  chain.single = () => Promise.resolve(result)
  chain.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
  return chain
}

function useUser(user: { id: string } | null) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: (table: string) => tableChain(table),
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  lastSystemInstruction = ''
  useUser({ id: 'user-1' })
  rpc.mockResolvedValue({ data: 2, error: null })
  mockAdmin.mockReturnValue({ rpc } as unknown as ReturnType<typeof createAdminClient>)
  sendMessage.mockResolvedValue({ response: { text: () => '올해는 흐름이 차분합니다.', usageMetadata: {} } })
  mockGenAI.mockImplementation(() => ({
    getGenerativeModel: (config: { systemInstruction?: string }) => {
      lastSystemInstruction = config.systemInstruction ?? ''
      return { startChat: () => ({ sendMessage }) }
    },
  }))
})

function expectNoTextLeaked() {
  for (const call of mockRecord.mock.calls) {
    expect(JSON.stringify(call)).not.toContain('죽고')
    expect(JSON.stringify(call)).not.toContain('의미가')
  }
}

describe('서버 액션 sendShamanChatMessage', () => {
  it('🔴 crisis — 질문권도 모델도 건드리지 않고 고정 안내를 돌려준다', async () => {
    const result = await sendShamanChatMessage(CRISIS_TEXT, [], 0)

    expect(result).toEqual({
      success: true,
      response: CRISIS_REPLY,
      suggestedQuestions: [],
      emotion: 'neutral',
      safety: 'crisis',
    })
    expect(rpc).not.toHaveBeenCalled()
    expect(mockGenAI).not.toHaveBeenCalled()
    expect(mockRecord).toHaveBeenCalledWith({ level: 'crisis', reason: 'desire' }, 'action')
    expectNoTextLeaked()
  })

  it('로그인하지 않았으면 안내도 나가지 않는다', async () => {
    useUser(null)
    const result = await sendShamanChatMessage(CRISIS_TEXT, [], 0)

    expect(result).toEqual({ success: false, error: '로그인 필요' })
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('concern — 평소처럼 차감·응답하고, 안전 지침이 맨 뒤에 · 안내 한 줄이 답 끝에 붙는다', async () => {
    const result = await sendShamanChatMessage(CONCERN_TEXT, [], 0)

    expect(result.success).toBe(true)
    expect(result.safety).toBe('concern')
    expect(result.response).toBe(`올해는 흐름이 차분합니다.\n\n${CONCERN_FOOTER}`)
    expect(rpc).toHaveBeenCalledWith('consume_shaman_credit', { p_user_id: 'user-1' })
    expect(lastSystemInstruction.endsWith(CHAT_SAFETY_INSTRUCTION)).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith({ level: 'concern', reason: 'weariness' }, 'action')
    expectNoTextLeaked()
  })

  it('평범한 질문은 아무것도 달라지지 않는다', async () => {
    const result = await sendShamanChatMessage(PLAIN_TEXT, [], 0)

    expect(result.response).toBe('올해는 흐름이 차분합니다.')
    expect(result.safety).toBeUndefined()
    expect(lastSystemInstruction).not.toContain(CHAT_SAFETY_INSTRUCTION)
  })

  it('직전 대화에 위기 신호가 있었다면 다음 질문도 안전 지침과 안내를 받는다', async () => {
    const history = [
      { role: 'user' as const, content: CRISIS_TEXT, timestamp: '' },
      { role: 'assistant' as const, content: CRISIS_REPLY, timestamp: '' },
    ]
    const result = await sendShamanChatMessage('그래도 사주나 봐 주세요', history, 1)

    expect(result.safety).toBe('concern')
    expect(lastSystemInstruction.endsWith(CHAT_SAFETY_INSTRUCTION)).toBe(true)
    expect(mockRecord).toHaveBeenCalledWith({ level: 'concern', reason: 'history' }, 'action')
  })
})

describe('SSE 파이프라인 prepareShamanChat · finalizeShamanChat', () => {
  it('🔴 crisis — 차감 없이 crisis 로 끊는다', async () => {
    const prep = await prepareShamanChat(CRISIS_TEXT, [])

    expect(prep).toEqual({ ok: false, crisis: true })
    expect(rpc).not.toHaveBeenCalled()
    expect(mockRecord).toHaveBeenCalledWith({ level: 'crisis', reason: 'desire' }, 'stream')
    expectNoTextLeaked()
  })

  it('로그인하지 않았으면 crisis 판정까지 가지 않는다', async () => {
    useUser(null)
    expect(await prepareShamanChat(CRISIS_TEXT, [])).toEqual({ ok: false, error: '로그인 필요' })
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('concern — 차감하고, 안전 지침을 맨 뒤에 얹어 넘긴다', async () => {
    const prep = await prepareShamanChat(CONCERN_TEXT, [])

    if (!prep.ok) throw new Error('concern 은 정상 경로여야 한다')
    expect(prep.prepared.safety).toBe('concern')
    expect(prep.prepared.consumedFrom).toBe('purchased')
    expect(prep.prepared.systemInstruction.endsWith(CHAT_SAFETY_INSTRUCTION)).toBe(true)
  })

  it('평범한 질문에는 안전 지침이 실리지 않는다', async () => {
    const prep = await prepareShamanChat(PLAIN_TEXT, [])

    if (!prep.ok) throw new Error('정상 경로여야 한다')
    expect(prep.prepared.safety).toBe('none')
    expect(prep.prepared.systemInstruction).not.toContain(CHAT_SAFETY_INSTRUCTION)
  })

  it('정본(done.full)에도 안내 한 줄이 붙는다 — 스트림으로 흘린 본문과 저장본이 어긋나지 않게', async () => {
    const base = {
      userId: 'user-1',
      deityCode: null,
      bondDeityId: null,
      familyMemberId: null,
      consumedFrom: 'purchased',
      records: { saju: false, face: false, hand: false },
      status: { onboardingCredits: 0, memberWeeklyRemaining: 0, adCredits: 0, purchasedCredits: 3 },
    } as unknown as PreparedChat

    const concern = await finalizeShamanChat({ ...base, safety: 'concern' }, '차분한 흐름입니다.')
    const plain = await finalizeShamanChat({ ...base, safety: 'none' }, '차분한 흐름입니다.')

    expect(concern.responseText).toBe(`차분한 흐름입니다.\n\n${CONCERN_FOOTER}`)
    expect(plain.responseText).toBe('차분한 흐름입니다.')
  })
})
