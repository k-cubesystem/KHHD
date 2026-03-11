'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SocialLoginButtons from '@/components/social-login-buttons'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (!name.trim()) {
      setError('이름을 입력해주세요.')
      setIsLoading(false)
      return
    }
    if (!birthDate) {
      setError('생년월일을 입력해주세요.')
      setIsLoading(false)
      return
    }
    if (password !== repeatPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setIsLoading(false)
      return
    }
    if (!agreeTerms || !agreePrivacy) {
      setError('이용약관 및 개인정보처리방침에 동의해주세요.')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: name,
            gender,
            birth_date: birthDate,
            birth_time: birthTime,
            calendar_type: calendarType,
          },
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'h-12 bg-stone-900/60 border border-stone-700/50 rounded-lg text-white placeholder:text-stone-600 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all px-4'
  const labelClass = 'text-stone-400 text-xs font-medium tracking-wide'
  const selectTriggerClass =
    'h-12 bg-stone-900/60 border border-stone-700/50 rounded-lg text-white focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20'

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <form onSubmit={handleSignUp} className="space-y-4">
        {/* 이름 & 성별 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name" className={labelClass}>
              이름
            </Label>
            <Input
              id="name"
              placeholder="홍길동"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>성별</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="성별 선택" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-stone-700 text-white">
                <SelectItem value="female">여성</SelectItem>
                <SelectItem value="male">남성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 생년월일 & 양력/음력 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="birthdate" className={labelClass}>
              생년월일
            </Label>
            <RadioGroup value={calendarType} onValueChange={setCalendarType} className="flex gap-3">
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="solar" id="solar" className="border-gold-400 text-gold-400 w-3.5 h-3.5" />
                <Label
                  htmlFor="solar"
                  className="text-stone-400 text-xs cursor-pointer hover:text-white transition-colors"
                >
                  양력
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="lunar" id="lunar" className="border-gold-400 text-gold-400 w-3.5 h-3.5" />
                <Label
                  htmlFor="lunar"
                  className="text-stone-400 text-xs cursor-pointer hover:text-white transition-colors"
                >
                  음력
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="birthdate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={cn(inputClass, '[color-scheme:dark]')}
            />
            <Select value={birthTime} onValueChange={setBirthTime}>
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="태어난 시간" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-stone-700 text-white max-h-[300px]">
                <SelectItem value="자시 (23:30 ~ 01:29)">자시 (23:30 ~ 01:29)</SelectItem>
                <SelectItem value="축시 (01:30 ~ 03:29)">축시 (01:30 ~ 03:29)</SelectItem>
                <SelectItem value="인시 (03:30 ~ 05:29)">인시 (03:30 ~ 05:29)</SelectItem>
                <SelectItem value="묘시 (05:30 ~ 07:29)">묘시 (05:30 ~ 07:29)</SelectItem>
                <SelectItem value="진시 (07:30 ~ 09:29)">진시 (07:30 ~ 09:29)</SelectItem>
                <SelectItem value="사시 (09:30 ~ 11:29)">사시 (09:30 ~ 11:29)</SelectItem>
                <SelectItem value="오시 (11:30 ~ 13:29)">오시 (11:30 ~ 13:29)</SelectItem>
                <SelectItem value="미시 (13:30 ~ 15:29)">미시 (13:30 ~ 15:29)</SelectItem>
                <SelectItem value="신시 (15:30 ~ 17:29)">신시 (15:30 ~ 17:29)</SelectItem>
                <SelectItem value="유시 (17:30 ~ 19:29)">유시 (17:30 ~ 19:29)</SelectItem>
                <SelectItem value="술시 (19:30 ~ 21:29)">술시 (19:30 ~ 21:29)</SelectItem>
                <SelectItem value="해시 (21:30 ~ 23:29)">해시 (21:30 ~ 23:29)</SelectItem>
                <SelectItem value="모름">시간 모름</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 이메일 */}
        <div className="space-y-2">
          <Label htmlFor="signup-email" className={labelClass}>
            이메일
          </Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <Label htmlFor="signup-password" className={labelClass}>
            비밀번호
          </Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, 'pr-11')}
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

        {/* 비밀번호 확인 */}
        <div className="space-y-2">
          <Label htmlFor="repeat-password" className={labelClass}>
            비밀번호 확인
          </Label>
          <Input
            id="repeat-password"
            type={showPassword ? 'text' : 'password'}
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* 약관 동의 */}
        <div className="space-y-3 pt-1">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="agree-terms"
              checked={agreeTerms}
              onCheckedChange={(v) => setAgreeTerms(v === true)}
              className="mt-0.5 border-stone-600 data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500"
            />
            <Label htmlFor="agree-terms" className="text-xs text-stone-400 leading-relaxed cursor-pointer">
              <Link href="/terms" target="_blank" className="text-gold-400 underline underline-offset-2">
                이용약관
              </Link>
              에 동의합니다 (필수)
            </Label>
          </div>
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="agree-privacy"
              checked={agreePrivacy}
              onCheckedChange={(v) => setAgreePrivacy(v === true)}
              className="mt-0.5 border-stone-600 data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500"
            />
            <Label htmlFor="agree-privacy" className="text-xs text-stone-400 leading-relaxed cursor-pointer">
              <Link href="/privacy" target="_blank" className="text-gold-400 underline underline-offset-2">
                개인정보처리방침
              </Link>
              에 동의합니다 (필수)
            </Label>
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
          className="w-full h-12 font-bold bg-gold-500 text-stone-950 hover:bg-gold-400 active:scale-[0.98] transition-all rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] font-serif tracking-wider text-[15px] mt-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>가입 처리 중...</span>
            </div>
          ) : (
            '회원가입'
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

      {/* Login Link */}
      <p className="mt-8 text-center text-sm text-stone-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/auth/login" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
          로그인
        </Link>
      </p>
    </div>
  )
}
