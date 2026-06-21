'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { ShrineSlot } from './ShrineSlot'
import { ShrineItemCatalog } from './ShrineItemCatalog'
import type { ShrineWithItems } from '@/app/actions/shrine/shrine'
import type { CatalogItem } from '@/app/actions/shrine/shrine-items'
import { placeItem, removeItem } from '@/app/actions/shrine/shrine-items'
import { toast } from 'sonner'

interface ShrineCanvasProps {
  shrine: ShrineWithItems
  catalogItems: CatalogItem[]
  isOwner: boolean
}

export function ShrineCanvas({ shrine, catalogItems, isOwner }: ShrineCanvasProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // slot_index 1~12 배열로 정렬
  const slots = Array.from({ length: 12 }, (_, i) => {
    const idx = i + 1
    const placed = shrine.shrine_items.find((item) => item.slot_index === idx)
    return { slotIndex: idx, item: placed ?? null }
  })

  const handleSlotClick = (slotIndex: number) => {
    if (!isOwner) return
    setSelectedSlot(slotIndex)
  }

  const handlePlaceItem = async (catalogItemId: string) => {
    if (selectedSlot === null) return
    setIsLoading(true)
    setSelectedSlot(null)

    const result = await placeItem({ catalogItemId, slotIndex: selectedSlot })
    setIsLoading(false)

    if (!result.success) {
      if (result.error === 'INSUFFICIENT_POINTS') toast.error('복 포인트가 부족합니다')
      else if (result.error === 'SLOT_FULL') toast.error('슬롯이 가득 찼습니다')
      else toast.error('아이템 배치 실패')
    } else {
      toast.success('아이템을 배치했습니다')
    }
  }

  const handleRemoveItem = async (slotIndex: number) => {
    setIsLoading(true)
    const result = await removeItem(slotIndex)
    setIsLoading(false)
    if (result.success) toast.success('아이템을 제거했습니다')
    else toast.error('제거 실패')
  }

  return (
    <div className="relative w-full">
      {/* 신당 배경 */}
      <div
        className="relative rounded-2xl overflow-hidden hanji-card dancheong-border-top"
        style={{
          background: 'linear-gradient(180deg, #100c06 0%, #1a1409 50%, #0e0a04 100%)',
          boxShadow: '0 20px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,168,76,0.08)',
          minHeight: 320,
        }}
      >
        {/* 배경 글로우 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 60%)',
          }}
        />

        {/* 상단 신당 이름 */}
        <div className="relative z-10 pt-5 pb-3 px-5 text-center">
          <p className="text-[10px] tracking-[0.5em] text-gold-500/40 font-serif mb-1">神 堂</p>
          <h3 className="text-gold-500 font-serif text-lg font-bold">{shrine.name}</h3>
          {shrine.description && <p className="text-ink-light/40 text-xs mt-1 font-sans">{shrine.description}</p>}
        </div>

        {/* 단청 구분선 */}
        <div className="dancheong-divider mx-5" />

        {/* 3×4 슬롯 그리드 */}
        <div className="relative z-10 p-5 grid grid-cols-3 gap-3">
          {slots.map(({ slotIndex, item }) => (
            <ShrineSlot
              key={slotIndex}
              slotIndex={slotIndex}
              item={item}
              isOwner={isOwner}
              isLoading={isLoading}
              onClick={() => handleSlotClick(slotIndex)}
              onRemove={() => handleRemoveItem(slotIndex)}
            />
          ))}
        </div>

        {/* 하단 통계 */}
        <div className="relative z-10 px-5 pb-5 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-gold-500 font-bold text-base font-sans">{shrine.visitor_count}</p>
            <p className="text-ink-light/30 text-[10px] font-sans">방문</p>
          </div>
          <div className="w-px h-6 bg-gold-500/15" />
          <div className="text-center">
            <p className="text-gold-500 font-bold text-base font-sans">{shrine.wish_count}</p>
            <p className="text-ink-light/30 text-[10px] font-sans">기원</p>
          </div>
        </div>
      </div>

      {/* 아이템 카탈로그 Bottom Sheet */}
      <AnimatePresence>
        {selectedSlot !== null && (
          <ShrineItemCatalog
            catalogItems={catalogItems}
            currentSlotIndex={selectedSlot}
            onSelect={handlePlaceItem}
            onClose={() => setSelectedSlot(null)}
          />
        )}
      </AnimatePresence>

      {/* 소유자용 안내 */}
      {isOwner && (
        <p className="text-center text-ink-light/30 text-xs mt-3 font-sans flex items-center justify-center gap-1">
          <Plus className="w-3 h-3" />빈 슬롯을 눌러 아이템을 배치하세요
        </p>
      )}
    </div>
  )
}
