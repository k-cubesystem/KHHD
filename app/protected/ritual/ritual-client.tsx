'use client'

/**
 * 초하루 의례 — 3화면 단일 클라이언트.
 * 설계: docs/designs/ritual-loop-traditional-rollout.md (D1~D11)
 *
 *   phase 'letter' ── 서간(편지): 박스 없는 세리프 문안 + 본인 히어로 카드 + 식구 가로스크롤
 *   phase 'pray'   ── 무대 지배: 신당 룸 45~55vh + 하단 시트(소원 라디오 + 도장 CTA)
 *   phase 'ledger' ── 치부책: 세로 괘선 장부 + 연속 기록 + 푸시 CTA
 *
 * 상태 규칙 (D3): 완주된 달 재진입 → ledger 직행 + 「✓ 문안 완료」 배지.
 * 창 밖 → ledger 읽기 전용 + D-day. 카드는 결정론 선표시 → AI fade 교체 (D4).
 * 완료 연출 (D5): 2.5~3초 시퀀스 — ZERO-LATENCY 의 명시적 예외. 서버 제출은 백그라운드.
 * reduced-motion (D8): 연출 생략, 정적 전환 + 확인 메시지.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/ga4'
import {
  RITUAL_GA,
  RITUAL_WISH_CATEGORIES,
  RITUAL_WISH_TEXT_MAX,
  type RitualWishCategory,
} from '@/lib/domain/ritual/lunar-window'
import type { LedgerRow } from '@/lib/domain/ritual/ledger'
import {
  completeRitual,
  enhanceRitualCard,
  enterRitual,
  optInRitualPush,
  type RitualCard,
  type RitualState,
} from '@/app/actions/ritual/loop'

type Phase = 'letter' | 'pray' | 'ceremony' | 'ledger'

const CEREMONY_MS = 2800

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function RitualClient({ initial, roomUrl }: { initial: RitualState; roomUrl: string | null }) {
  const { window: w } = initial
  const outOfWindow = !w.inWindow
  const [phase, setPhase] = useState<Phase>(outOfWindow || initial.completed ? 'ledger' : 'letter')
  const [completedNow, setCompletedNow] = useState(false)
  const [awarded, setAwarded] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const completed = initial.completed || completedNow

  // 진입 기록 — 창 안·미완주에만 (분모는 서버가 창을 재검증한다)
  const enteredRef = useRef(false)
  useEffect(() => {
    if (outOfWindow || initial.completed || enteredRef.current) return
    enteredRef.current = true
    trackEvent({ action: RITUAL_GA.enter, category: 'ritual', label: w.ritualMonth })
    void enterRitual()
  }, [outOfWindow, initial.completed, w.ritualMonth])

  const handleComplete = useCallback(
    (wish: { category: RitualWishCategory; text: string }) => {
      setError(null)
      trackEvent({ action: RITUAL_GA.pray, category: 'ritual', label: wish.category })
      const reduced = prefersReducedMotion()
      // 낙관적 연출 선행 + 백그라운드 제출 (D5)
      if (!reduced) setPhase('ceremony')
      const submittedAt = Date.now()
      // 7A·9A: 서버로 가는 것은 소원 갈래 하나뿐이다. 유저가 쓴 문장(wish.text)은
      //        이 화면의 소원 카드 연출로만 쓰이고 전송되지 않으며, 열람한 식구 목록은
      //        서버가 자기 family_members 에서 파생한다(클라 uuid 는 위조 가능).
      void completeRitual({ wishCategory: wish.category }).then((res) => {
        const finish = () => {
          if (!res.success) {
            setError(
              res.error === 'OUT_OF_WINDOW'
                ? '의례 창이 지났습니다. 다음 초하루에 다시 오세요.'
                : '향이 꺼졌습니다 — 다시 올려 주세요.'
            )
            setPhase('pray')
            return
          }
          trackEvent({ action: RITUAL_GA.complete, category: 'ritual', label: w.ritualMonth, value: res.awarded })
          setAwarded(res.awarded ?? 0)
          setCompletedNow(true)
          setPhase('ledger')
        }
        if (reduced) {
          finish()
        } else {
          // 연출 최소 시간 보장 후 전환
          const elapsed = Date.now() - submittedAt
          globalThis.setTimeout(finish, Math.max(0, CEREMONY_MS - elapsed))
        }
      })
    },
    [w.ritualMonth]
  )

  if (!initial.enabled) return null

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 pb-10">
      {phase === 'letter' && <LetterPhase state={initial} onNext={() => setPhase('pray')} />}
      {phase === 'pray' && <PrayPhase error={error} onPray={handleComplete} roomUrl={roomUrl} />}
      {phase === 'ceremony' && <CeremonyPhase />}
      {phase === 'ledger' && (
        <LedgerPhase
          state={initial}
          completed={completed}
          completedNow={completedNow}
          awarded={awarded}
          outOfWindow={outOfWindow}
        />
      )}
    </div>
  )
}

/* ────────────────────────── ① 서간(편지) ────────────────────────── */

