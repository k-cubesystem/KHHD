'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { History, Loader2, Sparkles, Users } from 'lucide-react'
import { toast } from 'sonner'
import { generateNarrative, type RecentTogether } from '@/app/actions/circle/narrative'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { TOGETHER_MAX, TOGETHER_MIN } from '@/lib/domain/circle/circle'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 둘·셋·넷 함께 보기 — 고른 사람들의 «서로의 기운»을 AI 가 풀어 쓴다(복채). CEO 2026-09-12.
 * 판정(라벨·이치·실천)은 엔진이 하고 AI 는 네 문단으로 풀어 쓴다. 같은 조합이면 30일 안에는 다시 사지 않는다.
 * «최근 본 조합»(35차)은 이미 산 풀이를 한 번에 다시 연다 — 서버를 부르지 않고, 복채도 없다.
 */

const STORE_HREF = '/protected/store?tab=bokchae'

export interface TogetherPerson {
  targetId: string
  name: string
  relation: string
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function comboKey(ids: readonly string[]): string {
  return [...ids].sort().join(',')
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(iso))
}

export function TogetherPanel({
  people,
  kind,
  recent = [],
}: {
  people: readonly TogetherPerson[]
  kind: string
  /** 최근 본 조합(30일) — 이 화면의 사람들로만 이루어진 것만 보인다. */
  recent?: readonly RecentTogether[]
}) {
  const [picked, setPicked] = useState<string[]>(() => people.slice(0, TOGETHER_MIN).map((p) => p.targetId))
  const [result, setResult] = useState<RecentTogether | null>(null)
  const [history, setHistory] = useState<RecentTogether[]>(() => {
    const here = new Set(people.map((p) => p.targetId))
    return recent.filter((r) => r.ids.every((id) => here.has(id)))
  })
  const [pending, startTransition] = useTransition()
  const cost = FEATURE_COST.togetherNarrative.display
  const canRun = picked.length >= TOGETHER_MIN && picked.length <= TOGETHER_MAX && !pending

  const toggle = (id: string) =>
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= TOGETHER_MAX) {
        toast.message(`한 번에 ${TOGETHER_MAX}명까지 함께 봅니다.`)
        return prev
      }
      return [...prev, id]
    })

  const remember = (entry: RecentTogether) =>
    setHistory((prev) => [entry, ...prev.filter((r) => comboKey(r.ids) !== comboKey(entry.ids))])

  const run = () => {
    if (!canRun) return
    const ids = [...picked]
    const names = people.filter((p) => ids.includes(p.targetId)).map((p) => p.name)
    startTransition(async () => {
      const res = await generateNarrative('together', ids.join(','))
      if (!res.success) {
        toast.error(res.error)
        if (res.errorType === 'INSUFFICIENT_BALANCE') {
          trackEvent({ action: 'together_narrative_insufficient', category: 'conversion', label: kind })
        }
        return
      }
      const entry: RecentTogether = { ids, names, text: res.text, createdAt: res.createdAt }
      setResult(entry)
      remember(entry)
      trackEvent({
        action: res.cached ? 'together_narrative_cached' : 'together_narrative_generate',
        category: 'engagement',
        label: kind,
        value: ids.length,
      })
      if (!res.cached) toast.success('함께 보는 풀이를 받았습니다.')
    })
  }

  const reopen = (entry: RecentTogether) => {
    setPicked([...entry.ids])
    setResult(entry)
    trackEvent({ action: 'together_recent_open', category: 'engagement', label: kind, value: entry.ids.length })
  }

  const pickedNames = people.filter((p) => picked.includes(p.targetId)).map((p) => p.name)

  return (
    <section className="space-y-3 rounded-xl border border-gold-500/25 bg-surface/30 p-4">
      <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-primary">
        <Users className="h-3.5 w-3.5 text-gold-400" /> 둘·셋·넷 함께 보기
      </p>
      <p className="text-[11.5px] leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
        같이 볼 사람을 두 명에서 네 명까지 고르면, 그 사람들만 두고 누가 누구에게 무엇을 주는지·어디서 지치는지· 이번
        주에 같이 할 한 가지를 AI 가 풀어 씁니다.
      </p>

      <ul className="flex flex-wrap gap-1.5">
        {people.map((p) => {
          const on = picked.includes(p.targetId)
          return (
            <li key={p.targetId}>
              <button
                type="button"
                onClick={() => toggle(p.targetId)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                  on
                    ? 'border-gold-500/50 bg-gold-500/[0.14] text-gold-300'
                    : 'border-white/10 bg-white/[0.02] text-ink-light/45'
                }`}
              >
                {p.name}
                <span className="ml-1 text-[10px] opacity-60">{p.relation}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10.5px] tracking-[0.1em] text-ink-light/45">
            <History className="h-3 w-3" /> 최근 본 조합 — 다시 여는 데 복채가 들지 않습니다
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {history.map((r) => {
              const open = result !== null && comboKey(result.ids) === comboKey(r.ids)
              return (
                <li key={comboKey(r.ids)}>
                  <button
                    type="button"
                    onClick={() => reopen(r)}
                    aria-pressed={open}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                      open
                        ? 'border-gold-500/45 bg-gold-500/[0.1] text-gold-200'
                        : 'border-white/10 bg-white/[0.02] text-ink-light/60 hover:text-ink-light'
                    }`}
                  >
                    <span className="font-serif font-bold">{r.names.join('·')}</span>
                    <span className="ml-1.5 text-[10px] opacity-60">{formatDate(r.createdAt)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-gold-500/20 bg-gold-500/[0.05] p-3">
          <p className="text-[10.5px] text-ink-light/45">
            {result.names.join(' · ')} · {formatDate(result.createdAt)}
          </p>
          <div className="space-y-2.5 text-[13px] leading-relaxed text-ink-light/85" style={{ wordBreak: 'keep-all' }}>
            {paragraphs(result.text).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canRun}
          onClick={run}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/[0.12] py-2.5 font-serif text-[12.5px] font-bold text-gold-200 hover:bg-gold-500/20 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {pickedNames.length >= TOGETHER_MIN ? `${pickedNames.join('·')} 함께 보기` : '두 명 이상 고르세요'}
          <span className="font-sans text-[11px] font-normal text-gold-200/70">· {cost}만냥</span>
        </button>
        <Link href={STORE_HREF} className="font-serif text-[11px] text-ink-light/45 hover:text-gold-300">
          복채 충전
        </Link>
      </div>
    </section>
  )
}
