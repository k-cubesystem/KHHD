'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { GOLD_500 } from '@/lib/config/design-tokens'
import type { Assessment } from '@/lib/domain/analysis/feature-parse'

export type FacePartKey = 'forehead' | 'eyes' | 'nose' | 'mouth' | 'ears' | 'chin'

interface FaceDiagramProps {
  /** 부위별 평가. 값이 있는 부위만 마커로 표시. 전부 없으면 렌더 생략. */
  parts: Partial<Record<FacePartKey, Assessment | undefined>>
}

/** assessment → 마커 색 (좋음 gold / 보통 청 / 주의 홍). 청·홍은 토큰 부재로 inline hex. */
const COLOR: Record<Assessment, string> = {
  좋음: GOLD_500,
  보통: '#A8C5DA',
  주의: '#E8A0A0',
}

/** 6부위 마커 배치 — 점(dot) + 연결선 + 라벨(anchor). viewBox 240×300 기준. */
const MARKERS: Record<
  FacePartKey,
  { label: string; dot: [number, number]; label_pos: [number, number]; anchor: 'start' | 'middle' | 'end' }
> = {
  forehead: { label: '이마', dot: [120, 104], label_pos: [120, 50], anchor: 'middle' },
  ears: { label: '귀', dot: [61, 160], label_pos: [36, 160], anchor: 'end' },
  eyes: { label: '눈', dot: [150, 143], label_pos: [204, 140], anchor: 'start' },
  nose: { label: '코', dot: [120, 168], label_pos: [204, 176], anchor: 'start' },
  mouth: { label: '입', dot: [120, 196], label_pos: [36, 200], anchor: 'end' },
  chin: { label: '턱', dot: [120, 232], label_pos: [120, 258], anchor: 'middle' },
}

const PART_ORDER: FacePartKey[] = ['forehead', 'ears', 'eyes', 'nose', 'mouth', 'chin']

/**
 * 관상 부위 다이어그램 — 절제된 라인아트 얼굴(정면) 위 6부위 마커(assessment 색).
 * 순수 SVG(캔버스 금지), viewBox 고정. 캡처 컨테이너 안에 위치해 공유 이미지에 포함된다.
 * 데이터(부위 평가) 미비 시 null.
 */
export function FaceDiagram({ parts }: FaceDiagramProps) {
  const reduce = useReducedMotion()
  const active = PART_ORDER.filter((k) => parts[k])
  if (active.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-500/20 bg-white/[0.02] p-4">
      <p className="text-[10px] tracking-[0.25em] text-gold-500/50 uppercase text-center mb-1 font-sans">
        부위별 진단도
      </p>
      <svg
        viewBox="0 0 240 300"
        className="w-full max-w-[280px] mx-auto block"
        role="img"
        aria-label="관상 부위 진단도"
      >
        <g
          fill="none"
          stroke={GOLD_500}
          strokeOpacity={0.55}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 얼굴 윤곽(계란형) */}
          <path d="M120 66 C158 66 182 100 182 146 C182 198 154 238 120 238 C86 238 58 198 58 146 C58 100 82 66 120 66 Z" />
          {/* 귀 */}
          <path d="M58 138 C44 141 44 165 59 170" />
          <path d="M182 138 C196 141 196 165 181 170" />
          {/* 헤어라인(이마 경계) */}
          <path d="M80 92 C100 76 140 76 160 92" opacity={0.6} />
          {/* 눈썹 */}
          <path d="M82 128 Q97 121 110 127" />
          <path d="M130 127 Q143 121 158 128" />
          {/* 눈 */}
          <path d="M84 141 Q96 133 108 141 Q96 148 84 141 Z" />
          <path d="M132 141 Q144 133 156 141 Q144 148 132 141 Z" />
          {/* 코 */}
          <path d="M120 146 L116 170 Q120 175 126 171" />
          {/* 입 */}
          <path d="M103 194 Q120 202 137 194" />
        </g>

        {/* 부위 마커: 연결선 + 점 + 라벨 */}
        {active.map((key, i) => {
          const m = MARKERS[key]
          const a = parts[key] as Assessment
          const c = COLOR[a]
          return (
            <motion.g
              key={key}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.15 + i * 0.08, duration: 0.4 }}
            >
              <line
                x1={m.dot[0]}
                y1={m.dot[1]}
                x2={m.label_pos[0]}
                y2={m.label_pos[1]}
                stroke={c}
                strokeWidth={0.6}
                opacity={0.5}
              />
              <circle cx={m.dot[0]} cy={m.dot[1]} r={4.5} fill={c} />
              <circle cx={m.dot[0]} cy={m.dot[1]} r={7.5} fill="none" stroke={c} strokeWidth={0.8} opacity={0.4} />
              <text
                x={m.label_pos[0]}
                y={m.label_pos[1]}
                fill={c}
                fontSize={12}
                textAnchor={m.anchor}
                dominantBaseline="middle"
                className="font-serif"
              >
                {m.label}
              </text>
            </motion.g>
          )
        })}
      </svg>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {(['좋음', '보통', '주의'] as Assessment[]).map((a) => (
          <div key={a} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR[a] }} />
            <span className="text-[10px] text-white/50 font-sans">{a}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
