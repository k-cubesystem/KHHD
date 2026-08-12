'use client'

import { useCallback, type MouseEvent } from 'react'
import { GA } from '@/lib/analytics/ga4'
import { shouldInterceptNavigation } from '@/lib/domain/shrine/view-transition'
import { hubScrollBehavior, type HubSection } from '@/lib/domain/analysis/hub-sections'

/**
 * 허브 상단 「섹션 바로가기」 — 한 줄로 늘어선 칩을 누르면 그 섹션으로 내려간다.
 *
 * 뼈대는 **평범한 앵커**(`<a href="#hub-studio">`)다. JS 가 죽어도, 자바스크립트를 끄고 봐도,
 * 키보드·스크린리더로도 그냥 동작한다. JS 가 얹는 것은 «부드럽게» 뿐이다.
 *
 * 가로 스크롤 대신 `flex-wrap` 을 쓴다 — 가로 스크롤 줄은 화면 밖으로 밀린 칩을 숨겨 «한눈에
 * 전체 섹션» 이라는 목적 자체를 깨고, 데스크톱에선 스크롤바도 안 보여 밀린 게 있다는 신호조차
 * 없다. 칩이 다섯 남짓이라 좁은 폰에서 두 줄이 되는 게 최악이고, 그 편이 낫다.
 */
interface HubSectionNavProps {
  readonly sections: readonly HubSection[]
}

/** 감속 선호 여부. matchMedia 가 없는 환경(구형·테스트)에서는 «선호하지 않음» 으로 본다. */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function HubSectionNav({ sections }: HubSectionNavProps) {
  const handleClick = useCallback((event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    GA.hubSectionJump(sectionId)

    // ⌘/Ctrl·Shift 클릭은 브라우저 것이다(새 탭·새 창). 연출 좀 얹자고 뺏지 않는다.
    if (!shouldInterceptNavigation(event)) return

    const target = document.getElementById(sectionId)
    // 앵커가 없으면 가로채지 않는다 — 브라우저 기본 해시 이동에 맡기는 편이 안전하다.
    if (!target) return

    event.preventDefault()
    target.scrollIntoView({ behavior: hubScrollBehavior(prefersReducedMotion()), block: 'start' })

    // 스크롤만으로는 키보드 초점과 스크린리더의 «현재 위치» 가 따라오지 않는다.
    // 섹션에 tabIndex={-1} 을 달아 두었으므로 초점을 옮겨 주면 제목이 함께 읽힌다.
    target.focus({ preventScroll: true })
  }, [])

  if (sections.length === 0) return null

  return (
    <nav aria-label="섹션 바로가기">
      <ul className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(event) => handleClick(event, section.id)}
              className="inline-flex items-center rounded-full border border-gold-500/20 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-ink-light/70 transition-colors duration-short hover:border-gold-500/40 hover:text-ink-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60 active:scale-[0.97]"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
