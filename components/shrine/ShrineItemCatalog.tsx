'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { CatalogItem } from '@/app/actions/shrine/shrine-items'

interface ShrineItemCatalogProps {
  catalogItems: CatalogItem[]
  currentSlotIndex: number
  onSelect: (catalogItemId: string) => void
  onClose: () => void
}

const RARITY_LABEL: Record<string, { text: string; color: string }> = {
  common: { text: '일반', color: 'text-ink-light/50' },
  rare: { text: '희귀', color: 'text-sky-400' },
  legendary: { text: '전설', color: 'text-amber-400' },
}

export function ShrineItemCatalog({ catalogItems, currentSlotIndex, onSelect, onClose }: ShrineItemCatalogProps) {
  return (
    <>
      {/* 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto rounded-t-2xl overflow-hidden border border-gold-500/[0.15]"
        style={{
          background: 'linear-gradient(180deg, #1a1409 0%, #120e06 100%)',
          borderBottom: 'none',
          maxHeight: '70vh',
        }}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gold-500/20" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-[10px] text-gold-500/40 font-serif tracking-widest">SLOT {currentSlotIndex}</p>
            <h3 className="text-ink-light font-serif text-base font-bold">아이템 선택</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4 text-ink-light/50" />
          </button>
        </div>

        <div className="dancheong-divider mx-5" />

        {/* 아이템 목록 */}
        <div className="overflow-y-auto px-4 pb-8 pt-3" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          <div className="grid grid-cols-2 gap-3">
            {catalogItems.map((item) => {
              const rarity = RARITY_LABEL[item.rarity] ?? RARITY_LABEL.common
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-left transition-all active:scale-95 bg-gold-500/[0.04] border border-gold-500/[0.15]"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="w-full text-center">
                    <p className="text-ink-light text-sm font-serif font-bold truncate">{item.name}</p>
                    <p className={`text-[10px] font-sans mt-0.5 ${rarity.color}`}>{rarity.text}</p>
                    {item.description && (
                      <p className="text-ink-light/30 text-[10px] font-sans mt-1 leading-tight line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {item.price_bok_points > 0 ? (
                      <span className="text-xs text-gold-500 font-sans font-bold">
                        🌟 {item.price_bok_points.toLocaleString()}포인트
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-sans font-bold">무료</span>
                    )}
                    {item.price_krw > 0 && (
                      <span className="text-xs text-ink-light/30 font-sans">
                        또는 ₩{item.price_krw.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </>
  )
}