function LetterPhase({ state, onNext }: { state: RitualState; onNext: () => void }) {
  const { window: w, cards, hasBirth } = state
  const self = cards.find((c) => c.memberId === null) ?? null
  const family = cards.filter((c) => c.memberId !== null)

  return (
    <div className="anim-fade-in-up pt-6">
      {/* 박스 없는 세리프 문안 (D1 서간 원형 — 인사말은 인용문 타이포) */}
      <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">朔日 問安</p>
      <h1 className="mt-1 font-serif text-heading-1 font-bold text-ink-light">{w.monthLabel} 문안</h1>
      <blockquote className="mt-4 border-none font-serif text-body-lg leading-relaxed text-ink-primary/90">
        {w.monthLabel.replace(' 초하루', '')}입니다.
        <br />
        식구들 안부부터 여쭈어요.
      </blockquote>
      <div className="dancheong-divider mt-5" />

      {/* 본인 히어로 카드 (D2) */}
      <div className="mt-6 space-y-4">
        {self ? <HeroCard card={self} seqLabel={w.monthLabel} /> : <MissingBirthCard hasBirth={hasBirth} />}

        {/* 식구 카드 가로스크롤 — 「+식구 모시기」 항상 마지막 + dim */}
        <div
          className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]"
          role="list"
          aria-label="식구 문안 카드"
        >
          {family.map((c) => (
            <FamilyCard key={c.memberId} card={c} />
          ))}
          <Link
            href="/protected/family"
            role="listitem"
            onClick={() => trackEvent({ action: RITUAL_GA.familyInvite, category: 'ritual' })}
            className="flex min-h-[44px] w-[200px] shrink-0 flex-col justify-center rounded-xl border border-dashed border-gold-500/20 p-4 text-ink-faint transition-colors hover:text-ink-primary"
          >
            <span className="text-body-sm font-semibold">+ 식구 모시기</span>
            <span className="mt-1 text-caption">가족을 등록하면 매달 함께 문안합니다</span>
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="bok-badge mt-6 block min-h-[48px] w-full rounded-[3px] bg-seal px-6 py-3 text-center font-serif text-body-lg font-bold text-ink-light transition-transform active:scale-[0.99]"
      >
        신당에 기원 올리기 →
      </button>
    </div>
  )
}

function useAiLine(card: RitualCard) {
  const [line, setLine] = useState<string | null>(card.aiLine)
  const [swapped, setSwapped] = useState(Boolean(card.aiLine))
  useEffect(() => {
    if (card.aiLine) return
    let alive = true
    void enhanceRitualCard(card.memberId).then((res) => {
      if (alive && res?.line) {
        setLine(res.line)
        setSwapped(true)
      }
    })
    return () => {
      alive = false
    }
  }, [card.memberId, card.aiLine])
  return { text: line ?? card.line, swapped }
}

function HeroCard({ card, seqLabel }: { card: RitualCard; seqLabel: string }) {
  const { text, swapped } = useAiLine(card)
  return (
    <section className="hanji-card rounded-xl border border-gold-500/25 p-5" aria-label="나의 이번 달 문안">
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-body font-bold text-ink-light">{card.name}</span>
        <span className="bok-badge rounded-[3px] px-2 py-0.5 text-[10px] text-ink-light">본인</span>
      </div>
      <p
        className={`mt-3 font-serif text-heading-3 leading-relaxed text-ink-primary ${swapped ? 'anim-fade-in-up' : ''}`}
      >
        {text}
      </p>
      <p className="mt-2 text-caption text-ink-faint">{seqLabel}의 한 줄</p>
    </section>
  )
}

