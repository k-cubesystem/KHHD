/**
 * @jest-environment node
 */
/**
 * 초대 링크 — 추천 쿠키를 심는 유일한 입구.
 *
 *  1. 있는 코드면 쿠키를 심고 가입 화면으로 보낸다(가입 화면의 추천 배너·가입 콜백의 발급이 이 쿠키를 본다).
 *  2. 없는 코드·빈 코드면 쿠키 없이 가입 화면으로 — 받지 못할 선물을 약속하지 않는다.
 */
import { NextRequest } from 'next/server'
import { findReferralCode } from '@/lib/services/signup-grant'

jest.mock('@/lib/services/signup-grant', () => ({ findReferralCode: jest.fn() }))

import { GET } from '../route'

const ORIGIN = 'https://k-haehwadang.com'
const mockFind = findReferralCode as jest.MockedFunction<typeof findReferralCode>

function invite(query: string) {
  return new NextRequest(`${ORIGIN}/invite${query}`)
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('있는 코드면 추천 쿠키를 심고 가입 화면으로 보낸다', async () => {
  mockFind.mockResolvedValue('AB12CD34')

  const res = await GET(invite('?ref=ab12cd34'))

  expect(mockFind).toHaveBeenCalledWith('ab12cd34')
  expect(res.headers.get('location')).toBe(`${ORIGIN}/auth/sign-up`)
  const cookie = res.cookies.get('referral_code')
  expect(cookie?.value).toBe('AB12CD34')
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.path).toBe('/')
})

it.each([
  ['없는 코드', '?ref=NOPE1234'],
  ['빈 코드', ''],
])('%s — 쿠키 없이 가입 화면으로', async (_label, query) => {
  mockFind.mockResolvedValue(null)

  const res = await GET(invite(query))

  expect(res.headers.get('location')).toBe(`${ORIGIN}/auth/sign-up`)
  expect(res.cookies.get('referral_code')).toBeUndefined()
})
