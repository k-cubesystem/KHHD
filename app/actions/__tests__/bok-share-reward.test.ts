/**
 * 복 포인트 발행 경로 봉쇄(S-P1) 검증.
 *
 * 핵심 계약 3가지:
 *  1. `'use server'` 모듈(bok-points)은 금액을 인자로 받는 발행 함수를 더는 export 하지 않는다.
 *  2. 클라이언트가 부를 수 있는 유일한 적립 경로(claimShareReward)는 금액이 서버 고정이다.
 *  3. 그 경로는 하루(KST) 1회다 — 트랜잭션 로그 판정 + rate limit 클레임.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { formatKstDate } from '@/lib/utils'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: jest.fn(),
}))

import * as bokPointsActions from '../payment/bok-points'
import { claimShareReward, completeBokMission } from '../payment/bok-points'
import { SHARE_REWARD_POINTS } from '@/lib/services/bok-grant'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>

/** 인증 상태만 흉내 내는 Supabase 대역 — 공개 액션은 auth 만 쓰고 나머지는 admin 으로 간다. */
function supabaseStub(user: { id: string } | null) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

/** bok_transactions 조회/삽입 + add_bok_points RPC 를 흉내 내는 admin 대역. */
function adminStub(todayLog: Array<{ id: string }> = [], logError: { message: string } | null = null) {
  const insert = jest.fn().mockResolvedValue({ error: null })
  const limit = jest.fn().mockResolvedValue({ data: todayLog, error: logError })
  const gte = jest.fn(() => ({ limit }))
  const eqType = jest.fn(() => ({ gte }))
  const eqUser = jest.fn(() => ({ eq: eqType }))
  const select = jest.fn(() => ({ eq: eqUser }))
  const from = jest.fn(() => ({ select, insert }))
  const rpc = jest.fn().mockResolvedValue({ data: 120, error: null })

  return {
    client: { from, rpc } as unknown as ReturnType<typeof createAdminClient>,
    insert,
    rpc,
    gte,
    eqUser,
    eqType,
  }
}

function allowRateLimit() {
  mockRateLimit.mockResolvedValue({ success: true, limit: 1, remaining: 0, reset: Date.now() + 86_400_000 })
}

function blockRateLimit() {
  mockRateLimit.mockResolvedValue({ success: false, limit: 1, remaining: 0, reset: Date.now() + 86_400_000 })
}

describe('bok-points 공개 액션 표면', () => {
  const surface = bokPointsActions as unknown as Record<string, unknown>

  it('금액을 인자로 받는 발행 함수(addBokPoints)는 공개 액션이 아니다', () => {
    // 이관처는 lib/services/bok-grant.ts(server-only). 여기로 되돌아오면 임의 금액 발행이 다시 열린다.
    expect(surface.addBokPoints).toBeUndefined()
  })

  it('호출자 없는 사장 코드(generateDailyBokMissions)는 제거됐다', () => {
    // 실제 일일 미션 생성은 app/api/cron/bok-missions 가 담당한다.
    expect(surface.generateDailyBokMissions).toBeUndefined()
  })

  it('차감·조회 계열은 존치한다', () => {
    expect(typeof surface.deductBokPoints).toBe('function')
    expect(typeof surface.getBokPointsBalance).toBe('function')
    expect(typeof surface.getBokTransactions).toBe('function')
  })

  it('클라이언트용 적립 경로는 인자 없는 claimShareReward 뿐이다', () => {
    expect(typeof surface.claimShareReward).toBe('function')
    expect(claimShareReward.length).toBe(0)
  })
})

