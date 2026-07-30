'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Flame, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { startBaekilVow, settleBaekilVow, type BaekilStatus, type BaekilTrophy } from '@/app/actions/shrine/rituals'
import {
  BAEKIL_DISCLAIMER,
  BAEKIL_GA,
  BAEKIL_ITEM_NAME,
  BAEKIL_PRIVACY_NOTICE,
  CANDLE_MIN_RATIO,
  VOW_TROPHY_INFO,
  VOW_VIDEO_LABEL,
  dormantLine,
  isVowVideoWatchable,
  trophyLabel,
} from '@/lib/domain/ritual/baekil'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 백일기도 화면 — 도메인(`lib/domain/ritual/baekil.ts`)이 판정한 상태를 그리기만 한다.
 *
 * ⚠️ 진행도를 여기서 다시 계산하지 않는다. `progress` 는 서버가 기원 누적일에서 파생한 값이고,
 *    화면이 같은 계산을 한 벌 더 들면 둘이 어긋나는 순간 "게이지는 100인데 완주가 안 되는" 상태가 된다.
 *
 * ⚠️ 완주 정산(`settleBaekilVow`)은 **멱등**이다 — 두 번 눌러도 트로피가 하나다(RPC 가 같은 문장에서
 *    `completed_at is null` 을 조건으로 걸고, 0행이면 지급 블록에 들어가지 않는다). 그래서 여기서는
 *    낙관 잠금만 걸고 실패해도 상태를 지어내지 않는다.
 */
