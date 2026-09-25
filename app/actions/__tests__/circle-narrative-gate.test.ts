/**
 * 기운 풀이(처방전·그룹 지도·함께 보기) 서버 액션 — 등급 게이트와 이용권 순서의 계약.
 *
 * `'use server'` export 는 공개 엔드포인트다. 화면이 업셀로 가려도 서버가 막지 않으면 게이트가 아니다.
 *  ① 비회원은 멤버십 안내로 멈춘다
 *  ② 처방전·그룹 지도 = 패밀리부터 · 함께 보기 = 비즈니스 (lib/domain/payment/membership-tiers)
 *  ③ 캐시 적중은 이용권을 쓰지 않는다 · 이용권은 AI 호출 «앞»에서 쓴다
 */
import { createClient } from '@/lib/supabase/server'
import { getActiveMembership, type ActiveMembership } from '@/lib/auth/subscription'
import { chargeFeature } from '@/lib/services/feature-charge'
import { generateAIContent } from '@/lib/services/ai-client'
import { rateLimit } from '@/lib/utils/rate-limit'
import { getPrescription, getTogetherEnergy } from '@/app/actions/circle/energy'
import { tierUpsellLine } from '@/lib/domain/payment/membership-tiers'
import { NO_PASS_ERROR } from '@/lib/domain/entitlement/pass'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getActiveMembership: jest.fn() }))
jest.mock('@/lib/services/feature-charge', () => ({ chargeFeature: jest.fn() }))
jest.mock('@/lib/services/ai-client', () => ({ generateAIContent: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn(), info: jest.fn() },
}))
jest.mock('@/app/actions/circle/energy', () => ({
  getPrescription: jest.fn(),
  getCircleEnergy: jest.fn(),
  getTogetherEnergy: jest.fn(),
}))
jest.mock('@/lib/domain/circle/narrative', () => ({
  ...jest.requireActual('@/lib/domain/circle/narrative'),
  prescriptionPrompt: jest.fn(() => '처방 프롬프트'),
  prescriptionFingerprint: jest.fn(() => 'fp-prescription'),
  prescriptionNames: jest.fn(() => ['민수']),
  togetherPrompt: jest.fn(() => '함께 프롬프트'),
  togetherFingerprint: jest.fn(() => 'fp-together'),
}))

import { generateNarrative } from '../circle/narrative'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockMembership = getActiveMembership as jest.MockedFunction<typeof getActiveMembership>
const mockCharge = chargeFeature as jest.MockedFunction<typeof chargeFeature>
const mockAI = generateAIContent as jest.MockedFunction<typeof generateAIContent>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockPrescription = getPrescription as jest.MockedFunction<typeof getPrescription>
const mockTogether = getTogetherEnergy as jest.MockedFunction<typeof getTogetherEnergy>

const USER = { id: 'user-1' }
const MATE = '11111111-2222-4333-8444-555555555555'
const TOGETHER_KEY = `self,${MATE}`

function membershipOf(tier: string): ActiveMembership {
  return {
    tier,
    planId: 'plan-1',
    status: 'ACTIVE',
    currentPeriodEnd: null,
    currentPeriodStart: null,
    renews: true,
    isMaster: tier === 'MASTER',
  }
}

/** circle_narratives 캐시 조회 체인 — 어떤 필터를 걸든 같은 결과를 돌려준다. */
function useSupabase(user: { id: string } | null, cacheHit: { body: string; created_at: string } | null = null) {
  const chain: Record<string, jest.Mock> = {}
  for (const method of ['select', 'eq', 'gte', 'order', 'limit']) chain[method] = jest.fn(() => chain)
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: cacheHit })
  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn(() => chain),
  } as unknown as Awaited<ReturnType<typeof createClient>>
  mockCreateClient.mockResolvedValue(client)
}

beforeEach(() => {
  jest.clearAllMocks()
  useSupabase(USER)
  mockRateLimit.mockResolvedValue({ success: true, limit: 6, remaining: 5, reset: Date.now() + 60_000 })
  mockPrescription.mockResolvedValue({ access: 'full', prescription: {} } as Awaited<
    ReturnType<typeof getPrescription>
  >)
  mockTogether.mockResolvedValue({
    circle: { id: 'together', name: '함께', kind: 'family' },
    energy: {
      entries: [
        { targetId: 'self', name: '민수' },
        { targetId: MATE, name: '지영' },
      ],
    },
  } as unknown as Awaited<ReturnType<typeof getTogetherEnergy>>)
  mockCharge.mockResolvedValue({
    ok: false,
    failure: { success: false, error: '이용권이 필요해요.', errorType: NO_PASS_ERROR, requiredUnits: 1 },
  })
})

