'use client'

import Link from 'next/link'
import { HUB_LAUNCHER } from '@/lib/domain/analysis/hub-home'
import { HUB_SECTIONS, hubHeadingId } from '@/lib/domain/analysis/hub-sections'

/**
 * 허브 맨 위 아이콘 런처 — 2행 4열 (한국 앱 홈 문법, CEO 2026-08-13).
 *
 * 카드가 아니라 아이콘인 이유는 하나다: **세로**. 2열 카드 4장이 먹던 높이에 여덟 칸이 들어간다.
 * 그래서 이 컴포넌트는 설명 문장을 그리지 않는다 — 라벨 한 줄이 전부다.
 *
 * 탭 타깃: 아이콘 판 56px + 라벨 줄 → 링크 하나가 세로 80px 안팎이다(최소 44px 규율 충족).
 * 자산·목적지는 `HUB_LAUNCHER` 한 곳에서만 온다.
 */
export function HubLauncher() {
  return (
    <section
      id={HUB_SECTIONS.launcher.id}
      aria-labelledby={hubHeadingId(HUB_SECTIONS.launcher.id)}
      tabIndex={-1}
      className="scroll-mt-20 outline-none"
    >
      <h2 id={hubHeadingId(HUB_SECTIONS.launcher.id)} className="sr-only">
        {HUB_SECTIONS.launcher.title}
      </h2>

      <nav role="navigation" aria-label={HUB_SECTIONS.launcher.title} className="grid grid-cols-4 gap-x-1 gap-y-2">
        {HUB_LAUNCHER.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            aria-label={entry.label}
            className="group flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-2 transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-gold-500/15 bg-white/[0.03] transition-colors duration-200 group-hover:border-gold-500/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.icon}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-11 w-11 object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </span>
            <span className="text-center text-[11px] font-light leading-tight text-ink-light/75 group-hover:text-ink-light">
              {entry.label}
            </span>
          </Link>
        ))}
      </nav>
    </section>
  )
}
