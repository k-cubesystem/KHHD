'use client'

import { ELEMENTS, EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'

/**
 * 오행 다섯 막대 — 신당 방의 「氣運 균형」·기운 지도·처방전·그룹 지도가 같은 것을 말하게 하는 공용 그림.
 *
 * `showNumbers=false` 는 직장 그룹(밴드 모드): 막대는 그리되 수를 적지 않는다(PRD-energy-circle §3-6).
 */
export function EnergyBars({
  energy,
  lacking,
  strongest,
  showNumbers = true,
  height = 52,
  unit = '',
}: {
  energy: Record<Element, number>
  lacking: Element
  strongest?: Element | null
  showNumbers?: boolean
  height?: number
  /** '%' 면 값을 비율(합 100)로 읽어 막대 높이를 2.5배로 그린다(균형 20% = 절반). */
  unit?: '' | '%'
}) {
  return (
    <div className="flex gap-1.5">
      {ELEMENTS.map((el) => {
        const low = el === lacking
        const high = el === strongest
        return (
          <div key={el} className="flex-1 text-center">
            <div
              className={`relative overflow-hidden rounded-md border bg-white/[0.05] ${
                low
                  ? 'border-gold-500/55 shadow-[0_0_10px_rgba(201,168,76,0.15)]'
                  : high
                    ? 'border-white/[0.18]'
                    : 'border-white/[0.06]'
              }`}
              style={{ height }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-500"
                style={{
                  height: `${unit === '%' ? Math.min(100, energy[el] * 2.5) : energy[el]}%`,
                  background: EL_COLOR[el],
                }}
              />
            </div>
            <div className="mt-1 font-serif text-[12px] text-ink-primary/75">
              {EL_KO[el]} <span className="font-sans text-ink-light/45">{EL_LABEL[el]}</span>
            </div>
            {showNumbers && (
              <div className="text-[10px] tabular-nums text-ink-light/40">
                {energy[el]}
                {unit}
              </div>
            )}
            {low && <div className="font-serif text-[9.5px] text-gold-400">모자람</div>}
            {high && !low && <div className="font-serif text-[9.5px] text-ink-light/40">넉넉</div>}
          </div>
        )
      })}
    </div>
  )
}
