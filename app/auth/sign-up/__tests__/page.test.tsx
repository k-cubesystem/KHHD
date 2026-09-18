/**
 * 가입 화면의 추천 배너 — 가입 콜백이 실제로 읽을 추천 쿠키가 있을 때만 약속한다.
 * 주소창의 ?ref= 는 누구나 붙일 수 있고 콜백은 그 값을 보지 않는다.
 */
import { render, screen } from '@testing-library/react'
import { cookies } from 'next/headers'
import { REFERRAL_PASSES, findBannedPassTerms } from '@/lib/domain/entitlement/pass'

jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@/components/sign-up-form', () => ({ SignUpForm: () => null }))

import SignUpPage from '../page'

const mockCookies = cookies as unknown as jest.Mock

function withReferralCookie(value: string | null) {
  mockCookies.mockResolvedValue({ get: (name: string) => (name === 'referral_code' && value ? { value } : undefined) })
}

it('추천 쿠키가 있으면 배너에 정본 장 수와 코드를 보인다', async () => {
  withReferralCookie('AB12CD34')

  const { container } = render(await SignUpPage())

  expect(screen.getByText('추천 혜택 적용 중')).not.toBeNull()
  expect(screen.getByText(`${REFERRAL_PASSES}장`)).not.toBeNull()
  expect(screen.getByText('AB12CD34')).not.toBeNull()
  expect(findBannedPassTerms(container.textContent ?? '')).toEqual([])
})

it('추천 쿠키가 없으면 배너를 그리지 않는다', async () => {
  withReferralCookie(null)

  render(await SignUpPage())

  expect(screen.queryByText('추천 혜택 적용 중')).toBeNull()
})
