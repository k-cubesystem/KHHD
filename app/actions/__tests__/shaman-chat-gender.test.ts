/**
 * 속풀이 성별 — 두 입력 경로(서버 액션 · SSE 파이프라인)의 계약.
 *
 * 🔴 2026-09-29: DB 값은 'male'/'female' 인데 'M'/'남성' 과 비교해 모든 회원이 여성으로 계산됐다
 *    (남성은 대운 순행·역행이 뒤집히고, 글에는 'male'·'미상' 이 그대로 찍혔다).
 *
 * 못 박는 것:
 *  1. 남성 본인·남성 가족 → 엔진에 gender 'male', 지시문에 '성별: 남성'.
 *  2. 대운이 남성 기준으로 계산돼 지시문에 실린다.
 *  3. 옛 표기('M')도 남성으로 읽는다.
 *  4. 미상 → 엔진은 기본값(ENGINE_GENDER_WHEN_UNKNOWN)으로 계산하되 글에는 '미상' + 대운 보류 고지.
 *  5. 생년월일이 없어 폴백 지시문으로 가도 '성별: 남성'.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { calculateDaeun } from '@/lib/domain/saju/saju'
import { ENGINE_GENDER_WHEN_UNKNOWN } from '@/lib/domain/saju/gender'

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
jest.mock('@/lib/saju-engine/master-prompt-builder', () => {
  const actual = jest.requireActual<typeof import('@/lib/saju-engine/master-prompt-builder')>(
    '@/lib/saju-engine/master-prompt-builder'
  )
  return { ...actual, buildMasterPromptForAction: jest.fn(actual.buildMasterPromptForAction) }
})

import { sendShamanChatMessage } from '../ai/shaman-chat'
import { prepareShamanChat } from '@/lib/services/shaman-chat-pipeline'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGenAI = GoogleGenerativeAI as unknown as jest.Mock
const mockBuild = buildMasterPromptForAction as jest.MockedFunction<typeof buildMasterPromptForAction>

const QUESTION = '올해 재물운이 궁금해요'
const FAMILY_ID = 'fm-1'
const SELF_BIRTH = { birth_date: '1990-05-15', birth_time: '14:30', calendar_type: 'solar' }

const rpc = jest.fn()
const sendMessage = jest.fn()
let lastSystemInstruction = ''
let rows: Record<string, unknown> = {}

const CREDITS = {
  purchased_credits: 3,
  expires_at: null,
  onboarding_credits: 0,
  onboarding_granted_at: '2026-01-01T00:00:00Z',
}

function tableChain(table: string) {
  const result = { data: rows[table] ?? null, error: null }
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is', 'gt', 'order', 'limit']) chain[method] = () => chain
  chain.maybeSingle = () => Promise.resolve(result)
  chain.single = () => Promise.resolve(result)
  chain.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
  return chain
}

function useRows(target: { profiles?: Record<string, unknown>; family_members?: Record<string, unknown> }) {
  rows = { shaman_question_credits: CREDITS, ...target }
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'
  lastSystemInstruction = ''
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: (table: string) => tableChain(table),
  } as unknown as Awaited<ReturnType<typeof createClient>>)
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

/** 두 경로를 같은 입력으로 돌려 엔진에 넘긴 대상 정보와 최종 지시문을 모은다. */
const PATHS = {
  '서버 액션': async (familyMemberId?: string) => {
    const result = await sendShamanChatMessage(QUESTION, [], 0, familyMemberId)
    if (!result.success) throw new Error(`정상 경로여야 한다: ${result.error}`)
    return lastSystemInstruction
  },
  'SSE 파이프라인': async (familyMemberId?: string) => {
    const prep = await prepareShamanChat(QUESTION, [], familyMemberId)
    if (!prep.ok) throw new Error('정상 경로여야 한다')
    return prep.prepared.systemInstruction
  },
} as const

function enginePerson() {
  expect(mockBuild).toHaveBeenCalledTimes(1)
  return mockBuild.mock.calls[0][0]
}

/** context-builder 대운 줄의 첫 항목 — 성별에 따라 기운 나이·간지가 달라진다. */
function firstDaeunMarker(gender: 'M' | 'F'): string {
  const [first] = calculateDaeun(SELF_BIRTH.birth_date, SELF_BIRTH.birth_time, gender, true)
  const birthYear = Number(SELF_BIRTH.birth_date.slice(0, 4))
  return `${first.age}~${first.age + 9}세(${birthYear + first.age}~${birthYear + first.age + 9}년):${first.ganji}(`
}

describe.each(Object.entries(PATHS))('%s', (_name, run) => {
  it('🔴 남성 본인 → 엔진 male · 지시문 «성별: 남성» · 대운도 남성 기준', async () => {
    useRows({ profiles: { full_name: '홍길동', gender: 'male', ...SELF_BIRTH } })

    const instruction = await run()

    expect(enginePerson()).toEqual(expect.objectContaining({ gender: 'male', genderUnknown: false }))
    expect(instruction).toContain('성별: 남성')
    expect(instruction).not.toContain('성별: 여성')
    expect(firstDaeunMarker('M')).not.toBe(firstDaeunMarker('F'))
    expect(instruction).toContain(firstDaeunMarker('M'))
    expect(instruction).not.toContain(firstDaeunMarker('F'))
  })

  it('🔴 남성 가족 → 엔진 male · 지시문 «성별: 남성»', async () => {
    useRows({
      family_members: {
        name: '홍아들',
        gender: 'male',
        birth_date: '2015-03-10',
        birth_time: null,
        calendar_type: 'solar',
      },
    })

    const instruction = await run(FAMILY_ID)

    expect(enginePerson()).toEqual(expect.objectContaining({ name: '홍아들', gender: 'male', genderUnknown: false }))
    expect(instruction).toContain('성별: 남성')
  })

  it('옛 표기 «M» 가족도 남성으로 읽는다', async () => {
    useRows({
      family_members: {
        name: '홍아들',
        gender: 'M',
        birth_date: '2015-03-10',
        birth_time: null,
        calendar_type: 'solar',
      },
    })

    await run(FAMILY_ID)

    expect(enginePerson()).toEqual(expect.objectContaining({ gender: 'male', genderUnknown: false }))
  })

  it('여성 본인 → 엔진 female · 지시문 «성별: 여성»', async () => {
    useRows({ profiles: { full_name: '김영희', gender: 'female', ...SELF_BIRTH } })

    const instruction = await run()

    expect(enginePerson()).toEqual(expect.objectContaining({ gender: 'female', genderUnknown: false }))
    expect(instruction).toContain('성별: 여성')
  })

  it('미상 → 엔진은 기본값으로 계산하되 글에는 «미상» + 대운 보류 고지', async () => {
    useRows({ profiles: { full_name: '홍길동', gender: null, ...SELF_BIRTH } })

    const instruction = await run()

    expect(enginePerson()).toEqual(expect.objectContaining({ gender: ENGINE_GENDER_WHEN_UNKNOWN, genderUnknown: true }))
    expect(instruction).toContain('성별: 미상')
    expect(instruction).toContain('[성별 미상]')
  })

  it('생년월일이 없어 폴백 지시문으로 가도 «성별: 남성»', async () => {
    useRows({
      profiles: { full_name: '홍길동', gender: 'male', birth_date: null, birth_time: null, calendar_type: 'solar' },
    })

    const instruction = await run()

    expect(mockBuild).not.toHaveBeenCalled()
    expect(instruction).toContain('성별: 남성')
  })
})
