'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, User, Hand, Compass, Layers, Check, Lock, ArrowRight, type LucideIcon } from 'lucide-react'
import {
  buildJourney,
  type JourneyProgress,
  type JourneyStage,
  type JourneyStageId,
} from '@/lib/domain/analysis/journey'
import { getJourneyProgress } from '@/app/actions/analysis/reading-insights'
import { GA } from '@/lib/analytics/ga4'

const STAGE_ICON: Record<JourneyStageId, LucideIcon> = {
  SAJU: Sparkles,
  FACE: User,
  HAND: Hand,
  FENGSHUI: Compass,
  SAMHAP: Layers,
}

const JOURNEY_COPY = '네 가지 상(相)을 모두 모아야 진정한 종합운수가 완성됩니다'

interface JourneyCardProps {
  /** 가족 대상 id(본인이면 생략). */
  targetId?: string
  /** full=허브용 큰 스텝퍼, compact=결과화면용 슬림. */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * 종합사주풀이 여정 카드 — 사주→관상→손금→풍수→종합의 진행을 보여주고 다음 단계로 유도한다.
 * 스스로 진행도(getJourneyProgress)를 조회한다(자가 조회 배너 패턴). 로드 전엔 렌더 없음.
 */
export function JourneyCard({ targetId, variant = 'full', className }: JourneyCardProps) {
  const router = useRouter()
  const [journey, setJourney] = useState<JourneyProgress | null>(null)
  const viewed = useRef(false)

  useEffect(() => {
    let active = true
    getJourneyProgress(targetId).then((completed) => {
      if (!active) return
      setJourney(buildJourney(completed, targetId))
      if (!viewed.current) {
        viewed.current = true
        GA.journeyView(variant)
      }
    })
    return () => {
      active = false
    }
  }, [targetId, variant])

  if (!journey) return null

  const go = (stage: JourneyStage) => {
    GA.journeyStep(stage.id)
    router.push(stage.href)
  }

  return variant === 'compact' ? (
    <JourneyCompact journey={journey} onGo={go} className={className} />
  ) : (
    <JourneyFull journey={journey} onGo={go} className={className} />
  )
}

// ── 다음 단계 CTA 라벨 ────────────────────────────────────────────────────────
function ctaLabel(journey: JourneyProgress): string {
  if (journey.allComplete) return '종합사주풀이 다시 보기'
  if (!journey.next) return '종합사주풀이 열기'
  return journey.next.isFinal ? '종합사주풀이 열기' : `다음: ${journey.next.label} 보러 가기`
}

/** allComplete 면 종합 단계, 아니면 next 단계로 이동시킬 대상. */
function ctaTarget(journey: JourneyProgress): JourneyStage {
  if (journey.next) return journey.next
  return journey.stages[journey.stages.length - 1]! // SAMHAP(완료 상태)
}

// ── Full 변형 (허브) ──────────────────────────────────────────────────────────
function JourneyFull({
  journey,
  onGo,
  className,
}: {
  journey: JourneyProgress
  onGo: (s: JourneyStage) => void
  className?: string
}) {
  const currentIdx = journey.stages.findIndex((s) => s.status === 'current')
  const fillPct = journey.allComplete ? 80 : currentIdx <= 0 ? 0 : currentIdx * 20

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-gold-500/30 p-5 ${className ?? ''}`}
      style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(158,43,43,0.05) 100%)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-gold-500" strokeWidth={1.5} />
        <p className="text-sm font-serif font-bold text-gold-500">종합운수 여정</p>
        <span className="ml-auto text-[11px] font-bold text-gold-500 font-serif tabular-nums">{journey.progress}%</span>
      </div>
      <p className="text-[11px] text-white/55 font-sans font-light leading-relaxed mb-4">{JOURNEY_COPY}</p>

      {/* 가로 스텝퍼 */}
      <div className="relative mb-4">
        <div className="absolute top-5 h-px bg-white/10" style={{ left: '10%', right: '10%' }} />
        <div className="absolute top-5 h-px bg-gold-500/70" style={{ left: '10%', width: `${fillPct}%` }} />
        <div className="relative grid grid-cols-5">
          {journey.stages.map((s) => (
            <StepNode key={s.id} stage={s} onGo={onGo} />
          ))}
        </div>
      </div>

      {/* 다음 단계 CTA */}
      <button
        onClick={() => onGo(ctaTarget(journey))}
        className="w-full h-11 rounded-xl bg-gold-500/10 border border-gold-500/40 text-gold-500 font-serif font-bold text-sm flex items-center justify-center gap-2 hover:bg-gold-500/20 transition-colors"
      >
        {ctaLabel(journey)}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

function StepNode({ stage, onGo }: { stage: JourneyStage; onGo: (s: JourneyStage) => void }) {
  const Icon = STAGE_ICON[stage.id]
  const done = stage.status === 'done'
  const current = stage.status === 'current'
  const locked = stage.status === 'locked'

  return (
    <button
      onClick={() => onGo(stage)}
      disabled={locked}
      className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed group"
      aria-label={`${stage.label} · ${stage.subtitle}`}
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
          done
            ? 'bg-gold-500 border-gold-500 text-black shadow-[0_0_14px_rgba(212,175,55,0.4)]'
            : current
              ? 'bg-gold-500/15 border-gold-500/70 text-gold-500 shadow-[0_0_14px_rgba(212,175,55,0.35)] animate-pulse'
              : locked
                ? 'bg-white/[0.03] border-white/10 text-white/25'
                : 'bg-white/5 border-white/10 text-white/40 group-hover:border-white/25'
        }`}
      >
        {done ? (
          <Check className="w-5 h-5" strokeWidth={2.5} />
        ) : locked ? (
          <Lock className="w-4 h-4" />
        ) : (
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        )}
      </span>
      <span
        className={`text-[10px] font-sans leading-none ${
          done || current ? 'text-gold-500 font-semibold' : 'text-white/45'
        }`}
      >
        {stage.label}
      </span>
    </button>
  )
}

// ── Compact 변형 (결과 화면) ──────────────────────────────────────────────────
function JourneyCompact({
  journey,
  onGo,
  className,
}: {
  journey: JourneyProgress
  onGo: (s: JourneyStage) => void
  className?: string
}) {
  const target = ctaTarget(journey)

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onGo(target)}
      className={`block w-full text-left relative overflow-hidden rounded-2xl border border-gold-500/40 p-4 group ${className ?? ''}`}
      style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(158,43,43,0.07) 100%)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 shrink-0">
          <Layers className="w-5 h-5 text-gold-500" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-serif font-bold text-gold-500">종합운수 여정</p>
            <span className="text-[10px] font-bold text-gold-500/80 font-serif tabular-nums">{journey.progress}%</span>
          </div>
          {/* 미니 진행 점 */}
          <div className="flex items-center gap-1 mt-1.5">
            {journey.stages.map((s) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.status === 'done'
                    ? 'w-4 bg-gold-500'
                    : s.status === 'current'
                      ? 'w-4 bg-gold-500/50'
                      : 'w-1.5 bg-white/15'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-white/55 font-sans font-light mt-1.5">{ctaLabel(journey)}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gold-500/70 group-hover:translate-x-1 transition-transform shrink-0" />
      </div>
    </motion.button>
  )
}
