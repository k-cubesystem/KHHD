'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * 어드민 **카드 단일 출처**.
 *
 * ## 🔴 왜 만들었나
 * 어드민 16화면의 카드가 **세 갈래**로 갈라져 있었다 —
 * `from-stone-800/30` 그라디언트 / 평면 `bg-surface` / 테두리만. 게다가 어드민 전체가
 * 제품과 **다른 팔레트**(`stone-*` 회색)를 쓰고 있었다(실측: `text-stone-500` 105회).
 * 제품은 오방색(`DESIGN.md`)이라 같은 서비스인데 다른 앱처럼 보였다.
 *
 * 🔴 새 카드는 이걸 쓴다. `<Card>` 에 클래스를 직접 붙여 새 변종을 만들지 않는다.
 *
 * ## 세부내용은 접어 둔다
 * 목록은 훑는 화면이다. 한 줄에 다 밀어 넣으면 아무것도 안 읽힌다.
 * `details` 를 주면 「세부내용」 토글이 생긴다 — 필요할 때만 펼친다.
 */
export type AdminCardTone = 'default' | 'accent' | 'danger'

const TONE: Record<AdminCardTone, string> = {
  default: 'border-white/[0.08] bg-surface/60',
  accent: 'border-gold-500/25 bg-gold-500/[0.05]',
  danger: 'border-seal/30 bg-seal/[0.06]',
}

export function AdminCard({
  title,
  subtitle,
  icon,
  action,
  tone = 'default',
  details,
  detailsLabel = '세부내용',
  className = '',
  children,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  /** 우상단 버튼·배지 자리. */
  action?: ReactNode
  tone?: AdminCardTone
  /** 접어 둘 세부내용. 주면 토글이 생긴다. */
  details?: ReactNode
  detailsLabel?: string
  className?: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <section className={`rounded-xl border ${TONE[tone]} ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
          <div className="min-w-0 space-y-0.5">
            <h3 className="flex items-center gap-1.5 font-serif text-[13.5px] font-bold text-ink-primary">
              {icon}
              {title}
            </h3>
            {subtitle && <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/45">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}

      {children && <div className="px-4 pb-3.5 pt-0.5">{children}</div>}

      {details && (
        <div className="border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 font-sans text-[11.5px] text-ink-primary/45 transition-colors hover:text-ink-primary/75"
          >
            {detailsLabel}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {open && (
            <div id={panelId} className="px-4 pb-4 font-sans text-[12px] leading-relaxed text-ink-primary/70">
              {details}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
