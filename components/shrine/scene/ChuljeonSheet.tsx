'use client'

/**
 * 척전(擲錢) 「엽전 세 닢」 — 갈림길을 정하는 의식 R-4.
 *
 * 전거는 태종실록 4년(1404) 10월 6일이다: 새 도읍을 두고 뜻이 갈리자 종묘에서 쟁반 위에 동전을
 * 던져 한양(2길1흉)으로 정했다. 그래서 화면도 그 순서를 그대로 따른다 —
 * 갈림길을 적고 → 상 앞에서 던지고 → 길마다 세 닢이 굴러 멎고 → 길(吉)이 많은 쪽에 도장이 찍힌다.
 *
 * ⚠️ **오방기와 전혀 다른 의식이다.** 오방기는 한 가지 일에 신이 답하는 자리(문복)이고
 *    척전은 사람이 이미 길을 다 알면서 고르지 못할 때 하늘에 맡기는 자리다.
 *    그래서 여기엔 신격도 처방도 사주도 없고 **복채도 없다**.
 *
 * 네 가지 규율은 다른 의식과 같다:
 *  1) **갈림길 원문은 이 파일 밖으로 나가지 않는다.** 서버에 넘기는 것은 갈래 **수**뿐이다.
 *  2) 연출 CSS 는 전부 app/shrine-scene.css (styled-jsx 는 App Router 산출물에 실리지 않는다).
 *  3) 결과는 **서버가 확정한 회차**로 계산한다 — 마음에 드는 답이 나올 때까지 되던질 수 없어야
 *     "정해 준 것"이 된다.
 *  4) 국면 전환은 setTimeout 체인이 아니라 animationend 가 몬다.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { X, ChevronLeft, Coins } from 'lucide-react'
import { toast } from 'sonner'
import {
  CHULJEON_COIN_STEP_MS,
  CHULJEON_DISCLAIMER,
  CHULJEON_ORIGIN_LINE,
  CHULJEON_PRIVACY_NOTICE,
  CHULJEON_RETIE_LINE,
  CHULJEON_TALLY_LABEL,
  CHULJEON_UNDECIDED_LINE,
  CHULJEON_WAY_MAX,
  CHULJEON_WAY_MIN,
  CHULJEON_WAY_STEP_MS,
  CHULJEON_WAY_TEXT_MAX,
  castChuljeon,
  pickLine,
  tallyText,
  throwSeed,
  type ChuljeonResult,
  type CoinFace,
} from '@/lib/domain/ritual/chuljeon'
import { castChuljeonThrow, type ChuljeonStatus } from '@/app/actions/shrine/rituals'
import { trackEvent } from '@/lib/analytics/ga4'

const SHRINE_HREF = '/protected/shrine'

const THROW_ERROR_MSG: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다',
  FORBIDDEN: '지금은 상을 펼 수 없습니다',
  RATE_LIMITED: '잠시 뒤 다시 던져 주세요',
  INVALID_WAYS: '갈림길을 두 개 이상 적어 주세요',
  DAILY_LIMIT: '오늘 던질 수 있는 몫을 다 쓰셨습니다',
  THROW_FAILED: '엽전이 기록되지 않았습니다 — 셈은 그대로입니다',
}

type Phase = 'compose' | 'throw'

interface Props {
  status: ChuljeonStatus
}

export function ChuljeonRitual({ status }: Props) {
  const [phase, setPhase] = useState<Phase>('compose')
  const [ways, setWays] = useState<string[]>(['', ''])
  const [todayCount, setTodayCount] = useState(status.todayCount)
  /** 이번 판의 회차 — 서버가 쓴 값으로 맞춘다(되던지기 방지의 핵심) */
  const [seq, setSeq] = useState(status.todayCount)
  const [settled, setSettled] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const filled = useMemo(() => ways.map((w) => w.trim()).filter((w) => w.length > 0), [ways])
  const ready = filled.length >= CHULJEON_WAY_MIN
  const remaining = Math.max(0, status.limit - todayCount)

  const seed = useMemo(() => throwSeed(status.seed, seq), [status.seed, seq])
  const result: ChuljeonResult = useMemo(() => castChuljeon(seed, filled.length), [seed, filled.length])

  const restart = useCallback(() => {
    setPhase('compose')
    setSettled(false)
    setFailed(null)
  }, [])

  const onThrow = useCallback(() => {
    setSettled(false)
    setFailed(null)
    setPhase('throw')
    trackEvent({ action: 'chuljeon_throw', category: 'shrine', label: String(filled.length) })

    void castChuljeonThrow(filled.length)
      .then((res) => {
        if (typeof res.todayCount === 'number') setTodayCount(res.todayCount)
        // 서버가 쓴 회차를 그대로 받아 같은 엽전을 던진다
        if (typeof res.seq === 'number') setSeq(res.seq)
        if (res.success) return
        if (res.error === 'THROW_FAILED') {
          // 기록만 실패 — 셈은 그대로 보여준다(연출을 취소하는 편이 더 나쁘다)
          toast(THROW_ERROR_MSG.THROW_FAILED)
          return
        }
        setFailed(res.error ?? 'THROW_FAILED')
      })
      .catch(() => setFailed('THROW_FAILED'))
  }, [filled.length])

  return (
    <div
      className="ritual-sheet hanji-card relative w-full rounded-2xl border border-gold-500/25 p-5 pb-7"
      style={{ background: '#16140F' }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">擲 錢</p>
          <h1 className="font-serif text-lg font-bold text-ink-primary">
            엽전 세 닢
            <span className="ml-2 text-[11px] font-normal text-ink-primary/45">· 오늘 {remaining}회 남음</span>
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
        <ComposeStep ways={ways} onWays={setWays} ready={ready} remaining={remaining} onThrow={onThrow} />
      ) : (
        <div className="space-y-3">
          {failed ? (
            <div className="space-y-3">
              <p className="text-center font-serif text-[13px] text-ink-primary/70">
                {THROW_ERROR_MSG[failed] ?? '엽전을 던지지 못했습니다'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="flex-1 rounded-lg border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[12px] font-bold text-gold-200"
                >
                  다시 적기
                </button>
                <Link
                  href={SHRINE_HREF}
                  className="flex-1 rounded-lg border border-white/10 bg-surface py-2.5 text-center font-serif text-[12px] font-bold text-ink-primary/60"
                >
                  신당으로
                </Link>
              </div>
            </div>
          ) : (
            <>
              <Tray result={result} labels={filled} onSettled={() => setSettled(true)} />
              {settled && (
                <Verdict result={result} labels={filled} seed={seed} remaining={remaining} onAgain={restart} />
              )}
            </>
          )}
        </div>
      )}

      <p className="mt-5 text-center font-sans text-[9.5px] leading-relaxed text-ink-primary/30">
        {CHULJEON_DISCLAIMER}
      </p>
    </div>
  )
}

