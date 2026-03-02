import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { grantSignupBonus } from '@/app/actions/payment/wallet'
import { processReferralBonus } from '@/app/actions/user/referral'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('[Callback Error]', error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (!code && !token_hash) {
    console.error('[Callback] No code or token_hash provided')
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=no_code`)
  }

  // CRITICAL: Create response FIRST, then inject cookies into it
  // signup 타입이면 welcome 파라미터 추가 (토스트 알림용)
  const isSignup = type === 'signup'
  const redirectUrl = isSignup ? `${requestUrl.origin}/protected/analysis?welcome=1` : `${requestUrl.origin}/protected`
  const redirectResponse = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (token_hash && type) {
    // 이메일 인증 (회원가입 확인, 비밀번호 재설정 등)
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
    })

    if (verifyError) {
      console.error('[OTP Verify Error]', verifyError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(verifyError.message)}`)
    }

    // 회원가입 인증 완료 시 50만냥 지급 + 추천 보너스
    if (type === 'signup' && verifyData?.user?.id) {
      await grantSignupBonus(verifyData.user.id).catch((e) => console.error('[SignupBonus Error]', e))

      // 추천 코드 쿠키 확인 및 보너스 처리
      const referralCode = request.cookies.get('referral_code')?.value
      if (referralCode) {
        await processReferralBonus(verifyData.user.id, referralCode).catch((e) =>
          console.error('[ReferralBonus Error]', e)
        )
        // 추천 보너스 지급 후 쿠키 삭제 (redirectResponse에 Set-Cookie 추가)
        redirectResponse.cookies.set('referral_code', '', { maxAge: 0, path: '/' })
      }
    }
  } else if (code) {
    // OAuth / Magic Link (PKCE 코드 교환)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Session Exchange Error]', exchangeError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    }
  }

  return redirectResponse
}
