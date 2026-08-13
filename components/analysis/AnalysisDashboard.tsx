'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { ChevronRight } from 'lucide-react'
import { HubLauncher } from './HubLauncher'
import { MasterpieceSection } from './dashboard/MasterpieceSection'
import { HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'
import {
  hubThemePicks,
  THEME_CATEGORIES,
  THEME_LIST_PATH,
  themeImage,
  themeListHref,
} from '@/lib/domain/theme-fortune/themes'

/**
 * 사주·궁합 허브 본문 — 「앱 홈」 문법으로 개편(CEO 2026-08-13 "상단에 어플처럼 아이콘과 제목").
 *
 *   [아이콘 런처 8칸] → [사주 유도 카드] → [① 인기테마운세] → (여정은 상위가 그린다)
 *
 * 🔴 구 ② 「무엇으로 볼까요」 카드 4장(궁합·관상·손금·풍수)은 **런처가 흡수했다.**
 *    카드를 되살리면 같은 문이 한 화면에 둘이 된다. 그 넷의 링크는 `HUB_LAUNCHER` 에 있다.
 *
 * 앞선 비우기(같은 날 새벽)에서 걷어낸 것: 오늘의 정성 카드 · 절기 특별 이벤트 배너 ·
 * ③ 더 깊이 들여다보기 · 하단 오늘의 운세 카드. 넷 다 컴포넌트째 사라졌다(소비처 0).
 *
 * 🔴 ③ 이 들고 있던 **오늘의 운세·2026 병오년은 지운 게 아니라 옮겼다** — 테마 목록
 *    (`THEME_LIST_PATH`)의 「지금 바로 볼 수 있는 풀이」가 두 화면의 유일한 진입 경로다.
 *    여기서 카드를 되살리기 전에 그 목록을 먼저 볼 것(길이 둘로 갈라진다).
 */

/**
 * 바로가기가 데려다 놓은 자리가 고정 헤더(h-14=56px) 밑에 깔리지 않도록 하는 여백.
 * `scroll-margin-top` 은 브라우저 기본 해시 이동(`#hub-theme`)을 존중한다 — 허브 밖에서
 * 앵커를 걸고 들어오는 길이 남아 있다.
 */
const SECTION_ANCHOR = 'scroll-mt-20 outline-none'

export function AnalysisDashboard() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-screen-sm mx-auto px-2 space-y-6"
    >
      {/* 아이콘 런처 — 화면의 첫 자리. 앱 헤더(고정 상단 바) 바로 밑이다. */}
      <motion.div variants={fadeInUp}>
        <HubLauncher />
      </motion.div>

      {/* 0. 사주 유도 카드 (1장 — 한국 전통풍) */}
      <motion.div variants={fadeInUp}>
        <MasterpieceSection />
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
    </motion.div>
  )
}