// ─── 1. 갈림길 적기 ──────────────────────────────────────────

function ComposeStep({
  ways,
  onWays,
  ready,
  remaining,
  onThrow,
}: {
  ways: string[]
  onWays: (next: string[]) => void
  ready: boolean
  remaining: number
  onThrow: () => void
}) {
  const spent = remaining <= 0
  return (
    <div className="space-y-4">
      {/* 전거를 먼저 보인다 — 이 셈이 어디서 왔는지 알고 던지는 것과 모르고 던지는 것은 다르다 */}
      <div className="rounded-xl border border-gold-500/25 bg-gold-500/[0.05] px-3 py-2.5">
        <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">전 거</p>
        <p className="mt-1 font-serif text-[12px] leading-relaxed text-gold-100/90">{CHULJEON_ORIGIN_LINE}</p>
      </div>

      <div>
        <p className="mb-2 font-serif text-[12px] text-gold-200">
          갈림길{' '}
          <span className="text-ink-primary/40">
            · {CHULJEON_WAY_MIN}~{CHULJEON_WAY_MAX}개
          </span>
        </p>
        <div className="space-y-1.5">
          {ways.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 text-center font-serif text-[11px] text-gold-500/60">{i + 1}</span>
              <input
                value={value}
                onChange={(e) => {
                  const next = [...ways]
                  next[i] = e.target.value.slice(0, CHULJEON_WAY_TEXT_MAX)
                  onWays(next)
                }}
                maxLength={CHULJEON_WAY_TEXT_MAX}
                placeholder={i === 0 ? '짜장면' : i === 1 ? '짬뽕' : '또 다른 길'}
                aria-label={`갈림길 ${i + 1}`}
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-sans text-[13px] text-ink-primary placeholder:text-ink-primary/25 focus:border-gold-500/40 focus:outline-none"
              />
              {ways.length > CHULJEON_WAY_MIN && (
                <button
                  type="button"
                  onClick={() => onWays(ways.filter((_, k) => k !== i))}
                  aria-label={`갈림길 ${i + 1} 지우기`}
                  className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-ink-primary/40"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {ways.length < CHULJEON_WAY_MAX && (
          <button
            type="button"
            onClick={() => onWays([...ways, ''])}
            className="mt-1.5 font-sans text-[11px] text-gold-300/70 underline"
          >
            ＋ 길 하나 더
          </button>
        )}
        <p className="mt-2 font-sans text-[10px] text-gold-500/60">🔒 {CHULJEON_PRIVACY_NOTICE}</p>
      </div>

      <button
        type="button"
        onClick={onThrow}
        disabled={!ready || spent}
        // 주 CTA — 의식을 성립시키는 버튼은 도장 반경 3px + 도장 그림자 (DESIGN.md "buttons 3px")
        className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/15 py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang disabled:opacity-40"
      >
        <Coins className="h-3.5 w-3.5" />
        {spent ? '오늘 몫을 다 쓰셨습니다' : '쟁반에 엽전을 던지기'}
      </button>
      {spent && (
        <p className="-mt-2 text-center font-sans text-[10px] text-ink-primary/40">
          내일 다시 던지실 수 있습니다 · 복채는 들지 않습니다
        </p>
      )}
    </div>
  )
}

// ─── 2. 쟁반 ─────────────────────────────────────────────────

/** 엽전 한 닢 — 글자면(常)이 길, 등면이 흉. */
function Coin({ face, delayMs }: { face: CoinFace; delayMs: number }) {
  const gil = face === 'gil'
  return (
    <span
      aria-hidden
      className="chuljeon-coin grid h-9 w-9 place-items-center rounded-full border font-serif text-[13px] font-bold"
      style={
        {
          '--cj-delay': `${delayMs}ms`,
          borderColor: gil ? '#C9A84C88' : '#5C564C88',
          background: gil
            ? 'radial-gradient(circle at 38% 32%, #E8D08A, #A8842E 72%)'
            : 'radial-gradient(circle at 38% 32%, #6E6656, #3A362E 72%)',
          color: gil ? '#2A1F0A' : '#9A9184',
          boxShadow: gil ? '0 4px 10px -6px rgba(201,168,76,0.9)' : '0 4px 10px -8px rgba(0,0,0,0.9)',
        } as React.CSSProperties
      }
    >
      {gil ? '常' : ''}
      {/* 엽전 가운데 네모 구멍 — 등면일 때 더 또렷하다 */}
      <span
        aria-hidden
        className="absolute h-[7px] w-[7px] rounded-[1px]"
        style={{ background: '#16140F', opacity: gil ? 0.55 : 0.8 }}
      />
    </span>
  )
}

/**
 * 쟁반 — 길마다 세 닢이 차례로 떨어진다.
 *
 * 순서는 전부 **지연**이 준다(타이머 체인이 아니라). 마지막 닢의 animationend 가 셈의 끝이고,
 * 그때 결과 카드가 선다 — 지연을 두 곳에서 세지 않으므로 어긋날 자리가 없다.
 */
function Tray({ result, labels, onSettled }: { result: ChuljeonResult; labels: string[]; onSettled: () => void }) {
  // 마지막 라운드가 곧 결과다. 앞 라운드는 동수라 다시 던진 판이므로 요약만 남긴다.
  const last = result.rounds[result.rounds.length - 1]
  const lead = (result.rounds.length - 1) * 260
  const lastCoinDelay = lead + (last.throws.length - 1) * CHULJEON_WAY_STEP_MS + 2 * CHULJEON_COIN_STEP_MS

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
      {result.rounds.length > 1 && (
        <p className="mb-2 font-serif text-[11px] leading-relaxed text-ink-primary/50">{CHULJEON_RETIE_LINE}</p>
      )}
      <div className="space-y-2.5">
        {last.throws.map((t, wi) => {
          const chosen = result.picked === t.index
          return (
            <div key={t.index} className="flex items-center gap-2.5">
              <span
                className={`min-w-0 flex-1 truncate font-serif text-[13px] ${
                  chosen ? 'font-bold text-gold-100' : 'text-ink-primary/60'
                }`}
              >
                {labels[t.index] ?? `${t.index + 1}번째 길`}
              </span>
              <span className="flex gap-1.5">
                {t.faces.map((f, ci) => (
                  <Coin key={ci} face={f} delayMs={lead + wi * CHULJEON_WAY_STEP_MS + ci * CHULJEON_COIN_STEP_MS} />
                ))}
              </span>
              <span
                className={`w-[46px] shrink-0 text-right font-serif text-[11px] ${
                  chosen ? 'text-gold-200' : 'text-ink-primary/40'
                }`}
                // 마지막 닢이 멎는 순간이 셈의 끝 — 여기서 결과 카드를 부른다
                onAnimationEnd={undefined}
              >
                {tallyText(t.gil)}
              </span>
            </div>
          )
        })}
      </div>

      {/* 셈의 끝을 알리는 보이지 않는 표식 — 마지막 닢과 같은 지연으로 멎는다.
          닢마다 핸들러를 달면 길 수만큼 중복 호출되므로 한 자리에서만 받는다. */}
      <span
        aria-hidden
        className="chuljeon-coin block h-0 w-0"
        style={{ '--cj-delay': `${lastCoinDelay}ms` } as React.CSSProperties}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && e.animationName === 'chuljeonCoin') onSettled()
        }}
      />
    </div>
  )
}

