'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { SeasonalEventBanner } from '@/components/events/seasonal-event-banner'
import { Card } from '@/components/ui/card'
import { Wallet, Building2, GraduationCap, TrendingUp, MessageCircle, ChevronRight } from 'lucide-react'
import {
  IconGunghap,
  IconGwansang,
  IconSongeum,
  IconPungsu,
  IconUnse,
  IconInyon,
} from '@/components/icons/traditional-icons'
import { DailyFortuneCard } from './daily-fortune-card'

const STUDIO_CARDS = [
  {
    id: 'compatibility',
    label: '궁합',
    desc: '두 사람의 오행 기운으로 관계의 해법을 찾습니다',
    icon: IconGunghap,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    href: '/protected/analysis/compatibility',
  },
  {
    id: 'face',
    label: '관상',
    desc: '얼굴에 새겨진 운명의 지도를 읽어드립니다',
    icon: IconGwansang,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    href: '/protected/studio/face',
  },
  {
    id: 'palm',
    label: '손금',
    desc: '손바닥 위의 생명선·지능선·감정선을 해석합니다',
    icon: IconSongeum,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    href: '/protected/studio/palm',
  },
  {
    id: 'fengshui',
    label: '풍수',
    desc: '공간의 기운을 분석하여 길한 배치를 제안합니다',
    icon: IconPungsu,
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
    icon: IconUnse,
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
    icon: IconInyon,
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

interface AnalysisDashboardProps {
  userId?: string
  userName?: string
}

export function AnalysisDashboard({ userId, userName }: AnalysisDashboardProps = {}) {
  const router = useRouter()

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-screen-sm mx-auto pb-40 px-2 space-y-6"
    >
      {/* 0. 사주 유도 슬라이드 카드 */}
      <motion.div variants={fadeInUp}>
        <div className="space-y-3">
          {/* 슬라이드 카드 영역 */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-2 px-2">
            {/* 카드 1: 천지인 분석 */}
            <div
              onClick={() => router.push('/protected/analysis/cheonjiin')}
              className="hanji-card dancheong-border-top min-w-[280px] snap-center p-5 cursor-pointer group active:scale-[0.97] transition-transform"
            >
              <p className="text-[10px] text-gold-500/60 font-serif tracking-widest mb-2">天 地 人</p>
              <h3 className="text-base font-serif font-bold text-ink-light mb-1">나의 사주를 풀어보세요</h3>
              <p className="text-xs text-ink-light/60 font-light leading-relaxed mb-3">
                태어난 순간 새겨진 운명의 지도.
                <br />
                하늘·땅·사람의 기운을 읽어드립니다.
              </p>
              <span className="text-xs text-gold-500 font-medium group-hover:underline">사주 분석 시작 →</span>
            </div>

            {/* 카드 2: 궁합 */}
            <div
              onClick={() => router.push('/protected/analysis/compatibility')}
              className="hanji-card min-w-[280px] snap-center p-5 cursor-pointer group active:scale-[0.97] transition-transform"
            >
              <p className="text-[10px] text-obangsaek-red/60 font-serif tracking-widest mb-2">陰 陽 合</p>
              <h3 className="text-base font-serif font-bold text-ink-light mb-1">소중한 인연의 궁합</h3>
              <p className="text-xs text-ink-light/60 font-light leading-relaxed mb-3">
                두 사람 사이 보이지 않는 기운의 흐름.
                <br />
                오행으로 관계의 해법을 찾습니다.
              </p>
              <span className="text-xs text-obangsaek-red font-medium group-hover:underline">궁합 보기 →</span>
            </div>

            {/* 카드 3: 오늘의 운세 */}
            <div
              onClick={() => router.push('/protected/analysis/today')}
              className="hanji-card min-w-[280px] snap-center p-5 cursor-pointer group active:scale-[0.97] transition-transform"
            >
              <p className="text-[10px] text-obangsaek-blue/60 font-serif tracking-widest mb-2">今 日 運</p>
              <h3 className="text-base font-serif font-bold text-ink-light mb-1">오늘의 기운을 확인하세요</h3>
              <p className="text-xs text-ink-light/60 font-light leading-relaxed mb-3">
                매일 달라지는 운의 흐름.
                <br />
                오늘 하루를 지혜롭게 보내는 비결.
              </p>
              <span className="text-xs text-obangsaek-blue font-medium group-hover:underline">운세 확인 →</span>
            </div>
          </div>

          {/* 슬라이드 인디케이터 */}
          <div className="flex justify-center gap-1.5">
            <div className="w-6 h-1 rounded-full bg-gold-500/40" />
            <div className="w-1.5 h-1 rounded-full bg-white/10" />
            <div className="w-1.5 h-1 rounded-full bg-white/10" />
          </div>
        </div>
      </motion.div>

      {/* 1. Seasonal Event Banner */}
      <motion.div variants={fadeInUp}>
        <SeasonalEventBanner />
      </motion.div>

      {/* 3. 개별 분석 (2열) */}
      <motion.div variants={fadeInUp} className="space-y-3">
        <div className="dancheong-divider my-4" />
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 className="text-sm font-serif text-gold-500/80">청담해화당 통합분석</h2>
        </div>

        <nav role="navigation" aria-label="통합분석 메뉴" className="grid grid-cols-2 gap-3">
          {STUDIO_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.id}
                onClick={() => router.push(card.href)}
                aria-label={card.label}
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
                    <span className="block text-[11px] text-ink-light/70 font-light mt-1 leading-relaxed">
                      {card.desc}
                    </span>
                  </div>
                </div>
                <ChevronRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-ink-light/20 group-hover:text-gold-500/50 transition-colors" />
              </Card>
            )
          })}
        </nav>
      </motion.div>

      {/* 4. 테마별 트렌드 (2열) */}
      <motion.div variants={fadeInUp} className="space-y-3">
        <div className="dancheong-divider my-4" />
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 className="text-sm font-serif text-gold-500/80">더 깊이 들여다보기</h2>
        </div>

        <nav role="navigation" aria-label="테마별 분석 메뉴" className="grid grid-cols-2 gap-3">
          {MENU_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.id}
                onClick={() => router.push(card.href)}
                aria-label={card.label}
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
                    <span className="block text-[11px] text-ink-light/70 font-light mt-0.5">{card.desc}</span>
                  </div>
                </div>
                <ChevronRight className="absolute bottom-3 right-3 w-3.5 h-3.5 text-ink-light/20 group-hover:text-gold-500/50 transition-colors" />
              </Card>
            )
          })}
        </nav>
      </motion.div>

      {/* 5. 오늘의 운세 (하단) */}
      {userId && userName && (
        <motion.div variants={fadeInUp}>
          <div className="dancheong-divider my-4" />
          <DailyFortuneCard userId={userId} userName={userName} />
        </motion.div>
      )}
    </motion.div>
  )
}
