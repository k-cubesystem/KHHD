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

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { X, ChevronLeft, Coins, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  CHULJEON_COIN_STEP_MS,
  CHULJEON_DISCLAIMER,
  CHULJEON_MS,
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
import { hapticPulse } from '@/lib/utils/haptic'
import type { SoundKey } from '@/lib/domain/shrine/types'
import { EffectsCanvas, type EffectsHandle } from './EffectsCanvas'
import { useShrineAudio } from './useShrineAudio'

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
  // 소리는 이 페이지가 주인이다(오방기 페이지와 같은 구조) — 짤랑(닿을 때)·바라(셈이 끝날 때)
  const { play } = useShrineAudio()
  const [phase, setPhase] = useState<Phase>('compose')
  const [ways, setWays] = useState<string[]>(['', ''])
  const [todayCount, setTodayCount] = useState(status.todayCount)
  /** 이번 판의 회차 — 서버가 쓴 값으로 맞춘다(되던지기 방지의 핵심) */
  const [seq, setSeq] = useState(status.todayCount)
  const [settled, setSettled] = useState(false)
  /**
   * 이번 판 번호 — 쟁반의 `key` 다. **연출 재생의 유일한 장치**라 없으면 안 된다.
   *
   * 같은 갈림길로 다시 던지면 React 는 같은 DOM 을 재사용하고, CSS 애니메이션은 마운트 때만
   * 도므로 엽전이 굴러 떨어지지 않는다. 그러면 `animationend` 도 오지 않고 → settled 가 영영
   * false → **결과 카드가 다시는 뜨지 않는다**. 숫자만 조용히 바뀌는 것이 아니라 화면이 멎는다.
   * key 를 갈아 무대를 새로 세우는 것으로 그 교착을 원천에서 없앤다.
   */
  const [throwNo, setThrowNo] = useState(0)
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
    setThrowNo((n) => n + 1)
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

  /**
   * 같은 갈림길로 한 판 더 — 결과를 보고 **그 자리에서** 다시 던진다(CEO: "결과 보고 바로 다시 던지기").
   *
   * ⚠️ 갈림길을 다시 적게 하지 않는 것이 요점이다. 종전에는 「다른 갈림길」뿐이라 같은 물음을
   *    한 번 더 물으려면 짜장면·짬뽕을 또 타이핑해야 했다.
   * ⚠️ 회차(seq)는 **서버가 정한다** — 여기서 미리 올려 두면 서버 값과 어긋난 판이 한 프레임 보인다.
   *    onThrow 가 settled 를 내리고 다시 올리므로 쟁반이 처음부터 다시 구른다.
   */
  const throwAgain = useCallback(() => onThrow(), [onThrow])

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
              {/* key=throwNo — 판이 바뀌면 무대를 새로 세운다(위 throwNo 주석의 교착 방지) */}
              <Tray key={throwNo} result={result} labels={filled} play={play} onSettled={() => setSettled(true)} />
              {settled && (
                <Verdict
                  result={result}
                  labels={filled}
                  seed={seed}
                  remaining={remaining}
                  play={play}
                  onThrowAgain={throwAgain}
                  onAgain={restart}
                />
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

/**
 * 닢마다 다른 흩어짐 — 세 닢이 판박이로 멎으면 그림이지 엽전이 아니다.
 * 자리 번호가 정하므로 결정론이다(같은 판을 다시 그려도 같은 자리에 멎는다).
 */
const COIN_SCATTER = [
  // x 는 출발점의 가로 치우침 — 양수라 산통(오른쪽)에서 날아든다. 산통에 가까운 셋째 닢이 가장 짧게 난다
  { x: 38, tilt: -9 },
  { x: 26, tilt: 6 },
  { x: 12, tilt: -3 },
] as const

/**
 * 엽전 한 닢 — 글자면(常平通寶)이 길, 등면(戶)이 흉.
 *
 * 네 겹이다(app/shrine-scene.css 척전 절 참고): 활공 → 포물선·튕김 → 공중제비 → 두 면.
 * **면은 공중제비의 끝 각이 정한다** — 360 의 배수면 글자면이, 배수+180 이면 등면이 위로 온다.
 * 그림을 바꿔치기하는 게 아니라 실제로 돌아서 그 면이 나오므로 눈이 속지 않는다.
 * --cj-delay 는 바깥 한 곳에만 두고 안쪽 겹은 상속받는다(네 겹이 한 박자로 움직이는 근거).
 */
function Coin({
  face,
  index,
  delayMs,
  onLand,
}: {
  face: CoinFace
  index: number
  delayMs: number
  /** 닢이 쟁반에 처음 닿았다 — 흙먼지·짤랑·햅틱은 여기서 난다(표식의 animationend 가 몬다) */
  onLand: (el: HTMLElement) => void
}) {
  const gil = face === 'gil'
  const scatter = COIN_SCATTER[index % COIN_SCATTER.length]
  return (
    <span
      aria-hidden
      className="chuljeon-coin relative block h-10 w-10"
      style={{ '--cj-delay': `${delayMs}ms`, '--cj-x': `${scatter.x}px` } as React.CSSProperties}
    >
      <span className="chuljeon-shadow" />
      <span className="chuljeon-arc relative block h-full w-full">
        <span
          className="chuljeon-spin relative block h-full w-full"
          style={{ '--cj-spin': gil ? '1080deg' : '1260deg', '--cj-tilt': `${scatter.tilt}deg` } as React.CSSProperties}
        >
          <span className="chuljeon-face chuljeon-face-front" />
          <span className="chuljeon-face chuljeon-face-back" />
        </span>
        {/* 접지 표식 — 보이지 않는다. 길이가 CHULJEON_MS.land 라 닢이 닿는 그 박자에 끝난다 */}
        <span
          className="chuljeon-land absolute inset-0"
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && e.animationName === 'chuljeonLand') onLand(e.currentTarget)
          }}
        />
      </span>
    </span>
  )
}

