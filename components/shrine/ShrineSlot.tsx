'use client'

import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface SlotItem {
  id: string
  slot_index: number
  shrine_item_catalog: {
    name: string
    emoji: string
    rarity: string
  }
}

interface ShrineSlotProps {
  slotIndex: number
  item: SlotItem | null
  isOwner: boolean
  isLoading: boolean
  onClick: () => void
  onRemove: () => void
}

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(201,168,76,0.15)',
  rare: 'rgba(96,165,250,0.25)',
  legendary: 'rgba(251,191,36,0.4)',
}

export function ShrineSlot({ slotIndex: _, item, isOwner, isLoading, onClick, onRemove }: ShrineSlotProps) {
  const [showRemove, setShowRemove] = useState(false)

  if (item) {
    const glow = RARITY_GLOW[item.shrine_item_catalog.rarity] ?? RARITY_GLOW.common
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 cursor-default select-none border border-gold-500/[0.2]"
        style={{
          background: `radial-gradient(circle, ${glow} 0%, rgba(255,255,255,0.02) 100%)`,
          boxShadow: item.shrine_item_catalog.rarity === 'legendary' ? '0 0 20px rgba(251,191,36,0.2)' : undefined,
        }}
        onTouchStart={() => isOwner && setShowRemove(true)}
        onTouchEnd={() => setTimeout(() => setShowRemove(false), 2000)}
        onMouseEnter={() => isOwner && setShowRemove(true)}
        onMouseLeave={() => setShowRemove(false)}
      >
        <span className="text-2xl leading-none">{item.shrine_item_catalog.emoji}</span>
        <span className="text-[9px] text-gold-500/50 font-sans leading-none text-center px-1 truncate w-full text-center">
          {item.shrine_item_catalog.name}
        </span>

        {/* 제거 버튼 (소유자만) */}
        {isOwner && showRemove && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            disabled={isLoading}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-900/80 border border-red-500/40 flex items-center justify-center"
          >
            <Trash2 className="w-2.5 h-2.5 text-red-400" />
          </motion.button>
        )}
      </motion.div>
    )
  }

  // 빈 슬롯
  if (!isOwner) {
    return (
      <div className="aspect-square rounded-xl flex items-center justify-center border border-dashed border-gold-500/[0.08] bg-white/[0.01]" />
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={isLoading}
      className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border border-dashed border-gold-500/[0.2] bg-gold-500/[0.02]"
    >
      <span className="text-gold-500/20 text-2xl leading-none">+</span>
    </motion.button>
  )
}
