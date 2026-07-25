import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StorySectionHeadingProps {
  /** 섹션 번호 라벨 — 01, 02 … */
  step: string
  /** 영문 오버라인 */
  overline: string
  title: ReactNode
  description?: ReactNode
  className?: string
}

/** 상세페이지 섹션 공통 헤더 — 번호 · 오버라인 · 제목 · 설명. */
export function StorySectionHeading({ step, overline, title, description, className }: StorySectionHeadingProps) {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-2.5">
        <span className="font-sans text-[11px] font-bold tabular-nums text-gold-500 tracking-[0.1em]">{step}</span>
        <span className="h-px w-5 bg-gold-500/60" aria-hidden />
        <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-light/65">
          {overline}
        </span>
      </div>

      <h2 className="font-serif text-[22px] leading-[1.4] font-bold text-ink-light break-keep tracking-tight m-0">
        {title}
      </h2>

      {description ? (
        <p className="font-sans text-[14px] leading-[1.8] text-ink-light/75 break-keep font-light m-0">{description}</p>
      ) : null}
    </header>
  )
}
