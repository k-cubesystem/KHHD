'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { SeasonalEventBanner } from '@/components/events/seasonal-event-banner'
import { Card } from '@/components/ui/card'
import { ChevronRight, Flame, type LucideIcon } from 'lucide-react'
import { DailyFortuneCard } from './daily-fortune-card'
import { MasterpieceSection } from './dashboard/MasterpieceSection'
import { DailyRitualCard } from './dashboard/DailyRitualCard'
import { HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'
import {
  hubThemePicks,
  THEME_CATEGORIES,
  THEME_LIST_PATH,
  themeImage,
  themeListHref,
} from '@/lib/domain/theme-fortune/themes'

/**
 * 바로가기가 데려다 놓은 자리가 고정 헤더(h-14=56px) 밑에 깔리지 않도록 하는 여백.
 * `scroll-margin-top` 은 JS 의 scrollIntoView 와 브라우저 기본 해시 이동 **둘 다** 존중한다.
 */
const SECTION_ANCHOR = 'scroll-mt-20 outline-none'

// 아이콘 → 「설빛 온기」 일러스트 (PRD §7, public/icons/hub)
const STUDIO_CARDS = [
  {
    id: 'compatibility',
    label: '궁합',
    desc: '두 사람의 오행 기운으로 관계의 해법을 찾습니다',
    img: '/icons/hub/gunghap.webp',
    bg: 'bg-rose-500/10',
    href: '/protected/analysis/compatibility',
  },
  {
    id: 'face',
    label: '관상',
    desc: '얼굴에 새겨진 운명의 지도를 읽어드립니다',
    img: '/icons/hub/gwansang.webp',
    bg: 'bg-amber-500/10',
    href: '/protected/studio/face',
  },
  {
    id: 'palm',
    label: '손금',
    desc: '손바닥 위의 생명선·지능선·감정선을 해석합니다',
    img: '/icons/hub/songeum.webp',
    bg: 'bg-sky-500/10',
    href: '/protected/studio/palm',
  },
  {
    id: 'fengshui',
    label: '풍수',
    desc: '공간의 기운을 분석하여 길한 배치를 제안합니다',
    img: '/icons/hub/pungsu.webp',
    bg: 'bg-teal-500/10',
    href: '/protected/studio/fengshui',
  },
] as const

interface DeeperCard {
  readonly id: string
  readonly label: string
  readonly desc: string
  readonly bg: string
  readonly href: string
  readonly badge?: string
  /** 「설빛 온기」 일러스트. 없으면 `icon` 을 그린다. */
  readonly img?: string
  readonly icon?: LucideIcon
  /** 2열 그리드에서 한 줄을 통째로 쓰는 카드(홀수 장일 때 끝자리를 비우지 않는다). */
  readonly wide?: boolean
}

/**
 * ③ 더 깊이 들여다보기 — 주기가 있는 것(연·일)과 대화만 남는다(마스터 §3-2).
 *
 * 구 MENU_CARDS 의 재물·애정·직장·학업·부동산 5장은 ① 인기테마운세로 흡수됐다. 그 화면들이
 * 사라진 게 아니라 **테마 목록을 거쳐 이어진다** — `lib/domain/theme-fortune/themes.ts` 의
 * `THEME_DESTINATIONS` 가 그 다섯 경로를 전부 들고 있고, 테마 목록 하단이 그것을 그린다.
 */
const DEEPER_CARDS = [
  {
    id: 'year2026',
    label: '2026 병오년',
    desc: '붉은 말의 해 운명 흐름',
    img: '/icons/hub/unse.webp',
    bg: 'bg-red-500/10',
    href: '/protected/analysis/new-year',
    badge: '2026',
  },
  {
    id: 'ai-shaman',
    label: '고민 상담',
    desc: 'AI 해화지기',
    img: '/icons/hub/sangdam.webp',
    bg: 'bg-gold-500/15',
    href: '/protected/ai-shaman',
  },
  {
    id: 'today',
    label: '오늘의 운세',
    desc: '하루의 결을 짚어봅니다',
    icon: Flame,
    bg: 'bg-gold-500/15',
    href: '/protected/analysis/today',
    wide: true,
  },
] as const satisfies readonly DeeperCard[]

interface AnalysisDashboardProps {
  userName?: string
}

export function AnalysisDashboard({ userName }: AnalysisDashboardProps = {}) {
  const router = useRouter()

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-screen-sm mx-auto pb-40 px-2 space-y-6"
    >
      {/* 0. 사주 유도 카드 (1장 — 한국 전통풍) */}
      <motion.div variants={fadeInUp}>
        <MasterpieceSection />
      </motion.div>

      {/* 0-1. 오늘의 정성 — 데일리 루프 허브(F-6) */}
      <motion.section
        variants={fadeInUp}
        id={HUB_SECTIONS.ritual.id}
        aria-labelledby={hubHeadingId(HUB_SECTIONS.ritual.id)}
        tabIndex={-1}
        className={SECTION_ANCHOR}
      >
        {/* 카드가 이미 제 이름을 달고 있어 눈에는 안 보이게 두되, 문서 구조에는 남긴다. */}
        <h2 id={hubHeadingId(HUB_SECTIONS.ritual.id)} className="sr-only">
          {HUB_SECTIONS.ritual.title}
        </h2>
        <DailyRitualCard />
      </motion.section>

      {/* 1. Seasonal Event Banner */}
      <motion.div variants={fadeInUp}>
        <SeasonalEventBanner />
      </motion.div>

      {/* ① 인기테마운세 — 「도구」가 아니라 「질문」으로 들어오는 입구 (마스터 §3-2).
          🔴 카드는 제목·그림만 그린다. 목록·허브에서 AI 를 부르면 9차 사고(오늘의 운세 자동
             생성)가 그대로 재발한다 — 풀이는 사용자가 누른 화면에서만 돈다. */}
      <motion.section
        variants={fadeInUp}
        id={HUB_SECTIONS.themeFortune.id}
        aria-labelledby={hubHeadingId(HUB_SECTIONS.themeFortune.id)}
        tabIndex={-1}
        className={`space-y-3 ${SECTION_ANCHOR}`}
      >
        <div className="dancheong-divider my-4" />
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 id={hubHeadingId(HUB_SECTIONS.themeFortune.id)} className="text-sm font-serif text-gold-500/80">
            {HUB_SECTIONS.themeFortune.title}
          </h2>
        </div>

        <nav role="navigation" aria-label="인기테마운세" className="space-y-3">
          {hubThemePicks().map((theme) => (
            <Link
              key={theme.id}
              href={themeListHref(theme)}
              aria-label={theme.title}
              className="group block relative overflow-hidden rounded-xl border border-white/10 bg-surface/60 transition-all duration-200 hover:border-gold-500/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
            >
              {/* 16:9 — 마스터 §10 썸네일이 들어올 자리. 지금은 카테고리 그림이 대신 선다. */}
              <div className="relative aspect-[16/9] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={themeImage(theme)}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute right-4 top-1/2 h-24 w-24 -translate-y-1/2 object-contain opacity-25 transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
                  <span className="font-serif text-[10px] tracking-[0.2em] text-gold-500/60">
                    {THEME_CATEGORIES[theme.category].label}
                  </span>
                  <h3 className="font-serif text-[15px] font-bold leading-snug text-ink-light">{theme.title}</h3>
                  <p className="text-[11px] font-light leading-relaxed text-ink-light/60">{theme.subcopy}</p>
                </div>
              </div>
            </Link>
          ))}
        </nav>

        <Link
          href={THEME_LIST_PATH}
          className="flex items-center justify-center gap-1 rounded-xl border border-gold-500/20 bg-white/[0.03] py-2.5 text-[12px] font-serif text-ink-light/70 transition-colors hover:border-gold-500/40 hover:text-ink-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
        >
          테마 전체 보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </motion.section>

      {/* ② 무엇으로 볼까요 — 도구를 아는 사람의 입구. 링크·아이콘 무손실 승계 (2열) */}
      <motion.section
        variants={fadeInUp}
        id={HUB_SECTIONS.studio.id}
        aria-labelledby={hubHeadingId(HUB_SECTIONS.studio.id)}
        tabIndex={-1}
        className={`space-y-3 ${SECTION_ANCHOR}`}
      >
        <div className="dancheong-divider my-4" />
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 id={hubHeadingId(HUB_SECTIONS.studio.id)} className="text-sm font-serif text-gold-500/80">
            {HUB_SECTIONS.studio.title}
          </h2>
        </div>

        <nav role="navigation" aria-label="통합분석 메뉴" className="grid grid-cols-2 gap-3">
          {STUDIO_CARDS.map((card) => {
            return (
              <Card
                key={card.id}
                onClick={() => router.push(card.href)}
                aria-label={card.label}
                className="group cursor-pointer card-glass-manse transition-all duration-200 p-4 rounded-xl active:scale-[0.97] hover:border-gold-500/30 relative overflow-hidden"
              >
                <div className="flex flex-col gap-2.5">
                  <div
                    className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.img} alt="" className="w-9 h-9 object-contain" draggable={false} />
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
      </motion.section>

      {/* ③ 더 깊이 들여다보기 — 연·일 주기와 대화 (2열) */}
      <motion.section
        variants={fadeInUp}
        id={HUB_SECTIONS.deeper.id}
        aria-labelledby={hubHeadingId(HUB_SECTIONS.deeper.id)}
        tabIndex={-1}
        className={`space-y-3 ${SECTION_ANCHOR}`}
      >
        <div className="dancheong-divider my-4" />
        <div className="flex items-center gap-2 px-1">
          <div className="h-px w-6 bg-gold-500/40" />
          <h2 id={hubHeadingId(HUB_SECTIONS.deeper.id)} className="text-sm font-serif text-gold-500/80">
            {HUB_SECTIONS.deeper.title}
          </h2>
        </div>

        <nav role="navigation" aria-label="더 깊이 들여다보기 메뉴" className="grid grid-cols-2 gap-3">
          {DEEPER_CARDS.map((card) => {
            const Icon = 'icon' in card ? card.icon : undefined
            return (
              <Card
                key={card.id}
                onClick={() => router.push(card.href)}
                aria-label={card.label}
                className={`group cursor-pointer card-glass-manse transition-all duration-200 p-4 rounded-xl active:scale-[0.97] hover:border-gold-500/30 relative overflow-hidden ${
                  'wide' in card && card.wide ? 'col-span-2' : ''
                }`}
              >
                {'badge' in card && card.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">
                    {card.badge}
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden`}
                  >
                    {'img' in card && card.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.img} alt="" className="w-9 h-9 object-contain" draggable={false} />
                    ) : (
                      Icon && <Icon className="w-5 h-5 text-gold-500" strokeWidth={1.5} />
                    )}
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
      </motion.section>

      {/* 5. 오늘의 운세 (하단) — 자동 생성 없이 버튼 진입만(CEO 2026-08-12) */}
      {userName && (
        <motion.section
          variants={fadeInUp}
          id={HUB_SECTIONS.dailyFortune.id}
          aria-labelledby={hubHeadingId(HUB_SECTIONS.dailyFortune.id)}
          tabIndex={-1}
          className={SECTION_ANCHOR}
        >
          <h2 id={hubHeadingId(HUB_SECTIONS.dailyFortune.id)} className="sr-only">
            {HUB_SECTIONS.dailyFortune.title}
          </h2>
          <div className="dancheong-divider my-4" />
          <DailyFortuneCard userName={userName} />
        </motion.section>
      )}
    </motion.div>
  )
}
