'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, Lock } from 'lucide-react'
import { ELEMENTS, EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import type { Prescription, PrescriptionTeaser } from '@/lib/domain/circle/prescription'
import type { PrescriptionPayload } from '@/app/actions/circle/energy'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 기운 처방전 화면 — 다섯 블록(PRD-energy-circle §3-1).
 *
 * 값은 전부 서버가 정한 것이다(순수 함수 buildPrescription). 여기서는 그리기만 하고,
 * 「타고난/지금」 토글만 클라이언트 상태다(두 값을 다 받아 두었으므로 재조회 없음).
 *
 * 🔴 무료(teaser)는 ①·② 만 온다 — 나머지는 **서버가 잘라서** 보내지 않았다. 잠금 패널은
 *    «가려진 것»이 아니라 «없는 것»의 자리다. 숨긴 개수는 서버가 실제 배열에서 센 수다.
 */

const STORE_ITEMS_HREF = '/protected/store?tab=items'
const MEMBERSHIP_HREF = '/protected/store?tab=membership'

type Mode = 'now' | 'born'

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

function BlockLabel({ n, title }: { n: string; title: string }) {
  return (
    <p className="flex items-center gap-2 font-serif text-[11px] tracking-[0.18em] text-gold-500/70">
      <span className="text-[13px] text-gold-500">{n}</span>
      {title}
    </p>
  )
}

/** 신당 방·기운 지도의 「氣運 균형」 막대와 같은 언어 — 세 화면이 같은 것을 말하고 있어야 한다. */
function EnergyBars({
  energy,
  lacking,
  strongest,
}: {
  energy: Record<Element, number>
  lacking: Element
  strongest: Element
}) {
  return (
    <div className="flex gap-1.5">
      {ELEMENTS.map((el) => {
        const low = el === lacking
        const high = el === strongest
        return (
          <div key={el} className="flex-1 text-center">
            <div
              className={`relative h-[52px] overflow-hidden rounded-md bg-white/[0.05] border ${
                low
                  ? 'border-gold-500/55 shadow-[0_0_10px_rgba(201,168,76,0.15)]'
                  : high
                    ? 'border-white/[0.18]'
                    : 'border-white/[0.06]'
              }`}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-md transition-[height] duration-500"
                style={{ height: `${energy[el]}%`, background: EL_COLOR[el] }}
              />
            </div>
            <div className="mt-1 font-serif text-[12px] text-ink-primary/75">
              {EL_KO[el]} <span className="font-sans text-ink-light/45">{EL_LABEL[el]}</span>
            </div>
            <div className="text-[10px] tabular-nums text-ink-light/40">{energy[el]}</div>
            {low && <div className="text-[9.5px] font-serif text-gold-400">모자람</div>}
            {high && !low && <div className="text-[9.5px] font-serif text-ink-light/40">넉넉</div>}
          </div>
        )
      })}
    </div>
  )
}

function BlockOne({
  energyNow,
  energyBorn,
  lacking,
  strongest,
}: Pick<Prescription, 'energyNow' | 'energyBorn' | 'lacking' | 'strongest'>) {
  const [mode, setMode] = useState<Mode>('now')
  const energy = mode === 'born' && energyBorn ? energyBorn : energyNow

  const pick = (next: Mode) => {
    setMode(next)
    trackEvent({ action: 'prescription_toggle', category: 'engagement', label: next })
  }

  return (
    <section className="space-y-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4">
      <div className="flex items-center justify-between">
        <BlockLabel n="①" title="지금 기운" />
        <div className="inline-flex overflow-hidden rounded-md border border-white/10 text-[11px]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'now'}
            onClick={() => pick('now')}
            className={`px-2.5 py-1 font-serif ${mode === 'now' ? 'bg-gold-500/[0.14] text-gold-300' : 'text-ink-light/45'}`}
          >
            지금 기운
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'born'}
            disabled={!energyBorn}
            onClick={() => pick('born')}
            className={`px-2.5 py-1 font-serif disabled:opacity-30 ${mode === 'born' ? 'bg-gold-500/[0.14] text-gold-300' : 'text-ink-light/45'}`}
          >
            타고난 기운
          </button>
        </div>
      </div>
      <EnergyBars energy={energy} lacking={lacking} strongest={strongest} />
      <p className="text-[10.5px] leading-snug text-ink-light/45">
        {mode === 'now'
          ? '신당 살림·관상·손금까지 얹은 지금의 기운입니다. 모자란 자리는 이 값으로 정합니다.'
          : '사주에서 유도한 타고난 기운입니다. 살림을 놓기 전의 바탕이에요.'}
      </p>
    </section>
  )
}