function FamilyCard({ card }: { card: RitualCard }) {
  const { text, swapped } = useAiLine(card)
  const ref = useRef<HTMLDivElement | null>(null)
  const firedRef = useRef(false)

  // member_card_view — 50% 노출 1초 유지 시 1회 (D11)
  useEffect(() => {
    const el = ref.current
    if (!el || firedRef.current || !card.memberId) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.5) {
            timer = globalThis.setTimeout(() => {
              if (firedRef.current || !card.memberId) return
              firedRef.current = true
              trackEvent({ action: RITUAL_GA.cardView, category: 'ritual', label: card.memberId })
            }, 1000)
          } else if (timer) {
            globalThis.clearTimeout(timer)
            timer = null
          }
        }
      },
      { threshold: [0.5] }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (timer) globalThis.clearTimeout(timer)
    }
  }, [card.memberId])

  return (
    <div ref={ref} role="listitem" className="hanji-card w-[200px] shrink-0 rounded-xl border border-gold-500/15 p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-body-sm font-bold text-ink-light">{card.name}</span>
        {card.relationship && <span className="text-caption text-ink-faint">{card.relationship}</span>}
      </div>
      <p className={`mt-2 text-body-sm leading-relaxed text-ink-primary/85 ${swapped ? 'anim-fade-in-up' : ''}`}>
        {text}
      </p>
    </div>
  )
}

function MissingBirthCard({ hasBirth }: { hasBirth: boolean }) {
  if (hasBirth) return null
  return (
    <section className="hanji-card rounded-xl border border-gold-500/25 p-5">
      <p className="font-serif text-body font-bold text-ink-light">명식을 모셔 주세요</p>
      <p className="mt-2 text-body-sm text-ink-primary/80">
        생년월일을 등록하면 매달 초하루, 나의 한 줄 문안이 이 자리에 옵니다.
      </p>
      <Link
        href="/protected/profile"
        className="mt-3 inline-block min-h-[44px] rounded-[3px] border border-gold-500/30 px-4 py-2.5 text-body-sm text-primary"
      >
        명식 등록하러 가기 →
      </Link>
    </section>
  )
}

/* ────────────────────────── ② 기원(무대 지배) ────────────────────────── */

