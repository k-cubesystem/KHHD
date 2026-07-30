'use client'

/**
 * 오방기(五方旗) 점괘 — 선택장애 해소 의식 (PRD-shrine-rituals-v1 §2 / ARCH §2·4).
 *
 * 흐름: 질문유형·선택지 입력 → 칠성방울 + 5기 셔플 → 한 기를 위로 쓸어 뽑기 → 펼침(색 공개) → 한마디.
 *
 * 이 컴포넌트의 네 가지 규율:
 *  1) **질문·선택지는 이 파일 밖으로 나가지 않는다.** 서버 액션에 넘기는 것은 색·질문유형 둘뿐이고,
 *     어느 깃발 뒤에 어느 선택지가 있는지는 서버가 준 시드로 **여기서** 계산한다. state 에만 살다 사라진다.
 *  2) **연출 CSS 는 전부 app/shrine-scene.css** — styled-jsx 는 App Router 산출물에 실리지 않는다.
 *     국면 전환도 setTimeout 체인이 아니라 셔플·뽑기 애니메이션의 animationend 가 몬다.
 *  3) **색은 펼칠 때 처음 드러난다.** 말아둔 깃발 5기는 전부 같은 모양·같은 색이다 —
 *     미리 보이면 "뽑기"가 아니라 "고르기"가 된다.
 *  4) **복채가 걸린 뽑기는 낙관 UI 를 쓰지 않는다.** 무료분은 즉시 펼쳐도 되지만, 값을 무는 회차는
 *     서버가 차감을 확정한 뒤에 펼친다(뽑기 애니메이션 0.55s 가 그 대기를 덮는다).
 */

import { useCallback, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import Link from 'next/link'
import { Flag, X, Share2, Loader2, Coins } from 'lucide-react'
import { toast } from 'sonner'
import {
  OBANGKI_COLOR_INFO,
  OBANGKI_DISCLAIMER,
  OBANGKI_DRAG_THRESHOLD,
  OBANGKI_OPTION_MAX,
  OBANGKI_OPTION_MIN,
  OBANGKI_OPTION_TEXT_MAX,
  OBANGKI_PRIVACY_NOTICE,
  OBANGKI_QTYPES,
  OBANGKI_QTYPE_HINT,
  OBANGKI_QTYPE_LABEL,
  assignOptions,
  drawSeed,
  obangkiLine,
  shuffleFlags,
  verdictLine,
  type ObangkiColor,
  type ObangkiQType,
} from '@/lib/domain/ritual/obangki'
import { drawObangki, type ObangkiStatus } from '@/app/actions/shrine/rituals'
import { claimShareReward } from '@/app/actions/payment/bok-points'
import { trackEvent } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'
import type { SoundKey } from '@/lib/domain/shrine/types'
import { EffectsCanvas, type EffectsHandle } from './EffectsCanvas'

/** 깃발 무대(px) — 5기가 모바일 480px 시트 안에 여유롭게 선다. */
const STAGE = { w: 300, h: 176 } as const
/** 자리 하나의 폭 — 무대 폭을 5로 나눈 값. */
const SLOT_W = STAGE.w / 5

const DRAW_ERROR_MSG: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다',
  INVALID_COLOR: '깃발을 잡지 못했습니다',
  INVALID_QTYPE: '무엇을 여쭐지 고르지 못했습니다',
  NEEDS_PAYMENT: '오늘 무료 점괘를 다 쓰셨습니다',
  INSUFFICIENT_BOKCHAE: '복채가 모자랍니다',
  DRAW_FAILED: '점괘가 기록되지 않았습니다 — 괘는 그대로입니다',
}

type Phase = 'compose' | 'shuffle' | 'pick' | 'draw'

interface DrawOutcome {
  success: boolean
  error?: string
}

interface Props {
  /** 서버가 내려준 오늘 현황. null 이면 스트립을 그리지 않는다(비로그인·조회 실패). */
  status: ObangkiStatus
  /** 신당 사운드 재생. 룸의 인스턴스를 빌려 쓴다(AudioContext 를 새로 만들지 않기 위함). */
  play: (key: SoundKey) => void
}

