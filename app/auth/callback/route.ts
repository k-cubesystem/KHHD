import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { grantSignupBonus } from '@/lib/services/wallet-grant'
import { processReferralBonus } from '@/app/actions/user/referral'
import { logger } from '@/lib/utils/logger'
import { rateLimitByIp } from '@/lib/utils/rate-limit'
import { safeNextPath } from '@/lib/auth/next-path'
import { createAdminClient } from '@/lib/supabase/admin'

/** 이메일 OTP 검증 브루트포스 방어(S-1) — IP당 시간당 10회. PKCE 코드 교환(정상 로그인)은 제외한다. */
const OTP_RATE_LIMIT = { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 10 }

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  if (error) {
    logger.error('[Callback Error]', error, error_description)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (!code && !token_hash) {
    logger.error('[Callback] No code or token_hash provided')
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=no_code`)
  }

  // CRITICAL: Create response FIRST, then inject cookies into it
  // signup 타입이면 welcome 파라미터 추가 (토스트 알림용)
  const isSignup = type === 'signup'
  // ?next= 로 돌아갈 곳을 지정할 수 있다(가족 초대 링크 등). 오픈 리다이렉트는 safeNextPath 가 막는다.
  const nextPath = safeNextPath(requestUrl.searchParams.get('next'))
  const defaultUrl = isSignup ? `${requestUrl.origin}/protected/analysis?welcome=1` : `${requestUrl.origin}/protected`
  const redirectUrl = nextPath ? `${requestUrl.origin}${nextPath}` : defaultUrl
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
    // 미로그인 상태이므로 IP 기준으로 시도 횟수를 제한한다(Supabase 자체 한도에 더한 2중 방어).
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByIp(ip, 'auth-otp-callback', OTP_RATE_LIMIT)
    if (!rl.success) {
      logger.warn('[Callback] OTP rate limit exceeded:', { ip })
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/login?error=${encodeURIComponent('인증 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.')}`
      )
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })

    if (verifyError) {
      logger.error('[OTP Verify Error]', verifyError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(verifyError.message)}`)
    }

    // 회원가입 인증 완료 시 50만냥 지급 + 추천 보너스
    if (type === 'signup' && verifyData?.user?.id) {
      await grantSignupBonus(verifyData.user.id).catch((e) => logger.error('[SignupBonus Error]', e))
      // 유입 귀속 — 이 브라우저의 방문자 쿠키(hhd_vid)를 가입자에 연결(utm_tracking.converted)
      await attributeSignupFromCookies(request, verifyData.user.id, 'email')

      // 추천 코드 쿠키 확인 및 보너스 처리
      const referralCode = request.cookies.get('referral_code')?.value
      if (referralCode) {
        await processReferralBonus(verifyData.user.id, referralCode).catch((e) =>
          logger.error('[ReferralBonus Error]', e)
        )
        // 추천 보너스 지급 후 쿠키 삭제 (redirectResponse에 Set-Cookie 추가)
        redirectResponse.cookies.set('referral_code', '', { maxAge: 0, path: '/' })
      }
    }
  } else if (code) {
    // OAuth / Magic Link (PKCE 코드 교환)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logger.error('[Session Exchange Error]', exchangeError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    // exchangeCodeForSession이 이미 쿠키에 세션을 설정하므로
    // 추가 setSession 호출은 불필요하며 오히려 세션 충돌을 유발할 수 있음
    if (!data.session) {
      logger.error('[Callback] No session after code exchange')
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=session_failed`)
    }

    // OAuth 첫 로그인 = 신규 가입. Supabase 는 별도 플래그를 안 주므로 created_at 이 «방금»이면 신규로 본다.
    // (마케팅 감사: 카카오·구글 가입이 계측에서 통째로 빠져 있던 구멍 — 여기서 메운다)
    const u = data.session.user
    const createdMs = Date.parse(u.created_at ?? '')
    if (Number.isFinite(createdMs) && Date.now() - createdMs < 5 * 60 * 1000) {
      const provider = typeof u.app_metadata?.provider === 'string' ? u.app_metadata.provider : 'oauth'
      await attributeSignupFromCookies(request, u.id, provider)
    }
  }

  return redirectResponse
}

/**
 * 가입 귀속 + 서버측 sign_up 이벤트. 방문자 쿠키가 없으면(쿠키 차단·앱 웹뷰) 귀속만 건너뛰고 이벤트는 남긴다.
 * 실패해도 가입 흐름을 막지 않는다.
 */
async function attributeSignupFromCookies(request: NextRequest, userId: string, method: string) {
  try {
    const admin = createAdminClient()
    const vid = request.cookies.get('hhd_vid')?.value ?? null
    if (vid && vid.length >= 8) {
      await admin.rpc('attribute_signup', { p_visitor_id: vid, p_user_id: userId })
    }
    // 서버 기록 — 클라이언트 GA.signUp 은 이메일 폼에만 있고, 여기(콜백)는 서버라 gtag 를 못 부른다.
    await admin.from('activity_logs').insert({
      user_id: userId,
      visitor_id: vid,
      activity_type: 'sign_up',
      activity_category: 'auth',
      description: method,
    })
    await admin.rpc('track_funnel', {
      p_event_name: 'signup_done',
      p_step: 3,
      p_metadata: { method },
      p_session_id: vid,
    })
  } catch (e) {
    logger.warn('[Callback] 가입 귀속 실패(무시)', e instanceof Error ? e.message : String(e))
  }
}
