'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Gift } from 'lucide-react'
import { IconBokjumeoni } from '@/components/icons/traditional-icons'
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

const JOURNEY_COPY = '주머니 하나를 채울 때마다 나의 기운이 오르고, 다섯이 모이면 큰 복(종합풀이)이 열립니다'
const JOURNEY_COMPLETE_COPY = '다섯 복주머니가 가득 차, 나의 기운이 정점에 올랐습니다'

/**
 * 첫 주머니(사주) 문안 — 구 사주 유도 카드(`MasterpieceSection`)에서 **옮겨 온** 카피다.
 *
 * 🔴 2026-08-24 CEO: «메인 배너가 2개일 필요가 없어. 아래 걸로 쓰고, 위 글 내용을 아래 배너에
 *    더해라. 위 배너는 없애도 된다 — 사주 아이콘이 런처에 있고, 종합운세에 들어가면 기본
 *    사주를 먼저 본다.» 그래서 배너는 이 카드 하나만 남았고, 사주 유도 카드는 삭제됐다.
 *
 * 🔴 헤드라인 세 줄(「태어난 순간 새겨진 / 당신만의 운명의 지도를 / 펼쳐드립니다」)과 아래
 *    명언은 CEO 가 문구를 명시한 자리다. 카피를 다듬을 때도 이 둘은 건드리지 않는다.
 *
 * 이 문안은 **첫 주머니가 아직 사주일 때만** 나온다(`journey.next?.id === 'SAJU'`).
 * 사주를 채우고 나면 카드는 원래의 복주머니 서사로 돌아간다 — 같은 자리에서 두 말을 하지 않는다.
 */
const SAJU_LABEL = '천 지 인 · 사 주 팔 자'
const SAJU_QUOTE = '하늘의 뜻을 알면, 땅 위의 길이 보인다'

/** 비단 복주머니 팔레트(짙은 진홍·금) — 허브의 **유일한** 메인 배너 정체성(구 먹빛 사주 카드는 폐기). */
const BOK_BG = 'linear-gradient(165deg, #170C0E 0%, #241014 45%, #120909 100%)'
const BOK_SHADOW = '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.08)'
const GOLD_FILL = 'linear-gradient(135deg, #E8D5A0 0%, #C9A84C 45%, #A8903F 100%)'

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
 * 복주머니 카드 — 사주→관상→손금→풍수→종합을 「복주머니 다섯을 채우는」 서사로 보여주고
 * 다음 단계로 유도한다. 스스로 진행도(getJourneyStatus)를 조회한다(자가 조회 배너 패턴).
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
  if (journey.allComplete) return '모아둔 종합풀이 다시 보기'
  if (!journey.next) return '다섯 주머니 종합풀이 열기'
  if (journey.next.isFinal) return '다섯 주머니 종합풀이 열기'
  // 첫 주머니는 사주다 — 구 사주 배너의 CTA(「나의 사주 · 운명 풀어보기」)를 여기로 합쳤다.
  return journey.next.id === 'SAJU' ? '첫 주머니 · 나의 사주 풀어보기' : `다음 주머니: ${journey.next.label} 보러 가기`
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
/**
 * 카드의 표현부 — 진행도를 «받아서» 그리기만 한다(조회 없음).
 *
 * export 한 이유: 배경화면 카드(`WallpaperCardView`)와 같은 계보로, 화면 상태
 * (빈 주머니·진행중·완주 미수령·수령함)를 목 값만 바꿔 세울 수 있어야
 * `/dev-preview` 가 로그인·DB 없이 그 네 상태를 그대로 찍는다.
 * 🔴 조회는 여전히 `JourneyCard` 만 진다 — 이걸 화면에서 직접 쓰지 말 것.
 */
