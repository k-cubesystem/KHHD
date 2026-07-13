'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

// 감성 돋보기:
// 오행 수호 정령 아바타 — 「설빛온기」 인물 초상 5종.
// 가족 구성원 선택기와 프로필 직접선택이 공유합니다.
// id는 기존 family_members.avatar_id 저장값(…_dokkaebi)과의 하위호환을 위해 유지합니다.

export interface FiveAvatar {
  id: string
  element: 'water' | 'fire' | 'metal' | 'wood' | 'earth'
  label: string
  color: string
  src: string
}

export const FIVE_AVATARS: FiveAvatar[] = [
  {
    id: 'water_dokkaebi',
    element: 'water',
    label: '청수 도령 (水)',
    color: '#4ECDC4',
    src: '/avatars/five/water.webp',
  },
  { id: 'fire_dokkaebi', element: 'fire', label: '단화 낭자 (火)', color: '#FF6B6B', src: '/avatars/five/fire.webp' },
  {
    id: 'metal_dokkaebi',
    element: 'metal',
    label: '백금 검사 (金)',
    color: '#F9CA24',
    src: '/avatars/five/metal.webp',
  },
  { id: 'wood_dokkaebi', element: 'wood', label: '청목 선비 (木)', color: '#6BCF7F', src: '/avatars/five/wood.webp' },
  {
    id: 'earth_dokkaebi',
    element: 'earth',
    label: '온토 부인 (土)',
    color: '#A29BFE',
    src: '/avatars/five/earth.webp',
  },
]

export function findFiveAvatar(id: string | null | undefined): FiveAvatar | undefined {
  return FIVE_AVATARS.find((a) => a.id === id)
}

interface AvatarSelectorProps {
  selectedId: string | undefined
  onSelect: (id: string) => void
}

export function FiveAvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {FIVE_AVATARS.map((avatar) => {
        const isSelected = selectedId === avatar.id
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={cn(
              'relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-300 group',
              isSelected
                ? 'bg-primary/10 border border-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                : 'bg-surface/30 border border-white/5 hover:bg-surface/50 hover:border-white/10'
            )}
          >
            <div
              className={cn(
                'w-11 h-11 rounded-full overflow-hidden flex items-center justify-center transition-transform duration-300 border',
                isSelected ? 'scale-110 border-primary/40' : 'border-white/10 group-hover:scale-105'
              )}
              style={{ backgroundColor: avatar.color + '18' }}
            >
              <Image
                src={avatar.src}
                alt={avatar.label}
                width={44}
                height={44}
                className="w-full h-full object-cover object-top"
              />
            </div>

            <span
              className={cn(
                'text-[9.5px] font-medium transition-colors whitespace-nowrap',
                isSelected ? 'text-primary' : 'text-ink-light/50 group-hover:text-ink-light/80'
              )}
            >
              {avatar.label}
            </span>

            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-background flex items-center justify-center shadow-sm animate-in zoom-in spin-in-180 duration-300">
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}

      {/* Hidden input for form submission */}
      <input type="hidden" name="avatar_id" value={selectedId || ''} />
    </div>
  )
}
