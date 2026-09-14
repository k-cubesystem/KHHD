'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, History, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { generateNarrative, type RecentTogether } from '@/app/actions/circle/narrative'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { TOGETHER_MAX, TOGETHER_MIN } from '@/lib/domain/circle/circle'
import { parseTogetherSections } from '@/lib/domain/circle/narrative'
import type { ActivityKind, ElementNeeds } from '@/lib/domain/circle/element-lore'
import type { MemberCare, PairCaution } from '@/lib/domain/circle/team-energy'
import { EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import { averageEnergy, lowestElement } from '@/lib/domain/shrine/energy-map'
import type { Element } from '@/lib/domain/shrine/types'
import { AD_DISCLOSURE_COUPANG } from '@/lib/domain/ads/rewarded'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * AI 풀이 — 둘·셋·넷 함께 보기 (CEO 2026-09-13 「그룹 전체 풀이와 합쳐 재구성 · 서로의 오행을 복채로 · 장점·단점·필요한 것」).
 *
 * 사람을 고르면(2~4) 엔진이 그 조합의 관계·모자란 기운을 정하고 AI 가 여섯 토막(한눈에 보면 · 잘 맞는 점 · 부딪히기 쉬운 점 ·
 * 사람마다 이렇게 · 곁에 두면 좋은 것 · 이번 주에 해 볼 것)으로 쉬운 말과 비유로 풀어 쓴다(프롬프트: together-prompt.ts). 풀이 아래 「필요한 것」 물건·자리는 엔진 값(사전·개운 표) 그대로이고 쿠팡 링크가 붙는다.
 * 같은 조합이면 30일 안에는 다시 사지 않는다. «최근 본 조합»은 이미 산 풀이를 서버 없이 다시 연다(복채 0).
 */

const STORE_HREF = '/protected/store?tab=bokchae'

export interface TogetherPerson {
  targetId: string
  name: string
  relation: string
  /** 타고난 비율(합 100) — 고른 사람들의 «함께 옅은 기운»을 여기서 낸다. */
  energy: Record<Element, number>
  yongsin: Element
  strongest: Element
}

function comboKey(ids: readonly string[]): string {
  return [...ids].sort().join(',')
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(iso))
}

function ElementChip({ el }: { el: Element }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[1px] font-serif text-[11px] font-bold"
      style={{ borderColor: `${EL_COLOR[el]}77`, background: `${EL_COLOR[el]}1a`, color: EL_COLOR[el] }}
    >
      {EL_KO[el]} <span className="font-sans font-normal text-ink-light/70">{EL_LABEL[el]}</span>
    </span>
  )
}

function ShopItem({ name, href, kind }: { name: string; href?: string; kind: string }) {
  if (!href) return <span className="text-ink-light/85">{name}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => trackEvent({ action: 'shop_link_click', category: 'conversion', label: `${kind}:${name}` })}
      className="inline-flex items-center gap-1 rounded border border-gold-500/30 bg-gold-500/[0.06] px-1.5 py-[1px] text-ink-light/90 hover:bg-gold-500/[0.12]"
    >
      {name}
      <span className="inline-flex items-center gap-0.5 font-sans text-[10px] text-gold-300">
        쿠팡 <ExternalLink className="h-2.5 w-2.5" />
      </span>
    </a>
  )
}

const ACTIVITY_ICON: Record<ActivityKind, string> = { move: '🏃', meal: '🍚', routine: '🗓', tidy: '🧹', rest: '😴' }

/**
 * 「함께 있을 때 이렇게」 — 사람마다 밥·몸 움직이기·쉬게 두기 가운데 무엇이 좋은지와 그 이유, 해야 할 것·피할 것.
 * 그리고 같은 팀·가족이라도 조심할 짝(상극). 값은 엔진(careOf·pairCautions) 그대로 — AI 는 이것을 풀어 쓴다.
 */
