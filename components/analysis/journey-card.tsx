'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Gift } from 'lucide-react'
import { IconSaju, IconGwansang, IconSongeum, IconPungsu, IconOhaeng } from '@/components/icons/traditional-icons'
import { AmbientVideo } from '@/components/shared/AmbientVideo'
import {
  buildJourney,
  type JourneyProgress,
  type JourneyStage,
  type JourneyStageId,
} from '@/lib/domain/analysis/journey'
import { getJourneyStatus, type JourneyStatusData } from '@/app/actions/analysis/reading-insights'
import { getJourneyRewardStatus } from '@/app/actions/analysis/journey-reward'
import { JOURNEY_COMPLETE_TITLE, type JourneyRewardKind } from '@/lib/domain/analysis/journey-reward'
import { JourneyRewardSheet } from './journey-reward-sheet'
import { GA } from '@/lib/analytics/ga4'

interface StageIconProps {
  className?: string
  size?: number
}

const STAGE_ICON: Record<JourneyStageId, ComponentType<StageIconProps>> = {
  SAJU: IconSaju,
  FACE: IconGwansang,
  HAND: IconSongeum,
  FENGSHUI: IconPungsu,
  SAMHAP: IconOhaeng,
}

/** 완료 낙관(도장)에 새길 상(相) 한자 — 표현 계층 전용. */
const STAGE_STAMP: Record<JourneyStageId, string> = {
  SAJU: '命',
  FACE: '相',
  HAND: '掌',
  FENGSHUI: '宅',
  SAMHAP: '合',
}

/** 수집 진행 한자 표기(0~5相). */
const HANJA_COUNT = ['零', '一', '二', '三', '四', '五'] as const

const JOURNEY_COPY = '네 가지 상(相)을 모두 모아야 진정한 종합운수가 완성됩니다'
const SAMHAP_LOCKED_COPY = '四相이 모이면 종합풀이가 열립니다'

interface JourneyCardProps {
  /** 가족 대상 id(본인이면 생략). 완주 보상은 본인 여정 전용. */
  targetId?: string
  /** full=허브용 큰 스텝퍼, compact=결과화면용 슬림. */
  variant?: 'full' | 'compact'
  className?: string
}

interface RewardState {
  claimed: boolean
  claimedName: string | null
}

/**
 * 종합운수 여정 카드 — 사주→관상→손금→풍수→종합의 진행을 보여주고 다음 단계로 유도한다.
 * 스스로 진행도(getJourneyStatus)를 조회한다(자가 조회 배너 패턴). 로드 전엔 렌더 없음.
 * 본인 여정 완주 시 보상(신위·테마 택1) 수령 CTA 를 노출한다.
 */