/** 산통(算筒) — 던지는 손. CSS 통 하나가 흔들렸다 기울며 닢을 쏟는다(chuljeonCupPour). */
function Cup() {
  return (
    <span aria-hidden className="chuljeon-cup absolute right-2.5 top-2 z-[2] block h-9 w-7">
      <span
        className="absolute inset-x-0 bottom-0 top-1 rounded-b-[7px] rounded-t-[3px]"
        style={{
          background: 'linear-gradient(90deg,#3B2A14,#8A6A34 42%,#C9A46A 58%,#5C4222)',
          boxShadow: '0 5px 9px -4px rgba(0,0,0,0.9), inset 0 -6px 8px -6px rgba(0,0,0,0.6)',
        }}
      />
      <span
        className="absolute inset-x-0 top-0 h-2.5 rounded-full"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #2A1D0C, #6B4A22 70%, #C9A46A)',
          border: '1px solid rgba(201,164,106,0.5)',
        }}
      />
    </span>
  )
}

/**
 * 쟁반 — 길마다 세 닢이 차례로 떨어진다.
 *
 * 순서는 전부 **지연**이 준다(타이머 체인이 아니라). 마지막 닢의 animationend 가 셈의 끝이고,
 * 그때 결과 카드가 선다 — 지연을 두 곳에서 세지 않으므로 어긋날 자리가 없다.
 * 흙먼지·짤랑도 같은 규율이다: 닢마다 접지 표식(.chuljeon-land)의 animationend 가 몬다.
 */