describe('claimShareReward', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockResolvedValue(supabaseStub({ id: 'user-1' }))
    allowRateLimit()
  })

  it('금액은 서버 고정 20p 다 — 클라이언트가 정할 수 없다', async () => {
    const admin = adminStub()
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await claimShareReward()

    expect(SHARE_REWARD_POINTS).toBe(20)
    expect(result).toEqual({ success: true, balance: 120 })
    expect(admin.rpc).toHaveBeenCalledWith('add_bok_points', { p_user_id: 'user-1', p_amount: 20 })
    expect(admin.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1', amount: 20, type: 'SHARE' }))
  })

  it('오늘(KST) 이미 받았으면 재지급하지 않는다 — 트랜잭션 로그 판정', async () => {
    const admin = adminStub([{ id: 'tx-1' }])
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await claimShareReward()

    expect(result).toEqual({ success: true, alreadyClaimed: true })
    expect(admin.rpc).not.toHaveBeenCalled()
    expect(admin.insert).not.toHaveBeenCalled()
    // 로그 판정이 먼저라 rate limit 창을 소모하지 않는다.
    expect(mockRateLimit).not.toHaveBeenCalled()
  })

  it('멱등 판정 경계는 KST 자정이다', async () => {
    const admin = adminStub()
    mockCreateAdminClient.mockReturnValue(admin.client)

    await claimShareReward()

    const expectedBoundary = new Date(`${formatKstDate()}T00:00:00+09:00`).toISOString()
    expect(admin.eqUser).toHaveBeenCalledWith('user_id', 'user-1')
    expect(admin.eqType).toHaveBeenCalledWith('type', 'SHARE')
    expect(admin.gte).toHaveBeenCalledWith('created_at', expectedBoundary)
  })

  it('동시 요청은 KST 날짜 키의 1일 1회 rate limit 으로 막는다', async () => {
    const admin = adminStub()
    mockCreateAdminClient.mockReturnValue(admin.client)
    blockRateLimit()

    const result = await claimShareReward()

    expect(mockRateLimit).toHaveBeenCalledWith(`bok-share:user-1:${formatKstDate()}`, {
      interval: 24 * 60 * 60 * 1000,
      uniqueTokenPerInterval: 1,
    })
    expect(result).toEqual({ success: true, alreadyClaimed: true })
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('멱등 조회가 실패하면 적립하지 않는다 — 판정 불가 시 보수적으로 거부', async () => {
    const admin = adminStub([], { message: 'db down' })
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await claimShareReward()

    expect(result.success).toBe(false)
    expect(admin.rpc).not.toHaveBeenCalled()
  })

  it('미인증 요청은 발행 경로에 진입하지 못한다', async () => {
    mockCreateClient.mockResolvedValue(supabaseStub(null))

    const result = await claimShareReward()

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' })
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(mockRateLimit).not.toHaveBeenCalled()
  })
})

/** bok_missions 조회/완료 + auth 를 함께 흉내 내는 유저 스코프 대역. */
function missionSupabaseStub(mission: Record<string, unknown>) {
  const single = jest.fn().mockResolvedValue({ data: mission, error: null })
  const eqCompleted = jest.fn(() => ({ single }))
  const eqUser = jest.fn(() => ({ eq: eqCompleted }))
  const eqId = jest.fn(() => ({ eq: eqUser }))
  const select = jest.fn(() => ({ eq: eqId }))
  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({ eq: updateEq }))

  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn(() => ({ select, update })),
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

describe('completeBokMission 보상 금액', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    allowRateLimit()
  })

  it('행에 실린 points_reward 가 아니라 미션 유형으로 금액을 정한다', async () => {
    // bok_missions RLS 는 유저가 자기 행을 직접 INSERT 할 수 있어(FOR ALL USING = WITH CHECK),
    // points_reward 를 신뢰하면 임의 금액 발행 경로가 된다.
    mockCreateClient.mockResolvedValue(
      missionSupabaseStub({
        id: 'mission-1',
        mission_type: 'DAILY_FORTUNE',
        mission_title: '조작된 미션',
        points_reward: 999_999,
        family_member_id: null,
      })
    )
    const admin = adminStub()
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await completeBokMission('mission-1')

    expect(result.pointsEarned).toBe(10)
    expect(admin.rpc).toHaveBeenCalledWith('add_bok_points', { p_user_id: 'user-1', p_amount: 10 })
  })

  it('알 수 없는 유형은 최소 보상으로 떨어진다', async () => {
    mockCreateClient.mockResolvedValue(
      missionSupabaseStub({
        id: 'mission-2',
        mission_type: 'UNKNOWN_TYPE',
        mission_title: '미지의 미션',
        points_reward: 5_000,
        family_member_id: null,
      })
    )
    const admin = adminStub()
    mockCreateAdminClient.mockReturnValue(admin.client)

    const result = await completeBokMission('mission-2')

    expect(result.pointsEarned).toBe(10)
    expect(admin.rpc).toHaveBeenCalledWith('add_bok_points', { p_user_id: 'user-1', p_amount: 10 })
  })
})