export function JourneyCard({ targetId, variant = 'full', className }: JourneyCardProps) {
  const router = useRouter()
  const [journey, setJourney] = useState<JourneyProgress | null>(null)
  const [records, setRecords] = useState<JourneyStatusData['records']>({})
  const [reward, setReward] = useState<RewardState | null>(null)
  const viewed = useRef(false)
  const completeTracked = useRef(false)

  useEffect(() => {
    let active = true
    getJourneyStatus(targetId).then((status) => {
      if (!active) return
      const built = buildJourney(status.categories, targetId)
      setJourney(built)
      setRecords(status.records)
      if (!viewed.current) {
        viewed.current = true
        GA.journeyView(variant)
      }
      if (built.allComplete && !completeTracked.current) {
        completeTracked.current = true
        GA.journeyComplete()
      }
      // 완주한 본인 여정에만 보상 현황 조회(그 외엔 추가 쿼리 없음)
      if (built.allComplete && !targetId) {
        getJourneyRewardStatus().then((r) => {
          if (!active || !r) return
          setReward({ claimed: !!r.claimed, claimedName: r.claimed?.name ?? null })
        })
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
    <JourneyCompact journey={journey} reward={reward} onGo={go} className={className} />
  ) : (
    <JourneyFull journey={journey} records={records} reward={reward} onGo={go} className={className} />
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

function doneCount(journey: JourneyProgress): number {
  return journey.stages.filter((s) => s.status === 'done').length
}

function formatStampDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

// ── Full 변형 (허브) ──────────────────────────────────────────────────────────
function JourneyFull({
  journey,
  records,
  reward,
  onGo,
  className,
}: {
  journey: JourneyProgress
  records: JourneyStatusData['records']
  reward: RewardState | null
  onGo: (s: JourneyStage) => void
  className?: string
}) {
  const [detailId, setDetailId] = useState<JourneyStageId | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [claimedLocal, setClaimedLocal] = useState<{ name: string } | null>(null)

  const currentIdx = journey.stages.findIndex((s) => s.status === 'current')
  const fillPct = journey.allComplete ? 80 : currentIdx <= 0 ? 0 : currentIdx * 20
  const collected = doneCount(journey)
  const claimed = claimedLocal !== null || (reward?.claimed ?? false)
  const claimedName = claimedLocal?.name ?? reward?.claimedName ?? null
  const showRewardCta = journey.allComplete && reward !== null && !claimed

  const handleNode = (stage: JourneyStage) => {
    if (stage.status === 'done') {
      setDetailId((prev) => (prev === stage.id ? null : stage.id))
      return
    }
    onGo(stage)
  }

  const detailStage = detailId ? journey.stages.find((s) => s.id === detailId) : null
  const detailRecord = detailId ? records[detailId] : null

  const onClaimed = (_kind: JourneyRewardKind, name: string) => {
    setClaimedLocal({ name })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl hanji-card dancheong-border-top ${className ?? ''}`}
      style={{
        background: 'linear-gradient(160deg, #0e0b07 0%, #16140F 50%, #0a0807 100%)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.07)',
      }}
    >
      {/* 앰비언트 배경 영상 — 흐르는 먹·금가루. 없으면 폴백(그라디언트 유지), reduced-motion 존중 */}
      <AmbientVideo
        id="analysis-ambient"
        rate={0.5}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.22, mixBlendMode: 'screen' }}
      />

      {/* 運 워터마크 */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 select-none pointer-events-none font-serif text-gold-500"
        style={{
          fontSize: '14rem',
          lineHeight: 1,
          opacity: 0.03,
          fontWeight: 700,
          transform: 'translate(15%, 15%)',
        }}
      >
        運
      </div>

      {/* 앰비언트 글로우 (도장 레드) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '-40%',
          right: '-20%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(158,43,43,0.08) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative z-10 px-6 py-7 flex flex-col gap-4">
        {/* 한자 라벨 + 수집 진행 */}
        <div className="flex items-baseline">
          <p className="text-[10px] font-serif tracking-[0.5em] text-gold-500/50">五 相 完 集 · 綜 合 運 數</p>
          <span className="ml-auto text-[11px] font-serif text-gold-500 tabular-nums shrink-0">
            <span className="font-bold">{HANJA_COUNT[collected] ?? collected}相</span>
            <span className="text-gold-500/50"> · 五相 中</span>
            <span className="text-gold-500/70 ml-1.5">{journey.progress}%</span>
          </span>
        </div>

        {/* 헤드라인 */}
        <h2
          className="text-[1.4rem] font-serif font-bold leading-[1.4] text-ink-light tracking-tight"
          style={{ wordBreak: 'keep-all' }}
        >
          {journey.allComplete ? (
            <>
              다섯 상(相)이 모두 모여
              <br />
              당신의 <span className="text-gold-500">종합운수</span>가
              <br />
              완성되었습니다
            </>
          ) : (
            <>
              다섯 상(相)이 모이면
              <br />
              비로소 열리는
              <br />
              당신의 <span className="text-gold-500">종합운수</span>
            </>
          )}
        </h2>

        {/* 명언 */}
        <p className="text-[11px] italic font-serif text-gold-500/40 leading-relaxed">
          &ldquo;命·相·掌·宅 — 네 기운이 모일 때, 하늘이 종합을 허락한다&rdquo;
        </p>

        {/* 단청 구분선 */}
        <div className="dancheong-divider" />

        {/* 서브 카피 */}
        <p
          className="text-[12px] text-ink-light/50 font-sans font-light leading-relaxed"
          style={{ wordBreak: 'keep-all' }}
        >
          {journey.allComplete ? `${JOURNEY_COMPLETE_TITLE} — 다섯 상이 모두 모였습니다` : JOURNEY_COPY}
        </p>

        {/* 가로 스텝퍼 */}
        <div className="relative mt-1">
          <div className="absolute top-5 h-px bg-white/10" style={{ left: '10%', right: '10%' }} />
          <div className="absolute top-5 h-px bg-gold-500/70" style={{ left: '10%', width: `${fillPct}%` }} />
          <div className="relative grid grid-cols-5">
            {journey.stages.map((s) => (
              <StepNode key={s.id} stage={s} onTap={handleNode} isDetailOpen={detailId === s.id} />
            ))}
          </div>
        </div>

        {/* 종합 잠금 가치 소구 */}
        {!journey.coreComplete && (
          <p className="text-[10px] text-gold-500/45 font-sans font-light text-right -mt-1">{SAMHAP_LOCKED_COPY}</p>
        )}

        {/* 완료 노드 상세 — 점수·측정일·다시 보기 */}
        {detailStage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg bg-black/25 border border-gold-500/15 px-3 py-2.5">
              <span className="text-[11px] font-serif font-bold text-gold-500 shrink-0">{detailStage.label}</span>
              <span className="text-[11px] text-ink-light/60 font-light flex-1 truncate">
                {detailRecord?.score != null && <span className="text-ink-light/80">{detailRecord.score}점</span>}
                {detailRecord?.score != null && detailRecord?.createdAt && ' · '}
                {detailRecord?.createdAt && `${formatStampDate(detailRecord.createdAt)} 측정`}
                {!detailRecord && detailStage.subtitle}
              </span>
              <button
                onClick={() => onGo(detailStage)}
                className="text-[11px] text-gold-500/80 hover:text-gold-500 font-medium shrink-0 flex items-center gap-0.5"
              >
                다시 보기
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* CTA — 보상 수령 > 다음 단계 순. 도장(印章) 스타일 + 시머 */}
        {claimed && claimedName && !showRewardCta && (
          <p className="text-[11px] text-gold-500/70 font-serif text-center -mb-1">
            {JOURNEY_COMPLETE_TITLE} · {claimedName} 봉안 완료
          </p>
        )}
        <button
          onClick={() => (showRewardCta ? setSheetOpen(true) : onGo(ctaTarget(journey)))}
          className="relative overflow-hidden w-full rounded-sm group/btn hover:scale-[1.01] active:scale-[0.97] transition-transform duration-200"
          style={{
            background: '#9E2B2B',
            border: '1px solid rgba(158,43,43,0.5)',
            boxShadow: '3px 3px 0 0 rgba(158,43,43,0.3)',
          }}
        >
          {/* 시머 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
            }}
          />
          <span className="relative z-10 flex items-center justify-center gap-2.5 py-3.5">
            {showRewardCta && <Gift className="w-4 h-4 text-white/90" />}
            <span className="text-[14px] font-serif font-bold tracking-[0.15em] text-white">
              {showRewardCta ? '완주 보상 받기 — 신위·테마신당 택1' : ctaLabel(journey)}
            </span>
            {!showRewardCta && (
              <ArrowRight
                className="w-4 h-4 text-white/80 group-hover/btn:translate-x-0.5 transition-transform duration-300"
                strokeWidth={2}
              />
            )}
          </span>
        </button>
      </div>

      <JourneyRewardSheet open={sheetOpen} onOpenChange={setSheetOpen} onClaimed={onClaimed} />
    </motion.div>
  )
}

function StepNode({
  stage,
  onTap,
  isDetailOpen,
}: {
  stage: JourneyStage
  onTap: (s: JourneyStage) => void
  isDetailOpen: boolean
}) {
  const Icon = STAGE_ICON[stage.id]
  const done = stage.status === 'done'
  const current = stage.status === 'current'
  const locked = stage.status === 'locked'

  return (
    <button
      onClick={() => onTap(stage)}
      disabled={locked}
      className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed group"
      aria-label={`${stage.label} · ${stage.subtitle}${done ? ' · 완료' : locked ? ' · 잠김' : ''}`}
      aria-expanded={done ? isDetailOpen : undefined}
    >
      {done ? (
        // 낙관(도장) — 붉은 인주에 상(相) 한자를 새겨 찍는다
        <motion.span
          initial={{ scale: 1.5, opacity: 0, rotate: -14 }}
          animate={{ scale: 1, opacity: 1, rotate: -6 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
          className={`w-10 h-10 rounded-md flex items-center justify-center font-serif font-bold text-[17px] text-[#F4E4BA] transition-shadow ${
            isDetailOpen ? 'shadow-[0_0_16px_rgba(158,43,43,0.55)]' : 'shadow-[0_0_10px_rgba(158,43,43,0.3)]'
          }`}
          style={{ background: '#9E2B2B' }}
        >
          {STAGE_STAMP[stage.id]}
        </motion.span>
      ) : (
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            current
              ? 'bg-gold-500/15 border-gold-500/70 text-gold-500 shadow-[0_0_14px_rgba(212,175,55,0.35)] animate-pulse'
              : locked
                ? 'bg-white/[0.03] border-white/10 text-white/25'
                : 'bg-white/5 border-white/10 text-white/40 group-hover:border-white/25'
          }`}
        >
          {locked ? <Lock className="w-4 h-4" /> : <Icon className="w-5 h-5" size={20} />}
        </span>
      )}
      <span
        className={`text-[10px] font-sans leading-none ${
          done || current ? 'text-gold-500 font-semibold' : 'text-white/45'
        }`}
      >
        {stage.label}
      </span>
      <span
        className={`text-[9px] font-sans font-light leading-none ${done || current ? 'text-gold-500/50' : 'text-white/25'}`}
      >
        {stage.subtitle}
      </span>
    </button>
  )
}

// ── Compact 변형 (결과 화면) ──────────────────────────────────────────────────
function JourneyCompact({
  journey,
  reward,
  onGo,
  className,
}: {
  journey: JourneyProgress
  reward: RewardState | null
  onGo: (s: JourneyStage) => void
  className?: string
}) {
  const router = useRouter()
  const target = ctaTarget(journey)
  const rewardWaiting = journey.allComplete && reward !== null && !reward.claimed
  const collected = doneCount(journey)

  const handleClick = () => {
    if (rewardWaiting) {
      // 보상 수령은 허브 여정 섹션에서 — 그리로 보낸다
      router.push('/protected/analysis#hub-journey')
      return
    }
    onGo(target)
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      className={`block w-full text-left relative overflow-hidden rounded-2xl border border-gold-500/40 p-4 group hanji-card ${className ?? ''}`}
      style={{
        background: 'linear-gradient(160deg, #0e0b07 0%, #16140F 50%, #0a0807 100%)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.07)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 shrink-0">
          {rewardWaiting ? (
            <Gift className="w-5 h-5 text-gold-500" strokeWidth={1.5} />
          ) : (
            <span
              className="w-6 h-6 rounded-[3px] flex items-center justify-center font-serif font-bold text-[11px] text-[#F4E4BA] -rotate-6"
              style={{ background: '#9E2B2B' }}
            >
              運
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-serif font-bold text-gold-500">종합운수 여정</p>
            <span className="text-[10px] font-bold text-gold-500/80 font-serif tabular-nums">
              {HANJA_COUNT[collected] ?? collected}相 · {journey.progress}%
            </span>
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
          <p className="text-[11px] text-white/55 font-sans font-light mt-1.5">
            {rewardWaiting ? '완주 보상이 기다립니다 — 신위·테마신당 택1' : ctaLabel(journey)}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gold-500/70 group-hover:translate-x-1 transition-transform shrink-0" />
      </div>
    </motion.button>
  )
}
