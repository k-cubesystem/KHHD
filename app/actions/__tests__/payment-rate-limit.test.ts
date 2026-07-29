/**
 * 결제 서버 액션의 rate limit 배선(S-1) 검증.
 * 핵심 계약: 한도를 넘으면 Toss API 호출·복채 지급 이전에 끊긴다.
 */
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

jest.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

// wallet 은 next/cache 를 끌고 오므로(jsdom 미지원) 대역으로 대체한다.
jest.mock('@/app/actions/payment/wallet', () => ({
  addTalismans: jest.fn(async () => ({ success: true })),
}))

import { confirmPayment } from '../payment/payment'
import { addTalismans } from '../payment/wallet'

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockAddTalismans = addTalismans as jest.MockedFunction<typeof addTalismans>

function allow() {
  mockRateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 })
}

function block() {
  mockRateLimit.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60_000 })
}

/** 인증 상태만 흉내 내는 Supabase 대역 — confirmPayment 는 한도 검사까지 auth 만 쓴다. */
function supabaseStub(user: { id: string } | null) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>
}

describe('confirmPayment rate limit', () => {
  const fetchSpy = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = fetchSpy as unknown as typeof fetch
    mockCreateClient.mockResolvedValue(supabaseStub({ id: 'user-1' }))
  })

  it('한도 초과 시 Toss 결제 승인 API 를 호출하지 않는다', async () => {
    block()

    await expect(confirmPayment('pk_test', 'order_1', 10)).rejects.toThrow(
      '결제 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.'
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(mockAddTalismans).not.toHaveBeenCalled()
  })

  it('유저별 키로 분당 10회 한도를 적용한다', async () => {
    block()

    await expect(confirmPayment('pk_test', 'order_1', 10)).rejects.toThrow()
    expect(mockRateLimit).toHaveBeenCalledWith('payment-confirm:user-1', {
      interval: 60_000,
      uniqueTokenPerInterval: 10,
    })
  })

  it('미인증 요청은 한도 검사 이전에 거부된다(한도 소모 없음)', async () => {
    allow()
    mockCreateClient.mockResolvedValue(supabaseStub(null))

    await expect(confirmPayment('pk_test', 'order_1', 10)).rejects.toThrow('인증되지 않은 사용자입니다.')
    expect(mockRateLimit).not.toHaveBeenCalled()
  })
})
