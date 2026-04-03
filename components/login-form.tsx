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
      router.push('/protected')
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
          <Label htmlFor="email" className="text-stone-400 text-xs font-medium tracking-wide">
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
            className="h-12 bg-stone-900/60 border border-stone-700/50 rounded-lg text-white placeholder:text-stone-600 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all px-4"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-stone-400 text-xs font-medium tracking-wide">
              비밀번호
            </Label>
            <Link href="/auth/reset-password" className="text-xs text-stone-500 hover:text-gold-400 transition-colors">
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
              className="h-12 bg-stone-900/60 border border-stone-700/50 rounded-lg text-white focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all px-4 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 font-bold bg-gold-500 text-stone-950 hover:bg-gold-400 active:scale-[0.98] transition-all rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] font-serif tracking-wider text-[15px]"
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
        <div className="flex-1 h-px bg-stone-700/50" />
        <span className="text-[11px] text-stone-500 tracking-wide">또는</span>
        <div className="flex-1 h-px bg-stone-700/50" />
      </div>

      {/* Social Login */}
      <SocialLoginButtons />

      {/* Sign Up Link */}
      <p className="mt-8 text-center text-sm text-stone-500">
        계정이 없으신가요?{' '}
        <Link href="/auth/sign-up" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
          회원가입
        </Link>
      </p>
    </div>
  )
}
