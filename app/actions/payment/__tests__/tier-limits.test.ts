/**
 * 등급 한도(인연·기록 보관)는 이용권 월 몫·등급 기능과 **같은 멤버십 판정**을 쓴다.
 *
 * 원결함: getUserTierLimits 가 subscriptions 를 status='ACTIVE' 로만 읽었다. «기간 끝 해지»를 누르면
 * 결제 기간이 남았는데도 즉시 무료 한도(보관 5개)로 떨어졌고, 다음 기록 저장 때 history.ts 의 자동 정리가
 * 오래된 기록을 지웠다. 같은 사람에게 이용권 월 몫과 등급 기능은 그대로 열려 있었다(판정이 둘로 갈라짐).
 */
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/helpers'
import { getActiveMembership, type ActiveMembership } from '@/lib/auth/subscription'
import { FREE_TIER_LIMITS } from '@/lib/domain/payment/membership-benefits'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/helpers', () => ({ getUserRole: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getActiveMembership: jest.fn() }))

import { getUserLimitsSummary, getUserTierLimits } from '../membership'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGetUserRole = getUserRole as jest.MockedFunction<typeof getUserRole>
const mockGetActiveMembership = getActiveMembership as jest.MockedFunction<typeof getActiveMembership>

const FAMILY_PLAN = { tier: 'FAMILY', relationship_limit: 15, storage_limit: 50 }

function membership(overrides: Partial<ActiveMembership> = {}): ActiveMembership {
  return {
    tier: 'FAMILY',
    planId: 'plan-family',
    status: 'ACTIVE',
    currentPeriodEnd: '2026-10-18T00:00:00.000Z',
    currentPeriodStart: '2026-09-18T00:00:00.000Z',
    isMaster: false,
    ...overrides,
  }
}

function sessionStub(plan: unknown = FAMILY_PLAN) {
  const tables: string[] = []
  const from = jest.fn((table: string) => {
    tables.push(table)
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq']) builder[method] = () => builder
    builder.maybeSingle = () => Promise.resolve({ data: plan, error: null })
    builder.then = (resolve: (value: { count: number; error: null }) => unknown) =>
      Promise.resolve({ count: 2, error: null }).then(resolve)
    return builder
  })
  mockCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  return { tables }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUserRole.mockResolvedValue('user')
})

describe('등급 한도 — 멤버십 판정 단일 출처', () => {
  it('🔴 기간 끝 해지(CANCELLED)라도 결제 기간이 남았으면 등급 한도를 유지한다', async () => {
    sessionStub()
    mockGetActiveMembership.mockResolvedValue(membership({ status: 'CANCELLED' }))

    await expect(getUserTierLimits()).resolves.toEqual({
      tier: 'FAMILY',
      relationship_limit: 15,
      storage_limit: 50,
      is_subscribed: true,
    })
  })

  it('멤버십 판정이 없으면(만료·비회원) 무료 한도로 떨어진다', async () => {
    sessionStub()
    mockGetActiveMembership.mockResolvedValue(null)

    await expect(getUserTierLimits()).resolves.toEqual({
      tier: null,
      relationship_limit: FREE_TIER_LIMITS.relationshipLimit,
      storage_limit: FREE_TIER_LIMITS.storageLimit,
      is_subscribed: false,
    })
  })

  it('구독 표를 직접 읽지 않는다 — 판정은 getActiveMembership 한 곳', async () => {
    const { tables } = sessionStub()
    mockGetActiveMembership.mockResolvedValue(membership())

    await getUserTierLimits()

    expect(mockGetActiveMembership).toHaveBeenCalledWith('user-1')
    expect(tables).not.toContain('subscriptions')
  })

  it('마스터는 상한 없음, 검수는 고정 한도', async () => {
    sessionStub()
    mockGetActiveMembership.mockResolvedValue(null)

    mockGetUserRole.mockResolvedValue('admin')
    await expect(getUserTierLimits()).resolves.toMatchObject({ tier: 'MASTER', storage_limit: 999 })

    mockGetUserRole.mockResolvedValue('tester')
    await expect(getUserTierLimits()).resolves.toMatchObject({ tier: 'TESTER', is_subscribed: true })
  })

  it('한도 요약은 등급 판정을 한 번만 한다', async () => {
    sessionStub()
    mockGetActiveMembership.mockResolvedValue(membership())

    const summary = await getUserLimitsSummary()

    expect(mockGetActiveMembership).toHaveBeenCalledTimes(1)
    expect(summary).toMatchObject({
      tier: 'FAMILY',
      is_subscribed: true,
      relationships: { current: 2, limit: 15, remaining: 13 },
      storage: { current: 2, limit: 50, remaining: 48 },
    })
  })
})
