'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { LuckyRouletteButton } from '@/components/events/lucky-roulette-button'
import { AttendanceMiniCard } from '@/components/attendance/attendance-mini-card'
import { SeasonalEventBanner } from '@/components/events/seasonal-event-banner'
import { Card } from '@/components/ui/card'
import {
  Flame,
  Wallet,
  Heart,
  Building2,
  GraduationCap,
  TrendingUp,
  MessageCircle,
  ChevronRight,
  Users,
  Hand,
  ScanFace,
  Compass,
} from 'lucide-react'

const MasterpieceSection = dynamic(
  () => import('./dashboard/MasterpieceSection').then((mod) => ({ default: mod.MasterpieceSection })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-white/5 rounded-2xl" /> },
)

interface RouletteStatus {
  canSpin: boolean
  nextAvailableTime?: string
}

interface AttendanceStatus {
  canCheckIn: boolean
  alreadyChecked?: boolean
}

interface WeeklyAttendance {
  weekDays: Array<{
    date: string
    dayLabel: string
    checked: boolean
    isToday: boolean
    isFuture: boolean
  }>
  weekCount: number
  totalBokchae: number
}

interface AnalysisDashboardProps {
  rouletteStatus: RouletteStatus | null
  attendanceStatus?: AttendanceStatus
  weeklyAttendance?: WeeklyAttendance
}

const STUDIO_CARDS = [
  {
    id: 'compatibility',
    label: '궁합',
    desc: '두 사람의 오행 기운으로 관계의 해법을 찾습니다',
    icon: Users,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    href: '/protected/analysis/compatibility',
  },
  {
    id: 'face',
    label: '관상',
    desc: '얼굴에 새겨진 운명의 지도를 읽어드립니다',
    icon: ScanFace,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    href: '/protected/studio/face',
  },
  {
    id: 'palm',
    label: '손금',
    desc: '손바닥 위의 생명선·지능선·감정선을 해석합니다',
    icon: Hand,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    href: '/protected/studio/palm',
  },
  {
    id: 'fengshui',
    label: '풍수',
    desc: '공간의 기운을 분석하여 길한 배치를 제안합니다',
    icon: Compass,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    href: '/protected/studio/fengshui',
  },
] as const

const MENU_CARDS = [
  {
    id: 'year2026',
    label: '2026 병오년',
    desc: '붉은 말의 해 운명 흐름',
    icon: Flame,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    href: '/protected/analysis/new-year',
    badge: '2026',
  },
  {
    id: 'ai-shaman',
    label: '고민 상담',
    desc: 'AI 해화지기',
    icon: MessageCircle,
    color: 'text-gold-500',
    bg: 'bg-gold-500/15',
    href: '/protected/ai-shaman',
  },
  {
    id: 'wealth',
    label: '재물운',
    desc: '투자·매매 흐름',
    icon: Wallet,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    href: '/protected/analysis/theme/wealth',
  },
  {
    id: 'love',
    label: '애정운',
    desc: '만남·결혼 시기',
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    href: '/protected/analysis/theme/love',
  },
  {
    id: 'career',
    label: '직장운',
    desc: '승진·이직 타이밍',
    icon: Building2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    href: '/protected/analysis/theme/career',
  },
  {
    id: 'exam',
    label: '학업운',
    desc: '합격·자격 운',
    icon: GraduationCap,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    href: '/protected/analysis/theme/exam',
  },
  {
    id: 'estate',
    label: '부동산',
    desc: '문서·이사 길일',
    icon: TrendingUp,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    href: '/protected/analysis/theme/estate',
  },
] as const

export function AnalysisDashboard({
  rouletteStatus,
  attendanceStatus,
  weeklyAttendance,
}: AnalysisDashboardProps) {
  const router = useRouter()

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-screen-sm mx-auto pb-40 px-2 space-y-6"
    >
      {/* 1. Seasonal Event Banner */}
      <motion.div variants={fadeInUp}>
        <SeasonalEventBanner />
      </motion.div>

      {/* 3. 나의 사주·운명 풀어보기 */}
      <motion.div variants={fadeInUp}>
        <MasterpieceSection />
      </motion.div>

      {/* 4. 궁합·관상·손금·풍수 (2열) */}
      <motion.div variants={fadeInUp} className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 className="text-sm font-serif text-gold-500/80">천지인 통합 분석</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STUDIO_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.id}
                onClick={() => router.push(card.href)}
                className="group cursor-pointer card-glass-manse transition-all duration-200 p-4 rounded-xl active:scale-[0.97] hover:border-gold-500/30 relative overflow-hidden"
              >
                <div className="flex flex-col gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`w-5 h-5 ${card.color}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-ink-light">{card.label}</span>
                    <span className="block text-[11px] text-ink-light/50 font-light mt-1 leading-relaxed">
                      {card.desc}
                    </span>
                  </div>
                </div>
                <ChevronRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-ink-light/20 group-hover:text-gold-500/50 transition-colors" />
              </Card>
            )
          })}
        </div>
      </motion.div>

      {/* 5. 테마별 트렌드 (2열) */}
      <motion.div variants={fadeInUp} className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 className="text-sm font-serif text-gold-500/80">더 깊이 들여다보기</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MENU_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.id}
                onClick={() => router.push(card.href)}
                className="group cursor-pointer card-glass-manse transition-all duration-200 p-4 rounded-xl active:scale-[0.97] hover:border-gold-500/30 relative overflow-hidden"
              >
                {'badge' in card && card.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                    {card.badge}
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className={`w-5 h-5 ${card.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-light">{card.label}</span>
                    <span className="block text-[11px] text-ink-light/50 font-light mt-0.5">{card.desc}</span>
                  </div>
                </div>
                <ChevronRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-ink-light/20 group-hover:text-gold-500/50 transition-colors" />
              </Card>
            )
          })}
        </div>
      </motion.div>

      {/* 6. 룰렛 + 출석체크 (2열) */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-3">
        <LuckyRouletteButton
          canSpin={rouletteStatus?.canSpin || false}
          nextAvailableTime={rouletteStatus?.nextAvailableTime}
        />
        <AttendanceMiniCard
          canCheckIn={attendanceStatus?.canCheckIn ?? false}
          weekCount={weeklyAttendance?.weekCount ?? 0}
          weekDays={weeklyAttendance?.weekDays}
        />
      </motion.div>
    </motion.div>
  )
}
