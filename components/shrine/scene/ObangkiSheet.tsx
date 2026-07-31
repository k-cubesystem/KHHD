'use client'

/**
 * 오방기(五方旗) 점괘 — 선택장애 해소 의식 (PRD-shrine-rituals-v1 §2 / ARCH §2·4).
 *
 * 흐름: 질문유형 입력 → 칠성방울 + 5기 셔플 → **삼기(자리·뿌리·향방)가 차례로 나와 펼쳐짐** → 두루마리 풀이.
 *
 * 8차: 한 기 한 괘에서 **삼기 점사**로 바꿨다. 전승에서 오방기는 보통 세 번 뽑아 조합으로 읽고
 * (앞 기 = 무슨 일인가 / 뒤 기 = 무엇을 하면 되는가), 자리에 흉기가 서면 부정을 물리고 다시 뽑는다.
 * 세 기·부정풀이 모두 **회차 시드 하나**에서 나오므로 화면과 서버가 같은 결과를 따로 계산한다.
 *
 * 2026-07-30: 신당 룸 안의 스트립+모달에서 **전용 페이지**(/protected/shrine/obangki)로 옮겼다.
 * 의식이 커질 것을 보고 자리를 먼저 뗀 것이라, 국면·연출·과금 규율은 한 줄도 바뀌지 않았다 —
 * 사라진 것은 여는 트리거(스트립)와 덮개(모달 오버레이)뿐이고 그 자리를 페이지가 대신한다.
 * 액막이는 촛불에서 불을 받는 의식이라 룸에 그대로 둔다(불이 없는 곳에서 태울 수 없다).
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

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Share2, Loader2, Coins, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  OBANGKI_COLOR_INFO,
  OBANGKI_DISCLAIMER,
  OBANGKI_OPTION_MAX,
  OBANGKI_OPTION_MIN,
  OBANGKI_OPTION_TEXT_MAX,
  OBANGKI_PRIVACY_NOTICE,
  OBANGKI_QTYPES,
  OBANGKI_QTYPE_HINT,
  OBANGKI_QTYPE_LABEL,
  assignOptions,
  drawSeed,
  sajuLine,
  obangkiLine,
  shuffleFlags,
  verdictLine,
  type ObangkiColor,
  type ObangkiQType,
} from '@/lib/domain/ritual/obangki'
import { SAMGI_SLOT_INFO, readSamgi, type SamgiReading, type SamgiSlot } from '@/lib/domain/ritual/obangki-reading'
import { SamgiRow, scrollDelayMs } from './SamgiRow'
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
  INVALID_QTYPE: '무엇을 여쭐지 고르지 못했습니다',
  NEEDS_PAYMENT: '오늘 무료 점괘를 다 쓰셨습니다',
  INSUFFICIENT_BOKCHAE: '복채가 모자랍니다',
  DRAW_FAILED: '점괘가 기록되지 않았습니다 — 괘는 그대로입니다',
}

type Phase = 'compose' | 'shuffle' | 'draw'

interface DrawOutcome {
  success: boolean
  error?: string
}

/** 신당으로 돌아가는 문 — 실패 화면·괘 화면이 같은 문을 쓴다 */
const SHRINE_HREF = '/protected/shrine'

interface Props {
  /** 서버가 내려준 오늘 현황. 페이지가 null 을 걸러 준다(비로그인·조회 실패). */
  status: ObangkiStatus
  /** 신당 사운드 재생. 페이지가 제 인스턴스를 만들어 넘긴다. */
  play: (key: SoundKey) => void
}

