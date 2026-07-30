'use client'

/**
 * 액막이(厄막이) — 부적 태우기 의식 (PRD-shrine-rituals-v1 §1 / ARCH §2·4).
 *
 * 흐름: 태그·글 → 부적 렌더 → 촛불 불씨를 부적 아래로 → 아래에서 위로 연소 → 마무리 카드.
 *
 * 이 컴포넌트의 세 가지 규율:
 *  1) **액운 원문은 이 파일 밖으로 나가지 않는다.** 서버 액션에 넘기는 것은 감정 태그 하나뿐이고,
 *     원문은 sigilStrokes 로 읽을 수 없는 획이 되어 부적 위에서 타 없어진다. state 에만 살다 사라진다.
 *  2) **연출 CSS 는 전부 app/shrine-scene.css** — styled-jsx 는 App Router 산출물에 실리지 않는다.
 *     국면 전환도 setTimeout 체인이 아니라 연소 애니메이션의 animationend 가 몬다.
 *  3) **파티클·사운드는 기존 자산 재사용** — EffectsCanvas('smoke'|'flame') · useShrineAudio('crackle').
 */

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Flame, X, Share2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AEKMAK_DISCLAIMER,
  AEKMAK_PRIVACY_NOTICE,
  AEKMAK_TAGS,
  AEKMAK_TAG_LABEL,
  AEKMAK_TAG_SEAL,
  AEKMAK_TEXT_MAX,
  BURN_MS,
  monthlyRecallLine,
  settleLine,
  sigilStrokes,
  type AekmakTag,
} from '@/lib/domain/ritual/aekmak'
import { burnAekmak, type AekmakStatus } from '@/app/actions/shrine/rituals'
import { claimShareReward } from '@/app/actions/payment/bok-points'
import { trackEvent } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'
import type { SoundKey } from '@/lib/domain/shrine/types'
import { EffectsCanvas, type EffectsHandle } from './EffectsCanvas'

/** 부적지 무대 크기(px) — 세로 부적 비율(2:3). 모바일 480px 폭 안에 여유롭게 들어간다. */
const STAGE = { w: 186, h: 279 } as const
/**
 * 불씨 놓기 판정의 여유(px) — 부적 하단 1/3 사각형을 이만큼 부풀린 영역이 히트존이다.
 * 반경 판정은 쓰지 않는다: 불씨 버튼이 쉬는 자리가 부적 하단 중심에서 80px 남짓이라
 * 넉넉한 반경을 잡으면 **끌지 않아도 이미 맞은 상태**가 되어 드래그 자체가 없어진다.
 */
const DROP_SLACK = 24
/** 드래그로 인정할 최소 이동(px). 이 아래는 탭으로 처리해 접근성 경로를 남긴다. */
const DRAG_THRESHOLD = 6

const BURN_ERROR_MSG: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다',
  INVALID_TAG: '태울 액을 고르지 못했습니다',
  DAILY_LIMIT: '오늘 몫의 액막이는 다 하셨습니다',
  BURN_FAILED: '기록이 남지 않았습니다 — 의식은 그대로 이루어졌습니다',
}

type Phase = 'compose' | 'talisman' | 'burning' | 'settled'

interface Props {
  /** 서버가 내려준 오늘/이달 현황. null 이면 스트립을 그리지 않는다(비로그인·조회 실패). */
  status: AekmakStatus
  /** 방에 켜져 있는 촛불 수 — 불씨의 밝기·문구만 바꾼다(0이어도 막지 않는다: 막으면 막다른 길). */
  litCandles: number
  /** 신당 사운드 재생. 룸의 인스턴스를 빌려 쓴다(AudioContext 를 새로 만들지 않기 위함). */
  play: (key: SoundKey) => void
}

