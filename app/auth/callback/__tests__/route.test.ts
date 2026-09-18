/**
 * @jest-environment node
 */
/**
 * 가입 콜백 — 가입 선물(맛보기·추천 이용권)의 문지기.
 *
 *  1. «방금 생긴 계정»(카카오·구글 첫 로그인)과 «방금 인증한 새 이메일 계정»만 선물을 받는다.
 *     오래된 계정의 로그인은 발급 경로에 닿지 않는다 — 전환 전 가입자가 로그인만으로 한 장을 받으면 안 된다.
 *  2. 환영 안내(?welcome=1)는 이번에 새로 발급됐을 때만 — 못 받은 선물을 «드렸어요»라고 말하지 않는다.
 *  3. ?next= 가 있으면 그리로 간다(가족 초대 링크 등).
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { grantOnboardingPasses, grantReferralPasses } from '@/lib/services/signup-grant'
import type { GrantPassesResult } from '@/lib/services/entitlement'

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('@/lib/services/signup-grant', () => ({
  grantOnboardingPasses: jest.fn(),
  grantReferralPasses: jest.fn(),
}))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimitByIp: jest.fn(async () => ({ success: true })) }))
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    rpc: jest.fn(async () => ({ data: null, error: null })),
    from: jest.fn(() => ({ insert: jest.fn(async () => ({ error: null })) })),
  })),
}))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

import { GET } from '../route'

const ORIGIN = 'https://k-haehwadang.com'
const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

const mockCreateServerClient = createServerClient as unknown as jest.Mock
const mockOnboarding = grantOnboardingPasses as jest.MockedFunction<typeof grantOnboardingPasses>
const mockReferral = grantReferralPasses as jest.MockedFunction<typeof grantReferralPasses>

const GRANTED: GrantPassesResult = { granted: true, reason: 'OK', grantId: 'g-1' }

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

function sessionUser(createdAgo: number, confirmedAgo: number) {
  return {
    id: 'user-1',
    created_at: ago(createdAgo),
    email_confirmed_at: ago(confirmedAgo),
    app_metadata: { provider: 'kakao' },
  }
}

function stubCodeExchange(user: ReturnType<typeof sessionUser>) {
  mockCreateServerClient.mockReturnValue({
    auth: {
      exchangeCodeForSession: jest.fn(async () => ({ data: { session: { user } }, error: null })),
      verifyOtp: jest.fn(),
    },
  })
}

function callback(query: string, cookie?: string) {
  return new NextRequest(`${ORIGIN}/auth/callback?${query}`, cookie ? { headers: { cookie } } : undefined)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockOnboarding.mockResolvedValue(GRANTED)
  mockReferral.mockResolvedValue({ success: true, passes: 1 })
})

describe('가입 선물 문지기', () => {
  it('카카오·구글 첫 로그인(방금 생긴 계정)은 맛보기를 받고 환영 안내로 간다', async () => {
    stubCodeExchange(sessionUser(MINUTE, MINUTE))

    const res = await GET(callback('code=abc'))

    expect(mockOnboarding).toHaveBeenCalledWith('user-1')
    expect(res.headers.get('location')).toBe(`${ORIGIN}/protected/analysis?welcome=1`)
  })

  it('PKCE 이메일 인증을 방금 마친 새 계정도 받는다', async () => {
    stubCodeExchange(sessionUser(2 * 60 * MINUTE, MINUTE))

    await GET(callback('code=abc'))

    expect(mockOnboarding).toHaveBeenCalledWith('user-1')
  })

  it('오래된 계정의 로그인은 발급 경로에 닿지 않는다', async () => {
    stubCodeExchange(sessionUser(30 * DAY, 30 * DAY))

    const res = await GET(callback('code=abc'))

    expect(mockOnboarding).not.toHaveBeenCalled()
    expect(mockReferral).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe(`${ORIGIN}/protected`)
  })

  it('가입 하루가 지난 계정은 방금 인증했어도 받지 않는다', async () => {
    stubCodeExchange(sessionUser(3 * DAY, MINUTE))

    await GET(callback('code=abc'))

    expect(mockOnboarding).not.toHaveBeenCalled()
  })

  it('이메일 OTP 가입 인증도 받는다', async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        verifyOtp: jest.fn(async () => ({ data: { user: { id: 'user-2' } }, error: null })),
        exchangeCodeForSession: jest.fn(),
      },
    })

    const res = await GET(callback('token_hash=th&type=signup'))

    expect(mockOnboarding).toHaveBeenCalledWith('user-2')
    expect(res.headers.get('location')).toBe(`${ORIGIN}/protected/analysis?welcome=1`)
  })
})

describe('환영 안내', () => {
  it.each<[string, () => void]>([
    ['이미 받은 계정', () => mockOnboarding.mockResolvedValue({ granted: false, reason: 'ALREADY_GRANTED' })],
    ['발급 오류', () => mockOnboarding.mockResolvedValue({ granted: false, reason: 'ERROR' })],
    ['발급 예외', () => mockOnboarding.mockRejectedValue(new Error('boom'))],
  ])('%s — 안내 없이 기본 경로로 간다', async (_label, arrange) => {
    arrange()
    stubCodeExchange(sessionUser(MINUTE, MINUTE))

    const res = await GET(callback('code=abc'))

    expect(res.headers.get('location')).toBe(`${ORIGIN}/protected`)
  })

  it('?next= 가 있으면 선물을 받아도 그리로 간다', async () => {
    stubCodeExchange(sessionUser(MINUTE, MINUTE))

    const res = await GET(callback(`code=abc&next=${encodeURIComponent('/protected/family')}`))

    expect(mockOnboarding).toHaveBeenCalled()
    expect(res.headers.get('location')).toBe(`${ORIGIN}/protected/family`)
  })
})

describe('친구 추천', () => {
  it('추천 코드 쿠키가 있으면 추천 이용권을 처리하고 쿠키를 지운다', async () => {
    stubCodeExchange(sessionUser(MINUTE, MINUTE))

    const res = await GET(callback('code=abc', 'referral_code=ABC123'))

    expect(mockReferral).toHaveBeenCalledWith('user-1', 'ABC123')
    const cleared = res.cookies.get('referral_code')
    expect(cleared?.value).toBe('')
  })

  it('쿠키가 없으면 추천 발급을 부르지 않는다', async () => {
    stubCodeExchange(sessionUser(MINUTE, MINUTE))

    await GET(callback('code=abc'))

    expect(mockReferral).not.toHaveBeenCalled()
  })
})
