'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, Printer, Sparkles, Users } from 'lucide-react'
import { findFiveAvatar } from '@/components/family/five-avatar-selector'
import { EnergyBars } from '@/components/family/energy-bars'
import { EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { CIRCLE_KIND_META } from '@/lib/domain/circle/circle'
import { PAIR_LABEL_KO, type CircleEnergy, type PairLabel } from '@/lib/domain/circle/team-energy'
import type { CircleEnergyPayload } from '@/app/actions/circle/energy'
import { trackEvent } from '@/lib/analytics/ga4'
import { NarrativePanel } from '@/components/family/narrative-panel'
import type { CachedNarrative } from '@/app/actions/circle/narrative'

/**
 * 그룹 기운 지도 — 「전체 균형 · 그 기운을 든 사람 · 서로의 관계 · 역할 결 · 구성원별」.
 *
 * 🔴 직장 그룹(scoreMode 'bands')는 수를 적지 않는다. 막대는 그리되 숫자·점수·순위가 어디에도 없다 —
 *    서버 응답에 점수가 없으므로 여기서 새로 만들 재료도 없다.
 */

function label(el: Element): string {
  return `${EL_LABEL[el]}(${EL_KO[el]})`
}

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
  lift: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/[0.08]',
  guard: 'border-sky-400/40 text-sky-200 bg-sky-500/[0.08]',
  distance: 'border-seal/45 text-[#D9A0A0] bg-seal/[0.08]',
  independent: 'border-white/10 text-ink-light/50 bg-white/[0.02]',
}

function prescriptionHref(targetId: string): string {
  return targetId === 'self' ? '/protected/prescription' : `/protected/prescription?target=${targetId}`
}

