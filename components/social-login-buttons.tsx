'use client'

import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useState, useEffect } from 'react'

export default function SocialLoginButtons() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLogin = async (e: React.MouseEvent, provider: 'google' | 'kakao') => {
    e.preventDefault()
    e.stopPropagation()

    if (!isMounted || typeof window === 'undefined') return

    logger.log(`[OAuth] 🚀 Attempting ${provider} login...`)

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
      <div className="flex flex-col gap-3 w-full max-w-sm mx-auto opacity-50 pointer-events-none">
        <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
        <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {/* Official Google Button Style */}
      <Button
        type="button"
        disabled={isLoading !== null}
        className="relative w-full h-12 bg-white text-black/54 hover:bg-[#F8F8F8] border border-[#dadce0] transition-all duration-200 active:bg-[#F1F3F4] rounded-none group"
        onClick={(e) => handleLogin(e, 'google')}
      >
        <div className="flex items-center justify-center gap-3 w-full">
          <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
            {/* Official Colored 'G' Logo SVG */}
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full block">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              ></path>
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              ></path>
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              ></path>
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              ></path>
            </svg>
          </div>
          <span className="font-roboto font-medium text-[14px] text-[#3c4043]">
            {isLoading === 'google' ? '연결 중...' : 'Google 계정으로 로그인'}
          </span>
        </div>
      </Button>

      {/* Official Kakao Button Style */}
      <Button
        type="button"
        disabled={isLoading !== null}
        className="relative w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black border-none transition-all duration-200 active:scale-[0.99] rounded-none"
        onClick={(e) => handleLogin(e, 'kakao')}
      >
        <div className="flex items-center justify-center gap-3 w-full">
          <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
            {/* Official Kakao Speech Bubble SVG */}
            <svg viewBox="0 0 24 24" className="w-full h-full fill-[#000000]">
              <path d="M12 3C5.373 3 0 7.373 0 12.768c0 3.425 2.164 6.426 5.46 8.214-.24.87-1.745 6.344-1.797 6.64-.04.227.24.436.463.284.28-.192 4.416-3.01 5.166-3.525.882.128 1.794.197 2.708.197 6.627 0 12-4.373 12-9.768C24 7.373 18.627 3 12 3z" />
            </svg>
          </div>
          <span className="font-sans font-medium text-[14px] text-[#000000]/85">
            {isLoading === 'kakao' ? '연결 중...' : '카카오 로그인'}
          </span>
        </div>
      </Button>
    </div>
  )
}
