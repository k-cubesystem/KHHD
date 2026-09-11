'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import SocialLoginButtons from '@/components/social-login-buttons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { GA } from '@/lib/analytics/ga4'
import { safeNextPath } from '@/lib/auth/next-path'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      GA.login()
      // ?next= 가 있으면 그리로 돌려보낸다(가족 초대 링크 등). 오픈 리다이렉트는 safeNextPath 가 막는다.
      router.push(safeNextPath(searchParams.get('next')) ?? '/protected')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-ink-light/60 text-xs font-medium tracking-wide">
            이메일
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-surface/60 border border-white/10 rounded-lg text-white placeholder:text-ink-light/30 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all px-4"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-ink-light/60 text-xs font-medium tracking-wide">
              비밀번호
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-ink-light/50 hover:text-gold-400 transition-colors"
            >
              비밀번호 찾기
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-surface/60 border border-white/10 rounded-lg text-white focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all px-4 pr-11"
            />
            {/* 아이콘만 두면 실제 누를 수 있는 넓이가 16x16 이 된다(라이브 실측). 모바일에서
                손끝으로 맞히기 어렵고, 라벨이 없어 스크린리더에는 이름 없는 버튼으로 읽힌다. */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-light/50 transition-colors hover:text-ink-light/80"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-error-light border border-error-border text-xs text-error-text text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 font-bold bg-gold-500 text-ink-900 hover:bg-gold-400 active:scale-[0.98] transition-all rounded-lg shadow-gold-glow hover:shadow-gold-glow-lg font-serif tracking-wider text-[15px]"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>운명의 문을 여는 중...</span>
            </div>
          ) : (
            '로그인'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[11px] text-ink-light/50 tracking-wide">또는</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Social Login */}
      <SocialLoginButtons />

      {/* Sign Up Link */}
      <p className="mt-8 text-center text-sm text-ink-light/50">
        계정이 없으신가요?{' '}
        <Link href="/auth/sign-up" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
          회원가입
        </Link>
      </p>
    </div>
  )
}