export function BaekilClient({ status }: { status: BaekilStatus }) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const { progress, trophies, completedCount, nextRound, milestone, prayedToday } = status
  const locked = pending || busy

  const refresh = () => startTransition(() => window.location.reload())

  const onStart = async () => {
    setBusy(true)
    const res = await startBaekilVow()
    setBusy(false)
    if (!res.success) {
      toast.error(
        res.error === 'ALREADY_ACTIVE' ? '이미 백일의 상이 차려져 있습니다' : '지금은 서약을 올릴 수 없습니다'
      )
      return
    }
    trackEvent({ action: BAEKIL_GA.start, category: 'shrine', label: `round_${res.round ?? nextRound}` })
    toast.success(`${res.round ?? nextRound}회차 백일기도를 시작했습니다`, {
      description: '하루 한 번, 신위 앞에 기도를 올리세요',
    })
    refresh()
  }

  const onSettle = async () => {
    setBusy(true)
    const res = await settleBaekilVow()
    setBusy(false)
    if (!res.success) {
      toast.error(res.error === 'NOT_READY' ? '아직 백일이 차지 않았습니다' : '지금은 갈무리할 수 없습니다')
      return
    }
    trackEvent({ action: BAEKIL_GA.complete, category: 'shrine', label: `round_${res.round ?? 0}` })
    toast.success(`${trophyLabel(res.round ?? 1)}을 받았습니다`, {
      description: res.itemQty ? `${BAEKIL_ITEM_NAME} 1개가 보관함에 담겼습니다` : undefined,
    })
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="hanji-card rounded-2xl border border-gold-500/25 p-5" style={{ background: '#16140F' }}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">百 日 祈 禱</p>
            <h1 className="font-serif text-lg font-bold text-ink-primary">
              백일기도
              {completedCount > 0 && (
                <span className="ml-2 rounded-full border border-gold-500/35 px-2 py-0.5 text-[10px] font-normal text-gold-300">
                  {completedCount}회 완주
                </span>
              )}
            </h1>
          </div>
          <Link
            href="/protected/shrine"
            aria-label="신당으로 돌아가기"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-surface text-ink-primary/60"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>

        {progress.phase === 'none' ? (
          <>
            <p className="font-serif text-[13px] leading-relaxed text-ink-primary/75">
              한 가지 소원을 정해 백일 동안 하루 한 번 기도를 올리는 의식입니다.
              <br />
              {completedCount > 0 ? `이번이 ${nextRound}회차입니다.` : '오늘이 첫날이 됩니다.'}
            </p>
            <button
              type="button"
              onClick={() => void onStart()}
              disabled={locked}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold-500/40 bg-gold-500/[0.10] py-3 font-serif text-[13px] font-bold text-gold-300 disabled:opacity-40"
            >
              {locked ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              {nextRound}회차 첫 촛불 올리기
            </button>
            <p className="mt-2.5 text-center font-sans text-[10px] text-ink-primary/35">{BAEKIL_PRIVACY_NOTICE}</p>
          </>
        ) : (
          <>
            {/* 백일초 — 남은 높이가 곧 남은 날수다. 도메인이 준 비율을 그대로 쓴다. */}
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-7 flex-shrink-0 rounded-t-full bg-white/[0.05]">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-full"
                  style={{
                    height: `${Math.max(CANDLE_MIN_RATIO, progress.candleRatio) * 100}%`,
                    background: 'linear-gradient(180deg, #F3E3B0 0%, #C9A84C 100%)',
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-2xl font-bold tabular-nums text-gold-300">
                  {progress.earnedDays}
                  <span className="ml-1 text-sm font-normal text-ink-primary/40">/ {progress.targetDays}일</span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gold-500/70" style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="mt-2 font-sans text-[11px] text-ink-primary/45">
                  {progress.round}회차 ·{' '}
                  {progress.remainingDays === 0 ? '백일이 찼습니다' : `${progress.remainingDays}일 남음`}
                </p>
              </div>
            </div>

            {milestone && (
              <p className="mt-4 rounded-xl border border-gold-500/15 bg-surface/50 p-3 font-serif text-[12.5px] leading-relaxed text-gold-200">
                {milestone}
              </p>
            )}

            {progress.phase === 'dormant' && progress.idleDays !== null && (
              <p className="mt-2.5 rounded-xl border border-white/10 bg-surface/50 p-3 font-sans text-[11.5px] leading-relaxed text-ink-primary/55">
                {dormantLine(progress.idleDays)}
              </p>
            )}

            {progress.ready ? (
              <button
                type="button"
                onClick={() => void onSettle()}
                disabled={locked}
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold-500/50 bg-gold-500/[0.14] py-3 font-serif text-[13px] font-bold text-gold-200 disabled:opacity-40"
              >
                {locked ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                백일 발원 갈무리하기
              </button>
            ) : (
              <div className="mt-5 rounded-xl border border-white/10 bg-surface/60 py-3 text-center font-serif text-[12.5px] text-ink-primary/45">
                {prayedToday ? '오늘 기도를 올렸습니다 — 내일 다시 뵙겠습니다' : '신당에서 오늘의 기도를 올리세요'}
              </div>
            )}

            {!prayedToday && (
              <Link
                href="/protected/shrine"
                className="mt-2.5 block w-full rounded-xl border border-gold-500/40 bg-gold-500/[0.08] py-2.5 text-center font-serif text-[12px] font-bold text-gold-300"
              >
                신당에서 기도 올리기
              </Link>
            )}
          </>
        )}

        <p className="mt-5 text-center font-sans text-[9.5px] leading-relaxed text-ink-primary/30">
          {BAEKIL_DISCLAIMER}
        </p>
      </div>

      {trophies.length > 0 && <TrophyShelf trophies={trophies} />}
    </div>
  )
}

/** 완주패 선반 — 회차마다 한 장. 트로피는 완주 처리된 서약 행 그 자체라 중복이 있을 수 없다. */
function TrophyShelf({ trophies }: { trophies: BaekilTrophy[] }) {
  return (
    <div className="rounded-2xl border border-gold-500/20 p-4" style={{ background: '#16140F' }}>
      <p className="mb-3 font-serif text-[12px] font-bold text-gold-300">완주패 {trophies.length}</p>
      <ul className="grid grid-cols-3 gap-3">
        {trophies.map((t) => {
          const info = VOW_TROPHY_INFO[t.tier]
          const watchable = isVowVideoWatchable(t.videoStatus, t.videoUrl)
          return (
            <li key={t.vowId} className="flex flex-col items-center gap-1.5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.asset} alt="" aria-hidden className="h-16 w-auto object-contain" draggable={false} />
              <p className="font-serif text-[11px] font-bold" style={{ color: info.accent }}>
                {t.round}회차 {info.label}
              </p>
              <p className="font-sans text-[9.5px] text-ink-primary/35">{t.completedAt.slice(0, 10)}</p>
              {watchable && t.videoUrl ? (
                <a
                  href={t.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gold-500/30 px-2 py-0.5 font-sans text-[9.5px] text-gold-300"
                >
                  축원 영상
                </a>
              ) : (
                <span className="font-sans text-[9.5px] text-ink-primary/25">{VOW_VIDEO_LABEL[t.videoStatus]}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
