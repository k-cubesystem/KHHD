'use client'

import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

/** 카카오톡/라인/인스타 등 인앱 브라우저 감지 */
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || navigator.vendor || ''
  return /KAKAOTALK|NAVER|Line|Instagram|FBAN|FBAV|Twitter/i.test(ua)
}

/** 인앱 브라우저에서 외부 브라우저로 열기 (Android/iOS 공통) */
function openInExternalBrowser(url: string) {
  // 카카오톡 인앱: intent scheme으로 외부 브라우저 열기
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) {
    // Android intent로 Chrome/기본 브라우저 열기
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
    window.location.href = intentUrl
  } else {
    // iOS: Safari로 열기 위해 window.open 사용
    // 카카오톡 iOS에서는 target=_blank + location 조합 시도
    window.open(url, '_system')
  }
}

export default function SocialLoginButtons() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [inApp, setInApp] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    setInApp(isInAppBrowser())
  }, [])

  const handleLogin = async (e: React.MouseEvent, provider: 'google' | 'kakao') => {
    e.preventDefault()
    e.stopPropagation()

    if (!isMounted || typeof window === 'undefined') return

    // 인앱 브라우저 감지 시 현재 페이지를 외부 브라우저로 열기
    if (isInAppBrowser()) {
      openInExternalBrowser(window.location.href)
      return
    }

    logger.log(`[OAuth] Attempting ${provider} login...`)

    try {
      setIsLoading(provider)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        logger.error(`[OAuth] ${provider} error:`, error)
        alert(`${provider} 로그인 중 오류가 발생했습니다: ${error.message}`)
        setIsLoading(null)
      } else if (data.url) {
        window.location.href = data.url
      } else {
        setIsLoading(null)
      }
    } catch (err) {
      logger.error(`[OAuth] Unexpected exception:`, err)
      setIsLoading(null)
    }
  }

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-3">
        <div className="w-full h-12 bg-stone-800/50 animate-pulse rounded-lg" />
        <div className="w-full h-12 bg-stone-800/50 animate-pulse rounded-lg" />
      </div>
    )
  }

  // 인앱 브라우저 안내 배너
  if (inApp) {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-center leading-relaxed">
          카카오톡 등 앱 내 브라우저에서는 소셜 로그인이 제한됩니다.
          <br />
          아래 버튼을 눌러 외부 브라우저에서 열어주세요.
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 border-stone-600 rounded-lg text-stone-300 hover:text-white hover:border-stone-400 transition-all"
          onClick={() => openInExternalBrowser(window.location.href)}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">외부 브라우저에서 열기</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <Button
        type="button"
        variant="outline"
        disabled={isLoading !== null}
        className="relative w-full h-12 bg-white hover:bg-stone-50 border-0 rounded-lg transition-all active:scale-[0.98]"
        onClick={(e) => handleLogin(e, 'google')}
      >
        <div className="flex items-center justify-center gap-3">
          <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] shrink-0">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          {isLoading === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          ) : (
            <span className="text-sm font-medium text-stone-700">Google로 계속하기</span>
          )}
        </div>
      </Button>

      {/* Kakao */}
      <Button
        type="button"
        disabled={isLoading !== null}
        className="relative w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 border-0 rounded-lg transition-all active:scale-[0.98]"
        onClick={(e) => handleLogin(e, 'kakao')}
      >
        <div className="flex items-center justify-center gap-3">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0 fill-[#191919]">
            <path d="M12 3C5.373 3 0 7.373 0 12.768c0 3.425 2.164 6.426 5.46 8.214-.24.87-1.745 6.344-1.797 6.64-.04.227.24.436.463.284.28-.192 4.416-3.01 5.166-3.525.882.128 1.794.197 2.708.197 6.627 0 12-4.373 12-9.768C24 7.373 18.627 3 12 3z" />
          </svg>
          {isLoading === 'kakao' ? (
            <Loader2 className="w-4 h-4 animate-spin text-stone-700" />
          ) : (
            <span className="text-sm font-medium text-[#191919]/85">카카오로 계속하기</span>
          )}
        </div>
      </Button>
    </div>
  )
}