describe('🔴 등급 게이트 — 서버 액션 입구에서 판정한다', () => {
  it('비회원은 멤버십 안내로 멈추고 이용권·AI 를 건드리지 않는다', async () => {
    mockMembership.mockResolvedValue(null)

    const result = await generateNarrative('prescription', 'self')

    expect(result).toMatchObject({ success: false, errorType: 'MEMBERSHIP' })
    expect(mockCharge).not.toHaveBeenCalled()
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('싱글은 처방전 AI 풀이가 막힌다 — 패밀리부터', async () => {
    mockMembership.mockResolvedValue(membershipOf('SINGLE'))

    const result = await generateNarrative('prescription', 'self')

    expect(result).toEqual({ success: false, error: tierUpsellLine('familyMap'), errorType: 'TIER_REQUIRED' })
    expect(mockPrescription).not.toHaveBeenCalled()
    expect(mockCharge).not.toHaveBeenCalled()
  })

  it('패밀리는 함께 보기가 막힌다 — 비즈니스부터', async () => {
    mockMembership.mockResolvedValue(membershipOf('FAMILY'))

    const result = await generateNarrative('together', TOGETHER_KEY)

    expect(result).toEqual({ success: false, error: tierUpsellLine('togetherView'), errorType: 'TIER_REQUIRED' })
    expect(mockTogether).not.toHaveBeenCalled()
    expect(mockCharge).not.toHaveBeenCalled()
  })

  it('등급 조회가 실패한 회원(MEMBER 폴백)은 처방전을 열지 않는다 (안전 측)', async () => {
    mockMembership.mockResolvedValue(membershipOf('MEMBER'))

    const result = await generateNarrative('prescription', 'self')

    expect(result).toMatchObject({ success: false, errorType: 'TIER_REQUIRED' })
    expect(mockCharge).not.toHaveBeenCalled()
  })

  it('패밀리는 처방전을 연다 — 장 수는 costKey 로 서버가 정한다', async () => {
    mockMembership.mockResolvedValue(membershipOf('FAMILY'))

    await generateNarrative('prescription', 'self')

    expect(mockCharge).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER.id, featureKey: 'circle_narrative', costKey: 'circleNarrative' })
    )
  })

  it('비즈니스·마스터는 함께 보기를 연다', async () => {
    for (const tier of ['BUSINESS', 'MASTER']) {
      mockCharge.mockClear()
      mockMembership.mockResolvedValue(membershipOf(tier))

      await generateNarrative('together', TOGETHER_KEY)

      expect({ tier, calls: mockCharge.mock.calls.length }).toEqual({ tier, calls: 1 })
      expect(mockCharge).toHaveBeenCalledWith(
        expect.objectContaining({ featureKey: 'together_narrative', costKey: 'togetherNarrative' })
      )
    }
  })
})

describe('🔴 이용권 — 캐시 뒤, AI 앞', () => {
  beforeEach(() => {
    mockMembership.mockResolvedValue(membershipOf('FAMILY'))
  })

  it('같은 입력의 풀이가 있으면 이용권을 쓰지 않고 저장본을 돌려준다', async () => {
    useSupabase(USER, { body: '저장된 풀이', created_at: '2026-09-10T00:00:00.000Z' })

    const result = await generateNarrative('prescription', 'self')

    expect(result).toEqual({ success: true, text: '저장된 풀이', cached: true, createdAt: '2026-09-10T00:00:00.000Z' })
    expect(mockCharge).not.toHaveBeenCalled()
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('이용권이 모자라면 AI 를 부르지 않고 실패 응답을 그대로 넘긴다', async () => {
    const result = await generateNarrative('prescription', 'self')

    expect(result).toEqual({ success: false, error: '이용권이 필요해요.', errorType: NO_PASS_ERROR, requiredUnits: 1 })
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('AI 가 실패하면 쓴 이용권을 되돌린다', async () => {
    const refund = jest.fn<Promise<void>, []>().mockResolvedValue(undefined)
    mockCharge.mockResolvedValue({ ok: true, refundOnFailure: refund })
    mockAI.mockRejectedValue(new Error('gemini 500'))

    const result = await generateNarrative('prescription', 'self')

    expect(result).toMatchObject({ success: false, errorType: 'AI_FAILED' })
    expect(refund).toHaveBeenCalledTimes(1)
  })
})
