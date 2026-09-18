/**
 * 관리자 이용권 조정의 **동작** — 회원 상세·구독 관리가 함께 쓰는 한 길.
 *
 * 🔴 돈과 같은 조작이다. 이 파일이 지키는 것:
 *  - 잘못된 값은 RPC 에 닿기 전에 막는다(0장·100장 초과·사유 없음·유효기간 범위 밖).
 *  - 보유분보다 많이 회수하지 않는다 — RPC 는 모자라도 있는 만큼 깎고 성공으로 돌려준다.
 *  - 발급은 폼마다 한 번 만든 요청 키를 멱등키로 쓴다 — 두 번 눌러도 한 번만 발급된다.
 *  - 성공한 조정만, 전·후 보유 장수와 함께 감사에 남는다.
 */
jest.mock('server-only', () => ({}))

const mockRpc = jest.fn()
const mockGrantPasses = jest.fn()
const mockLogAdminAction = jest.fn()
let mockGrantRows: Array<{ quantity: number; consumed: number; revoked: number }> = []
let mockGrantError: { message: string } | null = null

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    const query = {
      select: () => query,
      eq: () => query,
      or: () => Promise.resolve({ data: mockGrantRows, error: mockGrantError }),
    }
    return { from: () => query, rpc: (...args: unknown[]) => mockRpc(...args) }
  },
}))
jest.mock('@/lib/services/entitlement', () => ({
  grantPasses: (...args: unknown[]) => mockGrantPasses(...args),
}))
jest.mock('@/lib/admin/audit', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))

import { adjustPassesAsAdmin, ADMIN_PASS_ADJUST_MAX, ADMIN_PASS_VALID_DAYS_MAX } from '../pass-adjust'
import { PASS_VALID_DAYS } from '@/lib/domain/entitlement/pass'

const actor = { authorized: true as const, actorId: 'admin-1', actorEmail: 'admin@example.com' }
const REQUEST_KEY = '0b7c6a52-6f0e-4c1b-9d2a-3f4e5a6b7c8d'
const base = {
  actor,
  targetUserId: 'user-1',
  reason: 'CS 보상',
  requestKey: REQUEST_KEY,
  via: 'user_detail' as const,
}

beforeEach(() => {
  mockRpc.mockReset()
  mockGrantPasses.mockReset()
  mockLogAdminAction.mockReset()
  mockGrantRows = [{ quantity: 5, consumed: 1, revoked: 0 }]
  mockGrantError = null
})

