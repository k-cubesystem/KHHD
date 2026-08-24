'use client'

import { Home } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { hubGreeting } from '@/lib/domain/analysis/hub-home'
import { useHydrated } from '@/hooks/use-hydrated'
import { GuideBell } from '@/components/guide/GuideBell'

/** 상호·로고를 누르면 가는 곳. 홈 버튼도 같은 자리다. */
const APP_HOME_PATH = '/protected/analysis'

// relative — 가이드 패널이 이 바 바로 아래(top-full)로 펼쳐지는 기준점이다.
const BAR =
  'relative h-14 bg-background/80 backdrop-blur-md border-b border-primary/10 px-4 flex items-center justify-between gap-2 shrink-0'

/**
 * 고정 상단 바 — **모든 화면이 같은 머리글을 쓴다**(CEO 2026-08-24 "상단헤더를 전부 이렇게").
 * 아이콘 + 「청담해화당」(홈 링크) · 인사 한 줄 · 가이드 종 · 홈.
 *
 * 🔴 화면마다 바를 갈아 끼우지 않는다. 종전에는 허브에서만 「앱 헤더」였고 그 밖에서는
 *    «뒤로가기 + 상호 + 홈» 이라 같은 앱에서 머리글이 두 벌로 보였다. 뒤로가기는 이 개편으로
 *    내려갔다 — 되돌아갈 길은 하단 메뉴와 기기 뒤로가기(안드로이드 버튼·iOS 스와이프)가 진다.
 * 🔴 페이지 안에 헤더를 또 그리지 말 것. 같은 상호가 세로로 두 번 뜬다.
 */
export function MobileHeader() {
  const isHydrated = useHydrated()
  const t = useTranslations()

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px]">
      <header className={BAR}>
        <Link href={APP_HOME_PATH} className="flex items-center gap-2 min-w-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-new.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="font-serif text-[15px] font-bold tracking-[0.08em] text-gold-500 truncate group-hover:text-gold-300 transition-colors">
            {t('brand.name')}
          </span>
        </Link>

        <div className="flex shrink-0 items-center">
          {/* 인사는 시각으로만 갈린다(결정론·KST). 하이드레이션 뒤에 그려 서버/브라우저 시각
              차이로 문장이 엇갈리는 일을 없앤다. 폭이 모자라면 상호가 먼저 줄어든다(왼쪽 min-w-0). */}
          <span className="whitespace-nowrap pr-1 text-[11px] font-light text-ink-light/50">
            {isHydrated ? hubGreeting() : null}
          </span>

          <GuideBell />

          <Link
            href={APP_HOME_PATH}
            className="w-11 h-11 flex items-center justify-center text-ink-light/70 hover:text-primary transition-colors"
            aria-label={t('nav.home')}
          >
            <Home className="w-5 h-5" />
          </Link>
        </div>
      </header>
    </div>
  )
}