// ─── 3. 셈 ───────────────────────────────────────────────────

function Verdict({
  result,
  labels,
  seed,
  remaining,
  onAgain,
}: {
  result: ChuljeonResult
  labels: string[]
  seed: number
  remaining: number
  onAgain: () => void
}) {
  const decided = result.picked !== null && result.gil !== null
  return (
    <div className="space-y-3">
      <div
        className="chuljeon-seal rounded-xl border px-3 py-3 text-center"
        style={{
          borderColor: decided ? '#C9A84C55' : '#FFFFFF14',
          background: decided ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
        }}
      >
        <p className="font-serif text-[10px] tracking-[0.24em] text-gold-500/60">
          {decided ? `정 해 진 길 · ${CHULJEON_TALLY_LABEL[result.gil ?? 0]}` : '정 해 지 지 않 음'}
        </p>
        <p className="mt-1 font-serif text-[18px] font-bold text-ink-primary">
          {decided ? (labels[result.picked ?? 0] ?? '—') : '—'}
        </p>
        {decided && <p className="mt-0.5 font-sans text-[10.5px] text-ink-primary/45">{tallyText(result.gil ?? 0)}</p>}
      </div>

      <div className="rounded-xl border border-gold-500/20 bg-surface/60 px-3 py-2.5">
        <p className="font-serif text-[13px] leading-relaxed text-ink-primary/85">
          {decided ? pickLine(result.gil ?? 0, seed) : CHULJEON_UNDECIDED_LINE}
        </p>
      </div>

      <p className="text-center font-sans text-[10.5px] text-ink-primary/40">
        {remaining > 0 ? `오늘 ${remaining}회 더 던지실 수 있습니다` : '오늘 몫을 다 쓰셨습니다'}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-lg border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[12px] font-bold text-gold-200"
        >
          다른 갈림길
        </button>
        <Link
          href={SHRINE_HREF}
          className="rounded-lg border border-white/10 bg-surface px-4 py-2.5 text-center font-serif text-[12px] font-bold text-ink-primary/60"
        >
          신당
        </Link>
      </div>
    </div>
  )
}