export function ObangkiRitual({ status, play }: Props) {
  const [phase, setPhase] = useState<Phase>('compose')
  const [qtype, setQtype] = useState<ObangkiQType>('choice')
  const [options, setOptions] = useState<string[]>(['', ''])
  /** 오늘 뽑은 총 횟수 — 회차 시드(seq)이자 무료 잔여의 근거. 서버 응답으로 정정된다. */
  const [todayCount, setTodayCount] = useState(status.todayCount)
  /** 이번 회차의 시드가 선 순번. 시작 시점에 고정한다(뽑는 동안 카운트가 바뀌어도 깃발이 안 흔들리게) */
  const [seq, setSeq] = useState(status.todayCount)
  /** 셔플 애니메이션이 끝났는가 — 삼기가 나오는 두 조건 중 하나(나머지는 서버 응답) */
  const [shuffleDone, setShuffleDone] = useState(false)
  const [outcome, setOutcome] = useState<DrawOutcome | null>(null)
  const [sharing, setSharing] = useState(false)

  const effectsRef = useRef<EffectsHandle>(null)

  const remainingFree = Math.max(0, status.freeLimit - todayCount)
  const paidDraw = remainingFree <= 0

  // 이번 회차의 깃발 진열·선택지 배정 — 서버가 준 시드(userId+날짜)에 회차를 얹어 만든다.
  // 같은 (userId, 날짜, seq)면 언제 다시 그려도 같은 배열이다(리렌더에도 안 흔들린다).
  const seed = useMemo(() => drawSeed(status.seed, seq), [status.seed, seq])
  const filled = useMemo(() => options.map((o) => o.trim()).filter((o) => o.length > 0), [options])
  const flags = useMemo(() => shuffleFlags(seed), [seed])
  const slots = useMemo(() => assignOptions(filled.length, seed), [filled.length, seed])

  const revealed = shuffleDone && outcome?.success === true
  const failed = outcome?.success === false

  /**
   * 이번 회차의 삼기 점사 — 회차 시드 하나가 세 기·부정풀이·풀이 전부를 정한다.
   * 서버는 같은 함수로 **향방**만 계산해 기록하므로(로그 컬럼은 그대로 색 하나) 둘은 항상 같은 괘다.
   */
  const reading: SamgiReading = useMemo(() => readSamgi(seed, status.elements), [seed, status.elements])
  const wayColor = reading.draw.way
  /** 향방 기가 진열에서 선 자리 — 배정된 갈림길을 여기서 읽는다(선택지를 적었을 때만). */
  const wayIndex = flags.indexOf(wayColor)
  const wayOption = wayIndex < 0 || slots.length <= wayIndex ? null : (filled[slots[wayIndex]] ?? null)

  const restart = useCallback(() => {
    setPhase('compose')
    setShuffleDone(false)
    setOutcome(null)
  }, [])

  // ── 뽑기 의뢰 — 셔플 연출과 서버 확정을 동시에 시작한다 (CEO 7차: 사용자가 고르지 않는다) ──
  // 색은 서버가 시드·회차로 확정하고(감사 A3 "시드 역산" 근본 해소) 셔플 ~1.2s 가 응답 대기를
  // 덮는다. 응답이 늦으면 '기를 펴는 중…'으로 자연히 이어진다. 실패(무료 소진·복채 부족)면
  // picked 가 서지 않아 뽑힘 연출 없이 실패 카드가 뜬다.
  const startShuffle = useCallback(() => {
    setSeq(todayCount)
    setShuffleDone(false)
    setOutcome(null)
    setPhase('shuffle')
    play('bell')
    trackEvent({ action: 'obangki_draw', category: 'shrine', label: qtype })

    void drawObangki(qtype, paidDraw)
      .then((res) => {
        if (typeof res.todayCount === 'number') setTodayCount(res.todayCount)
        // **서버가 쓴 회차를 그대로 받아** 같은 삼기를 편다 — 동시요청으로 회차가 반 박자 밀려도
        // 화면의 괘와 기록된 향방이 갈리지 않는다(7차의 '색만 받아 자리 찾기'를 대신한다).
        if (typeof res.seq === 'number') setSeq(res.seq)
        if (res.success) {
          setOutcome({ success: true })
          return
        }
        if (res.error === 'DRAW_FAILED') {
          // 기록만 실패 — 괘는 그대로 보여준다(연출을 취소하는 편이 더 나쁘다)
          setOutcome({ success: true })
          toast(DRAW_ERROR_MSG.DRAW_FAILED)
          return
        }
        setOutcome({ success: false, error: res.error })
      })
      .catch(() => {
        // 네트워크 단절 — 고착 방지(감사 A2 P2: 실패 경로 부재). 실패 카드로 접는다.
        setOutcome({ success: false, error: 'DRAW_FAILED' })
      })
  }, [todayCount, qtype, paidDraw, play])

  // ── 공유 — 기존 공유 보상 흐름 재사용(새 지급 경로 없음) ──
  const onShare = useCallback(async () => {
    setSharing(true)
    // 질문도 선택지도 문장에 담지 않는다 — 공유물에 남는 것은 깃발 색과 괘뿐이다
    const shareText = `신당에서 오방기 삼기를 뽑았습니다 — 향방은 ${verdictLine(wayColor, null)}.`
    const url = typeof window === 'undefined' ? '' : `${window.location.origin}/protected/shrine/obangki`
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
  }, [wayColor])

  return (
    <div
      className="ritual-sheet hanji-card relative w-full rounded-2xl border border-gold-500/25 p-5 pb-7"
      style={{ background: '#16140F' }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">五 方 旗</p>
          <h1 className="font-serif text-lg font-bold text-ink-primary">
            오방기 점괘
            <span className="ml-2 text-[11px] font-normal text-ink-primary/45">
              · 오늘 무료 {remainingFree}/{status.freeLimit}회
            </span>
          </h1>
        </div>
        <Link
          href={SHRINE_HREF}
          aria-label="신당으로 돌아가기"
          className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-surface text-ink-primary/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
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
            reading={revealed ? reading : null}
            onShuffleEnd={() => {
              setShuffleDone(true)
              setPhase('draw')
            }}
          />

          {phase === 'shuffle' && (
            <p className="mt-4 font-serif text-[12px] text-ink-primary/55">방울이 울리고 기가 섞입니다…</p>
          )}
          {phase === 'draw' && !revealed && !failed && (
            <p className="mt-4 font-serif text-[12px] text-ink-primary/55">기를 펴는 중입니다…</p>
          )}

          {revealed && (
            <SamgiScroll
              reading={reading}
              option={wayOption}
              line={obangkiLine(wayColor, qtype, seed)}
              saju={status.yongsin ? sajuLine(wayColor, status.yongsin, seed) : null}
              remainingFree={remainingFree}
              cost={status.cost}
              sharing={sharing}
              onShare={() => void onShare()}
              onAgain={restart}
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
                    className="flex-1 rounded-lg border border-gold-500/35 bg-gold-500/[0.08] py-2.5 text-center font-serif text-[12px] font-bold text-gold-300"
                  >
                    복채 채우기
                  </Link>
                ) : (
                  // 무료 소진(NEEDS_PAYMENT)은 여기서 바로 결제하지 않고 작성 화면으로 돌린다 —
                  // 값이 붙은 버튼을 다시 눌러야 동의로 친다(액수를 안 보여주고 물리지 않는다)
                  <button
                    type="button"
                    onClick={restart}
                    className="flex-1 rounded-lg border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[12px] font-bold text-gold-200"
                  >
                    다시 여쭙기
                  </button>
                )}
                <Link
                  href={SHRINE_HREF}
                  className="flex-1 rounded-lg border border-white/10 bg-surface py-2.5 text-center font-serif text-[12px] font-bold text-ink-primary/60"
                >
                  신당으로
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-center font-sans text-[9.5px] leading-relaxed text-ink-primary/30">
        {OBANGKI_DISCLAIMER}
      </p>
    </div>
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
        // 주 CTA — 의식을 성립시키는 버튼은 도장 반경 3px + 도장 그림자 (DESIGN.md "buttons 3px")
        className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/15 py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang disabled:opacity-40"
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
 * 5기가 선 무대. 말아둔 상태에서는 **다섯 기가 전부 같은 모습**이고, 셔플이 끝나면 뒤로 물러난다.
 * 그 앞으로 **삼기(자리·뿌리·향방)가 차례로 나와** 펼쳐진다 — 순서는 지연이 준다(타이머 체인이 아니라).
 *
 * 세 기의 색이 겹칠 수 있으므로(겹기) 뽑힌 기는 진열 자리를 쓰지 않고 **앞줄에 따로 선다**.
 * 같은 자리를 두 번 뽑는 그림이 나오지 않아야 "거듭 섰다"가 눈에 보인다.
 */
function FlagStage({
  effectsRef,
  flags,
  phase,
  reading,
  onShuffleEnd,
}: {
  effectsRef: React.RefObject<EffectsHandle | null>
  flags: ObangkiColor[]
  phase: Phase
  /** 확정된 삼기. 서버 응답 전에는 null 이라 뒷줄만 보인다 */
  reading: SamgiReading | null
  onShuffleEnd: () => void
}) {
  return (
    <div className="relative" style={{ width: STAGE.w, height: STAGE.h }}>
      <EffectsCanvas ref={effectsRef} />

      {/* 뒷줄 — 말아둔 5기 */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        onAnimationEnd={(e) => {
          // 다섯 자리가 같은 길이로 끝나므로 다섯 번 오지만 국면 전환은 멱등하다
          if (e.animationName === 'obangkiShuffle') onShuffleEnd()
        }}
      >
        {flags.map((color, i) => {
          // 셔플 이동폭 — 자리마다 다르게 줘야 다섯 기가 한 덩어리로 흔들리지 않는다
          const dx = (i - 2) * 22 + (i % 2 === 0 ? 14 : -14)
          return (
            <span
              key={i}
              aria-hidden
              className={`obangki-slot relative block ${
                phase === 'shuffle' ? 'obangki-shuffle' : phase === 'draw' ? 'obangki-dim' : ''
              }`}
              style={{ width: SLOT_W, height: STAGE.h - 12, '--ob-dx': `${dx}px` } as React.CSSProperties}
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
                {/* 말아둔 기 — 다섯이 전부 같다(색을 미리 보이면 뽑기가 아니라 고르기가 된다) */}
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
              </span>
            </span>
          )
        })}
      </div>

      {/* 앞줄 — 뽑힌 삼기. 물린 기와 애니메이션의 관계는 SamgiRow 가 지킨다(구조 불변식) */}
      {reading && (
        <SamgiRow
          reading={reading}
          onFlagShown={(i) => {
            const x = 26 + i * 24
            effectsRef.current?.emit('sparkle', x, 34)
            effectsRef.current?.emit('petals', x, 30)
          }}
        />
      )}

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

// ─── 3. 삼기 두루마리 ────────────────────────────────────────

/** 자리 한 줄 — 기 이름·신장·소관과 그 자리의 풀이. */
function SlotRow({ slot, color, line }: { slot: SamgiSlot; color: ObangkiColor; line: string }) {
  const info = OBANGKI_COLOR_INFO[color]
  const meta = SAMGI_SLOT_INFO[slot]
  return (
    <div className="flex gap-2.5 py-2">
      <span
        aria-hidden
        className="mt-0.5 h-8 w-1.5 shrink-0 rounded-full"
        style={{ background: `linear-gradient(180deg,${info.accent},${info.hex})` }}
      />
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[10px] tracking-[0.16em] text-gold-500/60">
          {meta.flagName} · {meta.question}
        </p>
        <p className="mt-0.5 font-serif text-[12.5px] font-bold" style={{ color: info.accent }}>
          {info.label} — {info.verdict}
          <span className="ml-1.5 font-sans text-[10px] font-normal text-ink-primary/40">
            {info.general} · {info.deity}
          </span>
        </p>
        <p className="mt-1 font-serif text-[12px] leading-relaxed text-ink-primary/75">{line}</p>
      </div>
    </div>
  )
}

/**
 * 삼기 점사 두루마리 — 전승의 순서 그대로 읽는다.
 * 부정풀이 → 향방 머리 → 공수(자리 × 향방) → 세 자리 → 흐름·응기 → 신당지기·사주 → 처방.
 */
function SamgiScroll({
  reading,
  option,
  line,
  saju,
  remainingFree,
  cost,
  sharing,
  onShare,
  onAgain,
}: {
  reading: SamgiReading
  /** 향방 기에 배정된 갈림길 — 선택지를 적었을 때만 */
  option: string | null
  line: string
  /** 사주 해석 층 — 용신 오행 × 향방 색 오행 관계(결정론). 명식 분석 전 사용자는 null */
  saju: string | null
  remainingFree: number
  cost: number
  sharing: boolean
  onShare: () => void
  onAgain: () => void
}) {
  const way = OBANGKI_COLOR_INFO[reading.draw.way]
  // 두루마리는 삼기가 다 펴진 뒤에 뜬다 — 지연이 곧 순서다(타이머가 아니라)
  const delayMs = scrollDelayMs(reading)
  return (
    <div className="obangki-bubble mt-4 w-full space-y-3" style={{ animationDelay: `${delayMs}ms` }}>
      {/* 부정풀이 — 전승이 이르는 대로 물리고 다시 뽑았음을 먼저 알린다 */}
      {reading.purifyLine && (
        <p className="rounded-lg border border-white/10 bg-surface/70 px-3 py-2 font-serif text-[11.5px] leading-relaxed text-ink-primary/60">
          {reading.purifyLine}
        </p>
      )}

      {/* 향방 머리 — 결론을 쥔 기, 그리고 배정된 갈림길 */}
      <div
        className="rounded-xl border px-3 py-2.5 text-center"
        style={{ borderColor: `${way.accent}55`, background: `${way.hex}1f` }}
      >
        <p className="font-serif text-[10px] tracking-[0.24em]" style={{ color: way.accent }}>
          향 방 · {way.direction}
        </p>
        <p className="mt-0.5 font-serif text-[17px] font-bold text-ink-primary">{option ? option : way.verdict}</p>
        <p className="mt-0.5 font-sans text-[10.5px] text-ink-primary/45">
          {option ? `${way.label} · ${way.verdict}의 기운` : way.gloss}
        </p>
      </div>

      {/* 공수 — 자리 × 향방. 삼기 점사의 본문이다 */}
      <div className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] px-3 py-3">
        <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">공 수</p>
        <p className="mt-1 font-serif text-[13.5px] font-bold leading-relaxed text-gold-100">{reading.gongsu}</p>
      </div>

      {/* 세 자리 */}
      <div className="divide-y divide-white/[0.07] rounded-xl border border-white/10 bg-surface/50 px-3 py-1">
        {reading.slotLines.map((r) => (
          <SlotRow key={r.slot} slot={r.slot} color={r.color} line={r.line} />
        ))}
      </div>

      {/* 결·때 — 세 기가 이루는 흐름과 응기 */}
      <div className="rounded-xl border border-white/10 bg-surface/50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 font-serif text-[10.5px] font-bold text-gold-200">
            {reading.flowInfo.label}
          </span>
          <p className="min-w-0 flex-1 font-serif text-[12px] leading-relaxed text-ink-primary/75">
            {reading.flowInfo.line}
          </p>
        </div>
        <p className="mt-2 border-t border-white/[0.07] pt-2 font-serif text-[12px] leading-relaxed text-ink-primary/60">
          {reading.eunggi}
        </p>
      </div>

      {/* 신당지기 한마디 + 사주 층 — 결정론 문구 풀(AI 0원·즉답) */}
      <div className="rounded-xl border border-gold-500/20 bg-surface/60 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 whitespace-nowrap font-serif text-[10px] text-gold-500/60">신당지기</span>
          <p className="font-serif text-[13px] leading-relaxed text-ink-primary/85">{line}</p>
        </div>
        {(saju || reading.wangswe) && (
          /* 사주 층 — 용신은 개인 데이터라 문구에 오행 이름만 스치고 원리는 풀이가 진다 */
          <div className="mt-2 space-y-1 border-t border-gold-500/15 pt-2">
            {saju && <p className="font-serif text-[12.5px] leading-relaxed text-gold-200">{saju}</p>}
            {reading.wangswe && (
              <p className="font-serif text-[12.5px] leading-relaxed text-gold-200/80">{reading.wangswe}</p>
            )}
          </div>
        )}
      </div>

      {/* 처방 — 전승의 해법을 신당의 의식으로. 값을 무는 곳이 아니라 정성을 들이는 곳으로 잇는다 */}
      <Link
        href={reading.remedy.href}
        className="flex items-center justify-between rounded-xl border border-gold-500/35 bg-gold-500/[0.08] px-3 py-2.5"
      >
        <span className="min-w-0">
          <span className="block font-serif text-[10px] tracking-[0.16em] text-gold-500/60">
            처방 · {reading.remedy.rite}
          </span>
          <span className="mt-0.5 block font-serif text-[12.5px] font-bold text-gold-200">{reading.remedy.action}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-gold-300/70" />
      </Link>

      <p className="text-center font-sans text-[10.5px] text-ink-primary/40">
        {remainingFree > 0 ? `오늘 무료 점괘 ${remainingFree}회 남았습니다` : `다음 점괘부터는 복채 ${cost}만냥입니다`}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={sharing}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500/35 bg-gold-500/[0.08] py-2.5 font-serif text-[12px] font-bold text-gold-300 disabled:opacity-50"
        >
          {sharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          깃발 카드
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-lg border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[12px] font-bold text-gold-200"
        >
          한 번 더
        </button>
        <Link
          href={SHRINE_HREF}
          className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-center font-serif text-[12px] font-bold text-ink-primary/60"
        >
          신당
        </Link>
      </div>
    </div>
  )
}
