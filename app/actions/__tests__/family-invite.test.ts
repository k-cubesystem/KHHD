/**
 * 가족 초대 서버 액션의 보안 게이트 검증.
 *
 * 핵심 계약 — 아래 중 하나라도 걸리면 **RPC 에 닿기 전에** 끊긴다:
 *   로그인 · rate limit · 멤버십 · 토큰 형식 · 자기 자신 초대 수락.
 * 그리고 RPC 가 돌려준 거절 사유(USED/LIMIT/EXPIRED…)는 그대로 화면 사유로 흘러야 한다.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { getCurrentUserMembership, type ActiveMembership } from '@/lib/auth/subscription'
import { resolveRelationshipLimit } from '@/lib/domain/family/invite-repository'
import { generateInviteToken, hashInviteToken } from '@/lib/domain/family/invite-token'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn(), rateLimitByIp: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getCurrentUserMembership: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/domain/family/invite-repository', () => ({
  resolveRelationshipLimit: jest.fn(),
}))
jest.mock('@/lib/utils/site-url', () => ({ getSiteUrl: () => 'https://k-haehwadang.com' }))

import { acceptFamilyInviteLink, createFamilyInviteLink, revokeFamilyInviteLink } from '../family-invite'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockMembership = getCurrentUserMembership as jest.MockedFunction<typeof getCurrentUserMembership>
const mockLimit = resolveRelationshipLimit as jest.MockedFunction<typeof resolveRelationshipLimit>

const INVITER = '11111111-1111-4111-8111-111111111111'
const ACCEPTER = '22222222-2222-4222-8222-222222222222'
const MEMBER = '33333333-3333-4333-8333-333333333333'
const INVITE = '44444444-4444-4444-8444-444444444444'

/** admin.rpc 호출 기록 — 「RPC 에 닿기 전에 끊겼는가」를 이걸로 판정한다. */
const rpc = jest.fn()
/** family_invites 조회(수락 전 초대자 확인)가 돌려줄 행. */
let inviteLookup: { data: unknown; error: null | { message: string } } = { data: null, error: null }

function allowRate() {
  mockRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 })
}

function blockRate() {
  mockRateLimit.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60_000 })
}

function membership(): ActiveMembership {
  return { tier: 'FAMILY', planId: 'plan-1', status: 'ACTIVE', currentPeriodEnd: null, isMaster: false }
}

function supabaseStub(user: { id: string } | null) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

