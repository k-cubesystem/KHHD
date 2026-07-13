'use client'

import { useCallback, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, X } from 'lucide-react'
import type { Deity, DeityCatalog } from '@/app/actions/shrine/deities'
import { autoSeatGuardian, seatDeity, purchaseDeity } from '@/app/actions/shrine/deities'
import { BOND_LEVEL_NAMES, BOND_THRESHOLDS, type BondProgress } from '@/lib/domain/shrine/deities'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'

const ELEMENT_GLYPH: Record<string, string> = {
  wood: '🌿',
  fire: '🔥',
  earth: '⛰️',
  metal: '⚔️',
  water: '💧',
  all: '✨',
}
const TIERS = [1, 2, 3, 4] as const

/** 신위 원형 초상 — 초상/스프라이트가 있으면 이미지, 없으면 aura 색상 + 오행 상징 폴백. */
function DeityMedallion({ deity, size }: { deity: Deity; size: number }) {
  const accent = deity.aura.accent ?? '#C9A84C'
  const img = deity.portraitUrl ?? deity.spriteUrl
  return (
    <div
      className="relative flex items-center justify-center rounded-full overflow-hidden"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 38%, ${accent}66, ${accent}18 62%, transparent 78%)`,
        boxShadow: `0 0 ${size / 3}px ${accent}55, inset 0 0 ${size / 5}px ${accent}44`,
      }}
    >
      <div className="absolute inset-[10%] rounded-full border z-[1]" style={{ borderColor: `${accent}66` }} />
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={deity.name}
          className="absolute inset-0 w-full h-full object-contain p-[6%]"
          style={{ filter: `drop-shadow(0 ${size / 22}px ${size / 14}px rgba(0,0,0,0.35))` }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/shrine/elements/${deity.element}.webp`}
          alt=""
          style={{ width: size * 0.62, height: size * 0.62, objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.outerHTML = `<span style="font-size:${size * 0.4}px;line-height:1">${ELEMENT_GLYPH[deity.element] ?? '神'}</span>`
          }}
          draggable={false}
        />
      )}
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

/** 연출 모드 — 강신(降神)=실제 좌정 시점, 봉안(奉安)=구매 완료(좌정 CTA 제공) */
type RevealState = { deity: Deity; mode: 'gangshin' | 'bongan' } | null