function Tray({
  result,
  labels,
  play,
  onSettled,
}: {
  result: ChuljeonResult
  labels: string[]
  play: (key: SoundKey) => void
  onSettled: () => void
}) {
  // 마지막 라운드가 곧 결과다. 앞 라운드는 동수라 다시 던진 판이므로 요약만 남긴다.
  const last = result.rounds[result.rounds.length - 1]
  const lead = (result.rounds.length - 1) * 260
  const lastCoinDelay = lead + (last.throws.length - 1) * CHULJEON_WAY_STEP_MS + 2 * CHULJEON_COIN_STEP_MS
  const effectsRef = useRef<EffectsHandle>(null)
  const trayRef = useRef<HTMLDivElement>(null)

  // 닢이 닿은 자리(쟁반 기준 %)에 금가루·먼지를 뿌린다 — 좌표는 DOM 실측이라 길 수·글자 길이와 무관하다
  const onLand = useCallback(
    (el: HTMLElement) => {
      const tray = trayRef.current?.getBoundingClientRect()
      if (tray && tray.width > 0 && tray.height > 0) {
        const r = el.getBoundingClientRect()
        const x = ((r.left + r.width / 2 - tray.left) / tray.width) * 100
        const y = ((r.top + r.height - tray.top) / tray.height) * 100
        effectsRef.current?.emit('sparkle', x, y)
        effectsRef.current?.emit('smoke', x, y)
      }
      play('coin')
      hapticPulse(10)
    },
    [play]
  )

  return (
    <div
      ref={trayRef}
      className="relative overflow-hidden rounded-xl border px-3 pb-3"
      style={{
        // 놋쟁반 — 테두리는 놋쇠 결, 바닥은 가운데가 살짝 밝은 옻칠
        borderColor: 'rgba(201,164,106,0.35)',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(60,44,22,0.55), rgba(0,0,0,0.35) 80%)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 8px 18px -10px rgba(0,0,0,0.9)',
      }}
    >
      <EffectsCanvas ref={effectsRef} />
      {/* 머리 — 산통이 서고 닢이 날아드는 하늘. 쟁반이 overflow-hidden 이라 포물선 꼭대기(chuljeonArc 18%,
          -64px)가 이 안에 들어와야 한다. 낮으면 공중의 닢이 잘려 «갑자기 나타나» 떨어진다(하네스 실측). */}
      <div className="relative h-[74px]">
        <Cup />
        {result.rounds.length > 1 && (
          <p className="absolute left-0 top-2 pr-10 font-serif text-[11px] leading-relaxed text-ink-primary/50">
            {CHULJEON_RETIE_LINE}
          </p>
        )}
      </div>
      <div className="space-y-2.5">
        {last.throws.map((t, wi) => {
          const chosen = result.picked === t.index
          const rowStart = lead + wi * CHULJEON_WAY_STEP_MS
          // 줄이 울리는 박자 = 첫 닢이 닿는 때, 셈 글자가 뜨는 박자 = 마지막 닢이 닿는 때
          const rowLand = rowStart + CHULJEON_MS.land
          const rowLastLand = rowStart + 2 * CHULJEON_COIN_STEP_MS + CHULJEON_MS.land
          return (
            <div
              key={t.index}
              className="chuljeon-row flex items-center gap-2.5"
              style={{ '--cj-delay': `${rowLand}ms` } as React.CSSProperties}
            >
              <span
                className={`min-w-0 flex-1 truncate font-serif text-[13px] ${
                  chosen ? 'font-bold text-gold-100' : 'text-ink-primary/60'
                }`}
              >
                {labels[t.index] ?? `${t.index + 1}번째 길`}
              </span>
              <span className="flex gap-1.5">
                {t.faces.map((f, ci) => (
                  <Coin key={ci} face={f} index={ci} delayMs={rowStart + ci * CHULJEON_COIN_STEP_MS} onLand={onLand} />
                ))}
              </span>
              <span
                className={`chuljeon-tally w-[46px] shrink-0 text-right font-serif text-[11px] ${
                  chosen ? 'text-gold-200' : 'text-ink-primary/40'
                }`}
                style={{ '--cj-delay': `${rowLastLand}ms` } as React.CSSProperties}
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
  play,
  onThrowAgain,
  onAgain,
}: {
  result: ChuljeonResult
  labels: string[]
  seed: number
  remaining: number
  play: (key: SoundKey) => void
  /** 같은 갈림길로 그 자리에서 한 판 더 */
  onThrowAgain: () => void
  /** 갈림길을 새로 적는다 */
  onAgain: () => void
}) {
  const decided = result.picked !== null && result.gil !== null
  return (
    <div className="space-y-3">
      <div
        className="chuljeon-seal relative rounded-xl border px-3 py-3 text-center"
        style={{
          borderColor: decided ? '#C9A84C55' : '#FFFFFF14',
          background: decided ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
        }}
        // 도장이 내려앉는 박자에 바라가 울린다 — 타이머가 아니라 연출이 몬다
        onAnimationStart={(e) => {
          if (e.target !== e.currentTarget || e.animationName !== 'chuljeonSeal') return
          play('bara')
          hapticPulse(20)
        }}
      >
        {decided && (
          // 낙관 — 정해진 길 위에 내리찍히는 붉은 인장(chuljeonStamp)
          <span
            aria-hidden
            className="chuljeon-stamp absolute -top-2.5 right-2 grid h-9 w-9 place-items-center rounded-[3px] border font-serif text-[18px] font-bold"
            style={{
              borderColor: 'rgba(158,43,43,0.75)',
              color: '#B83232',
              background: 'rgba(158,43,43,0.12)',
              boxShadow: 'inset 0 0 0 1px rgba(158,43,43,0.35)',
            }}
          >
            吉
          </span>
        )}
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

      {/* 같은 갈림길로 한 판 더 — 결과 바로 아래 주 버튼이다(가장 자주 누를 자리) */}
      <button
        type="button"
        onClick={onThrowAgain}
        disabled={remaining <= 0}
        className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/15 py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {remaining > 0 ? '같은 갈림길로 다시 던지기' : '오늘 몫을 다 쓰셨습니다'}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-lg border border-white/10 bg-surface py-2.5 font-serif text-[12px] font-bold text-ink-primary/60"
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
