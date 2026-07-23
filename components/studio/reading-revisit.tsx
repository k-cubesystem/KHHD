'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Clock, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react'
import { trackEvent } from '@/lib/analytics/ga4'
import type { FamilyResemblanceResult } from '@/app/actions/analysis/reading-insights'

/**
 * B-2 기색 재측정 배너 (관상 업로드 화면).
 * 30일 경과 → "기색은 흐릅니다" 재측정 유도. 30일 미만 → 마지막 측정일만 조그맣게.
 */
export function GisaekRemeasureBanner({ daysSince }: { daysSince: number }) {
  const due = daysSince >= 30
  useEffect(() => {
    trackEvent({
      action: due ? 'gisaek_remeasure_due' : 'gisaek_last_measured',
      category: 'analysis',
      label: `face:${daysSince}d`,
    })
  }, [due, daysSince])

  if (!due) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40 font-sans">
        <Clock className="w-3 h-3 text-gold-500/50" />
        마지막 관상 측정 {daysSince}일 전
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-gold-500/40 p-4"
      style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(45,95,138,0.06) 100%)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gold-500/15 border border-gold-500/30 shrink-0">
          <RefreshCw className="w-4 h-4 text-gold-500" />
        </div>
        <div>
          <p className="text-sm font-serif font-bold text-gold-500">기색은 흐릅니다 — {daysSince}일 전 측정</p>
          <p className="text-[11px] text-white/55 font-sans font-light mt-0.5">
            계절이 바뀌면 얼굴의 기색도 달라집니다. 지금의 운기를 다시 살펴보세요.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * B-2 전/후 비교 카드 (관상 재분석 완료 시).
 * 이전 vs 현재 종합 점수(±N) + 기색 한줄을 나란히.
 */
export function ReadingCompareCard({
  prevScore,
  currentScore,
  prevGisaek,
  currentGisaek,
  daysSince,
}: {
  prevScore: number | null
  currentScore: number
  prevGisaek?: string
  currentGisaek?: string
  daysSince: number
}) {
  useEffect(() => {
    trackEvent({ action: 'reading_score_compare', category: 'analysis', label: 'face' })
  }, [])

  const delta = prevScore != null ? currentScore - prevScore : 0
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaColor = delta > 0 ? '#7FCf9f' : delta < 0 ? '#E8A0A0' : '#A8C5DA'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gold-500/25 bg-white/[0.02] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gold-500" />
          <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">기색의 변화</h3>
        </div>
        <span className="text-[10px] text-white/40 font-sans">{daysSince}일 만의 재측정</span>
      </div>

      <div className="flex items-stretch gap-2">
        <CompareColumn label="이전" score={prevScore} gisaek={prevGisaek} muted />
        <div className="flex flex-col items-center justify-center px-1">
          <div
            className="flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold font-serif"
            style={{ backgroundColor: `${deltaColor}22`, color: deltaColor }}
          >
            <DeltaIcon className="w-3 h-3" />
            {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'}
          </div>
        </div>
        <CompareColumn label="현재" score={currentScore} gisaek={currentGisaek} />
      </div>
    </motion.div>
  )
}

function CompareColumn({
  label,
  score,
  gisaek,
  muted = false,
}: {
  label: string
  score: number | null
  gisaek?: string
  muted?: boolean
}) {
  return (
    <div
      className={`flex-1 rounded-xl border border-white/5 p-3.5 ${muted ? 'bg-white/[0.015]' : 'bg-gold-500/[0.05]'}`}
    >
      <p className="text-[10px] text-gold-500/60 font-sans tracking-widest uppercase mb-1">{label}</p>
      <p
        className={`font-serif font-bold leading-none ${muted ? 'text-white/45' : 'text-gold-500'}`}
        style={{ fontSize: 28 }}
      >
        {score ?? '—'}
        <span className="text-xs font-sans font-light ml-0.5">점</span>
      </p>
      {gisaek && (
        <p className="text-[11px] text-white/55 font-sans font-light leading-relaxed mt-2 line-clamp-3">{gisaek}</p>
      )}
    </div>
  )
}

/**
 * B-3 가족 닮은꼴 운세 카드 (관상 결과 화면, AI 호출 없음).
 * 닮은 부위(강조)·다른 부위(개성) + 한줄 스토리.
 */
export function FamilyResemblanceCard({ data }: { data: FamilyResemblanceResult }) {
  useEffect(() => {
    trackEvent({ action: 'family_resemblance_view', category: 'analysis', label: data.otherLabel })
  }, [data.otherLabel])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-gold-500/30 p-5"
      style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(158,43,43,0.05) 100%)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gold-500/15 border border-gold-500/40">
          <Users className="w-3.5 h-3.5 text-gold-500" />
        </div>
        <div>
          <p className="text-sm font-serif font-bold text-gold-500 tracking-wide">가족 닮은꼴</p>
          <p className="text-[10px] text-gold-500/50 font-sans tracking-wider uppercase">
            {data.otherLabel} · 부위별 기운 비교
          </p>
        </div>
      </div>

      <p className="text-sm text-ink-primary/85 font-serif font-light leading-relaxed mb-4">{data.story}</p>

      {data.similar.length > 0 && (
        <div className="mb-2.5">
          <p className="text-[10px] text-gold-500/60 font-sans tracking-widest uppercase mb-1.5">닮은 부위</p>
          <div className="flex flex-wrap gap-1.5">
            {data.similar.map((p) => (
              <span
                key={p.key}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gold-500/12 border border-gold-500/30 text-gold-500/90 font-sans"
              >
                {p.label} ({p.palace})
              </span>
            ))}
          </div>
        </div>
      )}

      {data.different.length > 0 && (
        <div>
          <p className="text-[10px] text-white/40 font-sans tracking-widest uppercase mb-1.5">저마다의 개성</p>
          <div className="flex flex-wrap gap-1.5">
            {data.different.map((p) => (
              <span
                key={p.key}
                className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/55 font-sans"
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
