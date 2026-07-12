'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Deity, DeityCatalog } from '@/app/actions/shrine/deities'
import { autoSeatGuardian, seatDeity, purchaseDeity } from '@/app/actions/shrine/deities'
import { BOND_LEVEL_NAMES, BOND_THRESHOLDS, type BondProgress } from '@/lib/domain/shrine/deities'

const ELEMENT_GLYPH: Record<string, string> = {
  wood: '🌿',
  fire: '🔥',
  earth: '⛰️',
  metal: '⚔️',
  water: '💧',
  all: '✨',
}
const TIERS = [1, 2, 3, 4] as const

/** 에셋(스프라이트) 없이 aura 색상 + 오행 글리프로 신위를 표현하는 폴백 메달리온. */
function DeityMedallion({ deity, size }: { deity: Deity; size: number }) {
  const accent = deity.aura.accent ?? '#C9A84C'
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 38%, ${accent}66, ${accent}18 62%, transparent 78%)`,
        boxShadow: `0 0 ${size / 3}px ${accent}55, inset 0 0 ${size / 5}px ${accent}44`,
      }}
    >
      <div className="absolute inset-[10%] rounded-full border" style={{ borderColor: `${accent}66` }} />
      <span style={{ fontSize: size * 0.4, lineHeight: 1 }}>{ELEMENT_GLYPH[deity.element] ?? '神'}</span>
    </div>
  )
}

function BondBar({ progress }: { progress: BondProgress }) {
  const lower = BOND_THRESHOLDS[progress.level - 1] ?? 0
  const upper = progress.nextThreshold
  const ratio = upper === null ? 1 : Math.max(0, Math.min(1, (progress.points - lower) / Math.max(1, upper - lower)))
  const shown = upper === null ? 100 : Math.max(4, Math.round(ratio * 100))
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between text-[10px] font-serif">
        <span className="text-gold-300">緣 {BOND_LEVEL_NAMES[progress.level]}</span>
        <span className="text-ink-primary/40">{upper === null ? '지음(만연)' : `다음까지 ${progress.toNext}`}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-ink-primary/10 overflow-hidden">
        <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${shown}%` }} />
      </div>
    </div>
  )
}

interface Props {
  catalog: DeityCatalog
  bonds: Array<{ deityId: string; progress: BondProgress }>
}

