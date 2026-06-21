'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { CatalogItem } from '@/app/actions/shrine/shrine-items'
import type { ShrineWithItems } from '@/app/actions/shrine/shrine'
import { placeItem } from '@/app/actions/shrine/shrine-items'
import { GA } from '@/lib/analytics/ga4'
import { toast } from 'sonner'

interface ShrineShopClientProps {
  catalogItems: CatalogItem[]
  shrine: ShrineWithItems
  bokPoints: number
}

const RARITY_INFO: Record<string, { label: string; color: string; badge: string }> = {
  common: { label: '일반', color: 'text-ink-light/50', badge: 'bg-white/5 border-white/10' },
  rare: { label: '희귀', color: 'text-sky-400', badge: 'bg-sky-900/20 border-sky-500/20' },
  legendary: { label: '전설', color: 'text-amber-400', badge: 'bg-amber-900/20 border-amber-500/30' },
}

export function ShrineShopClient({ catalogItems, shrine, bokPoints }: ShrineShopClientProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  const usedSlots = shrine.shrine_items.map((i) => i.slot_index)
  const emptySlots = Array.from({ length: 12 }, (_, i) => i + 1).filter((s) => !usedSlots.includes(s))

  const handleBuyAndPlace = async (item: CatalogItem) => {
    if (item.price_bok_points > bokPoints) {
      toast.error(`복 포인트가 부족합니다 (필요: ${item.price_bok_points.toLocaleString()})`)
      return
    }

    const slot = selectedSlot ?? emptySlots[0]
    if (!slot) {
      toast.error('배치할 슬롯이 없습니다. 기존 아이템을 제거해주세요.')
      return
    }

    setLoadingId(item.id)
    const result = await placeItem({ catalogItemId: item.id, slotIndex: slot })
    setLoadingId(null)
    setSelectedSlot(null)

    if (result.success) {
      GA.shrineItemPurchase(item.type, item.price_bok_points)
      toast.success(`${item.emoji} ${item.name} 배치 완료!`)
    } else if (result.error === 'INSUFFICIENT_POINTS') {
      toast.error('복 포인트가 부족합니다')
    } else {
      toast.error('배치 실패. 다시 시도해주세요.')
    }
  }

  return (
    <div className="space-y-6">
      {/* 슬롯 선택 (빈 슬롯이 있을 때) */}
      {emptySlots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-ink-light/50 font-sans">배치할 슬롯 선택</p>
          <div className="flex gap-2 flex-wrap">
            {emptySlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                className="w-10 h-10 rounded-lg text-xs font-sans font-bold transition-all"
                style={{
                  background: selectedSlot === slot ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedSlot === slot ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: selectedSlot === slot ? '#C9A84C' : 'rgba(232,228,220,0.3)',
                }}
              >
                {slot}
              </button>
            ))}
          </div>
          {selectedSlot && <p className="text-[10px] text-gold-500/40 font-sans">슬롯 {selectedSlot}에 배치됩니다</p>}
          {!selectedSlot && (
            <p className="text-[10px] text-ink-light/20 font-sans">선택 안 하면 첫 번째 빈 슬롯에 자동 배치</p>
          )}
        </div>
      )}

      {/* 아이템 목록 */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence>
          {catalogItems.map((item, idx) => {
            const rarity = RARITY_INFO[item.rarity] ?? RARITY_INFO.common
            const canAfford = item.price_bok_points <= bokPoints || item.price_bok_points === 0
            const isLoading = loadingId === item.id

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-xl p-4 space-y-3 flex flex-col"
                style={{
                  background: 'rgba(201,168,76,0.03)',
                  border: '1px solid rgba(201,168,76,0.12)',
                }}
              >
                {/* 이모지 + 희귀도 */}
                <div className="flex items-start justify-between">
                  <span className="text-4xl leading-none">{item.emoji}</span>
                  <span
                    className={`text-[9px] px-2 py-1 rounded-full border font-sans ${rarity.badge} ${rarity.color}`}
                  >
                    {rarity.label}
                  </span>
                </div>

                {/* 이름 + 설명 */}
                <div className="space-y-1 flex-1">
                  <p className="text-ink-light font-serif text-sm font-bold">{item.name}</p>
                  {item.description && (
                    <p className="text-ink-light/30 text-[10px] font-sans leading-tight">{item.description}</p>
                  )}
                </div>

                {/* 가격 + 구매 버튼 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    {item.price_bok_points > 0 ? (
                      <span className={`text-xs font-sans font-bold ${canAfford ? 'text-gold-500' : 'text-red-400'}`}>
                        🌟 {item.price_bok_points.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs font-sans font-bold text-emerald-400">무료</span>
                    )}
                    {item.price_krw > 0 && (
                      <span className="text-[10px] text-ink-light/20 font-sans">
                        / ₩{item.price_krw.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuyAndPlace(item)}
                    disabled={isLoading || emptySlots.length === 0}
                    className="w-full py-2 rounded-lg text-xs font-serif font-bold transition-all disabled:opacity-30"
                    style={{
                      background: canAfford ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${canAfford ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: canAfford ? '#C9A84C' : 'rgba(232,228,220,0.2)',
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : emptySlots.length === 0 ? (
                      '슬롯 없음'
                    ) : (
                      '배치하기'
                    )}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {emptySlots.length === 0 && (
        <p className="text-center text-ink-light/30 text-xs font-sans py-4">
          신당이 가득 찼습니다. 기존 아이템을 제거 후 배치하세요.
        </p>
      )}
    </div>
  )
}
