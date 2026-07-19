'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ThemePack } from '@/lib/domain/shrine/types'
import { purchaseThemePack } from '@/app/actions/shrine/deities'
import { EL_KO, EL_COLOR } from '@/lib/domain/shrine/energy'

/** 상점 신당 테마 탭 — 그라디언트 프리뷰 + 복채 구매. 적용은 신당 테마칩에서. */
export function ThemeShopGrid({ themes }: { themes: ThemePack[] }) {
  const t = useTranslations('store')
  const [ownedExtra, setOwnedExtra] = useState<Set<string>>(new Set())
  const [loadingCode, setLoadingCode] = useState<string | null>(null)

  const buy = async (pack: ThemePack) => {
    setLoadingCode(pack.code)
    const res = await purchaseThemePack(pack.code)
    setLoadingCode(null)
    if (res.success || res.error === 'ALREADY_OWNED') {
      setOwnedExtra((prev) => new Set(prev).add(pack.code))
      toast.success(t('themeBought', { name: pack.name }), { description: t('themeBoughtDesc') })
    } else if (res.error === 'INSUFFICIENT_BOKCHAE') {
      toast.error(t('insufficientBokchae'))
    } else {
      toast.error(t('purchaseFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-light/40 font-sans">{t('themeHint')}</p>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((pack) => {
          const owned = pack.owned || ownedExtra.has(pack.code)
          const free = pack.priceBokchae === 0
          const loading = loadingCode === pack.code
          const accent = pack.assets.accent ?? '#c9a84c'
          return (
            <div
              key={pack.id}
              className="rounded-xl overflow-hidden border border-gold-500/[0.15] bg-gold-500/[0.03] flex flex-col"
            >
              {/* 방 프리뷰 — 벽/바닥 그라디언트 + 액센트 */}
              <div className="relative h-24">
                <div className="absolute inset-x-0 top-0 h-[62%]" style={{ background: pack.assets.wall }} />
                <div className="absolute inset-x-0 bottom-0 h-[38%]" style={{ background: pack.assets.floor }} />
                <div
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: pack.assets.top ?? `linear-gradient(90deg,transparent,${accent},transparent)` }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 bottom-2 rounded-full"
                  style={{
                    width: '55%',
                    height: '22%',
                    background: pack.assets.glow ?? `${accent}22`,
                    filter: 'blur(6px)',
                  }}
                />
                <span
                  className="absolute left-1/2 -translate-x-1/2 bottom-2 font-serif text-[15px]"
                  style={{ color: accent }}
                >
                  福
                </span>
                {pack.elementAffinity && (
                  <span
                    className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full text-[9px] font-serif grid place-items-center font-bold"
                    style={{
                      background: EL_COLOR[pack.elementAffinity],
                      color:
                        pack.elementAffinity === 'fire' || pack.elementAffinity === 'water' ? '#f2dcdc' : '#0a0a08',
                    }}
                  >
                    {EL_KO[pack.elementAffinity]}
                  </span>
                )}
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="text-[13px] font-serif font-bold text-ink-light leading-tight">{pack.name}</div>
                {owned ? (
                  <Link
                    href="/protected/shrine"
                    className="mt-auto flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-gold-500/[0.12] border border-gold-500/35 text-gold-300"
                  >
                    <Check className="w-3 h-3" />
                    {free ? t('themeFree') : t('themeOwned')}
                  </Link>
                ) : (
                  <button
                    onClick={() => void buy(pack)}
                    disabled={loading}
                    className="mt-auto flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-seal/15 border border-seal/40 text-seal disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      t('themeBuy', { price: pack.priceBokchae })
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