export function AekmakStrip({ status, litCandles, play }: Props) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('compose')
  const [tag, setTag] = useState<AekmakTag | null>(null)
  const [text, setText] = useState('')
  /** 낙관 UI — 서버 응답을 기다리지 않고 먼저 줄인다(실패 시 아래에서 되돌린다) */
  const [remaining, setRemaining] = useState(status.remaining)
  const [monthCount, setMonthCount] = useState(status.monthCount)
  /** 점화 시각 — 마무리 문구의 결정론 시드. 렌더마다 Date.now() 를 부르면 문장이 흔들린다 */
  const [burnedAt, setBurnedAt] = useState(0)
  const [sharing, setSharing] = useState(false)

  const effectsRef = useRef<EffectsHandle>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  /** 드래그로 끝난 제스처가 뒤이어 click 으로도 도착한다 — 빗나간 드래그가 탭으로 점화되지 않게 한 번 삼킨다 */
  const suppressClick = useRef(false)
  const [emberOffset, setEmberOffset] = useState<{ x: number; y: number } | null>(null)

  const strokes = useMemo(() => sigilStrokes(text), [text])
  const soldOut = remaining <= 0

  /** 시트를 닫을 때 원문·태그를 확실히 지운다 — 다음에 열었을 때 남아 있으면 그 자체가 사고다 */
  const close = useCallback(() => {
    setOpen(false)
    setPhase('compose')
    setTag(null)
    setText('')
    setEmberOffset(null)
    dragState.current = null
  }, [])

  // ── 점화 ─────────────────────────────────────────────────
  // 연출은 즉시 시작하고 서버 기록은 뒤에서 따라간다(ZERO-LATENCY: Background Submit).
  // 상한은 서버가 최종 판정하므로, 거절되면 아래에서 남은 횟수를 서버 값으로 되돌린다.
  const ignite = useCallback(() => {
    if (!tag || phase !== 'talisman') return
    const at = Date.now()
    setBurnedAt(at)
    setPhase('burning')
    setEmberOffset(null)
    play('crackle')
    effectsRef.current?.emit('flame', 50, 96)
    setRemaining((r) => Math.max(0, r - 1))
    setMonthCount((n) => n + 1)
    trackEvent({ action: 'aekmak_burn', category: 'shrine', label: tag })

    void burnAekmak(tag).then((res) => {
      if (res.success) return
      if (typeof res.remaining === 'number') setRemaining(res.remaining)
      if (res.error === 'DAILY_LIMIT') setMonthCount((n) => Math.max(0, n - 1))
      // 기록 실패는 의식을 되돌리지 않는다 — 사용자가 본 연출을 취소하는 편이 더 나쁘다
      toast(BURN_ERROR_MSG[res.error ?? ''] ?? '기록이 남지 않았습니다')
    })
  }, [tag, phase, play])

  // ── 재·불티 — 타는 선을 따라 위로 올라가며 방출 ───────────
  // 향로 상시 연기(ShrineRoomClient SMOKE_INTERVAL_MS)와 같은 규약의 이미터다.
  // 연소 자체는 CSS 가 그리고, 여기서는 파티클 좌표만 같은 속도로 따라 올린다.
  useEffect(() => {
    if (phase !== 'burning') return
    const steps = Math.max(1, Math.round(BURN_MS.total / BURN_MS.emit))
    let step = 0
    const iv = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      step += 1
      const y = Math.max(2, 98 - (step / steps) * 96)
      effectsRef.current?.emit('smoke', 50 + (step % 3) * 4 - 4, y)
      if (step % 2 === 0) effectsRef.current?.emit('flame', 50, y)
    }, BURN_MS.emit)
    return () => window.clearInterval(iv)
  }, [phase])

  // ── 불씨 드래그 ───────────────────────────────────────────
  const onEmberDown = useCallback((e: RPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.currentTarget.setPointerCapture(e.pointerId)
    suppressClick.current = false
    dragState.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }
  }, [])

  const onEmberMove = useCallback((e: RPointerEvent<HTMLButtonElement>) => {
    const d = dragState.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    d.moved = true
    setEmberOffset({ x: dx, y: dy })
  }, [])

  const onEmberUp = useCallback(
    (e: RPointerEvent<HTMLButtonElement>) => {
      const d = dragState.current
      dragState.current = null
      if (!d || d.id !== e.pointerId) return
      if (!d.moved) return // 탭 — onClick 이 받는다(키보드·스크린리더 경로와 같은 문)
      suppressClick.current = true
      const zone = dropRef.current?.getBoundingClientRect()
      const hit =
        zone !== undefined &&
        e.clientX >= zone.left - DROP_SLACK &&
        e.clientX <= zone.right + DROP_SLACK &&
        e.clientY >= zone.top - DROP_SLACK &&
        e.clientY <= zone.bottom + DROP_SLACK
      if (hit) ignite()
      else setEmberOffset(null) // 빗나가면 제자리로
    },
    [ignite]
  )

  // ── 마무리 카드 공유 — 기존 공유 보상 흐름 재사용(새 지급 경로 없음) ──
  const onShare = useCallback(async () => {
    setSharing(true)
    // 액운 원문은 물론 감정 태그도 문장에 담지 않는다 — 공유물에 남는 것은 "했다"뿐이다
    const shareText = '오늘 신당에서 액막이를 했습니다.'
    const url = typeof window === 'undefined' ? '' : `${window.location.origin}/protected/shrine`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: '액막이', text: shareText, url })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} ${url}`)
        toast.success('링크를 복사했습니다')
      }
      trackEvent({ action: 'share_copy_link', category: 'social', label: 'aekmak' })
      // 보상 금액·수령 자격은 전부 서버가 정한다(하루 1회). 실패해도 공유 UX 는 그대로.
      claimShareReward().catch(() => {})
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우도 여기로 온다 — 실패로 알리지 않는다
      logger.warn('[aekmak] 공유 취소/실패:', e)
    } finally {
      setSharing(false)
    }
  }, [])

  const recall = monthlyRecallLine(monthCount)

  return (
    <>
      {/* 스트립 — 기원(祈願) 스트립과 같은 톤. 신당 하단 의식 진입점 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="액막이 의식 열기"
        className="flex w-full items-center gap-2 rounded-[10px] border border-gold-500/20 bg-surface/60 px-2.5 py-1.5"
      >
        <span
          className="grid h-5 w-5 place-items-center rounded-full"
          style={{
            background: soldOut ? 'rgba(255,255,255,0.04)' : 'rgba(158,43,43,0.2)',
            boxShadow: soldOut ? 'none' : '0 0 9px rgba(200,64,64,0.35)',
          }}
        >
          <Flame className="h-3 w-3" style={{ color: soldOut ? '#5C564C' : '#E8A07A' }} />
        </span>
        <span className="whitespace-nowrap font-serif text-[11px] text-gold-200">
          액막이<span className="text-gold-500/60"> 厄</span>
        </span>
        <span className="flex-1 truncate text-left font-sans text-[10px] text-ink-primary/45">
          {soldOut ? '오늘 몫은 다 하셨습니다' : '마음에 걸린 것을 부적에 적어 태웁니다'}
        </span>
        <span className="whitespace-nowrap font-serif text-[9.5px] tabular-nums text-ink-primary/45">
          오늘 {remaining}/{status.limit}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-toast flex items-end justify-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="액막이 의식"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          <div
            className="ritual-sheet hanji-card relative max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl border-x border-t border-gold-500/25 p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#16140F' }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">厄 막 이</p>
                <h2 className="font-serif text-lg font-bold text-ink-primary">
                  부적 태우기
                  <span className="ml-2 text-[11px] font-normal text-ink-primary/45">
                    · 오늘 {remaining}/{status.limit}회
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

            {phase === 'compose' && (
              <ComposeStep
                tag={tag}
                text={text}
                soldOut={soldOut}
                onTag={setTag}
                onText={setText}
                onNext={() => {
                  setPhase('talisman')
                  play('moktak')
                }}
              />
            )}

            {phase !== 'compose' && (
              <div className="flex flex-col items-center">
                {/* 부적 무대 — 파티클 캔버스는 부적 위(z11)에서 재·불티를 뿌린다 */}
                <div className="relative" style={{ width: STAGE.w, height: STAGE.h }}>
                  <EffectsCanvas ref={effectsRef} />
                  <TalismanPaper
                    tag={tag}
                    strokes={strokes}
                    burning={phase === 'burning'}
                    onBurnEnd={() => setPhase('settled')}
                  />
                  {/* 불씨를 놓는 자리 — 부적 하단 1/3. 히트 판정의 기준 사각형이라 항상 렌더한다 */}
                  <div ref={dropRef} aria-hidden className="absolute inset-x-0 bottom-0 h-1/3" />
                </div>

                {phase === 'talisman' && (
                  <IgniteStep
                    litCandles={litCandles}
                    emberOffset={emberOffset}
                    onPointerDown={onEmberDown}
                    onPointerMove={onEmberMove}
                    onPointerUp={onEmberUp}
                    onTap={() => {
                      // 드래그 뒤에 따라온 click 은 삼킨다 — 빗나간 드래그가 점화로 둔갑하지 않게
                      if (suppressClick.current) {
                        suppressClick.current = false
                        return
                      }
                      ignite()
                    }}
                    onBack={() => setPhase('compose')}
                  />
                )}

                {phase === 'burning' && (
                  <p className="mt-5 font-serif text-[12px] text-ink-primary/55">불이 아래에서 올라옵니다…</p>
                )}

                {phase === 'settled' && tag && (
                  <SettleCard
                    line={settleLine(tag, burnedAt)}
                    recall={recall}
                    remaining={remaining}
                    limit={status.limit}
                    sharing={sharing}
                    canBurnAgain={remaining > 0}
                    onShare={() => void onShare()}
                    onAgain={() => {
                      setPhase('compose')
                      setTag(null)
                      setText('')
                    }}
                    onClose={close}
                  />
                )}
              </div>
            )}

            <p className="mt-5 text-center font-sans text-[9.5px] leading-relaxed text-ink-primary/30">
              {AEKMAK_DISCLAIMER}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// ─── 1. 작성 ─────────────────────────────────────────────────

function ComposeStep({
  tag,
  text,
  soldOut,
  onTag,
  onText,
  onNext,
}: {
  tag: AekmakTag | null
  text: string
  soldOut: boolean
  onTag: (t: AekmakTag) => void
  onText: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 font-serif text-[12px] text-gold-200">무엇을 태우시겠습니까</p>
        <div className="flex flex-wrap gap-1.5">
          {AEKMAK_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTag(t)}
              aria-pressed={tag === t}
              className={`rounded-full px-3 py-1.5 font-sans text-[12px] transition-colors ${
                tag === t
                  ? 'border border-seal/60 bg-seal/20 text-[#f2dcdc]'
                  : 'border border-white/10 bg-surface text-ink-light/55'
              }`}
            >
              <span className="mr-1 font-serif text-[10px] text-gold-500/70">{AEKMAK_TAG_SEAL[t]}</span>
              {AEKMAK_TAG_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value.slice(0, AEKMAK_TEXT_MAX))}
          maxLength={AEKMAK_TEXT_MAX}
          rows={3}
          placeholder="마음에 걸린 것을 적어보세요 (선택)"
          aria-label="태울 액운"
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-[13px] leading-relaxed text-ink-primary placeholder:text-ink-primary/25 focus:border-gold-500/40 focus:outline-none"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="font-sans text-[10px] text-gold-500/60">🔒 {AEKMAK_PRIVACY_NOTICE}</p>
          <span className="font-sans text-[10px] tabular-nums text-ink-primary/35">
            {text.length}/{AEKMAK_TEXT_MAX}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!tag || soldOut}
        className="w-full rounded-xl border border-seal/50 bg-seal/20 py-3 font-serif text-[13px] font-bold text-[#f2dcdc] disabled:opacity-40"
      >
        {soldOut ? '오늘 몫의 액막이는 다 하셨습니다' : '부적에 새기기'}
      </button>
    </div>
  )
}

// ─── 2. 부적지 ───────────────────────────────────────────────

/**
 * 부적지 — 배경 이미지가 없어도(에셋 404) 한지 그라디언트로 형태가 남는다.
 * 연소 중에는 같은 요소에 `.ritual-burn` 이 붙어 마스크가 아래에서 위로 올라간다.
 * 잉걸불 띠(.ritual-char)는 **이 요소 안**에 둬야 같은 마스크에 잘려 "타는 선"으로 읽힌다.
 */
function TalismanPaper({
  tag,
  strokes,
  burning,
  onBurnEnd,
}: {
  tag: AekmakTag | null
  strokes: ReturnType<typeof sigilStrokes>
  burning: boolean
  onBurnEnd: () => void
}) {
  return (
    <div
      className={`ritual-paper absolute inset-0 overflow-hidden rounded-[4px] ${burning ? 'ritual-burn' : ''}`}
      onAnimationEnd={(e) => {
        // 자식(잉걸불 띠)의 animationend 도 여기로 버블한다 — 내 것만 받는다
        if (burning && e.target === e.currentTarget) onBurnEnd()
      }}
      style={{
        backgroundColor: '#E8DCBE',
        backgroundImage: "url('/shrine/ritual/paper.webp')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        boxShadow: '0 10px 26px -12px rgba(0,0,0,0.8)',
      }}
    >
      {/* 머리 인장 — 태그의 한자 한 자 */}
      {tag && (
        <span
          className="absolute inset-x-0 top-[7%] text-center font-serif text-[22px] font-bold"
          style={{ color: '#9E2B2B', textShadow: '0 0 6px rgba(158,43,43,0.35)' }}
        >
          {AEKMAK_TAG_SEAL[tag]}
        </span>
      )}

      {/* 주문양(呪文樣) — 구운 경면주사 문양을 바탕으로 깔고, 그 위에 **원문에서 파생된 획**을 얹는다.
          글자를 그리지 않으므로 화면 캡처에도 원문이 남지 않는다(무저장 약속의 시각적 짝).
          흐림·투명도는 .ritual-sigil 이 든다 — 두 층이 같은 흐림을 먹어야 한 붓으로 읽힌다. */}
      <div className="ritual-sigil absolute inset-0" aria-hidden>
        <span
          className="absolute inset-x-[19%] top-[16%] bottom-[10%]"
          style={{
            backgroundImage: "url('/shrine/ritual/sigil.webp')",
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {strokes.map((s, i) => (
            <g key={i} transform={`rotate(${s.tilt} ${s.x} ${s.y})`}>
              <line
                x1={s.x - s.len / 2}
                y1={s.y}
                x2={s.x + s.len / 2}
                y2={s.y}
                stroke="#9E2B2B"
                strokeWidth={s.weight * 0.6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={s.x}
                y1={s.y - 3.4}
                x2={s.x}
                y2={s.y + 3.4}
                stroke="#9E2B2B"
                strokeWidth={s.weight * 0.4}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
      </div>

      {burning && <span aria-hidden className="ritual-char pointer-events-none absolute inset-0" />}
    </div>
  )
}

// ─── 3. 점화 ─────────────────────────────────────────────────

function IgniteStep({
  litCandles,
  emberOffset,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTap,
  onBack,
}: {
  litCandles: number
  emberOffset: { x: number; y: number } | null
  onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => void
  onPointerMove: (e: RPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (e: RPointerEvent<HTMLButtonElement>) => void
  onTap: () => void
  onBack: () => void
}) {
  const bright = litCandles > 0
  return (
    <div className="mt-4 flex w-full flex-col items-center gap-3">
      <p className="font-sans text-[11.5px] text-ink-primary/60">
        {bright ? '촛불의 불씨를 부적 아래로 옮기세요' : '불씨를 부적 아래로 옮기세요 · 촛불을 밝히면 더 환합니다'}
      </p>
      <button
        type="button"
        aria-label="불씨를 부적 아래로 옮기기"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onTap}
        className="grid h-12 w-12 touch-none place-items-center rounded-full"
        style={{
          background: bright
            ? 'radial-gradient(circle,#FFD08A 0%,#C05A1E 70%)'
            : 'radial-gradient(circle,#C9A06A,#6B3B14)',
          boxShadow: bright ? '0 0 18px rgba(255,150,60,0.55)' : '0 0 10px rgba(180,110,50,0.3)',
          transform: emberOffset ? `translate(${emberOffset.x}px, ${emberOffset.y}px)` : undefined,
          transition: emberOffset ? 'none' : 'transform 220ms cubic-bezier(0.22,0.61,0.36,1)',
        }}
      >
        <Flame className={`h-5 w-5 text-[#2A1508] ${emberOffset ? '' : 'ritual-ember'}`} fill="#FFE6B8" />
      </button>
      <button type="button" onClick={onBack} className="font-sans text-[11px] text-ink-primary/35 underline">
        다시 적기
      </button>
    </div>
  )
}