function PrayPhase({
  error,
  onPray,
  roomUrl,
}: {
  error: string | null
  onPray: (wish: { category: RitualWishCategory; text: string }) => void
  roomUrl: string | null
}) {
  const [category, setCategory] = useState<RitualWishCategory>('family')
  const [text, setText] = useState('')
  const custom = category === 'other'
  const canPray = !custom || text.trim().length > 0

  return (
    <div className="anim-fade-in-up flex min-h-[calc(100dvh-8rem)] flex-col pt-4">
      {/* 무대 — 뷰포트 절반을 신당에 (D1 무대 지배). 배경은 서버가 그린 테마 룸. */}
      <div className="ritual-stage relative h-[46dvh] min-h-[280px] overflow-hidden rounded-xl border border-gold-500/20 bg-gradient-to-b from-surface to-background">
        {/* 유저의 실제 신당 테마 방 — 배치·이동 인터랙션 없음 (D10 readOnly 임베드), 404 시 그라디언트 폴백 */}
        {roomUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={roomUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-90"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent"
          aria-hidden
        />
        {/* 향로 + 연기 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center">
          <div className="relative h-24 w-24">
            <span className="anim-incense-smoke absolute bottom-10 left-1/2 h-14 w-[3px] -translate-x-1/2 rounded-full bg-ink-light/25 blur-[2px]" />
            <span className="anim-incense-smoke-slow absolute bottom-10 left-[40%] h-10 w-[2px] rounded-full bg-ink-light/15 blur-[3px]" />
            <div className="absolute bottom-2 left-1/2 h-8 w-14 -translate-x-1/2 rounded-b-full border border-gold-500/40 bg-surface" />
            <div className="absolute bottom-9 left-1/2 h-3 w-[2px] -translate-x-1/2 bg-primary-dim" />
            <span className="anim-ember absolute bottom-[46px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-seal" />
          </div>
        </div>
      </div>

      {/* 하단 시트 — 소원 + CTA. 스크롤 없이 한 화면 (D1) */}
      <div className="mt-4 flex-1">
        <fieldset>
          <legend className="font-serif text-body font-bold text-ink-light">이번 달 소원</legend>
          <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="소원 선택">
            {RITUAL_WISH_CATEGORIES.map((c) => (
              <label
                key={c.key}
                className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-[3px] border px-3 py-2 text-body-sm transition-colors ${
                  category === c.key
                    ? 'border-seal bg-seal/15 font-semibold text-ink-light'
                    : 'border-gold-500/20 text-ink-primary/70'
                } ${c.key === 'other' ? 'col-span-2' : ''}`}
              >
                <input
                  type="radio"
                  name="ritual-wish"
                  value={c.key}
                  checked={category === c.key}
                  onChange={() => setCategory(c.key)}
                  className="sr-only"
                />
                {c.label}
              </label>
            ))}
          </div>
          {custom && (
            <input
              type="text"
              value={text}
              maxLength={RITUAL_WISH_TEXT_MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder="소원을 한 줄로 적어 주세요"
              aria-label="소원 직접 적기"
              className="mt-3 min-h-[44px] w-full rounded-[3px] border border-gold-500/25 bg-surface px-3 py-2.5 text-body text-ink-light placeholder:text-ink-faint focus:border-primary-dim focus:outline-none"
            />
          )}
        </fieldset>

        {error && (
          <p role="alert" className="mt-3 text-body-sm text-seal">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!canPray}
          onClick={() => onPray({ category, text })}
          aria-label="향 올리고 절하기, 이번 달 한 번만"
          className="bok-badge mt-4 block min-h-[52px] w-full rounded-[3px] bg-seal px-6 py-3.5 text-center font-serif text-body-lg font-bold text-ink-light transition-transform active:scale-[0.99] disabled:opacity-40"
        >
          향 올리고 절하기
        </button>
        <p className="mt-2 text-center text-caption text-ink-faint">이번 달 한 번만 올릴 수 있습니다</p>
      </div>
    </div>
  )
}

/* ────────────────────────── 완료 연출 (D5) ────────────────────────── */

function CeremonyPhase() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center" aria-live="polite">
      <div className="relative h-48 w-32">
        <span className="anim-incense-smoke absolute bottom-16 left-1/2 h-28 w-[3px] -translate-x-1/2 rounded-full bg-ink-light/30 blur-[2px]" />
        <span className="anim-incense-smoke-slow absolute bottom-16 left-[38%] h-20 w-[2px] rounded-full bg-ink-light/20 blur-[3px]" />
        <span className="anim-incense-smoke-slower absolute bottom-16 left-[58%] h-16 w-[2px] rounded-full bg-ink-light/15 blur-[3px]" />
        <div className="absolute bottom-6 left-1/2 h-10 w-16 -translate-x-1/2 rounded-b-full border border-gold-500/40 bg-surface" />
        <div className="absolute bottom-14 left-1/2 h-4 w-[2px] -translate-x-1/2 bg-primary-dim" />
        <span className="anim-ember absolute bottom-[70px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-seal" />
      </div>
      <p className="fortune-glow mt-6 font-serif text-heading-3 text-primary">향이 오르고 있습니다…</p>
      <p className="mt-2 text-body-sm text-ink-faint">마음을 담아 절 올리는 중</p>
    </div>
  )
}

/* ────────────────────────── ③ 치부책(장부) ────────────────────────── */

function LedgerPhase({
  state,
  completed,
  completedNow,
  awarded,
  outOfWindow,
}: {
  state: RitualState
  completed: boolean
  completedNow: boolean
  awarded: number
  outOfWindow: boolean
}) {
  const { window: w, ledger } = state
  const rows = useMemo(() => ledger.rows, [ledger.rows])

  return (
    <div className="anim-fade-in-up pt-6">
      <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">福 帳 簿</p>
      <div className="flex items-baseline justify-between">
        <h1 className="mt-1 font-serif text-heading-1 font-bold text-ink-light">우리 집 복 장부</h1>
        {completed && !outOfWindow && (
          <span className="bok-badge rounded-[3px] px-2 py-1 text-[11px] text-ink-light">✓ 문안 완료</span>
        )}
      </div>

      {completedNow && (
        <p className="mt-3 font-serif text-body text-primary" role="status">
          {awarded > 0 ? `복 ${awarded}점이 장부에 올랐습니다.` : '이번 달 문안이 장부에 올랐습니다.'}
        </p>
      )}
      {outOfWindow && (
        <p className="mt-3 text-body-sm text-ink-primary/80">
          다음 초하루까지 <span className="font-serif font-bold text-primary">D-{w.daysUntilNext}</span> ·{' '}
          {w.nextFirstDay}
        </p>
      )}

      {/* 치부책 — 카드 0개, 전면 세로 괘선 (D1·D7) */}
      <div className="ritual-ledger mt-5" role="table" aria-label="월별 문안 기록">
        {rows.length === 1 && rows[0].status === 'missed' && !completed ? (
          <p className="py-6 font-serif text-body text-ink-primary/80">
            아직 장부가 비어 있습니다. 첫 문안을 올리면 이 자리에 기록됩니다.
          </p>
        ) : (
          rows.map((row) => <LedgerLine key={row.seq} row={row} currentSeq={w.lunarMonthSeq} />)
        )}
      </div>

      {/* 연속 기록 */}
      <div className="dancheong-divider mt-5" />
      <p className="mt-4 font-serif text-body text-ink-light">
        {ledger.streak > 0 ? (
          <>
            <span className="text-primary">{ledger.streak}달 연속</span> 문안 — 석 달을 채우면 복이 깃듭니다
          </>
        ) : (
          '이번 달부터 다시 이어 보세요'
        )}
      </p>

      <PushCta state={state} />

      <Link
        href="/protected/shrine"
        className="mt-3 block min-h-[44px] rounded-[3px] border border-gold-500/25 px-4 py-3 text-center text-body-sm text-ink-primary/80"
      >
        신당 보러 가기
      </Link>
    </div>
  )
}

function LedgerLine({ row, currentSeq }: { row: LedgerRow; currentSeq: number }) {
  const isCurrent = row.seq === currentSeq
  return (
    <div
      role="row"
      className="flex min-h-[44px] items-center justify-between border-l-2 border-gold-500/[0.08] py-2 pl-4"
    >
      <span className={`font-serif text-body ${row.status === 'missed' ? 'text-ink-faint' : 'text-ink-light'}`}>
        {row.label} 초하루{isCurrent ? ' (이번 달)' : ''}
      </span>
      <span className="text-body-sm tabular-nums">
        {row.status === 'completed' ? (
          <span className="text-primary">
            문안 ✓{row.resumed ? <span className="ml-1 text-caption text-gold-500/80">다시 이은 달</span> : null}
          </span>
        ) : row.status === 'entered' ? (
          <span className="text-ink-primary/60">문안 중</span>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </span>
    </div>
  )
}

function PushCta({ state }: { state: RitualState }) {
  const [status, setStatus] = useState<'idle' | 'done' | 'needsSubscribe'>(state.pushOptedIn ? 'done' : 'idle')

  const onOptIn = useCallback(() => {
    trackEvent({ action: RITUAL_GA.pushOptin, category: 'ritual' })
    void optInRitualPush().then((res) => {
      if (res.success) setStatus('done')
      else if (res.needsSubscribe) setStatus('needsSubscribe')
    })
  }, [])

  if (status === 'done') {
    return (
      <p className="mt-4 rounded-[3px] border border-gold-500/20 px-4 py-3 text-center text-body-sm text-ink-primary/70">
        🔔 다음 초하루에 기별을 드립니다
      </p>
    )
  }
  if (status === 'needsSubscribe') {
    return (
      <Link
        href="/protected/notifications"
        className="bok-badge mt-4 block min-h-[48px] rounded-[3px] bg-seal/90 px-4 py-3 text-center font-serif text-body font-bold text-ink-light"
      >
        알림을 켜고 초하루 기별 받기 →
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onOptIn}
      className="bok-badge mt-4 block min-h-[48px] w-full rounded-[3px] bg-seal/90 px-4 py-3 text-center font-serif text-body font-bold text-ink-light"
    >
      다음 초하루에 알려주오
    </button>
  )
}