function adminStub() {
  return {
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(inviteLookup),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof createAdminClient>
}

beforeEach(() => {
  jest.clearAllMocks()
  allowRate()
  mockMembership.mockResolvedValue(membership())
  mockLimit.mockResolvedValue(3)
  mockCreateClient.mockResolvedValue(supabaseStub({ id: INVITER }))
  mockCreateAdminClient.mockReturnValue(adminStub())
  inviteLookup = { data: { inviter_id: INVITER }, error: null }
  rpc.mockResolvedValue({ data: [{ ok: true, reason: null, invite_id: INVITE }], error: null })
})

describe('초대 발급 — createFamilyInviteLink', () => {
  it('미로그인은 RPC 에 닿지 않는다', async () => {
    mockCreateClient.mockResolvedValue(supabaseStub(null))

    const result = await createFamilyInviteLink(MEMBER)

    expect(result).toEqual({ ok: false, reason: 'UNAUTHENTICATED' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('uuid 가 아닌 memberId 는 조회 전에 끊는다', async () => {
    const result = await createFamilyInviteLink('not-a-uuid')

    expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' })
    expect(rpc).not.toHaveBeenCalled()
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  it('rate limit 을 넘으면 멤버십 조회도 하지 않는다', async () => {
    blockRate()

    const result = await createFamilyInviteLink(MEMBER)

    expect(result).toEqual({ ok: false, reason: 'RATE_LIMIT' })
    expect(mockMembership).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('멤버십이 없으면 발급하지 않는다(UI 게이트는 우회 가능하므로 여기가 방어선)', async () => {
    mockMembership.mockResolvedValue(null)

    const result = await createFamilyInviteLink(MEMBER)

    expect(result).toEqual({ ok: false, reason: 'NO_MEMBERSHIP' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('성공하면 원문 토큰이 실린 링크를 돌려주고, DB 에는 해시만 넘긴다', async () => {
    const result = await createFamilyInviteLink(MEMBER)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')

    const token = result.data.url.split('/invite/family/')[1]
    expect(token).toHaveLength(43)

    const args = rpc.mock.calls[0][1] as Record<string, unknown>
    expect(args.p_token_hash).toBe(hashInviteToken(token))
    expect(args.p_token_hash).not.toBe(token)
    expect(String(args.p_token_hash)).toHaveLength(64)
    expect(args.p_inviter).toBe(INVITER)
  })

  it('만료 시각으로 72시간 뒤를 넘긴다', async () => {
    const before = Date.now()
    const result = await createFamilyInviteLink(MEMBER)
    const after = Date.now()

    expect(result.ok).toBe(true)
    const args = rpc.mock.calls[0][1] as Record<string, unknown>
    const expires = Date.parse(String(args.p_expires_at))
    expect(expires).toBeGreaterThanOrEqual(before + 72 * 3600_000)
    expect(expires).toBeLessThanOrEqual(after + 72 * 3600_000)
  })

  it('초대자 등급의 인연 한도를 그대로 RPC 에 실어 보낸다', async () => {
    mockLimit.mockResolvedValue(6)

    await createFamilyInviteLink(MEMBER)

    const args = rpc.mock.calls[0][1] as Record<string, unknown>
    expect(mockLimit).toHaveBeenCalledWith(INVITER)
    expect(args.p_max_linked).toBe(6)
  })

  it('한도가 찼다는 RPC 응답은 LIMIT 사유로 전달된다', async () => {
    rpc.mockResolvedValue({ data: [{ ok: false, reason: 'LIMIT', invite_id: null }], error: null })

    expect(await createFamilyInviteLink(MEMBER)).toEqual({ ok: false, reason: 'LIMIT' })
  })

  it('남의 가족 자리로 발급하려 하면 RPC 가 FORBIDDEN 을 돌려준다', async () => {
    rpc.mockResolvedValue({ data: [{ ok: false, reason: 'FORBIDDEN', invite_id: null }], error: null })

    expect(await createFamilyInviteLink(MEMBER)).toEqual({ ok: false, reason: 'FORBIDDEN' })
  })

  it('RPC 가 모르는 사유를 뱉어도 ERROR 로 눕는다', async () => {
    rpc.mockResolvedValue({ data: [{ ok: false, reason: 'SOMETHING_NEW', invite_id: null }], error: null })

    expect(await createFamilyInviteLink(MEMBER)).toEqual({ ok: false, reason: 'ERROR' })
  })
})

describe('초대 취소 — revokeFamilyInviteLink', () => {
  it('미로그인은 RPC 에 닿지 않는다', async () => {
    mockCreateClient.mockResolvedValue(supabaseStub(null))

    expect(await revokeFamilyInviteLink(INVITE)).toEqual({ ok: false, reason: 'UNAUTHENTICATED' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('언제나 자기 id 를 함께 넘긴다 — 남의 초대는 RPC 가 0행으로 거른다', async () => {
    rpc.mockResolvedValue({ data: true, error: null })

    expect(await revokeFamilyInviteLink(INVITE)).toEqual({ ok: true, data: null })
    expect(rpc).toHaveBeenCalledWith('revoke_family_invite', { p_inviter: INVITER, p_invite_id: INVITE })
  })

  it('0행(남의 초대·이미 처리됨)이면 FORBIDDEN', async () => {
    rpc.mockResolvedValue({ data: false, error: null })

    expect(await revokeFamilyInviteLink(INVITE)).toEqual({ ok: false, reason: 'FORBIDDEN' })
  })
})

describe('초대 수락 — acceptFamilyInviteLink', () => {
  const token = generateInviteToken()

  beforeEach(() => {
    mockCreateClient.mockResolvedValue(supabaseStub({ id: ACCEPTER }))
    rpc.mockResolvedValue({
      data: [{ ok: true, reason: null, inviter: INVITER, member_id: MEMBER, member_name: '어머니' }],
      error: null,
    })
  })

  it('미로그인은 수락할 수 없다', async () => {
    mockCreateClient.mockResolvedValue(supabaseStub(null))

    expect(await acceptFamilyInviteLink(token)).toEqual({ ok: false, reason: 'UNAUTHENTICATED' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    ['짧은 토큰', 'abc'],
    ['빈 문자열', ''],
    ['숫자', 123],
    ['null', null],
  ])('형식이 어긋난 토큰(%s)은 DB 를 두드리기 전에 끊는다', async (_label, value) => {
    expect(await acceptFamilyInviteLink(value)).toEqual({ ok: false, reason: 'INVALID_TOKEN' })
    expect(mockRateLimit).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rate limit 을 넘으면 초대 조회조차 하지 않는다', async () => {
    blockRate()

    expect(await acceptFamilyInviteLink(token)).toEqual({ ok: false, reason: 'RATE_LIMIT' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('자기 자신이 만든 초대는 수락할 수 없다 — RPC 에 닿기 전에 끊는다', async () => {
    mockCreateClient.mockResolvedValue(supabaseStub({ id: INVITER }))
    inviteLookup = { data: { inviter_id: INVITER }, error: null }

    expect(await acceptFamilyInviteLink(token)).toEqual({ ok: false, reason: 'SELF' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('없는 토큰은 NOT_FOUND', async () => {
    inviteLookup = { data: null, error: null }

    expect(await acceptFamilyInviteLink(token)).toEqual({ ok: false, reason: 'NOT_FOUND' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('토큰 원문이 아니라 해시로 조회·수락한다', async () => {
    await acceptFamilyInviteLink(token)

    const args = rpc.mock.calls[0][1] as Record<string, unknown>
    expect(args.p_token_hash).toBe(hashInviteToken(token))
    expect(args.p_token_hash).not.toBe(token)
    expect(args.p_accepter).toBe(ACCEPTER)
  })

  it('한도는 **초대자** 기준으로 계산해 넘긴다(수락자 등급이 아니다)', async () => {
    mockLimit.mockResolvedValue(10)

    await acceptFamilyInviteLink(token)

    expect(mockLimit).toHaveBeenCalledWith(INVITER)
    expect(mockLimit).not.toHaveBeenCalledWith(ACCEPTER)
    expect((rpc.mock.calls[0][1] as Record<string, unknown>).p_max_linked).toBe(10)
  })

  it.each([
    ['이미 쓴 토큰', 'USED'],
    ['취소된 초대', 'REVOKED'],
    ['만료된 초대', 'EXPIRED'],
    ['한도 초과', 'LIMIT'],
    ['이미 다른 계정이 붙은 자리', 'ALREADY_LINKED'],
    ['이미 그 가족에 속한 계정', 'ALREADY_MEMBER'],
  ])('%s 는 RPC 사유(%s)가 그대로 전달된다', async (_label, reason) => {
    rpc.mockResolvedValue({ data: [{ ok: false, reason }], error: null })

    expect(await acceptFamilyInviteLink(token)).toEqual({ ok: false, reason })
  })

  it('성공하면 연결된 자리 이름을 돌려준다', async () => {
    const result = await acceptFamilyInviteLink(token)

    expect(result).toEqual({ ok: true, data: { memberName: '어머니', memberId: MEMBER } })
  })

  it('RPC 오류는 ERROR 로 감싼다 — 내부 메시지를 화면에 흘리지 않는다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied for relation family_invites' } })

    expect(await acceptFamilyInviteLink(token)).toEqual({ ok: false, reason: 'ERROR' })
  })
})
