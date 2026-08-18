import type { ReactNode } from 'react'

/**
 * 어드민 **화면 머리말 단일 출처**.
 *
 * 🔴 제목 크기·색·간격이 화면마다 달랐다(`text-xl md:text-2xl font-black` / `text-lg` / `text-base`…).
 *    머리말은 화면을 여는 첫 인상이라 여기가 어긋나면 나머지가 아무리 맞아도 딴 앱처럼 보인다.
 */
export function AdminPageHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  /** 우측 버튼·필터 자리. */
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="flex items-center gap-2 font-serif text-lg font-bold text-ink-primary md:text-xl">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="max-w-[60ch] break-keep font-sans text-[12px] leading-relaxed text-ink-primary/45">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
