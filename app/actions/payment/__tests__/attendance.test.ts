/**
 * 출석 쓰기 계약 — 재화 지급 없음, 기록은 service_role 로만, 보상은 신당 정성 하루.
 *
 *  1. 출석 기록은 admin(service_role) 클라이언트로만 쓴다 — 유저 클라이언트 INSERT 는 정책째 걷었다.
 *  2. 지갑·원장(wallets·wallet_transactions)과 복채 RPC 를 건드리지 않는다.
 *  3. 같은 날 두 번은 UNIQUE(user_id, checked_date) 가 막고, 화면에는 «이미 출석»으로 돌려준다.
 *  4. 정성 적립은 기록이 성공한 뒤에만 한다.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accrueDevotion } from '@/lib/services/devotion'
import { formatKstDate } from '@/lib/utils'
import { recordDailyAttendance, getMonthlyAttendance } from '../attendance'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/services/devotion', () => ({
  accrueDevotion: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockAccrue = accrueDevotion as jest.MockedFunction<typeof accrueDevotion>

function sessionStub(user: { id: string } | null) {
  const from = jest.fn()
  return {
    client: {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>,
    from,
  }
}

function adminInsertStub(error: { code?: string; message: string } | null) {
  const insert = jest.fn().mockResolvedValue({ error })
  const from = jest.fn(() => ({ insert }))
  const rpc = jest.fn()
  return { client: { from, rpc } as unknown as ReturnType<typeof createAdminClient>, from, insert, rpc }
}

describe('recordDailyAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAccrue.mockResolvedValue({ gained: true, totalDays: 5 })
  })

  it('기록은 service_role 로 attendance_logs 한 줄 — 지갑·원장은 건드리지 않는다', async () => {
    const session = sessionStub({ id: 'user-1' })
    mockCreateClient.mockResolvedValue(session.client)
    const admin = adminInsertStub(null)
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await recordDailyAttendance()

    expect(result).toEqual({ success: true, devotionGained: true, devotionTotalDays: 5 })
    expect(admin.from).toHaveBeenCalledTimes(1)
    expect(admin.from).toHaveBeenCalledWith('attendance_logs')
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', checked_date: formatKstDate(), bokchae_awarded: 0 })
    )
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(session.from).not.toHaveBeenCalled()
    expect(mockAccrue).toHaveBeenCalledWith('user-1')
  })

  it('같은 날 두 번째는 «이미 출석» — 정성도 다시 쌓지 않는다', async () => {
    mockCreateClient.mockResolvedValue(sessionStub({ id: 'user-1' }).client)
    mockCreateAdminClient.mockReturnValue(adminInsertStub({ code: '23505', message: 'duplicate key' }).client)

    const result = await recordDailyAttendance()

    expect(result).toEqual({ success: false, alreadyChecked: true, error: '오늘은 이미 출석했어요.' })
    expect(mockAccrue).not.toHaveBeenCalled()
  })

  it('기록이 실패하면 정성을 쌓지 않는다', async () => {
    mockCreateClient.mockResolvedValue(sessionStub({ id: 'user-1' }).client)
    mockCreateAdminClient.mockReturnValue(adminInsertStub({ code: '42501', message: 'denied' }).client)

    const result = await recordDailyAttendance()

    expect(result.success).toBe(false)
    expect(mockAccrue).not.toHaveBeenCalled()
  })

  it('미인증 요청은 쓰기 경로에 들어가지 못한다', async () => {
    mockCreateClient.mockResolvedValue(sessionStub(null).client)

    const result = await recordDailyAttendance()

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' })
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockAccrue).not.toHaveBeenCalled()
  })
})

describe('getMonthlyAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('이번 달 날짜만 돌려주고, 연속 출석은 지난달까지 이어서 센다', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-02T10:00:00+09:00'))
    try {
      mockCreateClient.mockResolvedValue(sessionStub({ id: 'user-1' }).client)
      const rows = ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'].map((checked_date) => ({ checked_date }))
      const order = jest.fn().mockResolvedValue({ data: rows, error: null })
      const lte = jest.fn(() => ({ order }))
      const gte = jest.fn(() => ({ lte }))
      const eq = jest.fn(() => ({ gte }))
      const select = jest.fn(() => ({ eq }))
      mockCreateAdminClient.mockReturnValue({ from: jest.fn(() => ({ select })) } as unknown as ReturnType<
        typeof createAdminClient
      >)

      const result = await getMonthlyAttendance()

      expect(result).toEqual({
        success: true,
        checkedDates: ['2026-09-01', '2026-09-02'],
        consecutiveStreak: 4,
        canCheckIn: false,
      })
      expect(select).toHaveBeenCalledWith('checked_date')
    } finally {
      jest.useRealTimers()
    }
  })
})