export function JourneyFull({
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
  /** 첫 주머니가 아직 사주 — 이때만 구 사주 배너의 문안으로 말한다(SAJU_LABEL 주석 참고). */
  const atSaju = journey.next?.id === 'SAJU'

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
      className={`relative overflow-hidden rounded-xl border border-gold-500/25 ${className ?? ''}`}
      style={{ background: BOK_BG, boxShadow: BOK_SHADOW }}
    >
      {/* 금실 상단 라인 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

      {/* 복주머니 배경 영상 — 금빛 복주머니·엽전 부유. 없으면 폴백(비단 그라디언트), reduced-motion 존중 */}
      <AmbientVideo
        id="journey-bok"
        rate={0.6}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.3, mixBlendMode: 'screen' }}
      />
      {/* 텍스트 가독용 하단 그라데이션 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(18,9,9,0.45) 0%, rgba(18,9,9,0.72) 55%, rgba(18,9,9,0.88) 100%)',
        }}
      />

      <div className="relative z-10 px-6 py-7 flex flex-col gap-4 text-center">
        {/* 라벨 + 수집 진행 */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-serif tracking-[0.4em] text-gold-500/60">나 의 복 주 머 니</p>
          <span className="text-[11px] font-serif text-gold-500 tabular-nums flex items-center gap-1">
            <IconBokjumeoni className="w-3.5 h-3.5 text-gold-500" />
            <span className="font-bold">{collected}</span>
            <span className="text-gold-500/50">/ 5</span>
            <span className="text-gold-500/70 ml-1.5">기운 {journey.progress}%</span>
          </span>
        </div>

        {/* 사주 라벨 — 첫 주머니(사주) 단계에서만. 구 사주 배너의 첫 줄이다. */}
        {/* ml-[0.5em] — 자간이 마지막 글자 뒤에도 붙어 가운데정렬이 그만큼 왼쪽으로 밀리는 걸 되민다. */}
        {atSaju && (
          <p className="text-[10px] font-serif tracking-[0.5em] text-gold-500/50 -mb-1 ml-[0.5em]">{SAJU_LABEL}</p>
        )}

        {/* 헤드라인 — 첫 주머니(사주) / 진행중 / 완주 세 상태 */}
        <h2
          className="text-[1.35rem] font-serif font-bold leading-[1.5] text-ink-light tracking-tight"
          style={{ wordBreak: 'keep-all' }}
        >
          {journey.allComplete ? (
            <>
              다섯 복주머니가 가득 차
              <br />
              나의 <span className="text-gold-500">큰 복</span>이 열렸습니다
            </>
          ) : atSaju ? (
            <>
              태어난 순간 새겨진
              <br />
              당신만의 <span className="text-gold-500">운명의 지도</span>를
              <br />
              펼쳐드립니다
            </>
          ) : (
            <>
              다섯 개의 복주머니를 채우면
              <br />
              나의 <span className="text-gold-500">큰 복</span>이 열립니다
            </>
          )}
        </h2>

        {/* 부제 — 사주 단계에서는 구 배너의 명언이 그 자리를 대신한다(이탤릭 두 줄을 만들지 않는다) */}
        <p className="text-[11px] italic font-serif text-ink-light/45 leading-relaxed">
          {atSaju ? `“${SAJU_QUOTE}”` : '주머니가 채워질수록, 나의 기운이 차오릅니다'}
        </p>

        {/* 금실 구분선 */}
        <div className="h-px w-2/3 mx-auto bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

        {/* 서브 카피 */}
        <p
          className="text-[12px] text-ink-light/55 font-sans font-light leading-relaxed"
          style={{ wordBreak: 'keep-all' }}
        >
          {journey.allComplete ? (
            `${JOURNEY_COMPLETE_COPY} — ${JOURNEY_COMPLETE_TITLE}`
          ) : atSaju ? (
            <>
              천간·지지·오행의 흐름을 읽고,{' '}
              <span className="text-ink-light/80">대운과 세운이 알려주는 인생의 전환점</span>을 청담해화당이
              짚어드립니다. 이 사주 풀이가 첫 주머니에 담깁니다.
            </>
          ) : (
            JOURNEY_COPY
          )}
        </p>

        {/* 복주머니 스텝퍼 */}
        <div className="relative mt-1">
          <div
            className="absolute top-5 h-px border-t border-dashed border-white/15"
            style={{ left: '10%', right: '10%' }}
          />
          <div className="absolute top-5 h-px bg-gold-500/70" style={{ left: '10%', width: `${fillPct}%` }} />
          <div className="relative grid grid-cols-5">
            {journey.stages.map((s) => (
              <PouchNode key={s.id} stage={s} onTap={handleNode} isDetailOpen={detailId === s.id} />
            ))}
          </div>
        </div>

        {/* 완료 노드 상세 — 점수·측정일·다시 보기 */}
        {detailStage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg bg-black/30 border border-gold-500/15 px-3 py-2.5 text-left">
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

        {/* CTA — 보상 수령 > 다음 단계 순. 금빛 채움(밤하늘 위 금) */}
        {claimed && claimedName && !showRewardCta && (
          <p className="text-[11px] text-gold-500/70 font-serif -mb-1">
            {JOURNEY_COMPLETE_TITLE} · {claimedName} 봉안 완료
          </p>
        )}
        <button
          onClick={() => (showRewardCta ? setSheetOpen(true) : onGo(ctaTarget(journey)))}
          className="relative overflow-hidden w-full rounded-lg group/btn hover:scale-[1.01] active:scale-[0.97] transition-transform duration-200"
          style={{ background: GOLD_FILL, boxShadow: '0 4px 20px rgba(201,168,76,0.25)' }}
        >
          {/* 시머 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)',
            }}
          />
          <span className="relative z-10 flex items-center justify-center gap-2.5 py-3.5">
            {showRewardCta ? (
              <Gift className="w-4 h-4 text-[#0A0A08]" />
            ) : (
              <IconBokjumeoni className="w-4 h-4 text-[#0A0A08]" />
            )}
            <span className="text-[14px] font-serif font-bold tracking-[0.1em] text-[#0A0A08]">
              {showRewardCta ? '가득 찬 복 받기 — 신위·테마 중 하나' : ctaLabel(journey)}
            </span>
            {!showRewardCta && (
              <ArrowRight className="w-4 h-4 text-[#0A0A08]/80 group-hover/btn:translate-x-0.5 transition-transform duration-300" />
            )}
          </span>
        </button>
      </div>

      <JourneyRewardSheet open={sheetOpen} onOpenChange={setSheetOpen} onClaimed={onClaimed} />
    </motion.div>
  )
}

function PouchNode({
  stage,
  onTap,
  isDetailOpen,
}: {
  stage: JourneyStage
  onTap: (s: JourneyStage) => void
  isDetailOpen: boolean
}) {
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
        // 가득 찬 복주머니 — 금빛 점등
        <motion.span
          initial={{ scale: 1.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-shadow ${
            isDetailOpen ? 'shadow-[0_0_18px_rgba(212,175,55,0.6)]' : 'shadow-[0_0_12px_rgba(212,175,55,0.35)]'
          }`}
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.25) 0%, rgba(201,168,76,0.05) 70%)' }}
        >
          <IconBokjumeoni className="w-5 h-5 text-gold-500" fill="rgba(201,168,76,0.35)" />
        </motion.span>
      ) : (
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            current
              ? 'bg-gold-500/10 border-gold-500/60 text-gold-500 shadow-[0_0_14px_rgba(212,175,55,0.3)] animate-pulse'
              : locked
                ? 'bg-white/[0.03] border-white/10 text-white/25'
                : 'bg-white/5 border-white/10 text-white/35 group-hover:border-white/25'
          }`}
        >
          {locked ? <Lock className="w-4 h-4" /> : <IconBokjumeoni className="w-4 h-4" />}
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
      // 보상 수령은 허브 복주머니 섹션에서 — 그리로 보낸다
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
      className={`block w-full text-left relative overflow-hidden rounded-2xl border border-gold-500/30 p-4 group ${className ?? ''}`}
      style={{ background: BOK_BG, boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.08)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/30 shrink-0">
          {rewardWaiting ? (
            <Gift className="w-5 h-5 text-gold-500" strokeWidth={1.5} />
          ) : (
            <IconBokjumeoni className="w-5 h-5 text-gold-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-serif font-bold text-gold-500">나의 복주머니</p>
            <span className="text-[10px] font-bold text-gold-500/80 font-serif tabular-nums">
              주머니 {collected}/5 · 기운 {journey.progress}%
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
            {rewardWaiting ? '가득 찬 복이 기다립니다 — 신위·테마 중 하나' : ctaLabel(journey)}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gold-500/70 group-hover:translate-x-1 transition-transform shrink-0" />
      </div>
    </motion.button>
  )
}