function BlockTwo({ lacking, lore }: Pick<Prescription, 'lacking' | 'lore'>) {
  return (
    <section className="space-y-2.5 rounded-xl border border-white/10 bg-surface/30 p-4">
      <BlockLabel n="②" title="모자란 기운의 결" />
      <p className="flex flex-wrap items-center gap-2 font-serif text-[15px] font-bold text-ink-light">
        <ElementChip el={lacking} /> 기운이 옅으면
      </p>
      <p className="text-[13px] leading-relaxed text-ink-light/75" style={{ wordBreak: 'keep-all' }}>
        {lore.lacking}
      </p>
      <p className="text-[12px] leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
        채우면 <b className="font-serif text-gold-300">{lore.gains}</b>이 붙습니다.
      </p>
    </section>
  )
}

function LockedRest({ teaser }: { teaser: PrescriptionTeaser }) {
  return (
    <section className="space-y-3 rounded-xl border border-gold-500/40 bg-gradient-to-b from-gold-500/[0.1] to-transparent p-4">
      <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-light">
        <Lock className="h-3.5 w-3.5 text-gold-400" />
        나머지 세 블록은 멤버십이 엽니다
      </p>
      <ul className="space-y-1 text-[12px] text-ink-light/70">
        <li>③ {label(teaser.lacking)} 기운을 채워 주는 기운과 그 이유 — 직접·낳아 주는 기운·사람</li>
        <li>④ 곁에 둘 것 — 신당 살림·책상 위 한 가지·선물 셋·생활 처방</li>
        <li>⑤ 덜어낼 것</li>
      </ul>
      <p className="text-[11px] text-ink-light/45">
        지금 숨겨진 항목 <b className="font-serif text-gold-300 tabular-nums">{teaser.hiddenCount}</b>가지
      </p>
      <Link
        href={MEMBERSHIP_HREF}
        onClick={() =>
          trackEvent({ action: 'prescription_upsell_click', category: 'conversion', label: teaser.lacking })
        }
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gold-500/50 bg-gold-500/[0.14] py-2.5 font-serif text-[13px] font-bold text-gold-200 hover:bg-gold-500/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
      >
        멤버십으로 처방전 전부 열기 <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <ul className="space-y-0.5 text-[10.5px] text-ink-light/40">
        {GENERIC_MEMBERSHIP_BENEFIT_LINES.map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
    </section>
  )
}

function BlockThree({
  fillers,
  mansikNote,
  sideNote,
  caution,
}: Pick<Prescription, 'fillers' | 'mansikNote' | 'sideNote' | 'caution'>) {
  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-surface/30 p-4">
      <BlockLabel n="③" title="채워 주는 기운과 그 이유" />
      <ul className="space-y-3">
        {fillers.map((f) => (
          <li key={f.kind} className="grid grid-cols-[52px_1fr] gap-x-3">
            <span className="font-serif text-[12px] font-bold text-gold-300">
              {f.kind === 'direct' ? '직접' : f.kind === 'mother' ? '낳아줌' : '사람'}
            </span>
            <div>
              <p className="flex flex-wrap items-center gap-1.5 font-serif text-[13px] font-bold text-ink-light">
                <ElementChip el={f.element} /> {f.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
                {f.reason}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {(mansikNote || sideNote || caution) && (
        <div className="space-y-1 border-t border-white/[0.06] pt-2.5 text-[11px] leading-relaxed text-ink-light/50">
          {mansikNote && <p style={{ wordBreak: 'keep-all' }}>{mansikNote}</p>}
          {sideNote && <p style={{ wordBreak: 'keep-all' }}>{sideNote}</p>}
          {caution && (
            <p className="text-amber-300/70" style={{ wordBreak: 'keep-all' }}>
              {caution}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function BlockFour({ items, lacking }: Pick<Prescription, 'items' | 'lacking'>) {
  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-surface/30 p-4">
      <BlockLabel n="④" title="곁에 둘 것 — 세 층" />

      <div className="space-y-2">
        <p className="font-serif text-[11px] tracking-[0.14em] text-gold-500/60">신당 살림</p>
        {items.shrine.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {items.shrine.map((s) => (
              <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-center">
                {s.spriteUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.spriteUrl} alt="" className="mx-auto h-10 w-10 object-contain" loading="lazy" />
                ) : (
                  <span className="block text-[22px] leading-10">{s.emoji}</span>
                )}
                <p className="mt-1 truncate font-serif text-[11.5px] text-ink-light">{s.name}</p>
                <p className="text-[10px] tabular-nums text-ink-light/45">
                  {EL_KO[s.element]} +{s.energyPower}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11.5px] text-ink-light/45">{label(lacking)} 기운의 살림이 아직 상점에 없습니다.</p>
        )}
        <Link
          href={STORE_ITEMS_HREF}
          onClick={() => trackEvent({ action: 'prescription_shrine_cta', category: 'engagement', label: lacking })}
          className="inline-flex items-center gap-1 font-serif text-[11.5px] font-bold text-gold-400"
        >
          {EL_KO[lacking]} 기운 살림 신당에 놓기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-1.5">
        <p className="font-serif text-[11px] tracking-[0.14em] text-gold-500/60">실물</p>
        <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-ink-light/45">책상 위</dt>
          <dd className="text-ink-light/85">{items.real.desk}</dd>
          <dt className="text-ink-light/45">집 안</dt>
          <dd className="text-ink-light/85">{items.real.home}</dd>
          <dt className="text-ink-light/45">선물 셋</dt>
          <dd className="text-ink-light/85">{items.real.gifts.join(' · ')}</dd>
        </dl>
      </div>

      <div className="space-y-1.5">
        <p className="font-serif text-[11px] tracking-[0.14em] text-gold-500/60">생활</p>
        <ul className="space-y-2">
          {items.life.map((l) => (
            <li key={l.label} className="text-[12px]">
              <span className="font-serif text-ink-light/50">{l.label}</span>
              <span className="mx-1.5 text-ink-light/25">·</span>
              <span className="text-ink-light/85">{l.value}</span>
              <p className="text-[11px] leading-snug text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
                {l.action}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function BlockFive({ avoid }: Pick<Prescription, 'avoid'>) {
  return (
    <section className="space-y-2.5 rounded-xl border border-seal/30 bg-seal/[0.05] p-4">
      <BlockLabel n="⑤" title="덜어낼 것" />
      <p className="flex flex-wrap items-center gap-2 font-serif text-[13px] font-bold text-ink-light">
        <ElementChip el={avoid.element} /> 기운은 지금 더 채우지 않아도 됩니다
      </p>
      <ul className="space-y-1.5">
        {avoid.items.map((a) => (
          <li key={a.label} className="text-[12px]">
            <span className="font-serif text-ink-light/50">{a.label}</span>
            <span className="mx-1.5 text-ink-light/25">·</span>
            <span className="text-ink-light/85">{a.value}</span>
            <p className="text-[11px] leading-snug text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
              {a.action}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PrescriptionView({
  payload,
  backHref,
  backLabel,
}: {
  payload: PrescriptionPayload
  backHref: string
  backLabel: string
}) {
  const viewed = useRef(false)
  const head = payload.access === 'full' ? payload.prescription : payload.teaser

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackEvent({ action: 'prescription_view', category: 'engagement', label: payload.access })
  }, [payload.access])

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-3 py-6 pb-28">
      <div className="mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-light/50 hover:text-gold-300"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>

      <header className="mb-5 space-y-1.5 text-center">
        <p className="font-serif text-[10px] tracking-[0.5em] text-gold-500/50">氣運 處方</p>
        <h1 className="font-serif text-2xl font-bold text-ink-light">
          {head.name}님의 <span className="text-gold-500">기운 처방전</span>
        </h1>
        <p className="text-sm text-ink-light/50">
          모자란 <b className="font-serif text-ink-light/80">{label(head.lacking)}</b> 기운을 무엇으로, 왜 채우는지
        </p>
      </header>

      <div className="space-y-4">
        <BlockOne
          energyNow={head.energyNow}
          energyBorn={head.energyBorn}
          lacking={head.lacking}
          strongest={head.strongest}
        />
        <BlockTwo lacking={head.lacking} lore={head.lore} />
        {payload.access === 'full' ? (
          <>
            <BlockThree
              fillers={payload.prescription.fillers}
              mansikNote={payload.prescription.mansikNote}
              sideNote={payload.prescription.sideNote}
              caution={payload.prescription.caution}
            />
            <BlockFour items={payload.prescription.items} lacking={payload.prescription.lacking} />
            <BlockFive avoid={payload.prescription.avoid} />
          </>
        ) : (
          <LockedRest teaser={payload.teaser} />
        )}
      </div>

      <p className="mt-6 px-2 text-center text-[10px] leading-relaxed text-ink-light/35">
        재미로 즐기는 전통 풀이입니다. 의학적·심리적·재무적 조언을 대신하지 않습니다.
      </p>
    </div>
  )
}