export function DeityPantheon({ catalog, bonds }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [reveal, setReveal] = useState<RevealState>(null)
  const [err, setErr] = useState<string | null>(null)
  const { play } = useShrineAudio()

  const bondMap = new Map(bonds.map((b) => [b.deityId, b.progress]))
  const seated = catalog.deities.find((d) => d.id === catalog.seatedDeityId) ?? null
  const ownedCodes = new Set(catalog.ownedCodes)

  // 강신 의식 사운드 — 방울(bell) 점화 후 신위 강림 타이밍에 바라(bara)
  const playGangshinSound = useCallback(() => {
    play('bell')
    window.setTimeout(() => play('bara'), 800)
  }, [play])

  function onAutoSeat() {
    setErr(null)
    start(async () => {
      const r = await autoSeatGuardian()
      if (!r.success) {
        setErr('좌정에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      const d = catalog.deities.find((x) => x.code === r.deityCode)
      if (d) {
        setReveal({ deity: d, mode: 'gangshin' })
        playGangshinSound()
      }
      router.refresh()
    })
  }

  function onSeat(deity: Deity) {
    setErr(null)
    start(async () => {
      const r = await seatDeity(deity.id)
      if (r.success) {
        setReveal({ deity, mode: 'gangshin' })
        playGangshinSound()
        router.refresh()
      } else {
        setErr('좌정 변경에 실패했습니다.')
      }
    })
  }

  function onPurchase(deity: Deity) {
    setErr(null)
    start(async () => {
      const r = await purchaseDeity(deity.code)
      if (r.success) {
        setReveal({ deity, mode: 'bongan' })
        play('chime')
        router.refresh()
      } else {
        setErr(r.error === 'INSUFFICIENT_BOKCHAE' ? '복채가 부족합니다.' : '봉안에 실패했습니다.')
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/protected/shrine"
        className="inline-flex items-center gap-1 text-[12px] text-ink-light/50 hover:text-gold-300 font-serif mb-3"
      >
        <ChevronLeft className="w-4 h-4" />
        신당으로
      </Link>
      <header className="text-center space-y-1.5 mb-6">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">神 位</p>
        <h1 className="text-2xl font-serif font-bold text-ink-light">신위전(神位殿)</h1>
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

      {/* 신위전 — 등급별 */}
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
                const locked = !owned && d.tier > 1
                return (
                  <div
                    key={d.id}
                    className={`relative rounded-xl border p-3 flex flex-col items-center text-center transition ${
                      isSeated ? 'border-seal/50 bg-seal/[0.06]' : 'border-gold-500/15 bg-ink-primary/[0.02]'
                    }`}
                  >
                    {/* 잠금 신위: 색은 살려 「설빛온기」 매력을 보이되(그레이스케일 제거), 잠금 배지 오버레이 */}
                    <div className={`relative ${owned ? '' : locked ? 'opacity-80' : 'opacity-40 grayscale'}`}>
                      <DeityMedallion deity={d} size={56} />
                      {locked && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full grid place-items-center text-[9px] bg-ink-primary/80 border border-gold-500/40 text-gold-300"
                          aria-hidden
                        >
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-[13px] font-serif font-bold text-ink-light leading-tight">{d.name}</div>
                    <div className="text-[10px] text-ink-light/40">{d.domains[0]}</div>
                    {locked && (
                      <p className="mt-1 text-[9.5px] text-gold-300/55 font-serif leading-tight">
                        「{d.domains.join(' · ')}」의 {d.tierName}
                      </p>
                    )}

                    {isSeated ? (
                      <span className="mt-1.5 text-[10px] text-seal font-serif">主神 좌정중</span>
                    ) : owned ? (
                      <button
                        onClick={() => onSeat(d)}
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

      {/* 연출 오버레이 — 강신(降神, 좌정) / 봉안(奉安, 구매) */}
      {reveal ? (
        <div
          className="gangshin-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 cursor-pointer overflow-hidden"
          style={{ background: 'radial-gradient(circle at 50% 44%, #1a140a, #000 70%)' }}
          onClick={() => setReveal(null)}
        >
          {/* 스킵 — 시퀀스 시작부터 즉시 노출 */}
          <button
            aria-label="연출 건너뛰기"
            onClick={(e) => {
              e.stopPropagation()
              setReveal(null)
            }}
            className="absolute top-5 right-5 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full border border-ink-light/15 text-[11px] text-ink-light/50 hover:text-ink-light/80 transition"
          >
            건너뛰기 <X className="w-3.5 h-3.5" />
          </button>

          {/* 아우라 링 (확산 파티클) */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="gangshin-ring absolute rounded-full"
              style={{
                borderColor: reveal.deity.aura.accent ?? '#c9a84c',
                animationDelay: `${0.4 + i * 0.55}s`,
              }}
            />
          ))}
          {/* 강림 발광 */}
          <div
            className="gangshin-glow absolute rounded-full"
            style={{ background: reveal.deity.aura.accent ?? '#c9a84c' }}
          />

          <div className="gangshin-deity relative deity-breathe">
            <DeityMedallion deity={reveal.deity} size={188} />
          </div>
          <p className="gangshin-t1 mt-6 text-[11px] tracking-[0.55em] text-gold-500/70 font-serif">
            {reveal.mode === 'gangshin' ? '降 神' : '奉 安'}
          </p>
          <h2 className="gangshin-t2 mt-1 text-2xl font-serif font-bold text-ink-light">
            {reveal.deity.name}
            {reveal.deity.nameHanja ? (
              <span className="text-ink-light/40 text-base ml-1">{reveal.deity.nameHanja}</span>
            ) : null}
          </h2>
          <p className="gangshin-t3 text-sm text-ink-light/60 mt-1 font-serif">
            {reveal.mode === 'gangshin'
              ? `「${reveal.deity.domains.join(' · ')}」의 신위가 좌정하였습니다`
              : `「${reveal.deity.domains.join(' · ')}」의 신위를 봉안하였습니다`}
          </p>
          {reveal.mode === 'gangshin' ? (
            <p className="gangshin-t4 mt-4 text-[13px] text-gold-200/85 font-serif italic max-w-xs text-center leading-relaxed">
              “{reveal.deity.domains[0]}, 이제 내가 그대와 함께하리라.”
            </p>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const d = reveal.deity
                setReveal(null)
                onSeat(d)
              }}
              disabled={pending}
              className="gangshin-t4 mt-5 px-6 py-2.5 rounded-full bg-seal text-white font-serif text-sm shadow-lg shadow-seal/20 disabled:opacity-60 transition active:scale-95"
            >
              지금 主神으로 좌정하기
            </button>
          )}
          <button className="gangshin-t4 mt-6 text-xs text-ink-light/45 underline underline-offset-4">닫기</button>
        </div>
      ) : null}

      <style>{`
        @keyframes deity-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.016); } }
        .deity-breathe { animation: deity-breathe 4s ease-in-out infinite; }
        /* 강신 의식 시퀀스 */
        .gangshin-overlay { animation: gangshin-fade 0.5s ease-out; }
        @keyframes gangshin-fade { from { opacity: 0; } to { opacity: 1; } }
        .gangshin-ring {
          width: 60px; height: 60px; top: 44%; border-width: 1.5px; border-style: solid; opacity: 0;
          transform: translateY(-50%); animation: gangshin-ring 2.4s ease-out infinite;
        }
        @keyframes gangshin-ring {
          0% { width: 40px; height: 40px; opacity: 0.7; }
          100% { width: 460px; height: 460px; opacity: 0; }
        }
        .gangshin-glow {
          width: 260px; height: 260px; top: 44%; transform: translateY(-50%);
          filter: blur(60px); opacity: 0; animation: gangshin-glow 3s ease-out forwards;
        }
        @keyframes gangshin-glow { 0% { opacity: 0; } 30% { opacity: 0.4; } 100% { opacity: 0.18; } }
        .gangshin-deity { opacity: 0; animation: gangshin-descend 1.6s cubic-bezier(0.16,1,0.3,1) 0.6s forwards; }
        @keyframes gangshin-descend {
          0% { opacity: 0; transform: translateY(-40px) scale(0.82); filter: brightness(3) blur(6px); }
          60% { opacity: 1; filter: brightness(1.4) blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1); }
        }
        .gangshin-t1 { opacity: 0; animation: gangshin-rise 0.7s ease-out 1.9s forwards; }
        .gangshin-t2 { opacity: 0; animation: gangshin-rise 0.7s ease-out 2.3s forwards; }
        .gangshin-t3 { opacity: 0; animation: gangshin-rise 0.7s ease-out 2.8s forwards; }
        .gangshin-t4 { opacity: 0; animation: gangshin-rise 0.9s ease-out 3.5s forwards; }
        @keyframes gangshin-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .deity-breathe, .gangshin-overlay, .gangshin-ring, .gangshin-glow, .gangshin-deity,
          .gangshin-t1, .gangshin-t2, .gangshin-t3, .gangshin-t4 { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  )
}
