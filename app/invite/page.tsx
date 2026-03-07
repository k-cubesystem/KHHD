import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateReferralCode } from '@/app/actions/user/referral'

export const metadata: Metadata = {
  title: '초대',
  description: '친구의 초대로 청담해화당에 가입하세요.',
}

interface Props {
  searchParams: Promise<{ ref?: string }>
}

/**
 * /invite?ref=CODE
 * - 추천 코드를 쿠키에 저장 후 회원가입 페이지로 이동
 */
export default async function InvitePage({ searchParams }: Props) {
  const { ref } = await searchParams

  if (!ref) {
    redirect('/auth/sign-up')
  }

  const result = await validateReferralCode(ref)

  if (result.valid) {
    const cookieStore = await cookies()
    cookieStore.set('referral_code', ref.toUpperCase(), {
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  redirect(`/auth/sign-up?ref=${encodeURIComponent(ref)}&from=invite`)
}
