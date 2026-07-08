'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { ShopData } from '@/app/actions/shrine/inventory'
import { purchaseToInventory } from '@/app/actions/shrine/inventory'
import { EL_KO, EL_COLOR } from '@/lib/domain/shrine/energy'
import { ZONE_LABEL } from '@/lib/domain/shrine/zones'

const RARITY: Record<string, { label: string; cls: string }> = {
  common: { label: '일반', cls: 'text-ink-light/50 border-white/10 bg-white/[0.03]' },
  rare: { label: '희귀', cls: 'text-sky-400 border-sky-500/20 bg-sky-900/20' },
  legendary: { label: '전설', cls: 'text-gold-300 border-gold-500/30 bg-gold-500/[0.08]' },
}

export function ShrineShopClient({ data }: { data: ShopData }) {
  const [owned, setOwned] = useState<Record<string, number>>(data.owned)
  const [balance, setBalance] = useState(data.bokBalance)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const buy = async (id: string, name: string, priceBok: number) => {
    if (priceBok > balance) {
      toast.error(`복이 부족합니다 (필요: ${priceBok.toLocaleString()})`)
      return
    }
    setLoadingId(id)
    const res = await purchaseToInventory(id)
    setLoadingId(null)
    if (res.success) {
      setOwned((o) => ({ ...o, [id]: res.newQty ?? (o[id] ?? 0) + 1 }))
      if (typeof res.newBalance === 'number') setBalance(res.newBalance)
      toast.success(`${name} — 보관함에 담겼어요`, { description: '신당 꾸미기에서 배치하세요' })
    } else if (res.error === 'INSUFFICIENT_POINTS') {
      toast.error('복이 부족합니다')
    } else {
      toast.error('구매 실패. 다시 시도해주세요.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-light/40 font-sans">
          보유 복: <span className="text-gold-500 font-bold tabular-nums">✨ {balance.toLocaleString()}</span>
        </p>
        <Link
          href="/protected/shrine"
          className="text-[11px] text-gold-300 border border-gold-500/25 rounded-lg px-3 py-1.5"
        >
          신당으로 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.catalog.map((item, idx) => {
          const rarity = RARITY[item.rarity] ?? RARITY.common
          const have = owned[item.id] ?? 0
          const free = item.priceBok === 0
          const canAfford = free || item.priceBok <= balance
          const loading = loadingId === item.id
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-xl p-4 flex flex-col gap-3 bg-gold-500/[0.03] border border-gold-500/[0.12]"
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl leading-none">{item.emoji}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-sans ${rarity.cls}`}>
                    {rarity.label}
                  </span>
                  {have > 0 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-900/20 text-emerald-300 tabular-nums">
                      보유 {have}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-ink-primary font-serif text-sm font-bold">{item.name}</p>
                  {item.element && (
                    <span
                      className="text-[9px] w-[15px] h-[15px] rounded-full grid place-items-center font-serif font-bold"
                      style={{
                        background: EL_COLOR[item.element],
                        color: item.element === 'fire' || item.element === 'water' ? '#f2dcdc' : '#0a0a08',
                      }}
                    >
                      {EL_KO[item.element]}
                    </span>
                  )}
                  <span className="text-[9px] text-ink-light/40 border border-white/10 rounded px-1.5 py-px">
                    {ZONE_LABEL[item.layer]}
                  </span>
                </div>
                {item.description && (
                  <p className="text-ink-light/30 text-[10px] font-sans leading-tight">{item.description}</p>
                )}
                {item.element && (
                  <p className="text-[10px] text-gold-500/70 font-sans">
                    {EL_KO[item.element]} 기운 +{item.energyPower}
                  </p>
                )}
              </div>

              <button
                onClick={() => buy(item.id, item.name, item.priceBok)}
                disabled={loading || !canAfford}
                className={`w-full py-2 rounded-lg text-xs font-serif font-bold transition-all disabled:opacity-40 ${
                  free
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : canAfford
                      ? 'bg-gold-500/15 border border-gold-500/30 text-gold-300'
                      : 'bg-white/[0.04] border border-white/[0.06] text-ink-light/30'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                ) : free ? (
                  <span className="flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" /> 무료로 받기
                  </span>
                ) : (
                  `✨ ${item.priceBok.toLocaleString()}`
                )}
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
