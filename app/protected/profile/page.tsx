import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { AVATAR_BLUR_DATA_URL } from '@/lib/utils/image'
import { logger } from '@/lib/utils/logger'
import { LogoutButton } from '@/components/logout-button'
import { getMonthlyAttendance } from '@/app/actions/payment/attendance'
import { DailyCheckIn } from '@/components/events/daily-check-in'
import {
  ChevronLeft,
  Settings,
  Star,
  ArrowRight,
  Crown,
  Shield,
  Headphones,
  User as UserIcon,
  Coins,
  BookOpen,
  Sparkles,
  Users,
  ScrollText,
  Flame,
  Bell,
} from 'lucide-react'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { getCurrentUserRole } from '@/app/actions/payment/products'
import { getUserLimitsSummary } from '@/app/actions/payment/membership'
import { Button } from '@/components/ui/button'
import { BokHubSection } from '@/components/analysis/bok-hub-section'
import { getSajuData } from '@/lib/domain/saju/saju'
import { isSolarCalendar } from '@/lib/domain/saju/calendar'

// 오행 한자 → 엠블럼 에셋 슬러그 + 한글 라벨 (사주 정체성 표시용)
const ELEMENT_MAP: Record<string, { slug: string; hanja: string; label: string }> = {
  木: { slug: 'wood', hanja: '木', label: '나무' },
  火: { slug: 'fire', hanja: '火', label: '불' },
  土: { slug: 'earth', hanja: '土', label: '흙' },
  金: { slug: 'metal', hanja: '金', label: '쇠' },
  水: { slug: 'water', hanja: '水', label: '물' },
}

interface SajuIdentity {
  dayGan: string // 일간 천간 (예: 己)
  elementHanja: string // 오행 한자 (예: 土)
  elementLabel: string // 오행 한글 (예: 흙)
  emblemUrl: string // 오행 엠블럼 에셋
}

