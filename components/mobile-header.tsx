'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { hubGreeting } from '@/lib/domain/analysis/hub-home'
import { useHydrated } from '@/hooks/use-hydrated'

/** 고정 상단 바가 앱 홈 머리글로 서는 자리. 최상위 탭이라 여기엔 뒤로가기가 없다. */
const APP_HOME_PATH = '/protected/analysis'

const BAR = 'h-14 bg-background/80 backdrop-blur-md border-b border-primary/10 px-4 flex items-center shrink-0'

export function MobileHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const isHydrated = useHydrated()
  const t = useTranslations()

  /**
   * 허브(앱 홈)에서는 같은 바가 «앱 헤더»로 바뀐다 — 아이콘 + 「청담해화당」 + 인사 한 줄
   * (CEO 2026-08-13 "상단에 어플처럼 아이콘과 제목으로").
   *
   * 🔴 바를 하나 더 얹지 않는다. 페이지 안에 헤더를 또 그리면 같은 상호가 세로로 두 번 뜬다.
   *    뒤로가기·홈 버튼도 여기선 내린다 — 최상위 탭에서 뒤로 갈 곳도, 갈 홈도 이 화면이다.
   */
  if (pathname === APP_HOME_PATH) {
    return (
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px]">
        <header className={`${BAR} justify-between gap-2`}>
          <div className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-new.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span className="font-serif text-[15px] font-bold tracking-[0.08em] text-gold-500 truncate">
              {t('brand.name')}
            </span>
          </div>

          {/* 인사는 시각으로만 갈린다(결정론·KST). 하이드레이션 뒤에 그려 서버/브라우저 시각
              차이로 문장이 엇갈리는 일을 없앤다. */}
          <span className="shrink-0 text-[11px] font-light text-ink-light/50">{isHydrated ? hubGreeting() : null}</span>
        </header>
      </div>
    )
  }

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px]">
      <header className={`${BAR} justify-between`}>
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-start text-ink-light/70 hover:text-primary transition-colors"
          aria-label={t('nav.back')}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <Link
          href={APP_HOME_PATH}
          className="text-xs font-serif font-bold text-primary tracking-[0.2em] opacity-80 hover:opacity-100 transition-opacity"
        >
          {t('brand.name')}
        </Link>

        <Link
          href={APP_HOME_PATH}
          className="w-10 h-10 flex items-center justify-end text-ink-light/70 hover:text-primary transition-colors"
          aria-label={t('nav.home')}
        >
          <Home className="w-5 h-5" />
        </Link>
      </header>
    </div>
  )
}