/** 그룹 관계 세 섹션 — 가족 지도도 같은 그림을 쓴다(FamilyEnergyMapView 가 import). */
export function TeamRelations({ energy, compact = false }: { energy: CircleEnergy; compact?: boolean }) {
  const { lowest, holders, fallbackItem, pairs, roles } = energy
  const shown = compact ? pairs.filter((p) => p.label !== 'independent') : pairs

  return (
    <>
      {/* 그 기운을 든 사람 */}
      <section className="mb-5 space-y-2 rounded-xl border border-white/10 bg-surface/30 p-4">
        <p className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">
          {label(lowest)} 기운을 든 사람
        </p>
        {holders.length > 0 ? (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {holders.map((h) => (
                <li
                  key={h.targetId}
                  className="rounded-full border border-gold-500/40 bg-gold-500/[0.1] px-2.5 py-1 font-serif text-[12px] text-gold-200"
                >
                  {h.name}
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] leading-relaxed text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
              이 사람 곁이 그룹의 보약입니다. 같이 있는 시간을 늘리는 것이 물건보다 먼저입니다.
            </p>
          </>
        ) : (
          <p className="text-[11.5px] leading-relaxed text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
            이 그룹엔 {label(lowest)} 기운을 든 사람이 없습니다. 물건과 자리로 채웁니다 —{' '}
            <b className="font-serif text-gold-300">{fallbackItem}</b>부터.
          </p>
        )}
      </section>

      {/* 서로의 관계 */}
      {shown.length > 0 && (
        <section className="mb-5 space-y-2.5 rounded-xl border border-seal/30 bg-seal/[0.05] p-4">
          <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-primary">
            <Sparkles className="h-3.5 w-3.5 text-seal" /> 서로의 관계
          </p>
          <ul className="space-y-2.5">
            {shown.map((p) => (
              <li key={`${p.aId}-${p.bId}`} className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-serif text-[12.5px] font-bold text-ink-light">
                    {p.aName} <span className="text-ink-light/35">↔</span> {p.bName}
                  </span>
                  <span className={`rounded-full border px-2 py-[1px] font-serif text-[11px] ${PAIR_TONE[p.label]}`}>
                    {PAIR_LABEL_KO[p.label]}
                  </span>
                </div>
                <p className="text-[11.5px] leading-snug text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
                  {p.reason}
                </p>
                <p className="text-[11px] leading-snug text-gold-200/75" style={{ wordBreak: 'keep-all' }}>
                  <span className="font-serif text-gold-500/70">함께 · </span>
                  {p.how}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 역할 결 */}
      {roles && (
        <section className="mb-5 space-y-2 rounded-xl border border-white/10 bg-surface/30 p-4">
          <p className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">역할 결</p>
          <div className="flex flex-wrap gap-1.5 text-[11.5px]">
            <span className="rounded-full border border-gold-500/40 bg-gold-500/[0.1] px-2.5 py-1 font-serif text-gold-200">
              두꺼운 결 · {roles.thick.plain}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-serif text-ink-light/60">
              옅은 결 · {roles.thin.plain}
            </span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
            {roles.sentence}
          </p>
        </section>
      )}
    </>
  )
}

export function CircleEnergyMapView({
  payload,
  sheet = 'hidden',
  narrative = null,
}: {
  payload: CircleEnergyPayload
  /** 「기운 한 장」 문 — BUSINESS 은 인쇄 링크, 다른 유료 티어는 업셀 한 줄, 숨김. */
  sheet?: 'print' | 'upsell' | 'hidden'
  /** 지난 AI 풀이(30일 안). */
  narrative?: CachedNarrative | null
}) {
  const { circle, energy } = payload
  const showNumbers = energy.scoreMode === 'full'
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
          <Users className="h-3.5 w-3.5" /> {energy.entries.length}명의 기운을 나란히 두고 누가 누구를 채우는지 봅니다
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

      {/* 그룹 전체 균형 */}
      <section className="mb-5 space-y-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">그룹 전체 균형</span>
          <span className="rounded-sm border border-gold-500/35 bg-gold-500/[0.12] px-2 py-[3px] text-[10.5px] text-gold-300">
            함께 채울 기운 <b className="font-serif text-gold-500">{EL_KO[energy.lowest]}</b>
          </span>
        </div>
        <EnergyBars energy={energy.average} lacking={energy.lowest} showNumbers={showNumbers} height={46} unit="%" />
        <p className="text-[11px] leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
          그룹 전체로는 <b className="font-serif text-gold-400">{EL_LABEL[energy.lowest]}</b> 기운이 가장 옅습니다.
        </p>
      </section>

      <TeamRelations energy={energy} />

      <div className="mb-5">
        <NarrativePanel
          kind="circle"
          targetKey={circle.id}
          initial={narrative}
          title="AI 풀이 — 이 그룹의 기운을 신당의 말로"
        />
      </div>

      {/* 구성원별 */}
      <section className="space-y-3">
        <p className="px-1 font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">구성원별 기운</p>
        {energy.entries.map((e) => {
          const avatar = findFiveAvatar(e.avatarId ?? undefined)
          return (
            <div
              key={e.targetId}
              className="space-y-2.5 rounded-xl border border-gold-500/[0.18] bg-gold-500/[0.03] p-3"
            >
              <div className="flex items-center gap-2.5">
                {avatar ? (
                  <Image
                    src={avatar.src}
                    alt={avatar.label}
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                    style={{ backgroundColor: `${avatar.color}15`, border: `1px solid ${avatar.color}30` }}
                  />
                ) : (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-gold-500/20 bg-surface text-[13px]">
                    {e.targetId === 'self' ? '🪷' : '🕯️'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate font-serif text-[14px] font-bold text-ink-light">{e.name}</span>
                    <span className="shrink-0 text-[10px] text-ink-light/45">{e.relation}</span>
                  </div>
                  <p className="flex flex-wrap items-center gap-1 text-[10.5px] text-ink-light/50">
                    모자란 <ElementChip el={e.yongsin} /> 넉넉한 <ElementChip el={e.strongest} />
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
              <EnergyBars
                energy={e.energy}
                lacking={e.yongsin}
                strongest={e.strongest}
                showNumbers={showNumbers}
                height={38}
                unit="%"
              />
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
