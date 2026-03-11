'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, BookOpen, Compass, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveProfile, saveSelfFamilyMember } from '@/app/actions/user/profile'
import { AvatarSelector } from './avatar-selector'
import { KakaoAddressSearch } from './kakao-address-search'
import type { DokkaebiAvatarId } from '@/lib/constants/dokkaebi-avatars'

export function SettingsForm({ user, profile, familyMember }: { user: any; profile: any; familyMember?: any }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // 기본 정보 (family_members 우선, 없으면 profile)
  const [name, setName] = useState(familyMember?.name || profile?.full_name || '')
  const [gender, setGender] = useState(familyMember?.gender || profile?.gender || 'male')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')

  // 천(天) - 사주 정보 (family_members 우선)
  const [birthDate, setBirthDate] = useState(familyMember?.birth_date || profile?.birth_date || '')
  const [birthTime, setBirthTime] = useState(familyMember?.birth_time || profile?.birth_time || '')
  const [calendarType, setCalendarType] = useState(familyMember?.calendar_type || profile?.calendar_type || 'solar')

  // 지(地) - 풍수 정보 (profiles)
  const [homeAddress, setHomeAddress] = useState(profile?.home_address || '')
  const [workAddress, setWorkAddress] = useState(profile?.work_address || '')

  // 소셜 아바타 URL (변경 불가, 표시용)
  const socialAvatarUrl = user?.user_metadata?.avatar_url || null

  const handleAvatarSelect = (avatarId: DokkaebiAvatarId) => {
    setAvatarUrl(`/avatars/${avatarId}.svg`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const finalAvatarUrl = avatarUrl || socialAvatarUrl || ''

      // 1. 프로필 저장 (서버 액션 - admin client로 RLS 우회)
      const profileResult = await saveProfile({
        fullName: name,
        gender,
        birthDate,
        birthTime,
        calendarType,
        homeAddress,
        workAddress,
        avatarUrl: finalAvatarUrl,
      })

      if (!profileResult.success) {
        toast.error('프로필 저장 실패: ' + profileResult.error)
        return
      }

      // 2. 생년월일 없으면 기본 정보만 저장
      if (!birthDate) {
        toast.success('기본 정보가 저장되었습니다. (사주 정보를 저장하려면 생년월일을 입력해주세요)')
        router.refresh()
        return
      }

      // 3. family_members 저장 (서버 액션 - admin client로 RLS 우회)
      const familyResult = await saveSelfFamilyMember({
        userId: user.id,
        name,
        gender,
        birthDate,
        birthTime,
        calendarType,
      })

      if (!familyResult.success) {
        toast.error('사주 정보 저장 실패: ' + familyResult.error)
        return
      }

      toast.success('정보가 성공적으로 저장되었습니다.')
      router.refresh()
    } catch (error: unknown) {
      toast.error('저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card className="bg-surface/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif font-light text-ink-light flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary" strokeWidth={1} />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-light text-ink-light">
              이름
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface/50 border-primary/20 focus:border-primary font-sans font-light"
              placeholder="홍길동"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-light text-ink-light">성별</Label>
            <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" className="border-primary text-primary" />
                <Label htmlFor="male" className="font-light cursor-pointer">
                  남성
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" className="border-primary text-primary" />
                <Label htmlFor="female" className="font-light cursor-pointer">
                  여성
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 아바타 선택 */}
          <div className="pt-2">
            <AvatarSelector currentAvatar={avatarUrl} onSelect={handleAvatarSelect} socialAvatarUrl={socialAvatarUrl} />
          </div>
        </CardContent>
      </Card>

      {/* 천(天) - 사주 정보 */}
      <Card className="bg-surface/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif font-light text-ink-light flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" strokeWidth={1} />
            천(天) - 사주 정보
          </CardTitle>
          <p className="text-xs text-ink-light/50 font-light mt-1">태어난 시간에 담긴 하늘의 섭리</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate" className="text-sm font-light text-ink-light">
                생년월일
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-surface/50 border-primary/20 focus:border-primary font-sans font-light [color-scheme:dark]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-light text-ink-light">태어난 시간</Label>
              <Select value={birthTime} onValueChange={setBirthTime}>
                <SelectTrigger className="bg-surface/50 border-primary/20 font-light">
                  <SelectValue placeholder="시간 선택" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-primary/20">
                  <SelectItem value="23:00">子時 (자시) 23:00-01:00</SelectItem>
                  <SelectItem value="01:00">丑時 (축시) 01:00-03:00</SelectItem>
                  <SelectItem value="03:00">寅時 (인시) 03:00-05:00</SelectItem>
                  <SelectItem value="05:00">卯時 (묘시) 05:00-07:00</SelectItem>
                  <SelectItem value="07:00">辰時 (진시) 07:00-09:00</SelectItem>
                  <SelectItem value="09:00">巳時 (사시) 09:00-11:00</SelectItem>
                  <SelectItem value="11:00">午時 (오시) 11:00-13:00</SelectItem>
                  <SelectItem value="13:00">未時 (미시) 13:00-15:00</SelectItem>
                  <SelectItem value="15:00">申時 (신시) 15:00-17:00</SelectItem>
                  <SelectItem value="17:00">酉時 (유시) 17:00-19:00</SelectItem>
                  <SelectItem value="19:00">戌時 (술시) 19:00-21:00</SelectItem>
                  <SelectItem value="21:00">亥時 (해시) 21:00-23:00</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-light text-ink-light">양력/음력</Label>
            <Select value={calendarType} onValueChange={setCalendarType}>
              <SelectTrigger className="bg-surface/50 border-primary/20 font-light">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-primary/20">
                <SelectItem value="solar">양력</SelectItem>
                <SelectItem value="lunar">음력</SelectItem>
                <SelectItem value="lunar_leap">음력(윤달)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 지(地) - 풍수 정보 */}
      <Card className="bg-surface/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif font-light text-ink-light flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" strokeWidth={1} />
            지(地) - 풍수 정보
          </CardTitle>
          <p className="text-xs text-ink-light/50 font-light mt-1">당신을 둘러싼 공간과 환경의 기운</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <KakaoAddressSearch
            label="사는곳 (선택사항)"
            value={homeAddress}
            onChange={setHomeAddress}
            placeholder="거주하시는 곳의 주소를 검색하세요 (선택사항)"
          />

          <KakaoAddressSearch
            label="일하는곳 (선택사항)"
            value={workAddress}
            onChange={setWorkAddress}
            placeholder="근무하시는 곳의 주소를 검색하세요 (선택사항)"
          />

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <Compass className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={1} />
              <div className="space-y-1">
                <p className="text-xs font-light text-ink-light">
                  주소는 <strong className="text-primary">선택사항</strong>이지만, 입력하시면{' '}
                  <strong className="text-primary">더 정확하고 풍부한 풍수 분석 결과</strong>를 얻을 수 있습니다.
                </p>
                <p className="text-xs font-light text-primary/80">
                  * 공간별 기운의 흐름을 파악하여 맞춤형 풍수 조언을 제공합니다
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="pt-4">
        <Button type="submit" className="w-full h-12" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" strokeWidth={1} />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" strokeWidth={1} />
              저장하기
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
