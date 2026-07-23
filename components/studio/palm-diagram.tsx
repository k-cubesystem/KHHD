'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { GOLD_500 } from '@/lib/config/design-tokens'
import type { Assessment } from '@/lib/domain/analysis/feature-parse'

export type PalmLineKey = 'lifeLine' | 'intelligenceLine' | 'emotionLine' | 'fateLine' | 'sunLine' | 'marriageLine'

interface PalmDiagramProps {
  /** 선별 평가. 값이 있는 선만 경로로 표시. 전부 없으면 렌더 생략. */
  lines: Partial<Record<PalmLineKey, Assessment | undefined>>
}

const COLOR: Record<Assessment, string> = {
  좋음: GOLD_500,
  보통: '#A8C5DA',
  주의: '#E8A0A0',
}

/** 각 손금 선의 경로(d) + 한글 라벨. viewBox 240×300, 오른손 손바닥 기준. */
const LINES: Record<PalmLineKey, { label: string; d: string }> = {
  emotionLine: { label: '감정선', d: 'M158 170 Q120 150 92 167' },
  intelligenceLine: { label: '지능선', d: 'M88 180 Q120 193 154 197' },
  lifeLine: { label: '생명선', d: 'M94 174 Q74 206 100 250' },
  fateLine: { label: '운명선', d: 'M120 254 L121 188' },
  sunLine: { label: '태양선', d: 'M144 248 L143 196' },
  marriageLine: { label: '결혼선', d: 'M158 176 L170 175' },
}

const LINE_ORDER: PalmLineKey[] = ['lifeLine', 'intelligenceLine', 'emotionLine', 'fateLine', 'sunLine', 'marriageLine']

/**
 * 손금 다이어그램 — 절제된 손바닥 라인아트 위 삼대주선·특수선을 assessment 색으로.
 * 순수 SVG(캔버스 금지), viewBox 고정. 캡처 컨테이너 안에 위치. 데이터 미비 시 null.
 */
export function PalmDiagram({ lines }: PalmDiagramProps) {
  const reduce = useReducedMotion()
  const active = LINE_ORDER.filter((k) => lines[k])
  if (active.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-500/20 bg-white/[0.02] p-4">
      <p className="text-[10px] tracking-[0.25em] text-gold-500/50 uppercase text-center mb-1 font-sans">손금 진단도</p>
      <svg viewBox="0 0 240 300" className="w-full max-w-[280px] mx-auto block" role="img" aria-label="손금 진단도">
        {/* 손 라인아트 — 손바닥 + 손가락 + 엄지 (얇은 금색 stroke) */}
        <g
          fill="none"
          stroke={GOLD_500}
          strokeOpacity={0.5}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x={72} y={150} width={96} height={112} rx={30} />
          <rect x={90} y={88} width={15} height={78} rx={7.5} />
          <rect x={110} y={70} width={15} height={96} rx={7.5} />
          <rect x={130} y={84} width={15} height={82} rx={7.5} />
          <rect x={148} y={102} width={15} height={64} rx={7.5} />
          <g transform="rotate(-38 86 202)">
            <rect x={79} y={150} width={14} height={56} rx={7} />
          </g>
        </g>

        {/* 손금 선 — assessment 색 */}
        {active.map((key, i) => {
          const a = lines[key] as Assessment
          const c = COLOR[a]
          return (
            <motion.path
              key={key}
              d={LINES[key].d}
              fill="none"
              stroke={c}
              strokeWidth={2.2}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.15 + i * 0.12, duration: reduce ? 0 : 0.7, ease: 'easeOut' }}
            />
          )
        })}
      </svg>

      {/* 범례 — 표시된 선(assessment 색) */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-2">
        {active.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: COLOR[lines[key] as Assessment] }} />
            <span className="text-[10px] text-white/55 font-sans">{LINES[key].label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-1.5 pt-1.5 border-t border-white/5">
        {(['좋음', '보통', '주의'] as Assessment[]).map((a) => (
          <div key={a} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR[a] }} />
            <span className="text-[10px] text-white/45 font-sans">{a}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
