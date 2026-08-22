'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { ChevronRight } from 'lucide-react'
import { HubLauncher } from './HubLauncher'
import { ThemeThumbnail } from './ThemeThumbnail'
import { MasterpieceSection } from './dashboard/MasterpieceSection'
import { JourneyCard } from './journey-card'
import { WallpaperCard } from './wallpaper-card'
import { HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'
import {
  hubThemeDailyPicks,
  THEME_CATEGORIES,
  THEME_LIST_PATH,
  themeListHref,
} from '@/lib/domain/theme-fortune/themes'

/**
 * 사주·궁합 허브 본문 — 「앱 홈」 문법으로 개편(CEO 2026-08-13 "상단에 어플처럼 아이콘과 제목").
 *
 *   [아이콘 런처 7칸] → [종합사주풀이 대작 카드] → [나의 복주머니] → [① 인기테마운세 5줄]
 *
 * ① 은 2026-08-13 저녁 CEO 지시(「3개 말고 상하단 사이즈를 좀 줄여서 10개까지」)로 풀폭 와이드
 * 카드 3장에서 유튜브식 가로 리스트 열 줄이 됐고, 2026-08-22 CEO 지시로 **다섯 줄 + 매일 다른
 * 조합**이 됐다. 줄 수는 `HUB_THEME_ROWS`, 조합은 `hubThemeDailyPicks` 하나가 정한다.
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
      className="max-w-screen-sm mx-auto px-2 space-y-6 pb-40"
    >
      {/* 아이콘 런처 — 화면의 첫 자리. 앱 헤더(고정 상단 바) 바로 밑이다. */}
      <motion.div variants={fadeInUp}>
        <HubLauncher />
      </motion.div>

      {/* 0. 사주 유도 카드 (1장 — 한국 전통풍) */}
      <motion.div variants={fadeInUp}>
        <MasterpieceSection />
      </motion.div>

      {/* 나의 복주머니(여정) — 사주 카드 바로 아래(CEO 2026-08-22 «위치가 너무 하단» 재지시).
          «사주 보기 = 첫 주머니 채우기» 동선이 이어지고, 10줄 테마 리스트에 묻히지 않는다. */}
      <motion.section
        variants={fadeInUp}
        id={HUB_SECTIONS.journey.id}
        aria-labelledby={hubHeadingId(HUB_SECTIONS.journey.id)}
        tabIndex={-1}
        className={SECTION_ANCHOR}
      >
        <h2 id={hubHeadingId(HUB_SECTIONS.journey.id)} className="sr-only">
          {HUB_SECTIONS.journey.title}
        </h2>
        <JourneyCard variant="full" />
      </motion.section>

      {/* ① 인기테마운세 — 「도구」가 아니라 「질문」으로 들어오는 입구 (마스터 §3-2).
          🔴 행은 제목·그림만 그린다. 목록·허브에서 AI 를 부르면 9차 사고(오늘의 운세 자동
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

        {/* 유튜브 모바일 리스트 문법 — 왼쪽 16:9 썸네일 + 오른쪽 제목 2줄.
            🔴 세로가 이 레이아웃의 전부다: 풀폭 카드는 1장이 210px 를 먹어 셋이 한계였는데,
               행은 88px(썸네일 128×72 + 상하 8px)이라 다섯 줄이 옛 두 장 반 자리에 들어간다.
            🔴 순번(1·2·3…)을 붙이지 않는다 — «인기»가 아직 수동값이라 순위 숫자는 실측 주장이
               된다(themes.ts `hubThemePicks` 주석).
            🔴 조합은 **날짜 시드 결정론**이다(`hubThemeDailyPicks`). 여기서 Math.random 을 쓰면
               SSR 과 하이드레이션이 다른 다섯을 그려 섹션이 통째로 날아간다. */}
        <nav role="navigation" aria-label="인기테마운세" className="space-y-1.5">
          {hubThemeDailyPicks().map((theme, index) => (
            <Link
              key={theme.id}
              href={themeListHref(theme)}
              aria-label={theme.title}
              className="group flex gap-3 rounded-xl border border-white/[0.06] bg-surface/40 p-2 transition-colors duration-200 hover:border-gold-500/25 hover:bg-surface/70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
            >
              {/* 위 세 줄만 즉시 — 나머지 둘은 스크롤할 때 받는다. */}
              <ThemeThumbnail
                theme={theme}
                eager={index < 3}
                showCost
                className="aspect-[16/9] w-32 shrink-0 rounded-lg border border-white/[0.06]"
              />

              {/* min-w-0 이 없으면 flex 자식이 안 줄어들어 line-clamp 가 듣지 않는다. */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-1">
                <span className="font-serif text-[10px] leading-none tracking-[0.2em] text-gold-500/60">
                  {THEME_CATEGORIES[theme.category].label}
                </span>
                <h3 className="line-clamp-2 font-serif text-body-sm font-bold leading-snug text-ink-light">
                  {theme.title}
                </h3>
                <p className="line-clamp-1 text-[11px] font-light leading-tight text-ink-light/50">{theme.subcopy}</p>
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

        {/* 복 배경화면 — 테마 섹션 «안»에 둔다. 새 허브 섹션을 만들면 hub-sections 표와
            그 표를 화면과 대조하는 테스트(hub-layout)가 함께 흔들린다. 자격 조회는 카드가
            스스로 진다 — 이 파일은 서버 액션을 import 하지 않는다(회귀 테스트가 막는다). */}
        <WallpaperCard />
      </motion.section>
    </motion.div>
  )
}
