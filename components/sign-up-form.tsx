'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SocialLoginButtons from '@/components/social-login-buttons'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('female')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Basic Validation
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

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="border-none bg-transparent shadow-none text-white overflow-hidden group relative">
        <CardContent className="grid gap-6 p-0">
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-5">
              {/* 이름 & 성별 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="name"
                    className="text-gold-100/60 text-xs font-bold uppercase tracking-wider pl-1"
                  >
                    이름
                  </Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all h-12 text-white placeholder:text-white/20 rounded-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-gold-100/60 text-xs font-bold uppercase tracking-wider pl-1">
                    성별
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 h-12 text-white rounded-none">
                      <SelectValue placeholder="성별 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-ink-900 border-white/10 text-white">
                      <SelectItem value="female">여성</SelectItem>
                      <SelectItem value="male">남성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 생년월일 & 양력/음력 */}
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label
                    htmlFor="birthdate"
                    className="text-gold-100/60 text-xs font-bold uppercase tracking-wider pl-1"
                  >
                    생년월일
                  </Label>
                  <RadioGroup
                    value={calendarType}
                    onValueChange={setCalendarType}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="solar"
                        id="solar"
                        className="border-gold-400 text-gold-400 w-4 h-4"
                      />
                      <Label
                        htmlFor="solar"
                        className="text-white/70 text-xs cursor-pointer hover:text-white transition-colors"
                      >
                        양력
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="lunar"
                        id="lunar"
                        className="border-gold-400 text-gold-400 w-4 h-4"
                      />
                      <Label
                        htmlFor="lunar"
                        className="text-white/70 text-xs cursor-pointer hover:text-white transition-colors"
                      >
                        음력
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="birthdate"
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all h-12 text-white placeholder:text-white/20 rounded-none [color-scheme:dark]"
                  />
                  <Select value={birthTime} onValueChange={setBirthTime}>
                    <SelectTrigger className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 h-12 text-white rounded-none">
                      <SelectValue placeholder="태어난 시간 (자시~해시)" />
                    </SelectTrigger>
                    <SelectContent className="bg-ink-900 border-white/10 text-white max-h-[300px]">
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
              <div className="grid gap-2">
                <Label
                  htmlFor="email"
                  className="text-gold-100/60 text-xs font-bold uppercase tracking-wider pl-1"
                >
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all h-12 text-white placeholder:text-white/20 rounded-none"
                />
              </div>

              {/* 비밀번호 */}
              <div className="grid gap-2">
                <Label
                  htmlFor="password"
                  className="text-gold-100/60 text-xs font-bold uppercase tracking-wider pl-1"
                >
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all h-12 text-white rounded-none"
                />
              </div>

              {/* 비밀번호 확인 */}
              <div className="grid gap-2">
                <Label
                  htmlFor="repeat-password"
                  className="text-gold-100/60 text-xs font-bold uppercase tracking-wider pl-1"
                >
                  비밀번호 확인
                </Label>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 transition-all h-12 text-white rounded-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-none bg-red-500/10 border border-red-500/20 text-xs text-red-400 animate-in fade-in slide-in-from-top-1 text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 font-bold bg-gold-500 text-ink-950 hover:bg-gold-400 active:scale-[0.98] transition-all rounded-none shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] mt-2 font-serif tracking-wide"
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

              <SocialLoginButtons />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