function CareBlock({
  people,
  care,
  cautions,
}: {
  people: readonly TogetherPerson[]
  care: readonly MemberCare[]
  cautions: readonly PairCaution[]
}) {
  const ids = new Set(people.map((p) => p.targetId))
  const mine = care.filter((c) => ids.has(c.targetId))
  const ours = cautions.filter((c) => ids.has(c.presserId) && ids.has(c.pressedId))
  if (mine.length === 0) return null
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="font-serif text-[12px] font-bold tracking-[0.1em] text-gold-300">함께 있을 때 이렇게</p>
      <ul className="space-y-3">
        {mine.map((c) => (
          <li key={c.targetId} className="text-[12px] leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            <p className="flex flex-wrap items-center gap-1.5">
              <b className="font-serif text-ink-light">{c.name}</b>
              <span className="rounded-full border border-gold-500/40 bg-gold-500/[0.1] px-2 py-[1px] font-serif text-[11px] text-gold-200">
                {ACTIVITY_ICON[c.kind]} {c.label}
              </span>
            </p>
            <p className="mt-0.5 text-ink-light/85">{c.together}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-light/55">{c.why}</p>
            <dl className="mt-1 grid grid-cols-[64px_1fr] gap-x-2 gap-y-0.5 text-ink-light/70">
              <dt className="text-ink-light/45">해야 할 것</dt>
              <dd>{c.do}</dd>
              <dt className="text-ink-light/45">피할 것</dt>
              <dd>{c.avoid}</dd>
            </dl>
          </li>
        ))}
      </ul>
      {ours.length > 0 && (
        <div
          className="space-y-1.5 border-t border-white/[0.06] pt-2.5 text-[12px] leading-relaxed"
          style={{ wordBreak: 'keep-all' }}
        >
          <p className="font-serif font-bold text-ink-light">같은 팀·가족이라도 조심할 것</p>
          <ul className="space-y-1.5 text-ink-light/75">
            {ours.map((c) => (
              <li key={`${c.presserId}-${c.pressedId}`}>{c.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** 「필요한 것」 — 사람마다 옅은 기운의 물건, 그리고 고른 사람들에게 함께 맞는 풍수·물건. 값은 엔진(사전·개운 표) 그대로. */
function NeedsBlock({
  people,
  needs,
  shopLinks,
  kind,
}: {
  people: readonly TogetherPerson[]
  needs: Record<Element, ElementNeeds>
  shopLinks: Record<string, string>
  kind: string
}) {
  const together = lowestElement(averageEnergy(people))
  const t = needs[together]
  const hasLinks = Object.keys(shopLinks).length > 0
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="font-serif text-[12px] font-bold tracking-[0.1em] text-gold-300">필요한 것 — 물건과 자리</p>
      <ul className="space-y-2.5">
        {people.map((p) => {
          const n = needs[p.yongsin]
          return (
            <li key={p.targetId} className="text-[12px] leading-relaxed">
              <p className="flex flex-wrap items-center gap-1.5">
                <b className="font-serif text-ink-light">{p.name}</b>
                <span className="text-ink-light/45">부족한</span> <ElementChip el={p.yongsin} />
              </p>
              <dl className="mt-1 grid grid-cols-[52px_1fr] gap-x-2 gap-y-1 text-ink-light/70">
                <dt className="text-ink-light/45">책상 위</dt>
                <dd>
                  <ShopItem name={n.desk} href={shopLinks[n.desk]} kind={kind} />
                </dd>
                <dt className="text-ink-light/45">집 안</dt>
                <dd className="text-ink-light/85">{n.home}</dd>
                <dt className="text-ink-light/45">선물</dt>
                <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {n.gifts.map((g) => (
                    <ShopItem key={g} name={g} href={shopLinks[g]} kind={kind} />
                  ))}
                </dd>
              </dl>
            </li>
          )
        })}
      </ul>
      <div className="space-y-1.5 border-t border-white/[0.06] pt-2.5 text-[12px] leading-relaxed">
        <p className="flex flex-wrap items-center gap-1.5">
          <b className="font-serif text-ink-light">서로에게 맞는 풍수·물건</b>
          <span className="text-ink-light/45">함께 부족한</span> <ElementChip el={together} />
        </p>
        <dl className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-1 text-ink-light/70">
          <dt className="text-ink-light/45">자리</dt>
          <dd>{t.home}</dd>
          <dt className="text-ink-light/45">색</dt>
          <dd>{t.color}</dd>
          <dt className="text-ink-light/45">방향</dt>
          <dd>{t.direction}</dd>
          <dt className="text-ink-light/45">시간</dt>
          <dd>{t.hourBand}</dd>
          <dt className="text-ink-light/45">물건</dt>
          <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ShopItem name={t.desk} href={shopLinks[t.desk]} kind={kind} />
            {t.gifts.map((g) => (
              <ShopItem key={g} name={g} href={shopLinks[g]} kind={kind} />
            ))}
          </dd>
        </dl>
      </div>
      {hasLinks && <p className="text-[9.5px] leading-snug text-ink-light/35">{AD_DISCLOSURE_COUPANG}</p>}
    </div>
  )
}

export function TogetherPanel({
  people,
  kind,
  recent = [],
  needs,
  shopLinks = {},
  care = [],
  cautions = [],
}: {
  people: readonly TogetherPerson[]
  kind: string
  /** 최근 본 조합(30일) — 이 화면의 사람들로만 이루어진 것만 보인다. */
  recent?: readonly RecentTogether[]
  /** 다섯 기운의 물건·자리(서버 계산). */
  needs: Record<Element, ElementNeeds>
  /** 물건 이름 → 쿠팡 파트너스 링크. 없으면 이름만. */
  shopLinks?: Record<string, string>
  /** 사람마다 「함께 있을 때 이렇게」(엔진 판정). */
  care?: readonly MemberCare[]
  /** 같은 팀·가족이라도 조심할 짝(상극). */
  cautions?: readonly PairCaution[]
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

  const pickedPeople = people.filter((p) => picked.includes(p.targetId))
  const pickedNames = pickedPeople.map((p) => p.name)
  const resultPeople = result ? people.filter((p) => result.ids.includes(p.targetId)) : []

  return (
    <section id="ai" className="space-y-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.05] p-4">
      <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-primary">
        <Sparkles className="h-3.5 w-3.5 text-gold-400" /> AI 풀이 — 둘·셋·넷 함께 보기
      </p>
      <p className="text-[11.5px] leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
        사람을 두 명에서 네 명까지 고르면 서로의 기운을 쉬운 말로 풀어 씁니다 — 한눈에 보면 · 잘 맞는 점 · 부딪히기 쉬운
        점 · 사람마다 이렇게(같이 밥이 좋은지, 몸을 움직이는 게 좋은지, 쉬게 두는 게 좋은지와 그 이유) · 곁에 두면 좋은
        것 · 이번 주에 해 볼 것. 곁에 둘 물건과 자리는 그 아래에 쿠팡 링크와 함께 섭니다.
      </p>
      <p className="text-[11px] leading-relaxed text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
        팀을 이끄는 팀장·사장님, 가족의 기운을 살피는 엄마·아빠, 모임의 리더가 보는 풀이입니다. 이미 곁에 있는 사람과
        어떻게 지낼지를 말하지, 사람을 고르거나 재는 자리가 아닙니다.
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
        <div className="space-y-3 rounded-lg border border-gold-500/20 bg-gold-500/[0.05] p-3">
          <p className="text-[10.5px] text-ink-light/45">
            {result.names.join(' · ')} · {formatDate(result.createdAt)}
          </p>
          <div className="space-y-3">
            {parseTogetherSections(result.text).map((s, i) => (
              <div key={`${s.heading}-${i}`} className="space-y-1">
                {s.heading && (
                  <h4 className="font-serif text-[12.5px] font-bold tracking-[0.08em] text-gold-300">{s.heading}</h4>
                )}
                {s.body.split(/\n+/).map((p, j) => (
                  <p
                    key={j}
                    className="text-[13px] leading-relaxed text-ink-light/85"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
          {resultPeople.length >= TOGETHER_MIN && (
            <>
              <CareBlock people={resultPeople} care={care} cautions={cautions} />
              <NeedsBlock people={resultPeople} needs={needs} shopLinks={shopLinks} kind={kind} />
            </>
          )}
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
      <p className="text-[10.5px] text-ink-light/40">
        같은 조합이면 30일 안에는 다시 사지 않습니다. 기운이 바뀌었을 때만 새로 짓습니다.
      </p>
    </section>
  )
}
