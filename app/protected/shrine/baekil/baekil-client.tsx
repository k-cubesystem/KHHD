'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Flame, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  requestGut,
  settleBaekilVow,
  startBaekilVow,
  type BaekilStatus,
  type BaekilTrophy,
  type GutStatusData,
} from '@/app/actions/shrine/rituals'
import { ShrineWishForm } from '@/components/shrine/ShrineWishForm'
import {
  BAEKIL_DISCLAIMER,
  BAEKIL_DORMANT_DAYS,
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
import { GUT_NOTICE, GUT_SEGMENTS, GUT_STATUS_LABEL, GUT_TOTAL_SEC, chukwonText } from '@/lib/domain/ritual/gut'
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
export function BaekilClient({
  status,
  shrineId,
  gut,
}: {
  status: BaekilStatus
  /** 소원을 남길 신당 — 백일 서약과 소원이 한 자리에서 이루어진다(CEO 2026-08-01 통합) */
  shrineId: string | null
  /** 기원굿 현황 — 조회 실패면 null 이라 칸 자체가 서지 않는다 */
  gut: GutStatusData | null
}) {
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
              // 주 CTA — 의식을 성립시키는 버튼은 도장 반경 3px + 도장 그림자 (DESIGN.md "buttons 3px")
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/40 bg-gold-500/[0.10] py-3 font-serif text-[13px] font-bold text-gold-300 shadow-dojang disabled:opacity-40"
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
                // 주 CTA — 완주 정산도 의식의 성립이라 도장 문법을 따른다
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/[0.14] py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang disabled:opacity-40"
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
                className="mt-2.5 block w-full rounded-lg border border-gold-500/40 bg-gold-500/[0.08] py-2.5 text-center font-serif text-[12px] font-bold text-gold-300"
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

      {/* 왜·어떻게 — 서약 전에는 권유, 서약 뒤에는 지금 어느 걸음인지 (CEO: 이유와 동기부여) */}
      {/* 기원굿 — 완주 전에는 **무엇이 기다리는지**(동기부여), 완주 뒤에는 신청 */}
      {gut && <GutPanel gut={gut} completedCount={completedCount} />}

      <WhyBaekil />
      <HowBaekil step={progress.phase === 'none' ? 0 : progress.ready ? 2 : 1} />

      {/*
        소원 세우기 — 신당 하단에 따로 있던 「나의 소원 기원」을 여기로 옮겼다(CEO 2026-08-01).
        백일기도는 원래 **한 가지 소원을 정해** 백 일을 지키는 의식이라, 소원 없이 날짜만 세는 화면과
        날짜 없이 소원만 적는 화면으로 갈라져 있던 것이 애초에 어긋난 구성이었다.
      */}
      {shrineId && (
        <div className="rounded-2xl border border-gold-500/20 p-4" style={{ background: '#16140F' }}>
          <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">소 원 세 우 기</p>
          <p className="mt-1.5 mb-3 font-sans text-[11.5px] leading-relaxed text-ink-primary/50">
            {progress.phase === 'none'
              ? '백 일 동안 붙들 소원 한 가지를 적어 두십시오. 서약을 시작하기 전이어도 괜찮습니다.'
              : '오늘의 마음을 한 줄 더 남기셔도 됩니다. 쌓인 말이 백 일의 기록이 됩니다.'}
          </p>
          <ShrineWishForm shrineId={shrineId} isOwner prayedToday={prayedToday} />
        </div>
      )}

      {trophies.length > 0 && <TrophyShelf trophies={trophies} />}
    </div>
  )
}

/**
 * 「왜 백일인가」 — 기한의 내력.
 *
 * 삼국유사 고조선조: 환웅이 곰과 호랑이에게 쑥과 마늘을 주며 **백 일 동안** 햇빛을 보지 말라 했다.
 * 곰은 그 금기를 지켜 삼칠일(21일) 만에 사람의 몸을 얻었다 — 곧 우리에게 백일은
 * **"여기까지 견디면 달라진다"고 여겨 온 기한**이다. 아이의 백일, 절집의 백일기도가 다 같은 셈이다.
 *
 * 동기부여는 문구가 아니라 **왜 하는지를 알려 주는 것**이 먼저다. 그래서 서약 전에 이 카드가 선다.
 */
