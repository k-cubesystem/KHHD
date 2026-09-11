'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Printer, Sparkles, Users } from 'lucide-react'
import { findFiveAvatar } from '@/components/family/five-avatar-selector'
import { ElementRadar, RADAR_AVERAGE_COLOR, seriesColor, type RadarSeries } from '@/components/family/element-radar'
import { NarrativePanel } from '@/components/family/narrative-panel'
import { TogetherPanel } from '@/components/family/together-panel'
import { EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { highestElement } from '@/lib/domain/shrine/energy-map'
import { CIRCLE_KIND_META } from '@/lib/domain/circle/circle'
import { PAIR_LABEL_KO, type CircleEnergy, type PairLabel } from '@/lib/domain/circle/team-energy'
import type { CircleEnergyPayload } from '@/app/actions/circle/energy'
import type { CachedNarrative, RecentTogether } from '@/app/actions/circle/narrative'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 기운 지도 v2 — «팩트만, 간단히» (CEO 2026-09-12 「불필요한 것 빼고 팩트만 남겨 간단히 해석, 디테일은 복채 AI 로»).
 *
 * 무료(멤버십)로 보이는 것: 오각형 그래프(겹침) · 팩트 세 줄 · 관계 라벨 한 줄씩 · 구성원 한 줄씩.
 * 복채로 여는 것: 그룹 전체 AI 풀이 · 둘·셋·넷 함께 보기 AI 분석. 이치·실천 문장은 AI 재료로 들어간다.
 *
 * 🔴 수치·점수 없음 — 직장 그룹의 밴드 규율을 전 화면이 그대로 따른다(모양·라벨이 말한다).
 */

function ElementChip({ el }: { el: Element }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] font-serif text-[11.5px] font-bold"
      style={{ borderColor: `${EL_COLOR[el]}77`, background: `${EL_COLOR[el]}1a`, color: EL_COLOR[el] }}
    >
      {EL_KO[el]} <span className="font-sans font-normal text-ink-light/70">{EL_LABEL[el]}</span>
    </span>
  )
}

const PAIR_TONE: Record<PairLabel, string> = {
  complement: 'border-gold-500/45 text-gold-300 bg-gold-500/[0.08]',
  lift: 'border-bok-sprout/45 text-bok-sprout bg-bok-sprout/[0.08]',
  guard: 'border-info-border text-info-text bg-info-light',
  distance: 'border-error-border text-error-text bg-error-light',
  independent: 'border-white/10 text-ink-light/50 bg-white/[0.02]',
}

function prescriptionHref(targetId: string): string {
  return targetId === 'self' ? '/protected/prescription' : `/protected/prescription?target=${targetId}`
}

