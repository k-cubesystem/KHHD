'use client'

import { useEffect, useState } from 'react'
import { computeJinmaek } from '@/app/actions/webtoon/jinmaek'
import { WU_XING_ORDER, type JinmaekReading, type WuXing } from '@/lib/domain/webtoon/jinmaek'
import { collectEvent, collectFunnel } from '@/lib/analytics/collector'
import { WEBTOON_FUNNEL } from '@/lib/analytics/funnel'
import { WebtoonCta } from '@/components/webtoon/WebtoonCta'

/**
 * 간이 진맥 위젯 — 회차 본문 중간에서 독자의 사주를 실제로 읽어 주는 컷.
 *
 * 극중 말풍선 문법(§6-2 이름표)을 UI 로 잇는다: 화자 칩 + 대사 → 입력 → 팔자등.
 * ⚠️ 생년월일은 서버에 저장되지 않는다 — 기억은 이 브라우저(localStorage)뿐이고,
 *    지우기 버튼이 그 기억을 지운다. 문구로도 이 약속을 화면에 못박는다.
 */

const STORE_KEY = 'hhd_jinmaek_birth'
const SPEAKER_COLOR: Record<string, string> = { 해수: '#8fb7d9', 해화지기: '#9fd4e8' }
const ELEMENT_HAN: Record<WuXing, string> = { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' }

interface StoredBirth {
  d: string
  t: string | null
}

function readStored(): StoredBirth | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null) return null
    const d = (v as Record<string, unknown>).d
    const t = (v as Record<string, unknown>).t
    if (typeof d !== 'string') return null
    return { d, t: typeof t === 'string' ? t : null }
  } catch {
    return null
  }
}

function writeStored(b: StoredBirth | null) {
  try {
    if (b) localStorage.setItem(STORE_KEY, JSON.stringify(b))
    else localStorage.removeItem(STORE_KEY)
  } catch {
    /* 저장 불가 환경 — 이번 화면만 보여 주면 된다 */
  }
}

interface Palette {
  fill: string
  text: string
}

export function JinmaekWidget({
  no,
  hook,
  speaker,
  palette,
  ctaHref,
}: {
  no: number
  hook: string
  speaker: string
  palette: Record<WuXing, Palette>
  ctaHref: string
}) {
  const [phase, setPhase] = useState<'intro' | 'form' | 'loading' | 'result'>('intro')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [noTime, setNoTime] = useState(true)
  const [reading, setReading] = useState<JinmaekReading | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    collectEvent('webtoon_jinmaek_view', 'webtoon', `ep${no}`)
  }, [no])

  async function run(birth: StoredBirth) {
    setPhase('loading')
    setError(null)
    const res = await computeJinmaek({ episodeNo: no, birthDate: birth.d, birthTime: birth.t })
    if (!res.success || !res.reading) {
      setError('날짜를 읽지 못했어요. 다시 확인해 주세요.')
      setPhase('form')
      return
    }
    writeStored(birth)
    setReading(res.reading)
    setPhase('result')
    collectFunnel('webtoon_jinmaek', WEBTOON_FUNNEL.webtoon_jinmaek, { no })
    collectEvent('webtoon_jinmaek_submit', 'webtoon', `ep${no}`)
  }

  function onOpen() {
    const stored = readStored()
    if (stored) void run(stored)
    else setPhase('form')
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void run({ d: date, t: noTime ? null : time || null })
  }

  function onForget() {
    writeStored(null)
    setReading(null)
    setDate('')
    setTime('')
    setNoTime(true)
    setPhase('form')
  }

  const chip = SPEAKER_COLOR[speaker] ?? '#c9a84c'

  return (
    <section aria-label="간이 진맥" className="relative -mx-4 border-y border-gold-500/25 bg-[#0b0a10] px-4 py-6">
      <div className="mx-auto w-full max-w-[440px]">
        {/* 화자 칩 — 조판의 이름표 말풍선과 같은 문법 */}
        <span
          className="inline-block rounded-md border px-2.5 py-0.5 font-sans text-[12px] font-bold"
          style={{ borderColor: chip, color: chip, background: 'rgba(8,8,12,0.9)' }}
        >
          {speaker}
        </span>
        <p className="mt-2 rounded-2xl rounded-tl-sm border border-white/15 bg-[#faf8f2] px-4 py-3 font-sans text-[14px] font-semibold leading-relaxed text-[#1a1813]">
          {hook}
        </p>

        {phase === 'intro' && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={onOpen}
              className="w-full rounded-xl bg-gold-500/90 py-3 font-serif text-[14px] font-bold text-black"
            >
              내 팔자등 켜 보기 — 생년월일이면 됩니다
            </button>
            <p className="text-center font-sans text-[11px] text-ink-primary/40">
              무료 · 저장되지 않습니다 (이 브라우저에만 기억)
            </p>
          </div>
        )}

        {(phase === 'form' || phase === 'loading') && (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="font-sans text-[12px] text-ink-primary/60">생년월일 (양력)</span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min="1900-01-01"
                max="2026-12-31"
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 font-sans text-[14px] text-ink-primary"
              />
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 font-sans text-[12.5px] text-ink-primary/70">
                <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)} />시 모름
              </label>
              {!noTime && (
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-sans text-[13px] text-ink-primary"
                />
              )}
            </div>
            {error && <p className="font-sans text-[12px] text-error">{error}</p>}
            <button
              type="submit"
              disabled={phase === 'loading'}
              className="w-full rounded-xl bg-gold-500/90 py-3 font-serif text-[14px] font-bold text-black disabled:opacity-60"
            >
              {phase === 'loading' ? '등불을 켜는 중…' : '진맥 받기'}
            </button>
          </form>
        )}

        {phase === 'result' && reading && (
          <div className="mt-4 space-y-4">
            {/* 팔자등 — 오행 다섯 등불. 0개 = 불 꺼진 감실 */}
            <div className="grid grid-cols-5 gap-2">
              {WU_XING_ORDER.map((el) => {
                const n = reading.counts[el]
                const lit = n > 0
                return (
                  <div
                    key={el}
                    className="rounded-xl border px-1 py-2.5 text-center"
                    style={{
                      borderColor: lit ? palette[el].fill : 'rgba(255,255,255,0.12)',
                      background: lit ? `${palette[el].fill}1f` : 'rgba(0,0,0,0.25)',
                    }}
                  >
                    <span
                      className="block font-serif text-[19px] font-bold"
                      style={{ color: lit ? palette[el].text : 'rgba(244,242,236,0.25)' }}
                    >
                      {ELEMENT_HAN[el]}
                    </span>
                    <span
                      className="mt-0.5 block font-sans text-[11px]"
                      style={{ color: lit ? palette[el].text : 'rgba(244,242,236,0.3)' }}
                    >
                      {n}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="font-serif text-[13.5px] leading-relaxed text-gold-200">{reading.dayMasterLine}</p>
            <p className="font-sans text-[13px] leading-relaxed text-ink-primary/75">{reading.comment}</p>
            <WebtoonCta
              no={no}
              href={ctaHref}
              label="내 여덟 글자, 전부 읽어 보기"
              sub="간이 진맥은 여기까지 — 본풀이는 해화당에서"
            />
            <button
              type="button"
              onClick={onForget}
              className="mx-auto block font-sans text-[11px] text-ink-primary/35 underline underline-offset-2"
            >
              입력 지우기 (이 브라우저 기억 삭제)
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
