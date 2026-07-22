'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, BookOpen, Compass, User as UserIcon, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIVE_AVATARS } from '@/components/family/five-avatar-selector'
import { DEITY_AVATARS } from '@/lib/domain/family/avatars'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { saveProfile, saveSelfFamilyMember } from '@/app/actions/user/profile'
import { KakaoAddressSearch } from './kakao-address-search'

interface SettingsUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

interface SettingsProfile {
  full_name: string | null
  avatar_url: string | null
  gender: string | null
  birth_date: string | null
  birth_time: string | null
  calendar_type: string | null
  is_leap_month?: boolean | null
  home_address: string | null
  work_address: string | null
}

interface SettingsFamilyMember {
  name: string | null
  gender: string | null
  birth_date: string | null
  birth_time: string | null
  calendar_type: string | null
  is_leap_month?: boolean | null
}

export function SettingsForm({
  user,
  profile,
  familyMember,
}: {
  user: SettingsUser
  profile: SettingsProfile | null
  familyMember?: SettingsFamilyMember | null
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // 기본 정보 (family_members 우선, 없으면 profile)
  const [name, setName] = useState(familyMember?.name || profile?.full_name || '')
  const [gender, setGender] = useState(familyMember?.gender || profile?.gender || 'male')

  // 프로필 아바타 선택: 자동(신당 연동) / 정령·신위 직접 선택(경로 저장) / 소셜 사진
  const savedAvatar =
    profile?.avatar_url && !profile.avatar_url.startsWith('/avatars/dokkaebi-') ? profile.avatar_url : ''
  // 오행 정령(/avatars/five/) + 신위(/shrine/deities/) 둘 다 '직접 선택' 모드로 인정
  const isFiveSaved = savedAvatar.startsWith('/avatars/five/') || savedAvatar.startsWith('/shrine/deities/')
  const [avatarChoice, setAvatarChoice] = useState<'auto' | 'five' | 'social'>(
    isFiveSaved ? 'five' : savedAvatar ? 'social' : 'auto'
  )
  const [fiveSrc, setFiveSrc] = useState(isFiveSaved ? savedAvatar : FIVE_AVATARS[0].src)

  // 천(天) - 사주 정보 (family_members 우선)
  const [birthDate, setBirthDate] = useState(familyMember?.birth_date || profile?.birth_date || '')
  // 생시: 저장값이 없으면 '시간 모름'(unknown)으로 명시 — 조용한 12:00 강제 대신 정직한 표시
  const savedBirthTime = familyMember?.birth_time || profile?.birth_time || ''
  const [birthTime, setBirthTime] = useState<string>(savedBirthTime || 'unknown')
  // 달력: 레거시 'lunar_leap' → 'lunar' + 윤달 true 로 정규화(calendar_type 은 solar|lunar 로 통일)
  const rawCalendar = familyMember?.calendar_type || profile?.calendar_type || 'solar'
  const [calendarType, setCalendarType] = useState(rawCalendar === 'lunar_leap' ? 'lunar' : rawCalendar)
  const [isLeapMonth, setIsLeapMonth] = useState<boolean>(
    rawCalendar === 'lunar_leap' || familyMember?.is_leap_month === true || profile?.is_leap_month === true
  )

  // 지(地) - 풍수 정보 (profiles)
  const [homeAddress, setHomeAddress] = useState(profile?.home_address || '')
  const [workAddress, setWorkAddress] = useState(profile?.work_address || '')

  // 소셜 아바타 URL (변경 불가, 표시용)
  const socialAvatarUrl = user?.user_metadata?.avatar_url || null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const finalAvatarUrl = avatarChoice === 'five' ? fiveSrc : avatarChoice === 'social' ? socialAvatarUrl || '' : ''
      // 시간 모름(unknown) → 빈 값(서버에서 null 저장). 윤달은 음력일 때만 유효.
      const resolvedBirthTime = birthTime === 'unknown' ? '' : birthTime
      const resolvedLeap = calendarType === 'lunar' ? isLeapMonth : false

      // 1. 프로필 저장 (서버 액션 - admin client로 RLS 우회)
      const profileResult = await saveProfile({
        fullName: name,
        gender,
        birthDate,
        birthTime: resolvedBirthTime,
        calendarType,
        isLeapMonth: resolvedLeap,
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
        birthTime: resolvedBirthTime,
        calendarType,
        isLeapMonth: resolvedLeap,
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
      {/* 프로필 아바타 */}
      <Card className="bg-surface/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif font-light text-ink-light flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1} />
            프로필 아바타
          </CardTitle>
          <p className="text-xs text-ink-light/50 font-light mt-1">나를 대신할 얼굴을 고르세요</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={avatarChoice}
            onValueChange={(v) => setAvatarChoice(v as 'auto' | 'five' | 'social')}
            className="flex flex-wrap gap-4 pt-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="avatar-auto" className="border-primary text-primary" />
              <Label htmlFor="avatar-auto" className="font-light cursor-pointer">
                자동 (신당 연동)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="five" id="avatar-five" className="border-primary text-primary" />
              <Label htmlFor="avatar-five" className="font-light cursor-pointer">
                정령 · 신위
              </Label>
            </div>
            {socialAvatarUrl && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="social" id="avatar-social" className="border-primary text-primary" />
                <Label htmlFor="avatar-social" className="font-light cursor-pointer">
                  소셜 사진
                </Label>
              </div>
            )}
          </RadioGroup>

          {avatarChoice === 'auto' && (
            <p className="text-xs text-ink-light/50 font-light">
              좌정 主神 초상 → 일간 오행 엠블럼 → 소셜 사진 순으로 자동 반영됩니다.
            </p>
          )}

          {avatarChoice === 'five' && (
            <div className="space-y-3">
              {/* 오행 정령 5종 */}
              <div>
                <p className="text-[10px] text-ink-light/40 font-serif mb-1.5">오행 정령</p>
                <div className="grid grid-cols-5 gap-2">
                  {FIVE_AVATARS.map((avatar) => (
                    <AvatarTile
                      key={avatar.id}
                      src={avatar.src}
                      label={avatar.label}
                      color={avatar.color}
                      selected={fiveSrc === avatar.src}
                      onSelect={() => setFiveSrc(avatar.src)}
                    />
                  ))}
                </div>
              </div>
              {/* 신위 17종 — 가족 아바타와 동일 카탈로그 재사용(경로 저장) */}
              <div>
                <p className="text-[10px] text-ink-light/40 font-serif mb-1.5">신위 (神位)</p>
                <div className="grid grid-cols-5 gap-2">
                  {DEITY_AVATARS.map((avatar) => (
                    <AvatarTile
                      key={avatar.id}
                      src={avatar.src}
                      label={avatar.label}
                      color={avatar.color}
                      selected={fiveSrc === avatar.src}
                      onSelect={() => setFiveSrc(avatar.src)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {avatarChoice === 'social' && socialAvatarUrl && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10">
                <Image
                  src={socialAvatarUrl}
                  alt="소셜 프로필"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-ink-light/50 font-light">로그인한 소셜 계정의 사진을 사용합니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <SelectItem value="unknown">시간 모름 (정오 기준 계산)</SelectItem>
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
              </SelectContent>
            </Select>
            {calendarType === 'lunar' && (
              <label className="flex items-center gap-2 pt-1.5 cursor-pointer">
                <Checkbox
                  checked={isLeapMonth}
                  onCheckedChange={(v) => setIsLeapMonth(v === true)}
                  className="border-primary"
                />
                <span className="text-sm font-light text-ink-light">윤달(閏月)에 태어났어요</span>
              </label>
            )}
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

/** 아바타 선택 타일 — 정령·신위 공용(경로 저장). */
function AvatarTile({
  src,
  label,
  color,
  selected,
  onSelect,
}: {
  src: string
  label: string
  color: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 group',
        selected
          ? 'bg-primary/10 border border-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
          : 'bg-surface/30 border border-white/5 hover:bg-surface/50 hover:border-white/10'
      )}
    >
      <div
        className={cn(
          'w-11 h-11 rounded-full overflow-hidden border transition-transform duration-300',
          selected ? 'scale-110 border-primary/40' : 'border-white/10 group-hover:scale-105'
        )}
        style={{ backgroundColor: color + '18' }}
      >
        <Image src={src} alt={label} width={44} height={44} className="w-full h-full object-cover object-top" />
      </div>
      <span
        className={cn('text-[9.5px] font-medium whitespace-nowrap', selected ? 'text-primary' : 'text-ink-light/50')}
      >
        {label}
      </span>
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-background flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}