// ─── 4. 마무리 ───────────────────────────────────────────────

function SettleCard({
  line,
  recall,
  remaining,
  limit,
  sharing,
  canBurnAgain,
  onShare,
  onAgain,
  onClose,
}: {
  line: string
  recall: string | null
  remaining: number
  limit: number
  sharing: boolean
  canBurnAgain: boolean
  onShare: () => void
  onAgain: () => void
  onClose: () => void
}) {
  const used = Math.max(0, limit - remaining)
  return (
    <div className="ritual-settle mt-5 w-full space-y-3.5">
      <p className="text-center font-serif text-[15px] leading-relaxed text-ink-primary">{line}</p>

      {/* 옥수(玉水) 한 잔 — 재가 흩어진 자리에 올린다 */}
      <div className="flex justify-center">
        <svg className="ritual-cup" width="58" height="42" viewBox="0 0 58 42" aria-hidden>
          <ellipse cx="29" cy="37" rx="16" ry="3.4" fill="rgba(0,0,0,0.45)" />
          <path
            d="M11 10 h36 l-4.5 20 a6 6 0 0 1 -6 5 h-15 a6 6 0 0 1 -6 -5 z"
            fill="#1F2A2E"
            stroke="#C9A84C"
            strokeWidth="1.2"
          />
          <path d="M13.6 14 h30.8 l-1.1 5 h-28.6 z" fill="#A8C5DA" opacity="0.75" />
          <ellipse cx="29" cy="10" rx="18" ry="3.6" fill="#0F1417" stroke="#C9A84C" strokeWidth="1.2" />
        </svg>
      </div>

      {/* 오늘의 액막이 게이지 — 기원 게이지와 같은 문법(과장 없이 횟수만 보인다) */}
      <div className="flex items-center gap-2 rounded-[10px] border border-gold-500/20 bg-surface/60 px-2.5 py-1.5">
        <span className="whitespace-nowrap font-serif text-[10.5px] text-gold-200">오늘의 액막이</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-primary/15">
          <div className="h-full rounded-full bg-seal transition-all" style={{ width: `${(used / limit) * 100}%` }} />
        </div>
        <span className="whitespace-nowrap font-serif text-[9.5px] tabular-nums text-ink-primary/45">
          {used}/{limit}
        </span>
      </div>

      {recall && <p className="text-center font-sans text-[11px] text-ink-primary/40">{recall}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold-500/35 bg-gold-500/[0.08] py-2.5 font-serif text-[12px] font-bold text-gold-300 disabled:opacity-50"
        >
          {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          액막이 카드
        </button>
        {canBurnAgain ? (
          <button
            type="button"
            onClick={onAgain}
            className="flex-1 rounded-xl border border-seal/45 bg-seal/15 py-2.5 font-serif text-[12px] font-bold text-[#f2dcdc]"
          >
            한 장 더 태우기
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-surface py-2.5 font-serif text-[12px] font-bold text-ink-primary/60"
          >
            신당으로
          </button>
        )}
      </div>
    </div>
  )
}
