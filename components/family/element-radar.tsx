'use client'

import { BOK_TIER_COLORS, GOLD_500, INK_PRIMARY, OBANGSAEK } from '@/lib/config/design-tokens'
import { EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { RADAR_AXES, pointAt, polygonAttr, radarPoints, ringPoints } from '@/lib/domain/circle/radar'

/**
 * 오각형(오행) 그래프 — 사람 여럿을 한 그림에 겹친다(CEO 2026-09-12 「막대 말고 오각형으로」).
 *
 * 축은 상생 순 木→火→土→金→水, 균형(20%) 고리를 금색 점선으로 두어 «둥글면 고르다»가 한눈에 읽힌다.
 * 수치는 그리지 않는다(직장 그룹의 밴드 규율과 같은 자) — 모양이 말한다.
 */

export interface RadarSeries {
  id: string
  name: string
  share: Record<Element, number>
  color: string
  fill?: boolean
  dashed?: boolean
}

/** 겹치는 사람들의 색 순서 — 평균은 금, 사람은 청·주·백·창송·황토·청록. */
export const RADAR_SERIES_COLORS: readonly string[] = [
  OBANGSAEK.blue,
  OBANGSAEK.red,
  OBANGSAEK.white,
  BOK_TIER_COLORS.TREE,
  BOK_TIER_COLORS.SEED,
  BOK_TIER_COLORS.SPROUT,
]
export const RADAR_AVERAGE_COLOR = GOLD_500

/** i번째 사람의 선 색 — 사람이 색보다 많으면 돌아온다. */
export function seriesColor(i: number): string {
  return RADAR_SERIES_COLORS[i % RADAR_SERIES_COLORS.length] ?? INK_PRIMARY
}

const RINGS = [0.25, 0.5, 0.75, 1]

export function ElementRadar({
  series,
  size = 240,
  legend = true,
  labels = true,
  dots = true,
  className,
}: {
  series: readonly RadarSeries[]
  size?: number
  legend?: boolean
  /** 축 이름(木火土金水). 썸네일은 끈다 — 글자가 그림보다 커진다. */
  labels?: boolean
  /** 꼭짓점 점. */
  dots?: boolean
  className?: string
}) {
  const cx = size / 2
  const cy = size / 2 + (labels ? 6 : 0)
  const R = size / 2 - (labels ? 34 : 4)

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${size} ${size + (labels ? 8 : 0)}`}
        width="100%"
        role="img"
        aria-label={`오행 오각형 그래프 — ${series.map((s) => s.name).join(', ')}`}
        className="mx-auto block max-w-[320px]"
      >
        {RINGS.map((ratio) => (
          <polygon
            key={ratio}
            points={polygonAttr(ringPoints(R, cx, cy, ratio))}
            fill="none"
            stroke={ratio === 0.5 ? GOLD_500 : INK_PRIMARY}
            strokeOpacity={ratio === 0.5 ? 0.45 : 0.1}
            strokeWidth={ratio === 0.5 ? 1 : 0.8}
            strokeDasharray={ratio === 0.5 ? '3 3' : undefined}
          />
        ))}
        {RADAR_AXES.map((_, i) => {
          const p = pointAt(i, R, cx, cy)
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={INK_PRIMARY}
              strokeOpacity={0.12}
              strokeWidth={0.8}
            />
          )
        })}
        {series.map((s) => {
          const pts = radarPoints(s.share, R, cx, cy)
          return (
            <g key={s.id}>
              <polygon
                points={polygonAttr(pts)}
                fill={s.fill ? s.color : 'none'}
                fillOpacity={s.fill ? 0.2 : 0}
                stroke={s.color}
                strokeWidth={s.fill ? 1.8 : 1.5}
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? '4 3' : undefined}
              />
              {dots && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={s.color} />)}
            </g>
          )
        })}
        {labels &&
          RADAR_AXES.map((el, i) => {
            const p = pointAt(i, R + 20, cx, cy)
            return (
              <text
                key={el}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={EL_COLOR[el]}
                fontSize={13}
                fontWeight={700}
                fontFamily="var(--font-serif, 'Noto Serif KR', serif)"
              >
                {EL_KO[el]}
                <tspan fontSize={9} fontWeight={400} fill={INK_PRIMARY} fillOpacity={0.55} dx={2}>
                  {EL_LABEL[el]}
                </tspan>
              </text>
            )
          })}
      </svg>
      {legend && series.length > 1 && (
        <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-ink-light/70">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: s.fill ? s.color : 'transparent', border: `2px solid ${s.color}` }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