function WhyBaekil() {
  return (
    <div className="rounded-2xl border border-gold-500/20 p-4" style={{ background: '#16140F' }}>
      <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">왜 백 일 인 가</p>
      <p className="mt-2 font-serif text-[12.5px] leading-[1.8] text-ink-primary/75">
        환웅이 곰과 호랑이에게 쑥과 마늘을 주며 이른 기한이 <b className="text-gold-200">백 일</b>이었습니다. 곰은 그
        약속을 지켜 사람이 되었고, 호랑이는 견디지 못해 굴을 나갔습니다. 그 뒤로 우리에게 백 일은
        <b className="text-gold-200"> 여기까지 견디면 달라진다</b>고 여겨 온 기한입니다. 아이의 백일잔치도, 절집의
        백일기도도 모두 같은 셈에서 나왔습니다.
      </p>
      <p className="mt-2.5 font-sans text-[11.5px] leading-relaxed text-ink-primary/45">
        백일기도가 이루어 주는 것은 기적이 아니라 <b className="text-ink-primary/70">백 일 동안 같은 마음을 지킨 나</b>
        입니다. 소원은 그 마음을 붙들어 두는 말뚝입니다.
      </p>
    </div>
  )
}

/** 「어떻게 하는가」 — 세 걸음. 서약 전에는 안내, 서약 뒤에는 지금 어느 걸음인지 알려 준다. */
function HowBaekil({ step }: { step: 0 | 1 | 2 }) {
  const STEPS = [
    { n: '하나', title: '소원을 세웁니다', body: '한 가지만 정합니다. 여럿을 담으면 마음이 흩어집니다.' },
    {
      n: '둘',
      title: '하루 한 번 기도를 올립니다',
      body: '신당에서 기도를 올리면 그날의 하루가 쌓입니다. 하루에 두 번 올려도 하루입니다.',
    },
    {
      n: '셋',
      title: '백 일을 채우면 갈무리합니다',
      body: '완주패를 받고, 기원굿으로 그 백 일을 영상에 담아 드립니다.',
    },
  ]
  return (
    <div className="rounded-2xl border border-white/10 p-4" style={{ background: '#16140F' }}>
      <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">어 떻 게 하 는 가</p>
      <ol className="mt-2.5 space-y-2.5">
        {STEPS.map((s, i) => {
          const now = i === step
          return (
            <li key={s.n} className="flex gap-2.5">
              <span
                className={`mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-[3px] border font-serif text-[10px] font-bold ${
                  now
                    ? 'border-gold-500/60 bg-gold-500/15 text-gold-200'
                    : 'border-white/12 bg-white/[0.03] text-ink-primary/40'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className={`font-serif text-[12.5px] font-bold ${now ? 'text-gold-200' : 'text-ink-primary/65'}`}>
                  {s.title}
                  {now && <span className="ml-1.5 font-sans text-[10px] font-normal text-gold-300/70">지금 여기</span>}
                </p>
                <p className="mt-0.5 font-sans text-[11.5px] leading-relaxed text-ink-primary/45">{s.body}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 border-t border-white/[0.07] pt-2.5 font-sans text-[11px] leading-relaxed text-ink-primary/45">
        하루를 거르셔도 지금까지 쌓인 날은 사라지지 않습니다. 다만 {BAEKIL_DORMANT_DAYS}일 넘게 발길이 끊기면 촛불이
        사그라들어 「쉬는 중」으로 표시됩니다 — 그때 다시 오시면 그 자리에서 이어집니다.
      </p>
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

/**
 * 기원굿 칸 — 백 일 끝에 무엇이 기다리는지 **미리** 보여 준다.
 *
 * 동기부여는 문구가 아니라 **보상이 구체적일 때** 생긴다. 그래서 완주 전에도 굿거리 다섯과
 * 길이, 그리고 내 축원문에 무엇이 담기는지를 그대로 펼쳐 놓는다 — 받게 될 것을 아는 사람이 견딘다.
 *
 * ⚠️ 지금은 **접수까지만** 연다(영상 제작은 힉스필드 연동 후). 그래서 접수 뒤에는 상태만 알린다.
 * ⚠️ 청원(값을 치르고 청하는) 건은 가격 미정이라 버튼 자체를 만들지 않는다 — 값을 모르는 결제
 *    버튼을 두는 것이 가장 나쁘다.
 */
function GutPanel({ gut, completedCount }: { gut: GutStatusData; completedCount: number }) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const chukwon = chukwonText(gut.chukwon)
  const latest = gut.requests[0] ?? null
  const canRequest = gut.remainingFree > 0

  const onRequest = async () => {
    setBusy(true)
    const res = await requestGut('completion')
    setBusy(false)
    if (!res.success) {
      toast.error(res.error === 'NO_QUOTA' ? '이번 회차의 기원굿은 이미 접수하셨습니다' : '지금은 접수할 수 없습니다')
      return
    }
    trackEvent({ action: 'gut_request', category: 'shrine', label: 'completion' })
    toast.success('기원굿을 접수했습니다', { description: '축원문이 준비되면 알려 드리겠습니다' })
    window.location.reload()
  }

  return (
    <div className="rounded-2xl border border-gold-500/25 p-4" style={{ background: '#16140F' }}>
      <div className="flex items-baseline justify-between">
        <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">기 원 굿 · 祈 願</p>
        <p className="font-sans text-[10.5px] text-ink-primary/40">약 {Math.round(GUT_TOTAL_SEC / 60)}분 영상</p>
      </div>

      <p className="mt-2 font-serif text-[12.5px] leading-[1.8] text-ink-primary/75">
        {completedCount > 0
          ? '백 일을 채우신 분께는 그 정성을 굿으로 올려 영상에 담아 드립니다.'
          : '백 일을 채우시면 그 정성을 굿으로 올려 영상에 담아 드립니다. 이름을 부르는 축원과 함께입니다.'}
      </p>

      {/* 굿거리 다섯 — 전승의 뼈대(부정으로 열고 뒷전으로 닫는다) 그대로다 */}
      <ol className="mt-3 space-y-1.5">
        {GUT_SEGMENTS.map((seg) => (
          <li key={seg.key} className="flex items-baseline gap-2">
            <span
              className={`w-[54px] flex-shrink-0 font-serif text-[11.5px] ${
                seg.personal ? 'font-bold text-gold-200' : 'text-ink-primary/55'
              }`}
            >
              {seg.name}
            </span>
            <span className="min-w-0 flex-1 font-sans text-[11px] leading-relaxed text-ink-primary/45">{seg.does}</span>
            <span className="flex-shrink-0 font-sans text-[10px] tabular-nums text-ink-primary/30">{seg.sec}초</span>
          </li>
        ))}
      </ol>

      {/* 축원문 미리보기 — 무엇이 담기는지 먼저 본다 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 w-full rounded-lg border border-white/10 bg-surface/40 py-2 font-serif text-[11.5px] text-ink-primary/55"
      >
        {open ? '축원문 접기' : '내 축원문 미리 보기'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-xl border border-gold-500/15 bg-black/25 px-3 py-3">
          {chukwon.map((line, i) => (
            <p key={i} className="font-serif text-[12.5px] leading-[1.8] text-gold-100/85">
              {line}
            </p>
          ))}
          <p className="mt-1 border-t border-white/[0.07] pt-2 font-sans text-[10px] leading-relaxed text-ink-primary/40">
            {GUT_NOTICE}
          </p>
        </div>
      )}

      {latest ? (
        <p className="mt-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.06] px-3 py-2.5 font-serif text-[12px] text-gold-200">
          {latest.round ? `${latest.round}회차 기원굿 — ` : ''}
          {GUT_STATUS_LABEL[latest.status]}
        </p>
      ) : null}

      {canRequest ? (
        <button
          type="button"
          onClick={() => void onRequest()}
          disabled={busy}
          // 주 CTA — 의식의 성립이라 도장 문법 (DESIGN.md "buttons 3px")
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/[0.14] py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
          기원굿 올리기 {gut.remainingFree > 1 ? `(${gut.remainingFree}회 가능)` : ''}
        </button>
      ) : (
        <p className="mt-3 rounded-xl border border-white/10 bg-surface/50 py-2.5 text-center font-sans text-[11.5px] text-ink-primary/45">
          {completedCount > 0
            ? '이번 회차 몫은 다 쓰셨습니다 — 다음 백 일에 다시 올려 드립니다'
            : '백 일을 채우시면 열립니다'}
        </p>
      )}
    </div>
  )
}
