import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { rateLimitByIp } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

/** 이메일 OTP 검증 브루트포스 방어(S-1) — IP당 시간당 10회. */
const OTP_RATE_LIMIT = { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 10 }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    // token_hash 는 추측 가능한 길이의 값이므로 우리 라우트에서도 시도 횟수를 제한한다
    // (Supabase 자체 한도에 더한 2중 방어). 로그인한 사용자가 아니므로 IP 기준.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByIp(ip, 'auth-otp-confirm', OTP_RATE_LIMIT)
    if (!rl.success) {
      logger.warn('[AuthConfirm] Rate limit exceeded:', { ip })
      redirect(`/auth/error?error=${encodeURIComponent('인증 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.')}`)
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next)
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`)
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=No token hash or type`)
}
