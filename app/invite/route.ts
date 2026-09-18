import { NextResponse, type NextRequest } from 'next/server'
import { findReferralCode } from '@/lib/services/signup-grant'

const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/**
 * /invite?ref=CODE — 있는 추천 코드면 쿠키에 담아 가입 화면으로 보낸다. 선물 발급은 가입 콜백이 이 쿠키를 읽어
 * 하고, 가입 화면의 «추천 혜택 적용 중» 배너도 이 쿠키를 본다(주소창의 코드로는 약속하지 않는다).
 *
 * 🔴 페이지가 아니라 라우트 핸들러다. 페이지 렌더 중 cookies().set 은 던진다(Next 규칙) — 예전 page.tsx 는
 *    유효한 코드로 들어오면 오류 화면이 떴다.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/auth/sign-up', request.url))
  const code = await findReferralCode(request.nextUrl.searchParams.get('ref'))
  if (code) {
    response.cookies.set('referral_code', code, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    })
  }
  return response
}