/** 겹친 오각형 — 평균은 금색 채움, 사람은 선. 이름을 눌러 숨기고 보인다. */
function RadarSection({ energy }: { energy: CircleEnergy }) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const series: RadarSeries[] = [
    { id: 'average', name: '전체', share: energy.average, color: RADAR_AVERAGE_COLOR, fill: true },
    ...energy.entries
      .map((e, i) => ({ id: e.targetId, name: e.name, share: e.energy, color: seriesColor(i) }))
      .filter((s) => !hidden.has(s.id)),
  ]

  return (
    <section className="mb-5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4">
      <ElementRadar series={series} size={250} legend={false} />
      <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
        <li className="flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/[0.12] px-2.5 py-1 text-[11px] text-gold-200">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: RADAR_AVERAGE_COLOR }}
          />
          전체
        </li>
        {energy.entries.map((e, i) => {
          const on = !hidden.has(e.targetId)
          const color = seriesColor(i)
          return (
            <li key={e.targetId}>
              <button
                type="button"
                onClick={() => toggle(e.targetId)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-opacity ${
                  on ? 'border-white/15 text-ink-light/80' : 'border-white/[0.06] text-ink-light/35 opacity-60'
                }`}
              >
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ border: `2px solid ${color}` }}
                />
                {e.name}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-center text-[10.5px] text-ink-light/40">
        점선 고리가 고른 기운입니다. 안으로 들어간 꼭짓점이 옅은 기운.
      </p>
    </section>
  )
}

function FactsSection({ energy }: { energy: CircleEnergy }) {
  const thick = highestElement(energy.average)
  return (
    <section className="mb-5 space-y-2.5 rounded-xl border border-white/10 bg-surface/30 p-4">
      <p className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">이것만 보면 됩니다</p>
      <dl className="space-y-2 text-[12.5px]">
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-[92px] shrink-0 text-ink-light/45">함께 채울 기운</dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            <ElementChip el={energy.lowest} />
            {energy.holders.length > 0 ? (
              <span className="text-ink-light/75">
                든 사람 <b className="font-serif text-gold-300">{energy.holders.map((h) => h.name).join(', ')}</b>
              </span>
            ) : (
              <span className="text-ink-light/60">
                든 사람 없음 → 물건으로 <b className="font-serif text-gold-300">{energy.fallbackItem}</b>
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-[92px] shrink-0 text-ink-light/45">두꺼운 기운</dt>
          <dd>
            <ElementChip el={thick} />
          </dd>
        </div>
        {energy.roles && (
          <div className="flex flex-wrap items-center gap-2">
            <dt className="w-[92px] shrink-0 text-ink-light/45">역할 결</dt>
            <dd className="flex flex-wrap gap-1.5 text-[11.5px]">
              <span className="rounded-full border border-gold-500/40 bg-gold-500/[0.1] px-2 py-[2px] font-serif text-gold-200">
                두꺼운 · {energy.roles.thick.plain}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-[2px] font-serif text-ink-light/60">
                옅은 · {energy.roles.thin.plain}
              </span>
            </dd>
          </div>
        )}
      </dl>
      <Link
        href="/protected/store?tab=items"
        onClick={() => trackEvent({ action: 'circle_map_store', category: 'engagement', label: energy.lowest })}
        className="inline-flex items-center gap-1 font-serif text-[11.5px] font-bold text-gold-400"
      >
        {EL_KO[energy.lowest]} 기운 살림 보러가기 →
      </Link>
    </section>
  )
}

function RelationsSection({ energy }: { energy: CircleEnergy }) {
  const shown = energy.pairs.filter((p) => p.label !== 'independent')
  return (
    <section className="mb-5 space-y-2.5 rounded-xl border border-seal/30 bg-seal/[0.05] p-4">
      <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-primary">
        <Sparkles className="h-3.5 w-3.5 text-seal" /> 서로의 관계
      </p>
      {shown.length > 0 ? (
        <ul className="space-y-1.5">
          {shown.map((p) => (
            <li key={`${p.aId}-${p.bId}`} className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="font-serif font-bold text-ink-light">
                {p.aName} <span className="text-ink-light/35">↔</span> {p.bName}
              </span>
              <span className={`rounded-full border px-2 py-[1px] font-serif text-[11px] ${PAIR_TONE[p.label]}`}>
                {PAIR_LABEL_KO[p.label]}
              </span>
              {p.element && <ElementChip el={p.element} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-ink-light/55">뚜렷하게 밀어주거나 빼앗는 짝이 없습니다. 각자 서는 사이입니다.</p>
      )}
      <p className="text-[11px] leading-snug text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
        왜 그런지, 함께 무엇을 하면 되는지는 아래 AI 풀이가 사람마다 풀어 씁니다.
      </p>
    </section>
  )
}

export function CircleEnergyMapView({
  payload,
  sheet = 'hidden',
  narrative = null,
  recentTogether = [],
}: {
  payload: CircleEnergyPayload
  /** 「기운 한 장」 문 — BUSINESS 은 인쇄 링크, 다른 유료 티어는 업셀 한 줄, 숨김. */
  sheet?: 'print' | 'upsell' | 'hidden'
  /** 지난 AI 풀이(30일 안). */
  narrative?: CachedNarrative | null
  /** 최근 본 함께 보기 조합(30일 안) — 이 화면의 사람들로만 이루어진 것이 걸러져 보인다. */
  recentTogether?: readonly RecentTogether[]
}) {
  const { circle, energy } = payload
  const meta = CIRCLE_KIND_META[circle.kind]
  const viewed = useRef(false)

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackEvent({ action: 'circle_map_view', category: 'engagement', label: circle.kind, value: energy.entries.length })
  }, [circle.kind, energy.entries.length])

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-3 py-6 pb-28">
      <div className="mb-4">
        <Link
          href="/protected/family"
          className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-light/50 hover:text-gold-300"
        >
          <ChevronLeft className="h-4 w-4" />
          가족·인연 관리
        </Link>
      </div>

      <header className="mb-4 space-y-1.5 text-center">
        <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">氣運 地圖</p>
        <h1 className="font-serif text-2xl font-bold text-ink-light">
          {circle.name}{' '}
          <span className="align-middle rounded-full border border-white/10 px-2 py-[2px] font-sans text-[11px] font-normal text-ink-light/55">
            {meta.label}
          </span>
        </h1>
        <p className="flex items-center justify-center gap-1 text-sm text-ink-light/50">
          <Users className="h-3.5 w-3.5" /> {energy.entries.length}명의 타고난 오행을 한 오각형에
        </p>
      </header>

      {energy.notice && (
        <p
          className="mb-5 rounded-lg border border-gold-500/25 bg-gold-500/[0.07] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-gold-200/90"
          style={{ wordBreak: 'keep-all' }}
        >
          {energy.notice}
        </p>
      )}

      <RadarSection energy={energy} />
      <FactsSection energy={energy} />
      <RelationsSection energy={energy} />

      {/* 복채로 여는 것 — 그룹 전체 풀이 · 둘·셋·넷 함께 보기 */}
      <div id="ai" className="mb-5 space-y-3">
        <NarrativePanel
          kind="circle"
          targetKey={circle.id}
          initial={narrative}
          title="AI 풀이 — 이 그룹 전체를 신당의 말로"
        />
        {energy.entries.length >= 2 && (
          <TogetherPanel
            kind={circle.kind}
            people={energy.entries.map((e) => ({ targetId: e.targetId, name: e.name, relation: e.relation }))}
            recent={recentTogether}
          />
        )}
      </div>

      {sheet === 'print' && (
        <Link
          href={`/protected/family/map/print?circle=${circle.id}`}
          onClick={() => trackEvent({ action: 'team_sheet_open', category: 'engagement', label: circle.kind })}
          className="mb-5 flex items-center justify-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/[0.1] py-2.5 font-serif text-[12.5px] font-bold text-gold-200 hover:bg-gold-500/20"
        >
          <Printer className="h-3.5 w-3.5" /> {circle.name} 기운 한 장 — 자리마다 놓을 표 인쇄
        </Link>
      )}
      {sheet === 'upsell' && (
        <Link
          href="/protected/store?tab=membership"
          onClick={() => trackEvent({ action: 'business_gate_view', category: 'conversion', label: circle.kind })}
          className="mb-5 block rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-center text-[11.5px] text-ink-light/55 hover:text-gold-300"
          style={{ wordBreak: 'keep-all' }}
        >
          BUSINESS 멤버십은 그룹 전원의 «책상 위 한 가지»를 표 한 장으로 인쇄합니다 →
        </Link>
      )}

      {/* 구성원 — 한 줄씩. 자세한 것은 처방전. */}
      <section className="space-y-2">
        <p className="px-1 font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">구성원</p>
        {energy.entries.map((e, i) => {
          const avatar = findFiveAvatar(e.avatarId ?? undefined)
          const color = seriesColor(i)
          return (
            <div
              key={e.targetId}
              className="flex items-center gap-2.5 rounded-xl border border-gold-500/[0.18] bg-gold-500/[0.03] px-3 py-2.5"
            >
              <span aria-hidden className="h-6 w-1 shrink-0 rounded-full" style={{ background: color }} />
              {avatar ? (
                <Image
                  src={avatar.src}
                  alt={avatar.label}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                  style={{ backgroundColor: `${avatar.color}15`, border: `1px solid ${avatar.color}30` }}
                />
              ) : (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold-500/20 bg-surface text-[12px]">
                  {e.targetId === 'self' ? '🪷' : '🕯️'}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate font-serif text-[13.5px] font-bold text-ink-light">{e.name}</span>
                  <span className="shrink-0 text-[10px] text-ink-light/45">{e.relation}</span>
                </div>
                <p className="flex flex-wrap items-center gap-1 text-[10.5px] text-ink-light/50">
                  옅은 <ElementChip el={e.yongsin} /> 넉넉한 <ElementChip el={e.strongest} />
                </p>
              </div>
              <Link
                href={prescriptionHref(e.targetId)}
                aria-label={`${e.name} 기운 처방전 열기`}
                className="shrink-0 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-2 py-1.5 font-serif text-[11px] text-gold-300 hover:bg-gold-500/[0.12]"
              >
                처방전
              </Link>
            </div>
          )
        })}
      </section>

      <p className="mt-6 px-2 text-center text-[10px] leading-relaxed text-ink-light/35">
        재미로 즐기는 전통 풀이입니다. 의학적·심리적·재무적 조언을 대신하지 않습니다.
      </p>
    </div>
  )
}
