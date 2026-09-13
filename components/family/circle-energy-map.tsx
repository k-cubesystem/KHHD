'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, Printer, Users } from 'lucide-react'
import { ElementRadar, RADAR_AVERAGE_COLOR } from '@/components/family/element-radar'
import { TogetherPanel } from '@/components/family/together-panel'
import { TargetSelect, type TargetOption } from '@/components/destiny/target-select'
import { ELEMENTS, EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { highestElement } from '@/lib/domain/shrine/energy-map'
import { NODE_MAP } from '@/lib/data/saju-knowledge-graph'
import { CIRCLE_KIND_META } from '@/lib/domain/circle/circle'
import type { ElementNeeds } from '@/lib/domain/circle/element-lore'
import type { CircleEnergy } from '@/lib/domain/circle/team-energy'
import type { CircleEnergyPayload } from '@/app/actions/circle/energy'
import type { RecentTogether } from '@/app/actions/circle/narrative'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 기운 지도 v3 (CEO 2026-09-13):
 *  - 「오행이란?」 접이식 설명을 다시 위에.
 *  - 겹친 오각형은 없앴다 — 드롭다운으로 **한 사람씩** 본다(복잡해서 뭔지 모르겠다).
 *  - 「서로의 관계」 무료 목록은 없앴다 — 서로의 오행은 **복채 AI**(둘·셋·넷 함께 보기)가 장점·단점·필요한 것으로 풀어 쓴다.
 *  - 그룹 전체 AI 풀이는 함께 보기에 합쳤다(문 하나). 필요한 물건은 쿠팡 링크와 함께.
 *
 * 🔴 수치·점수 없음 — 직장 그룹의 밴드 규율을 전 화면이 그대로 따른다.
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

function prescriptionHref(targetId: string): string {
  return targetId === 'self' ? '/protected/prescription' : `/protected/prescription?target=${targetId}`
}

/** 오행이 무엇인지 처음 보는 사람을 위한 접이식 설명 — saju-knowledge-graph 오행 노드 재사용(v1 에 있던 것, CEO 요청으로 복원). */
function ElementPrimer() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-surface/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-serif text-[12.5px] text-ink-light/80">
          <span className="text-gold-400">☯</span> 오행(五行)이란?
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-light/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/5 px-4 pb-4 pt-1">
          <p className="text-[11px] leading-relaxed text-ink-light/50">
            세상의 기운을 나무·불·흙·쇠·물 다섯으로 나눈 것이에요. 서로 살리고(相生) 누르며(相剋) 균형을 이룹니다.
            타고난 여덟 글자에서 옅은 기운이 «채울 것», 넉넉한 기운이 «나눠 줄 것»입니다.
          </p>
          {ELEMENTS.map((el) => {
            const node = NODE_MAP.get(EL_KO[el])
            return (
              <div key={el} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md font-serif text-[12px]"
                  style={{
                    background: `${EL_COLOR[el]}22`,
                    color: EL_COLOR[el],
                    border: `1px solid ${EL_COLOR[el]}55`,
                  }}
                >
                  {EL_KO[el]}
                </span>
                <p className="text-[11px] leading-snug text-ink-light/60">
                  <b className="font-serif text-ink-light/80">{EL_LABEL[el]}</b> · {node?.description}
                  {node?.detail ? <span className="text-ink-light/40"> — {node.detail}</span> : null}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** 한 사람의 오각형 — 드롭다운(사람 고르기 단일 출처 TargetSelect)으로 바꿔 본다. */
function PersonSection({ energy }: { energy: CircleEnergy }) {
  const [id, setId] = useState<string>(() => energy.entries[0]?.targetId ?? 'self')
  const person = energy.entries.find((e) => e.targetId === id) ?? energy.entries[0]
  const targets: TargetOption[] = energy.entries.map((e) => ({
    id: e.targetId,
    name: e.name,
    relation: e.relation,
    avatarId: e.avatarId,
  }))
  if (!person) return null

  return (
    <section className="mb-5 space-y-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4">
      <TargetSelect
        label="누구의 기운을 볼까요"
        targets={targets}
        value={person.targetId}
        onChange={(next) => {
          setId(next)
          trackEvent({
            action: 'circle_map_person',
            category: 'engagement',
            label: next === 'self' ? 'self' : 'member',
          })
        }}
      />
      <ElementRadar
        series={[
          { id: person.targetId, name: person.name, share: person.energy, color: RADAR_AVERAGE_COLOR, fill: true },
        ]}
        size={240}
        legend={false}
      />
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-ink-light/70">
        옅은 <ElementChip el={person.yongsin} /> 넉넉한 <ElementChip el={person.strongest} />
      </p>
      <p className="text-center text-[10.5px] text-ink-light/40">
        점선 고리가 고른 기운입니다. 안으로 들어간 꼭짓점이 옅은 기운.
      </p>
      <Link
        href={prescriptionHref(person.targetId)}
        aria-label={`${person.name} 기운 처방전 열기`}
        onClick={() => trackEvent({ action: 'circle_map_prescription', category: 'engagement', label: person.yongsin })}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/[0.1] py-2.5 font-serif text-[12.5px] font-bold text-gold-200 hover:bg-gold-500/20"
      >
        {person.name}님의 기운 처방전 — 옅은 {EL_KO[person.yongsin]} 기운을 무엇으로 채울지
      </Link>
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
      <p className="text-[11px] leading-snug text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
        누가 누구를 채우고 어디서 부딪히는지는 아래 AI 풀이가 사람을 골라 풀어 씁니다.
      </p>
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

export function CircleEnergyMapView({
  payload,
  sheet = 'hidden',
  recentTogether = [],
  needs,
  shopLinks = {},
}: {
  payload: CircleEnergyPayload
  /** 「기운 한 장」 문 — BUSINESS 은 인쇄 링크, 다른 유료 티어는 업셀 한 줄, 숨김. */
  sheet?: 'print' | 'upsell' | 'hidden'
  /** 최근 본 함께 보기 조합(30일 안) — 이 화면의 사람들로만 이루어진 것이 걸러져 보인다. */
  recentTogether?: readonly RecentTogether[]
  /** 다섯 기운의 물건·자리(서버 계산). */
  needs: Record<Element, ElementNeeds>
  /** 물건 이름 → 쿠팡 파트너스 링크. */
  shopLinks?: Record<string, string>
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
          <Users className="h-3.5 w-3.5" /> {energy.entries.length}명 · 한 사람씩 보고, 서로의 기운은 AI 로
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

      <ElementPrimer />
      <PersonSection energy={energy} />
      <FactsSection energy={energy} />

      <div className="mb-5">
        <TogetherPanel
          kind={circle.kind}
          people={energy.entries.map((e) => ({
            targetId: e.targetId,
            name: e.name,
            relation: e.relation,
            energy: e.energy,
            yongsin: e.yongsin,
            strongest: e.strongest,
          }))}
          recent={recentTogether}
          needs={needs}
          shopLinks={shopLinks}
        />
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

      <p className="mt-6 px-2 text-center text-[10px] leading-relaxed text-ink-light/35">
        재미로 즐기는 전통 풀이입니다. 의학적·심리적·재무적 조언을 대신하지 않습니다.
      </p>
    </div>
  )
}
