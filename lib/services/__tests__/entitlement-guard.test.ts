/**
 * 이용권 사용·되돌림의 입력 가드 — 옛 wallet-deduct-guard / wallet-refund-guard 의 불변식을 승계한다.
 *
 * 복채 시절 차감 액션은 공개 엔드포인트였고, 음수 금액이 «RPC 미설정» 폴백으로 새어 잔액을 **증액**했다
 * (QA 2026-08-20 C-1). 이용권 경로에는 공개 표면이 없지만(feature-charge.test 가 잠근다), 서버 안의
 * 호출 실수도 DB 에 닿기 전에 끊는다.
 *
 * 못 박는 것:
 *  1. 음수·0·비정수 장 수는 어떤 DB 경로에도 닿지 못한다.
 *  2. 정상 장 수는 ent_consume 하나로만 간다 — 표를 직접 쓰지 않는다.
 *  3. 되돌릴 원장 행이 없으면 되돌림 RPC 를 부르지 않는다(무사용 환급 차단).
 */
jest.mock('server-only', () => ({}))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getActiveMembership: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { consumePass, refundPass } from '../entitlement'

const mockCreateAdmin = createAdminClient as jest.MockedFunction<typeof createAdminClient>

function adminStub(rpcResult: { data: unknown; error: unknown }) {
  const rpc = jest.fn().mockResolvedValue(rpcResult)
  const tables: string[] = []
  const from = jest.fn((table: string) => {
    tables.push(table)
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq']) builder[method] = () => builder
    builder.maybeSingle = () => Promise.resolve({ data: { role: 'user' }, error: null })
    return builder
  })
  mockCreateAdmin.mockReturnValue({ rpc, from } as unknown as ReturnType<typeof createAdminClient>)
  return { rpc, from, tables }
}

beforeEach(() => jest.clearAllMocks())

describe('consumePass — 장 수 가드', () => {
  it.each([[-1_000_000], [-1], [0], [1.5], [Number.NaN]])(
    '잘못된 장 수 %p 는 DB 에 닿기 전에 거절된다',
    async (bad) => {
      const admin = adminStub({ data: { ok: true }, error: null })

      const result = await consumePass({ userId: 'user-1', featureKey: 'SAJU', units: bad })

      expect(result).toMatchObject({ ok: false, reason: 'INVALID_INPUT' })
      expect(admin.rpc).not.toHaveBeenCalled()
      expect(admin.from).not.toHaveBeenCalled()
    }
  )

  it('정상 장 수는 ent_consume 하나로 간다 — 발급·사용 표를 직접 쓰지 않는다', async () => {
    const admin = adminStub({ data: { ok: true, ledger_ids: ['l1'], from_membership: 0, from_pass: 1 }, error: null })

    const result = await consumePass({ userId: 'user-1', featureKey: 'SAJU', units: 1 })

    expect(result).toMatchObject({ ok: true, bypass: false, ledgerIds: ['l1'] })
    expect(admin.rpc).toHaveBeenCalledTimes(1)
    expect(admin.rpc).toHaveBeenCalledWith('ent_consume', expect.objectContaining({ p_user_id: 'user-1', p_units: 1 }))
    expect(admin.tables.filter((table) => table !== 'profiles')).toEqual([])
  })

  it('모자라면 아무것도 쓰지 않았다고 알린다 — 부분 사용 없음', async () => {
    adminStub({ data: { ok: false, reason: 'INSUFFICIENT', member_available: 0, pass_available: 0 }, error: null })

    const result = await consumePass({ userId: 'user-1', featureKey: 'SAMHAP', units: 2 })

    expect(result).toMatchObject({ ok: false, reason: 'INSUFFICIENT' })
  })
})

describe('refundPass — 쓴 것만 되돌린다', () => {
  it('되돌릴 원장 행이 없으면 RPC 를 부르지 않는다 — 쓰지 않은 것을 돌려받는 경로가 없다', async () => {
    const admin = adminStub({ data: 1, error: null })

    await expect(refundPass('user-1', [])).resolves.toBe(0)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('이번 사용의 원장 행만 넘긴다', async () => {
    const admin = adminStub({ data: 2, error: null })

    await expect(refundPass('user-1', ['l1', 'l2'])).resolves.toBe(2)
    expect(admin.rpc).toHaveBeenCalledWith('ent_refund', { p_user_id: 'user-1', p_ledger_ids: ['l1', 'l2'] })
  })

  it('되돌림이 실패해도 던지지 않는다 — 풀이 실패 응답을 이것 때문에 잃지 않는다', async () => {
    adminStub({ data: null, error: { message: 'connection lost' } })

    await expect(refundPass('user-1', ['l1'])).resolves.toBe(0)
  })
})