export function DeityPantheon({ catalog, bonds }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [reveal, setReveal] = useState<Deity | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const bondMap = new Map(bonds.map((b) => [b.deityId, b.progress]))
  const seated = catalog.deities.find((d) => d.id === catalog.seatedDeityId) ?? null
  const ownedCodes = new Set(catalog.ownedCodes)

  function onAutoSeat() {
    setErr(null)
    start(async () => {
      const r = await autoSeatGuardian()
      if (!r.success) {
        setErr('좌정에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      const d = catalog.deities.find((x) => x.code === r.deityCode)
      if (d) setReveal(d)
      router.refresh()
    })
  }

  function onSeat(id: string) {
    setErr(null)
    start(async () => {
      const r = await seatDeity(id)
      if (r.success) router.refresh()
      else setErr('좌정 변경에 실패했습니다.')
    })
  }

  function onPurchase(deity: Deity) {
    setErr(null)
    start(async () => {
      const r = await purchaseDeity(deity.code)
      if (r.success) {
        setReveal(deity)
        router.refresh()
      } else {
        setErr(r.error === 'INSUFFICIENT_BOKCHAE' ? '복채가 부족합니다.' : '봉안에 실패했습니다.')
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="text-center space-y-1.5 mb-6">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">神 位</p>
        <h1 className="text-2xl font-serif font-bold text-ink-light">신위 · 판테온</h1>
        <p className="text-sm text-ink-light/50 font-sans">
          고민과 사주 용신으로 맺어진 수호신을 좌정하고, 인연을 쌓으세요
        </p>
      </header>

      {/* 제단 — 主神 */}
      <section className="rounded-2xl border border-gold-500/20 bg-gold-500/[0.04] p-6 mb-8 text-center">
        {seated ? (
          <div className="flex flex-col items-center">
            <div className="deity-breathe">
              <DeityMedallion deity={seated} size={132} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-seal/15 text-seal font-serif">主神</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-300 font-serif">
                {seated.tierName}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-serif font-bold text-ink-light">
              {seated.name}
              {seated.nameHanja ? <span className="text-ink-light/40 text-sm ml-1">{seated.nameHanja}</span> : null}
            </h2>
            <p className="text-xs text-ink-light/50 mt-1">{seated.domains.join(' · ')}</p>
            {(() => {
              const p = bondMap.get(seated.id)
              return p ? (
                <div className="w-52 mt-3">
                  <BondBar progress={p} />
                </div>
              ) : null
            })()}
          </div>
        ) : (
          <div className="py-4">
            <div className="text-4xl mb-3">🕯️</div>
            <p className="text-sm text-ink-light/70 font-serif mb-4">아직 좌정한 수호신이 없습니다.</p>
            <button
              onClick={onAutoSeat}
              disabled={pending}
              className="px-6 py-2.5 rounded-full bg-seal text-white font-serif text-sm shadow-lg shadow-seal/20 disabled:opacity-60 transition active:scale-95"
            >
              {pending ? '좌정 중…' : '수호신 좌정하기'}
            </button>
            <p className="text-[11px] text-ink-light/40 mt-3">사주 용신 · 관심사로 자동 배정됩니다 (무료)</p>
          </div>
        )}
        {err ? <p className="text-xs text-seal mt-3">{err}</p> : null}
      </section>

      {/* 판테온 — 등급별 */}
      {TIERS.map((tier) => {
        const list = catalog.deities.filter((d) => d.tier === tier)
        if (list.length === 0) return null
        const tierName = list[0]?.tierName ?? ''
        return (
          <section key={tier} className="mb-6">
            <h3 className="text-xs font-serif text-gold-500/70 tracking-wider mb-2.5 uppercase">
              {tierName}
              {tier > 1 ? (
                <span className="text-ink-light/30 ml-2 normal-case">유료</span>
              ) : (
                <span className="text-success/70 ml-2 normal-case">무료 좌정</span>
              )}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {list.map((d) => {
                const owned = ownedCodes.has(d.code)
                const isSeated = d.id === catalog.seatedDeityId
                return (
                  <div
                    key={d.id}
                    className={`relative rounded-xl border p-3 flex flex-col items-center text-center transition ${
                      isSeated ? 'border-seal/50 bg-seal/[0.06]' : 'border-gold-500/15 bg-ink-primary/[0.02]'
                    }`}
                  >
                    <div className={owned ? '' : 'opacity-45 grayscale'}>
                      <DeityMedallion deity={d} size={56} />
                    </div>
                    <div className="mt-2 text-[13px] font-serif font-bold text-ink-light leading-tight">{d.name}</div>
                    <div className="text-[10px] text-ink-light/40">{d.domains[0]}</div>

                    {isSeated ? (
                      <span className="mt-1.5 text-[10px] text-seal font-serif">主神 좌정중</span>
                    ) : owned ? (
                      <button
                        onClick={() => onSeat(d.id)}
                        disabled={pending}
                        className="mt-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gold-500/15 text-gold-300 disabled:opacity-50"
                      >
                        좌정
                      </button>
                    ) : d.tier === 1 ? (
                      <span className="mt-1.5 text-[10px] text-ink-light/35">배정 대기</span>
                    ) : (
                      <button
                        onClick={() => onPurchase(d)}
                        disabled={pending}
                        className="mt-1.5 text-[11px] px-2.5 py-1 rounded-full bg-seal/15 text-seal disabled:opacity-50"
                      >
                        봉안 · {d.priceBokchae}복채
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* 좌정 연출 (강신 lite) */}
      {reveal ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6 cursor-pointer"
          onClick={() => setReveal(null)}
        >
          <div className="deity-descend">
            <DeityMedallion deity={reveal} size={180} />
          </div>
          <p className="mt-6 text-[11px] tracking-[0.4em] text-gold-500/60 font-serif">降 神</p>
          <h2 className="mt-1 text-2xl font-serif font-bold text-ink-light">{reveal.name}</h2>
          <p className="text-sm text-ink-light/60 mt-1 font-serif">
            「{reveal.domains.join(' · ')}」의 신위가 좌정하였습니다
          </p>
          <button className="mt-6 text-xs text-ink-light/50 underline underline-offset-4">닫기</button>
        </div>
      ) : null}

      <style>{`
        @keyframes deity-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.016); } }
        @keyframes deity-descend { 0% { opacity:0; transform: translateY(-28px) scale(.9); filter: brightness(2.2); } 100% { opacity:1; transform: translateY(0) scale(1); filter: brightness(1); } }
        .deity-breathe { animation: deity-breathe 4s ease-in-out infinite; }
        .deity-descend { animation: deity-descend 1.2s ease-out; }
        @media (prefers-reduced-motion: reduce) { .deity-breathe, .deity-descend { animation: none !important; } }
      `}</style>
    </div>
  )
}
