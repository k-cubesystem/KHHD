import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { grantOnboardingPasses, grantReferralPasses } from '@/lib/services/signup-grant'
import { logger } from '@/lib/utils/logger'
import { rateLimitByIp } from '@/lib/utils/rate-limit'
import { safeNextPath } from '@/lib/auth/next-path'
import { createAdminClient } from '@/lib/supabase/admin'

/** 이메일 OTP 검증 브루트포스 방어(S-1) — IP당 시간당 10회. PKCE 코드 교환(정상 로그인)은 제외한다. */
const OTP_RATE_LIMIT = { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 10 }

/** 계정이 이만큼 안에 생겼으면 «방금 가입»으로 본다 — Supabase 는 신규 가입 플래그를 따로 주지 않는다. */
const FRESH_SIGNUP_MS = 5 * 60 * 1000
/** PKCE 이메일 인증은 가입보다 늦게 눌린다 — 인증 링크가 살아 있는 동안만 가입 인증으로 친다. */
const CONFIRM_LINK_MS = 24 * 60 * 60 * 1000

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
  // ?next= 로 돌아갈 곳을 지정할 수 있다(가족 초대 링크 등). 오픈 리다이렉트는 safeNextPath 가 막는다.
  const nextPath = safeNextPath(requestUrl.searchParams.get('next'))
  const redirectResponse = NextResponse.redirect(`${requestUrl.origin}${nextPath ?? '/protected'}`)
  let welcomed = false

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

    // 회원가입 인증 완료 — 가입 맛보기 이용권 + 친구 추천 이용권
    if (type === 'signup' && verifyData?.user?.id) {
      welcomed = await grantSignupGifts(request, redirectResponse, verifyData.user.id)
      // 유입 귀속 — 이 브라우저의 방문자 쿠키(hhd_vid)를 가입자에 연결(utm_tracking.converted)
      await attributeSignupFromCookies(request, verifyData.user.id, 'email')
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
    const now = Date.now()
    const isNewAccount = isWithin(u.created_at, FRESH_SIGNUP_MS, now)
    if (isNewAccount) {
      const provider = typeof u.app_metadata?.provider === 'string' ? u.app_metadata.provider : 'oauth'
      await attributeSignupFromCookies(request, u.id, provider)
    }
    // 가입 선물도 이 길로 가입한 사람(카카오·구글, PKCE 이메일 인증)에게 똑같이 — 화면이 «가입하면 1회 무료»를 약속한다.
    const justConfirmed =
      isWithin(u.email_confirmed_at, FRESH_SIGNUP_MS, now) && isWithin(u.created_at, CONFIRM_LINK_MS, now)
    if (isNewAccount || justConfirmed) {
      welcomed = await grantSignupGifts(request, redirectResponse, u.id)
    }
  }

  // 환영 안내(가입 선물 토스트)는 선물이 실제로 발급됐을 때만 — 받지 못한 이용권을 «드렸어요»라고 말하지 않는다.
  // (Supabase 이메일 인증은 PKCE 로 돌아와 type 이 없다 — type 으로 가입을 가리면 안내가 한 번도 뜨지 않았다.)
  if (welcomed && !nextPath) {
    redirectResponse.headers.set('location', `${requestUrl.origin}/protected/analysis?welcome=1`)
  }

  return redirectResponse
}

function isWithin(iso: string | null | undefined, windowMs: number, nowMs: number): boolean {
  const at = Date.parse(iso ?? '')
  return Number.isFinite(at) && nowMs - at < windowMs
}

/**
 * 가입 선물 — 맛보기 이용권(평생 한 번) + 추천 코드 쿠키가 있으면 친구 추천 이용권.
 * 두 발급 모두 멱등이라 콜백이 두 번 돌아도 한 번만 받는다. 실패해도 가입 흐름은 막지 않는다.
 * 돌려주는 값 = 맛보기 이용권이 이번에 새로 발급됐는가(환영 안내를 띄울지).
 */
async function grantSignupGifts(request: NextRequest, response: NextResponse, userId: string): Promise<boolean> {
  const onboarding = await grantOnboardingPasses(userId).catch((e: unknown) => {
    logger.error(new Error('[Callback] 가입 맛보기 이용권 발급 실패'), {
      userId,
      cause: e instanceof Error ? e.message : String(e),
    })
    return null
  })

  const referralCode = request.cookies.get('referral_code')?.value
  if (referralCode) {
    await grantReferralPasses(userId, referralCode).catch((e: unknown) =>
      logger.error(new Error('[Callback] 친구 추천 이용권 처리 실패'), {
        userId,
        cause: e instanceof Error ? e.message : String(e),
      })
    )
    response.cookies.set('referral_code', '', { maxAge: 0, path: '/' })
  }

  return onboarding?.granted === true
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