export default async function MyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isGuest = !user

  // Guest Preview
  if (isGuest) {
    return (
      <div className="min-h-screen w-full max-w-[480px] mx-auto bg-background text-ink-light font-sans selection:bg-primary/30 pb-24 overflow-x-hidden relative">
        <div className="hanji-overlay" />

        <header className="flex items-center justify-between px-3 py-5 sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/20">
          <Link href="/protected" className="p-1 -ml-1 hover:bg-surface/10 transition-colors">
            <ChevronLeft className="w-6 h-6 text-ink-light/90" />
          </Link>
          <h1 className="text-sm font-serif tracking-[0.2em] text-ink-light/90">내 정보</h1>
          <div className="w-6 h-6" />
        </header>

        <section className="flex flex-col items-center pt-10 pb-8 relative z-10 opacity-60">
          <div className="w-28 h-28 rounded-full border-2 border-primary/20 overflow-hidden bg-surface flex items-center justify-center shadow-lg">
            <span className="font-serif text-4xl text-primary">客</span>
          </div>
        </section>

        <section className="px-3 relative z-10">
          <div className="bg-surface/40 border border-primary/20 rounded-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-5">
              <Sparkles className="w-32 h-32 text-primary" strokeWidth={0.5} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" strokeWidth={1} />
              </div>
              <h2 className="text-3xl font-serif text-ink-light mb-3">가입하고 서재 만들기</h2>
              <p className="text-sm text-ink-light/70 font-light max-w-md mx-auto mb-8 leading-relaxed">
                청담 해화당에 들어 당신의 사주와 신당을 갖추고,
                <br />
                운명 분석 기록을 남겨보세요
              </p>
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <Link href="/auth/sign-up">
                  <Button className="w-full bg-primary hover:bg-primary-dim text-background font-serif px-8 py-6 text-base">
                    가입하고 시작하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-ink-light hover:border-primary hover:bg-primary/10 font-serif px-8 py-6 text-base"
                  >
                    로그인
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ── 데이터 로드 (개별 예외 처리) ──
  interface ProfileRecord {
    full_name: string | null
    avatar_url: string | null
    birth_date: string | null
    birth_time: string | null
    calendar_type: string | null
    email: string | null
  }
  interface AttendanceStatus {
    checkedDates: string[]
    consecutiveStreak: number
    weekCount: number
    totalBokchae: number
    canCheckIn: boolean
  }

  let profile: ProfileRecord | null = null
  let walletBalance = 0
  let recordCount = 0
  let userRoleData: { role: string; userId: string | null } = { role: 'user', userId: null }
  let attendanceStatus: AttendanceStatus | null = null
  let seatedDeity: { name: string; portraitUrl: string | null } | null = null

  try {
    profile = (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
  } catch (error) {
    logger.error('Error fetching profile:', error)
  }
  try {
    walletBalance = await getWalletBalance()
  } catch (error) {
    logger.error('Error fetching wallet balance:', error)
  }
  try {
    attendanceStatus = (await getMonthlyAttendance()) as AttendanceStatus
  } catch (error) {
    logger.error('Error fetching attendance:', error)
  }
  try {
    const { count } = await supabase
      .from('analysis_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    recordCount = count ?? 0
  } catch (error) {
    logger.error('Error counting records:', error)
  }
  try {
    userRoleData = await getCurrentUserRole()
  } catch (error) {
    logger.error('Error fetching user role:', error)
  }
  // 좌정 主神 (프로필 아바타·정체성 연동)
  try {
    const { data: shrine } = await supabase.from('shrines').select('main_deity_id').eq('user_id', user.id).maybeSingle()
    if (shrine?.main_deity_id) {
      const { data: d } = await supabase
        .from('shrine_deities')
        .select('name, portrait_url')
        .eq('id', shrine.main_deity_id)
        .maybeSingle()
      if (d) seatedDeity = { name: d.name, portraitUrl: d.portrait_url }
    }
  } catch (error) {
    logger.error('Error fetching seated deity:', error)
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '벗'
  const isAdmin = userRoleData?.role === 'admin'

  const userLimits = await getUserLimitsSummary()
  const tier = isAdmin ? '관리자' : userLimits.tier || '무료 회원'
  const isSubscribed = userLimits.is_subscribed
  const talismanBalance = typeof walletBalance === 'number' ? walletBalance : 0

  // ── 사주 정체성 (일간·오행) 서버 계산 ──
  let identity: SajuIdentity | null = null
  if (profile?.birth_date) {
    try {
      const saju = getSajuData(
        profile.birth_date,
        profile.birth_time || '12:00',
        isSolarCalendar(profile.calendar_type)
      )
      const el = ELEMENT_MAP[saju.dayMasterElement]
      if (el) {
        identity = {
          dayGan: saju.dayMaster,
          elementHanja: el.hanja,
          elementLabel: el.label,
          emblemUrl: `/shrine/elements/${el.slug}.webp`,
        }
      }
    } catch (error) {
      logger.warn('[profile] saju identity skipped:', error)
    }
  }

  // 아바타: 직접 선택(오행 정령) > 자동(主神 > 엠블럼 > 소셜 > 모노그램). 레거시 도깨비 URL은 무시.
  const rawAvatar = profile?.avatar_url || user.user_metadata?.avatar_url || null
  const chosenAvatar = rawAvatar?.startsWith('/avatars/five/') ? rawAvatar : null
  const socialAvatar = rawAvatar && !rawAvatar.startsWith('/avatars/dokkaebi-') && !chosenAvatar ? rawAvatar : null

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-background text-ink-light font-sans selection:bg-primary/30 pb-24 overflow-x-hidden relative">
      <div className="hanji-overlay" />

      {/* ── 1. 정체성 히어로 ── */}
      <section
        aria-label="나의 서재"
        className="px-3 pt-7 pb-3 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.4em] text-gold-500/50 font-serif">나 의 서 재</span>
          <Link href="/protected/settings">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-ink-light/40 hover:text-primary hover:bg-primary/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4 bg-surface/30 border border-primary/20 rounded-2xl p-4 dancheong-border-top">
          {/* 아바타: 직접 선택 > 좌정 主神 초상 > 오행 엠블럼 > 소셜 이미지 > 모노그램 */}
          <Link href="/protected/settings" className="relative group cursor-pointer flex-shrink-0">
            <div className="w-[68px] h-[68px] rounded-full border border-primary/25 overflow-hidden bg-surface flex items-center justify-center shadow-md group-hover:border-primary/50 transition-all group-hover:scale-105">
              {chosenAvatar ? (
                <Image
                  src={chosenAvatar}
                  alt={displayName}
                  width={68}
                  height={68}
                  className="w-full h-full object-cover object-top"
                />
              ) : seatedDeity?.portraitUrl ? (
                <Image
                  src={seatedDeity.portraitUrl}
                  alt={seatedDeity.name}
                  width={68}
                  height={68}
                  className="w-full h-full object-cover object-top"
                />
              ) : identity ? (
                <Image
                  src={identity.emblemUrl}
                  alt={identity.elementLabel}
                  width={68}
                  height={68}
                  className="w-[80%] h-[80%] object-contain"
                />
              ) : socialAvatar ? (
                <Image
                  src={socialAvatar}
                  alt={displayName}
                  width={68}
                  height={68}
                  placeholder="blur"
                  blurDataURL={AVATAR_BLUR_DATA_URL}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-serif text-2xl text-primary">{displayName[0]}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-background p-1 rounded-full shadow-md border border-background group-hover:scale-110 transition-transform">
              {isAdmin ? (
                <Crown className="w-3 h-3 fill-current" strokeWidth={1} />
              ) : (
                <Star className="w-3 h-3 fill-current" strokeWidth={1} />
              )}
            </div>
          </Link>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif font-medium text-ink-light tracking-wide truncate">{displayName}</h2>
              <span className="flex-shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-full bg-gold-500/15 text-gold-300 font-serif">
                {tier}
              </span>
            </div>
            {/* 사주 정체성 한 줄 */}
            {identity ? (
              <p className="text-[12px] text-gold-200/80 font-serif mt-0.5 truncate">
                {identity.dayGan}
                {identity.elementHanja} 일간 · {identity.elementLabel}의 기운
              </p>
            ) : (
              <Link
                href="/protected/settings"
                className="text-[11px] text-gold-300/70 font-serif mt-0.5 underline underline-offset-2"
              >
                생년월일을 입력하고 내 사주를 밝혀보세요 →
              </Link>
            )}
            {seatedDeity && (
              <p className="text-[10.5px] text-ink-light/45 font-sans mt-0.5 truncate">主神 {seatedDeity.name} 좌정</p>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. 지표 스트립: 복채 · 멤버십 · 기록 ── */}
      <section
        aria-label="현황"
        className="px-3 mb-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-75 relative z-10"
      >
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/protected/membership"
            className="group rounded-xl border border-primary/20 bg-surface/40 p-3 flex flex-col items-center gap-1 transition-all hover:border-primary/50 hover:bg-surface/60 active:scale-95"
          >
            <Coins className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
            <span className="font-serif text-lg font-medium text-ink-light leading-none group-hover:text-primary">
              {talismanBalance}
            </span>
            <span className="text-[9.5px] text-ink-light/45">복채 만냥</span>
          </Link>
          <Link
            href="/protected/membership"
            className="group rounded-xl border border-primary/20 bg-surface/40 p-3 flex flex-col items-center gap-1 transition-all hover:border-primary/50 hover:bg-surface/60 active:scale-95"
          >
            <Crown className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
            <span className="font-serif text-[13px] font-medium text-ink-light leading-tight text-center mt-1 group-hover:text-primary">
              {tier}
            </span>
            <span className="text-[9.5px] text-primary/55">{isSubscribed ? '이용중' : '업그레이드'}</span>
          </Link>
          <Link
            href="/protected/history"
            className="group rounded-xl border border-primary/20 bg-surface/40 p-3 flex flex-col items-center gap-1 transition-all hover:border-primary/50 hover:bg-surface/60 active:scale-95"
          >
            <BookOpen className="h-4 w-4 text-primary/80" strokeWidth={1.5} />
            <span className="font-serif text-lg font-medium text-ink-light leading-none group-hover:text-primary">
              {recordCount}
            </span>
            <span className="text-[9.5px] text-ink-light/45">분석 기록</span>
          </Link>
        </div>
      </section>

      {/* ── 3. 오늘: 출석 ── */}
      <section className="px-3 mb-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 relative z-10">
        <DailyCheckIn
          canCheckIn={attendanceStatus?.canCheckIn ?? true}
          checkedDates={attendanceStatus?.checkedDates || []}
          weekCount={attendanceStatus?.weekCount || 0}
          totalBokchae={attendanceStatus?.totalBokchae || 0}
          consecutiveStreak={attendanceStatus?.consecutiveStreak || 0}
        />
      </section>

      {/* ── 4. 복 관리 허브 ── */}
      <section className="px-3 mb-6 relative z-10">
        <BokHubSection />
      </section>

      {/* ── 5. 바로가기 ── */}
      <section className="px-3 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px w-6 bg-gold-500/40" />
          <h3 className="text-xs font-serif text-gold-500/80 tracking-wider">바로가기</h3>
        </div>

        {isAdmin && (
          <Link href="/admin" className="group block mb-3">
            <div className="bg-gradient-to-r from-seal/20 via-seal/10 to-seal/20 border-2 border-seal/40 hover:border-seal rounded-xl p-4 flex items-center justify-center gap-3 transition-all relative overflow-hidden">
              <Shield className="w-5 h-5 text-seal relative z-10" strokeWidth={1} />
              <span className="text-sm font-serif text-seal tracking-widest relative z-10">관리자 대시보드</span>
              <ArrowRight
                className="w-4 h-4 text-seal/60 group-hover:translate-x-1 transition-transform relative z-10"
                strokeWidth={1}
              />
            </div>
          </Link>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { href: '/protected/shrine', icon: Flame, label: '나의 신당', accent: true },
            { href: '/protected/profile/manse', icon: ScrollText, label: '내 명식' },
            { href: '/protected/family', icon: Users, label: '인연 관리' },
            { href: '/protected/history', icon: BookOpen, label: '사주 기록' },
            { href: '/protected/membership', icon: Crown, label: '멤버십' },
            { href: '/protected/settings', icon: UserIcon, label: '내 정보 설정' },
          ].map(({ href, icon: Icon, label, accent }) => (
            <Link key={href} href={href} className="group">
              <div
                className={`rounded-xl border p-4 flex flex-col items-center justify-center gap-2 aspect-square transition-all duration-300 ${
                  accent
                    ? 'border-gold-500/40 bg-gold-500/[0.07] hover:border-gold-500/70 hover:bg-gold-500/[0.12]'
                    : 'border-primary/20 bg-surface/30 hover:border-primary/50 hover:bg-surface/50'
                }`}
              >
                <Icon
                  className={`w-7 h-7 transition-colors ${accent ? 'text-gold-400 group-hover:text-gold-300' : 'text-ink-light/60 group-hover:text-primary'}`}
                  strokeWidth={1}
                />
                <span
                  className={`text-[12px] font-serif text-center leading-tight transition-colors ${accent ? 'text-gold-200' : 'text-ink-light group-hover:text-primary'}`}
                >
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 6. 설정·지원 ── */}
      <section className="px-3 mb-10 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 relative z-10">
        <div className="rounded-xl border border-primary/15 bg-surface/20 divide-y divide-primary/10 overflow-hidden">
          <Link
            href="/protected/notifications"
            className="flex items-center justify-between p-4 hover:bg-surface/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Bell
                className="w-[18px] h-[18px] text-ink-light/50 group-hover:text-primary transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">알림 설정</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>
          <Link
            href="/privacy"
            className="flex items-center justify-between p-4 hover:bg-surface/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Shield
                className="w-[18px] h-[18px] text-ink-light/50 group-hover:text-primary transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">개인정보 처리방침</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>
          <Link
            href="/protected/support"
            className="flex items-center justify-between p-4 hover:bg-surface/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Headphones
                className="w-[18px] h-[18px] text-ink-light/50 group-hover:text-primary transition-colors"
                strokeWidth={1}
              />
              <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">고객센터</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
          </Link>
        </div>
      </section>

      {/* 로그아웃 */}
      <div className="text-center animate-in fade-in duration-1000 delay-500 relative z-10 pb-10">
        <LogoutButton
          variant="ghost"
          className="text-ink-light/35 text-[11px] tracking-[0.2em] hover:text-ink-light hover:bg-transparent transition-colors font-serif font-light"
        >
          로그아웃
        </LogoutButton>
      </div>
    </div>
  )
}
