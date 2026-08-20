'use client'

import { useCallback, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { autoSeatGuardian, seatDeity, purchaseDeity, type Deity, type DeityCatalog } from '@/app/actions/shrine/deities'
import { BOND_LEVEL_NAMES, BOND_THRESHOLDS, type BondProgress } from '@/lib/domain/shrine/deities'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'
import { DeityMedallion } from './DeityMedallion'
import { GangshinOverlay } from './GangshinOverlay'

const TIERS = [1, 2, 3, 4] as const

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
  /** 점사 대상 가족 (null/생략=본인 신당) — 좌정·인연이 이 신당 스코프로 적용 */
  familyMemberId?: string | null
  /**
   * 모아보기(/protected/shrine/collection) 안의 한 탭으로 그릴 때 true.
   * 그 화면이 이미 「신당으로」를 들고 있어 여기까지 그리면 뒤로가기가 두 개가 된다.
   * 제목(신위전)은 그대로 둔다 — 탭 안에서 지금 무엇을 보고 있는지 알려 주는 유일한 표지다.
   */
  hideBackLink?: boolean
}

/** 연출 모드 — 강신(降神)=실제 좌정 시점, 봉안(奉安)=구매 완료(좌정 CTA 제공) */
type RevealState = { deity: Deity; mode: 'gangshin' | 'bongan' } | null

export function DeityPantheon({ catalog, bonds, familyMemberId, hideBackLink = false }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [reveal, setReveal] = useState<RevealState>(null)
  const [err, setErr] = useState<string | null>(null)
  const { play } = useShrineAudio()

  const fmId = familyMemberId ?? null
  const shrineHref = fmId ? `/protected/shrine?member=${fmId}` : '/protected/shrine'
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
      const r = await autoSeatGuardian(fmId)
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
      const r = await seatDeity(deity.id, fmId)
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
      {!hideBackLink && (
        <Link
          href={shrineHref}
          className="inline-flex items-center gap-1 text-[12px] text-ink-light/50 hover:text-gold-300 font-serif mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          신당으로
        </Link>
      )}
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
            <h3 className="text-caption font-semibold font-serif text-gold-500/70 tracking-wider mb-2.5 uppercase">
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
                        봉안 · 복채 {d.priceBokchae}만냥
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
        <GangshinOverlay
          deity={reveal.deity}
          mode={reveal.mode}
          pending={pending}
          backgroundVideoId="summon-ritual"
          onClose={() => setReveal(null)}
          onSeatNow={(d) => {
            setReveal(null)
            onSeat(d)
          }}
        />
      ) : null}

      <style>{`
        @keyframes deity-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.016); } }
        .deity-breathe { animation: deity-breathe 4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
