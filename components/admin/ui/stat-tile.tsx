import type { ReactNode } from 'react'

/**
 * 숫자 요약 — **3칸짜리 카드 격자를 대신한다**.
 *
 * ## 🔴 왜 형태를 바꿨나
 * 어드민 곳곳이 «큰 상자 3개»로 숫자를 보여줬다. 상자가 크니 한 화면에 3~6개밖에 못 담고,
 * 정작 비교하려는 숫자들이 서로 멀리 떨어져 눈이 왔다 갔다 해야 했다.
 * 대시보드는 **훑는 화면**이다 — 상자를 없애고 **띠(strip)** 로 붙여 한눈에 비교되게 한다.
 *
 * 🔴 숫자는 `tabular-nums` 로 자리를 고정한다. 안 하면 값이 바뀔 때마다 폭이 흔들려
 *    「깜빡인다」는 인상을 준다.
 */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  )
}

export function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  unit?: string
  /** 값 아래 한 줄 — 비교 기준·증감 등. */
  hint?: string
  tone?: 'default' | 'accent' | 'warn'
}) {
  const valueTone = tone === 'accent' ? 'text-gold-500' : tone === 'warn' ? 'text-seal' : 'text-ink-primary'

  return (
    <div className="bg-surface/70 px-3.5 py-3">
      <p className="font-sans text-[11px] leading-none text-ink-primary/45">{label}</p>
      <p className={`mt-1.5 font-serif text-[19px] font-bold leading-none tabular-nums ${valueTone}`}>
        {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
        {unit && <span className="ml-0.5 font-sans text-[11px] font-normal text-ink-primary/40">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 font-sans text-[10.5px] leading-none text-ink-primary/35">{hint}</p>}
    </div>
  )
}