describe('adjustPassesAsAdmin — 입력 검증은 RPC 앞에서', () => {
  it.each([0, Number.NaN, ADMIN_PASS_ADJUST_MAX + 1, -(ADMIN_PASS_ADJUST_MAX + 1)])(
    '조정 장수 %p 는 거절한다',
    async (delta) => {
      const out = await adjustPassesAsAdmin({ ...base, delta })

      expect(out.success).toBe(false)
      expect(mockRpc).not.toHaveBeenCalled()
      expect(mockGrantPasses).not.toHaveBeenCalled()
      expect(mockLogAdminAction).not.toHaveBeenCalled()
    }
  )

  it.each(['', 'short', 'has space in key', 'x'.repeat(65)])(
    '요청 키 %p 는 거절한다 (멱등키 없이 발급 금지)',
    async (requestKey) => {
      const out = await adjustPassesAsAdmin({ ...base, delta: 1, requestKey })

      expect(out.success).toBe(false)
      expect(mockGrantPasses).not.toHaveBeenCalled()
      expect(mockRpc).not.toHaveBeenCalled()
    }
  )

  it('사유가 비면 거절한다', async () => {
    const out = await adjustPassesAsAdmin({ ...base, delta: 1, reason: '   ' })

    expect(out).toEqual({ success: false, error: '조정 사유를 입력하세요.' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it.each([0, 1.5, ADMIN_PASS_VALID_DAYS_MAX + 1])('발급 유효기간 %p 일은 거절한다', async (validDays) => {
    const out = await adjustPassesAsAdmin({ ...base, delta: 1, validDays })

    expect(out.success).toBe(false)
    expect(mockGrantPasses).not.toHaveBeenCalled()
  })

  it('🔴 보유분보다 많이 회수하지 않는다 (덜 깎이고 «성공»으로 남지 않게)', async () => {
    const out = await adjustPassesAsAdmin({ ...base, delta: -5 })

    expect(out.success).toBe(false)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('보유분을 읽지 못하면 조정하지 않는다', async () => {
    mockGrantError = { message: 'boom' }
    const out = await adjustPassesAsAdmin({ ...base, delta: 1 })

    expect(out.success).toBe(false)
    expect(mockGrantPasses).not.toHaveBeenCalled()
  })
})

describe('adjustPassesAsAdmin — 발급·회수', () => {
  it('발급은 기본 유효기간(PASS_VALID_DAYS)·요청 멱등키로 grantPasses 를 부르고 감사에 전·후를 남긴다', async () => {
    mockGrantPasses.mockResolvedValue({ granted: true, reason: 'OK', grantId: 'g-1' })

    const out = await adjustPassesAsAdmin({ ...base, delta: 3 })

    expect(out).toEqual({ success: true, granted: 3, revoked: 0, heldBefore: 4, heldAfter: 7 })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockGrantPasses).toHaveBeenCalledTimes(1)
    expect(mockGrantPasses).toHaveBeenCalledWith({
      userId: 'user-1',
      source: 'admin',
      quantity: 3,
      validDays: PASS_VALID_DAYS,
      idempotencyKey: `ADMIN:user-1:${REQUEST_KEY}`,
      note: '[관리자] CS 보상',
    })

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'pass_adjust',
        targetUser: 'user-1',
        detail: expect.objectContaining({
          before: 4,
          after: 7,
          delta: 3,
          validDays: PASS_VALID_DAYS,
          reason: 'CS 보상',
          requestKey: REQUEST_KEY,
        }),
      })
    )
  })

  it('🔴 같은 요청 키로 다시 보내면 두 번 발급하지 않고, 감사에도 남기지 않는다', async () => {
    mockGrantPasses.mockResolvedValue({ granted: false, reason: 'ALREADY_GRANTED', grantId: 'g-1' })

    const out = await adjustPassesAsAdmin({ ...base, delta: 3 })

    expect(out.success).toBe(false)
    expect(mockLogAdminAction).not.toHaveBeenCalled()
  })

  it('회수는 기한을 넘기지 않고(null) 보유분에서 뺀다', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, granted: 0, revoked: 2, shortfall: 0 }, error: null })

    const out = await adjustPassesAsAdmin({ ...base, delta: -2, validDays: 30 })

    expect(out).toEqual({ success: true, granted: 0, revoked: 2, heldBefore: 4, heldAfter: 2 })
    expect(mockGrantPasses).not.toHaveBeenCalled()
    const [fn, args] = mockRpc.mock.calls[0] as [string, Record<string, unknown>]
    expect(fn).toBe('ent_admin_adjust')
    expect(args).toMatchObject({ p_user_id: 'user-1', p_delta: -2, p_note: '[관리자] CS 보상' })
    expect(args.p_expires_at).toBeNull()
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ before: 4, after: 2, validDays: null }) })
    )
  })

  it('발급이 실패하면 감사에 «성공»을 남기지 않는다', async () => {
    mockGrantPasses.mockResolvedValue({ granted: false, reason: 'ERROR' })

    const out = await adjustPassesAsAdmin({ ...base, delta: 1 })

    expect(out.success).toBe(false)
    expect(mockLogAdminAction).not.toHaveBeenCalled()
  })

  it('회수 RPC 가 실패하면 감사에 «성공»을 남기지 않는다', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'denied' } })

    const out = await adjustPassesAsAdmin({ ...base, delta: -1 })

    expect(out.success).toBe(false)
    expect(mockLogAdminAction).not.toHaveBeenCalled()
  })

  it('회수 RPC 가 입력을 거절하면 실패로 돌려준다', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, reason: 'INVALID_INPUT' }, error: null })

    const out = await adjustPassesAsAdmin({ ...base, delta: -1 })

    expect(out).toEqual({ success: false, error: '조정 값이 올바르지 않아요.' })
    expect(mockLogAdminAction).not.toHaveBeenCalled()
  })
})