export function ObangkiStrip({ status, play }: Props) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('compose')
  const [qtype, setQtype] = useState<ObangkiQType>('choice')
  const [options, setOptions] = useState<string[]>(['', ''])
  /** 오늘 뽑은 총 횟수 — 회차 시드(seq)이자 무료 잔여의 근거. 서버 응답으로 정정된다. */
  const [todayCount, setTodayCount] = useState(status.todayCount)
  /** 이번 회차의 시드가 선 순번. 시작 시점에 고정한다(뽑는 동안 카운트가 바뀌어도 깃발이 안 흔들리게) */
  const [seq, setSeq] = useState(status.todayCount)
  const [picked, setPicked] = useState<number | null>(null)
  /** 뽑기 애니메이션이 끝났는가 — 펼침의 두 조건 중 하나(나머지는 서버 응답) */
  const [pullDone, setPullDone] = useState(false)
  const [outcome, setOutcome] = useState<DrawOutcome | null>(null)
  const [sharing, setSharing] = useState(false)

  const effectsRef = useRef<EffectsHandle>(null)
  const dragState = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  /** 드래그로 끝난 제스처가 뒤이어 click 으로도 도착한다 — 빗나간 드래그가 탭 뽑기로 둔갑하지 않게 한 번 삼킨다 */
  const suppressClick = useRef(false)

  const remainingFree = Math.max(0, status.freeLimit - todayCount)
  const paidDraw = remainingFree <= 0

  // 이번 회차의 깃발 진열·선택지 배정 — 서버가 준 시드(userId+날짜)에 회차를 얹어 만든다.
  // 같은 (userId, 날짜, seq)면 언제 다시 그려도 같은 배열이다(리렌더에도 안 흔들린다).
  const seed = useMemo(() => drawSeed(status.seed, seq), [status.seed, seq])
  const filled = useMemo(() => options.map((o) => o.trim()).filter((o) => o.length > 0), [options])
  const flags = useMemo(() => shuffleFlags(seed), [seed])
  const slots = useMemo(() => assignOptions(filled.length, seed), [filled.length, seed])

  const revealed = pullDone && outcome?.success === true
  const failed = outcome?.success === false
  const pickedColor: ObangkiColor | null = picked === null ? null : flags[picked]
  const pickedOption = picked === null || slots.length <= picked ? null : (filled[slots[picked]] ?? null)

  /** 시트를 닫을 때 질문·선택지를 확실히 지운다 — 다음에 열었을 때 남아 있으면 그 자체가 사고다 */
  const close = useCallback(() => {
    setOpen(false)
    setPhase('compose')
    setOptions(['', ''])
    setPicked(null)
    setPullDone(false)
    setOutcome(null)
    dragState.current = null
  }, [])

  const restart = useCallback(() => {
    setPhase('compose')
    setPicked(null)
    setPullDone(false)
    setOutcome(null)
    dragState.current = null
  }, [])

  // ── 셔플 시작 ────────────────────────────────────────────
  const startShuffle = useCallback(() => {
    setSeq(todayCount)
    setPicked(null)
    setPullDone(false)
    setOutcome(null)
    setPhase('shuffle')
    play('bell')
  }, [todayCount, play])

  // ── 뽑기 ─────────────────────────────────────────────────
  // 색은 여기서 확정된다(시드가 정한 진열 × 사용자가 고른 자리). 서버로는 그 색만 간다.
  // 무료 회차는 결과를 기다리지 않고 펼쳐도 되지만, 복채 회차는 차감 확정 후에 펼친다 —
  // 두 경로를 하나로 두기 위해 **언제나 서버 응답을 기다린다**(뽑기 0.55s 가 대기를 덮는다).
  const pull = useCallback(
    (index: number) => {
      if (phase !== 'pick' || picked !== null) return
      const color = flags[index]
      setPicked(index)
      setPullDone(false)
      setPhase('draw')
      play('chime')
      trackEvent({ action: 'obangki_draw', category: 'shrine', label: color })

      void drawObangki(color, qtype, paidDraw).then((res) => {
        if (typeof res.todayCount === 'number') setTodayCount(res.todayCount)
        if (res.success) {
          setOutcome({ success: true })
          // 뽑힌 자리(0~4) 위에서 색 버스트 — 무대를 5등분한 가운데가 x%
          const x = (index + 0.5) * 20
          effectsRef.current?.emit('sparkle', x, 34)
          effectsRef.current?.emit('petals', x, 30)
          return
        }
        // 기록 실패(DRAW_FAILED)는 괘를 되돌리지 않는다 — 사용자가 본 연출을 취소하는 편이 더 나쁘다.
        // 반면 과금 거절(복채 부족·동의 필요)은 결과를 보여주면 안 된다.
        if (res.error === 'DRAW_FAILED') {
          setOutcome({ success: true })
          toast(DRAW_ERROR_MSG.DRAW_FAILED)
          return
        }
        setOutcome({ success: false, error: res.error })
      })
    },
    [phase, picked, flags, qtype, paidDraw, play]
  )

  // ── 위로 쓸어 뽑기 제스처 ─────────────────────────────────
  const onFlagDown = useCallback((e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    suppressClick.current = false
    dragState.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }, [])

  const onFlagMove = useCallback((e: RPointerEvent<HTMLButtonElement>) => {
    const d = dragState.current
    if (!d || d.id !== e.pointerId) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 6) d.moved = true
  }, [])

  const onFlagUp = useCallback(
    (index: number) => (e: RPointerEvent<HTMLButtonElement>) => {
      const d = dragState.current
      dragState.current = null
      if (!d || d.id !== e.pointerId) return
      if (!d.moved) return // 탭 — onClick 이 받는다(키보드·스크린리더 경로와 같은 문)
      suppressClick.current = true
      // 위로 끌어올린 만큼만 뽑기로 인정한다(아래로 끌면 시트 스크롤이지 뽑기가 아니다)
      if (d.y - e.clientY >= OBANGKI_DRAG_THRESHOLD) pull(index)
    },
    [pull]
  )

  // ── 공유 — 기존 공유 보상 흐름 재사용(새 지급 경로 없음) ──
  const onShare = useCallback(async () => {
    if (!pickedColor) return
    setSharing(true)
    // 질문도 선택지도 문장에 담지 않는다 — 공유물에 남는 것은 깃발 색과 괘뿐이다
    const shareText = `신당에서 오방기를 뽑았습니다 — ${verdictLine(pickedColor, null)}.`
    const url = typeof window === 'undefined' ? '' : `${window.location.origin}/protected/shrine`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: '오방기 점괘', text: shareText, url })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} ${url}`)
        toast.success('링크를 복사했습니다')
      }
      trackEvent({ action: 'share_copy_link', category: 'social', label: 'obangki' })
      // 보상 금액·수령 자격은 전부 서버가 정한다(하루 1회). 실패해도 공유 UX 는 그대로.
      claimShareReward().catch(() => {})
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우도 여기로 온다 — 실패로 알리지 않는다
      logger.warn('[obangki] 공유 취소/실패:', e)
    } finally {
      setSharing(false)
    }
  }, [pickedColor])

  return (
    <>
      {/* 스트립 — 액막이 스트립과 같은 톤. 신당 하단 의식 진입점 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="오방기 점괘 열기"
        className="flex w-full items-center gap-2 rounded-[10px] border border-gold-500/20 bg-surface/60 px-2.5 py-1.5"
      >
        <span
          className="grid h-5 w-5 place-items-center rounded-full"
          style={{ background: 'rgba(62,95,134,0.22)', boxShadow: '0 0 9px rgba(143,180,218,0.28)' }}
        >
          <Flag className="h-3 w-3" style={{ color: '#9FBEDD' }} />
        </span>
        <span className="whitespace-nowrap font-serif text-[11px] text-gold-200">
          오방기<span className="text-gold-500/60"> 旗</span>
        </span>
        <span className="flex-1 truncate text-left font-sans text-[10px] text-ink-primary/45">
          {paidDraw ? '한 번 더 여쭈려면 복채 1만냥' : '고민되는 두 갈래를 깃발에 맡깁니다'}
        </span>
        <span className="whitespace-nowrap font-serif text-[9.5px] tabular-nums text-ink-primary/45">
          오늘 {remainingFree}/{status.freeLimit}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-toast flex items-end justify-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="오방기 점괘"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          <div
            className="ritual-sheet hanji-card relative max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl border-x border-t border-gold-500/25 p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#16140F' }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">五 方 旗</p>
                <h2 className="font-serif text-lg font-bold text-ink-primary">
                  오방기 점괘
                  <span className="ml-2 text-[11px] font-normal text-ink-primary/45">
                    · 오늘 무료 {remainingFree}/{status.freeLimit}회
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-surface text-ink-primary/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {phase === 'compose' ? (
              <ComposeStep
                qtype={qtype}
                options={options}
                paidDraw={paidDraw}
                cost={status.cost}
                onQtype={setQtype}
                onOptions={setOptions}
                onStart={startShuffle}
              />
            ) : (
              <div className="flex flex-col items-center">
                <FlagStage
                  effectsRef={effectsRef}
                  flags={flags}
                  phase={phase}
                  picked={picked}
                  revealed={revealed}
                  onShuffleEnd={() => setPhase('pick')}
                  onPullEnd={() => setPullDone(true)}
                  onFlagDown={onFlagDown}
                  onFlagMove={onFlagMove}
                  onFlagUp={onFlagUp}
                  onFlagTap={(i) => {
                    // 드래그 뒤에 따라온 click 은 삼킨다 — 빗나간 드래그가 뽑기로 둔갑하지 않게
                    if (suppressClick.current) {
                      suppressClick.current = false
                      return
                    }
                    pull(i)
                  }}
                />

                {phase === 'shuffle' && (
                  <p className="mt-4 font-serif text-[12px] text-ink-primary/55">방울이 울리고 기가 섞입니다…</p>
                )}
                {phase === 'pick' && (
                  <p className="mt-4 font-serif text-[12px] text-gold-200">마음 가는 기 하나를 위로 쓸어 올리세요</p>
                )}
                {phase === 'draw' && !revealed && !failed && (
                  <p className="mt-4 font-serif text-[12px] text-ink-primary/55">기를 펴는 중입니다…</p>
                )}

                {revealed && pickedColor && (
                  <VerdictCard
                    color={pickedColor}
                    option={pickedOption}
                    line={obangkiLine(pickedColor, qtype, seed)}
                    remainingFree={remainingFree}
                    cost={status.cost}
                    sharing={sharing}
                    onShare={() => void onShare()}
                    onAgain={restart}
                    onClose={close}
                  />
                )}

                {failed && (
                  <div className="mt-5 w-full space-y-3">
                    <p className="text-center font-serif text-[13px] text-ink-primary/70">
                      {DRAW_ERROR_MSG[outcome?.error ?? ''] ?? '점괘를 여쭙지 못했습니다'}
                    </p>
                    <div className="flex gap-2">
                      {outcome?.error === 'INSUFFICIENT_BOKCHAE' ? (
                        <Link
                          href="/protected/store?tab=bokchae"
                          className="flex-1 rounded-xl border border-gold-500/35 bg-gold-500/[0.08] py-2.5 text-center font-serif text-[12px] font-bold text-gold-300"
                        >
                          복채 채우기
                        </Link>
                      ) : (
                        // 무료 소진(NEEDS_PAYMENT)은 여기서 바로 결제하지 않고 작성 화면으로 돌린다 —
                        // 값이 붙은 버튼을 다시 눌러야 동의로 친다(액수를 안 보여주고 물리지 않는다)
                        <button
                          type="button"
                          onClick={restart}
                          className="flex-1 rounded-xl border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[12px] font-bold text-gold-200"
                        >
                          다시 여쭙기
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={close}
                        className="flex-1 rounded-xl border border-white/10 bg-surface py-2.5 font-serif text-[12px] font-bold text-ink-primary/60"
                      >
                        신당으로
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="mt-5 text-center font-sans text-[9.5px] leading-relaxed text-ink-primary/30">
              {OBANGKI_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// ─── 1. 작성 ─────────────────────────────────────────────────

function ComposeStep({
  qtype,
  options,
  paidDraw,
  cost,
  onQtype,
  onOptions,
  onStart,
}: {
  qtype: ObangkiQType
  options: string[]
  paidDraw: boolean
  cost: number
  onQtype: (q: ObangkiQType) => void
  onOptions: (next: string[]) => void
  onStart: () => void
}) {
  const hint = OBANGKI_QTYPE_HINT[qtype].split(' / ')
  const ready = options.filter((o) => o.trim().length > 0).length >= OBANGKI_OPTION_MIN

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 font-serif text-[12px] text-gold-200">무엇을 여쭙시겠습니까</p>
        <div className="flex flex-wrap gap-1.5">
          {OBANGKI_QTYPES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQtype(q)}
              aria-pressed={qtype === q}
              className={`rounded-full px-3 py-1.5 font-sans text-[12px] transition-colors ${
                qtype === q
                  ? 'border border-gold-500/60 bg-gold-500/15 text-gold-200'
                  : 'border border-white/10 bg-surface text-ink-light/55'
              }`}
            >
              {OBANGKI_QTYPE_LABEL[q]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-serif text-[12px] text-gold-200">
          갈림길{' '}
          <span className="text-ink-primary/40">
            · {OBANGKI_OPTION_MIN}~{OBANGKI_OPTION_MAX}개
          </span>
        </p>
        <div className="space-y-1.5">
          {options.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 text-center font-serif text-[11px] text-gold-500/60">{i + 1}</span>
              <input
                value={value}
                onChange={(e) => {
                  const next = [...options]
                  next[i] = e.target.value.slice(0, OBANGKI_OPTION_TEXT_MAX)
                  onOptions(next)
                }}
                maxLength={OBANGKI_OPTION_TEXT_MAX}
                placeholder={hint[i] ?? '또 다른 길'}
                aria-label={`선택지 ${i + 1}`}
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-sans text-[13px] text-ink-primary placeholder:text-ink-primary/25 focus:border-gold-500/40 focus:outline-none"
              />
              {options.length > OBANGKI_OPTION_MIN && (
                <button
                  type="button"
                  onClick={() => onOptions(options.filter((_, k) => k !== i))}
                  aria-label={`선택지 ${i + 1} 지우기`}
                  className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-ink-primary/40"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < OBANGKI_OPTION_MAX && (
          <button
            type="button"
            onClick={() => onOptions([...options, ''])}
            className="mt-1.5 font-sans text-[11px] text-gold-300/70 underline"
          >
            ＋ 길 하나 더
          </button>
        )}
        <p className="mt-2 font-sans text-[10px] text-gold-500/60">🔒 {OBANGKI_PRIVACY_NOTICE}</p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!ready}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold-500/50 bg-gold-500/15 py-3 font-serif text-[13px] font-bold text-gold-200 disabled:opacity-40"
      >
        {paidDraw && <Coins className="h-3.5 w-3.5" />}
        {paidDraw ? `복채 ${cost}만냥으로 기 세우기` : '기 세우고 방울 울리기'}
      </button>
      {paidDraw && (
        <p className="-mt-2 text-center font-sans text-[10px] text-ink-primary/40">
          오늘 무료 점괘를 다 쓰셨습니다 · 이후 한 번에 {cost}만냥
        </p>
      )}
    </div>
  )
}

// ─── 2. 깃발 무대 ────────────────────────────────────────────

/**
 * 5기가 선 무대. 말아둔 상태에서는 **다섯 기가 전부 같은 모습**이고, 뽑아 편 기 하나만 색을 드러낸다.
 * 자리(.obangki-slot)가 이동을, 천(.obangki-cloth)이 나부낌을, 펼침(.obangki-unfurl)이 색 공개를 맡는다.
 */
function FlagStage({
  effectsRef,
  flags,
  phase,
  picked,
  revealed,
  onShuffleEnd,
  onPullEnd,
  onFlagDown,
  onFlagMove,
  onFlagUp,
  onFlagTap,
}: {
  effectsRef: React.RefObject<EffectsHandle | null>
  flags: ObangkiColor[]
  phase: Phase
  picked: number | null
  revealed: boolean
  onShuffleEnd: () => void
  onPullEnd: () => void
  onFlagDown: (e: RPointerEvent<HTMLButtonElement>) => void
  onFlagMove: (e: RPointerEvent<HTMLButtonElement>) => void
  onFlagUp: (index: number) => (e: RPointerEvent<HTMLButtonElement>) => void
  onFlagTap: (index: number) => void
}) {
  return (
    <div className="relative" style={{ width: STAGE.w, height: STAGE.h }}>
      <EffectsCanvas ref={effectsRef} />
      <div
        className="absolute inset-0 flex items-end justify-center"
        onAnimationEnd={(e) => {
          // 다섯 자리가 같은 길이로 끝나므로 다섯 번 오지만 국면 전환은 멱등하다
          if (e.animationName === 'obangkiShuffle') onShuffleEnd()
        }}
      >
        {flags.map((color, i) => {
          const isPicked = picked === i
          const info = OBANGKI_COLOR_INFO[color]
          // 셔플 이동폭 — 자리마다 다르게 줘야 다섯 기가 한 덩어리로 흔들리지 않는다
          const dx = (i - 2) * 22 + (i % 2 === 0 ? 14 : -14)
          const slotClass =
            phase === 'shuffle'
              ? 'obangki-shuffle'
              : phase === 'draw'
                ? isPicked
                  ? 'obangki-pull'
                  : 'obangki-dim'
                : ''
          return (
            <button
              key={i}
              type="button"
              disabled={phase !== 'pick'}
              aria-label={`${i + 1}번째 깃발 뽑기`}
              onPointerDown={onFlagDown}
              onPointerMove={onFlagMove}
              onPointerUp={onFlagUp(i)}
              onPointerCancel={onFlagUp(i)}
              onClick={() => onFlagTap(i)}
              className={`obangki-slot relative touch-none ${slotClass}`}
              style={
                {
                  width: SLOT_W,
                  height: STAGE.h - 12,
                  '--ob-dx': `${dx}px`,
                } as React.CSSProperties
              }
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget && e.animationName === 'obangkiPull') onPullEnd()
              }}
            >
              {/* 깃대 — 말린 기든 편 기든 늘 서 있다 */}
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full"
                style={{ height: '100%', background: 'linear-gradient(180deg,#C9A46A,#6B4A22)' }}
              />
              <span
                className="obangki-cloth absolute inset-x-0 top-[12%]"
                style={{ '--ob-sway-delay': `${i * 0.24}s` } as React.CSSProperties}
              >
                {isPicked && revealed ? (
                  <span
                    aria-hidden
                    className="obangki-unfurl relative mx-auto block rounded-[3px]"
                    style={{
                      // 1:2 — 에셋(256×512)과 같은 비. 어긋나면 깃발 천이 늘어나 붓결이 뭉갠다
                      width: SLOT_W - 14,
                      height: (SLOT_W - 14) * 2,
                      // 에셋이 없어도(404) 오방색 면으로 형태와 색이 남는다
                      backgroundColor: info.hex,
                      backgroundImage: `url('/shrine/ritual/obangki-${color}.webp')`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      boxShadow: `0 8px 20px -10px rgba(0,0,0,0.85), 0 0 14px -4px ${info.accent}`,
                    }}
                  >
                    <span
                      className="absolute inset-x-0 top-[8%] text-center font-serif text-[13px] font-bold"
                      style={{ color: 'rgba(28,20,12,0.72)' }}
                    >
                      {info.seal}
                    </span>
                  </span>
                ) : (
                  // 말아둔 기 — 다섯이 전부 같다(색을 미리 보이면 뽑기가 아니라 고르기가 된다)
                  <span
                    aria-hidden
                    className="mx-auto block rounded-full"
                    style={{
                      width: SLOT_W - 26,
                      height: STAGE.h * 0.34,
                      background: 'linear-gradient(180deg,#D8C9A6,#8E7A54 62%,#5C4B2E)',
                      boxShadow: 'inset 0 0 6px rgba(60,42,20,0.55), 0 6px 14px -8px rgba(0,0,0,0.9)',
                    }}
                  >
                    <span
                      className="absolute inset-x-[22%] top-[42%] h-[5px] rounded-full"
                      style={{ background: 'linear-gradient(180deg,#9E2B2B,#6A1A1A)' }}
                    />
                  </span>
                )}
              </span>

              {isPicked && revealed && (
                <span
                  aria-hidden
                  className="obangki-burst pointer-events-none absolute left-1/2 top-[38%] h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ '--ob-accent': info.accent } as React.CSSProperties}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* 칠성방울 — 셔플이 시작될 때 한 번 울린다 */}
      {phase === 'shuffle' && (
        <span
          aria-hidden
          className="obangki-bell absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full"
          style={{ background: 'radial-gradient(circle,#E8D08A 0%,#8A6B24 72%)' }}
        >
          <span className="font-serif text-[13px] text-[#2A1F0A]">鈴</span>
        </span>
      )}
    </div>
  )
}

// ─── 3. 괘 ───────────────────────────────────────────────────

function VerdictCard({
  color,
  option,
  line,
  remainingFree,
  cost,
  sharing,
  onShare,
  onAgain,
  onClose,
}: {
  color: ObangkiColor
  option: string | null
  line: string
  remainingFree: number
  cost: number
  sharing: boolean
  onShare: () => void
  onAgain: () => void
  onClose: () => void
}) {
  const info = OBANGKI_COLOR_INFO[color]
  return (
    <div className="obangki-bubble mt-5 w-full space-y-3.5">
      {/* 괘 머리 — 색·괘 이름, 그리고 배정된 갈림길 */}
      <div
        className="rounded-xl border px-3 py-2.5 text-center"
        style={{ borderColor: `${info.accent}55`, background: `${info.hex}1f` }}
      >
        <p className="font-serif text-[11px] tracking-[0.24em]" style={{ color: info.accent }}>
          {info.seal} {info.label}
        </p>
        <p className="mt-0.5 font-serif text-[17px] font-bold text-ink-primary">{option ? option : info.verdict}</p>
        {option && <p className="mt-0.5 font-sans text-[11px] text-ink-primary/45">{info.verdict}의 기운</p>}
      </div>

      {/* 신당지기 한마디 — 결정론 문구 풀(AI 0원·즉답) */}
      <div className="flex items-start gap-2 rounded-xl border border-gold-500/20 bg-surface/60 px-3 py-2.5">
        <span className="mt-0.5 whitespace-nowrap font-serif text-[10px] text-gold-500/60">신당지기</span>
        <p className="font-serif text-[13px] leading-relaxed text-ink-primary/85">{line}</p>
      </div>

      <p className="text-center font-sans text-[10.5px] text-ink-primary/40">
        {remainingFree > 0 ? `오늘 무료 점괘 ${remainingFree}회 남았습니다` : `다음 점괘부터는 복채 ${cost}만냥입니다`}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold-500/35 bg-gold-500/[0.08] py-2.5 font-serif text-[12px] font-bold text-gold-300 disabled:opacity-50"
        >
          {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          깃발 카드
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-xl border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[12px] font-bold text-gold-200"
        >
          한 번 더
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-surface px-3 py-2.5 font-serif text-[12px] font-bold text-ink-primary/60"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
