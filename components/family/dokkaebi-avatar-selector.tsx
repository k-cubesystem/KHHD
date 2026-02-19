'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

// 감성 돋보기:
// 도깨비 아바타는 사용자의 성향을 대변하는 12가지 캐릭터입니다.
// 컬러풀하고 귀여운 스타일로, 사용자에게 친근감을 줍니다.

import { DOKKAEBI_AVATARS as PROFILE_AVATARS } from '@/lib/constants/dokkaebi-avatars'

export const DOKKAEBI_AVATARS = [
  {
    id: 'water_dokkaebi',
    label: '청백 도깨비 (수)',
    color: '#4ECDC4',
    icon: PROFILE_AVATARS.find((a) => a.id === 'dokkaebi-blue')?.svg,
  },
  {
    id: 'fire_dokkaebi',
    label: '적토 도깨비 (화)',
    color: '#FF6B6B',
    icon: PROFILE_AVATARS.find((a) => a.id === 'dokkaebi-red')?.svg,
  },
  {
    id: 'metal_dokkaebi',
    label: '황금 도깨비 (금)',
    color: '#F9CA24',
    icon: PROFILE_AVATARS.find((a) => a.id === 'dokkaebi-yellow')?.svg,
  },
  {
    id: 'wood_dokkaebi',
    label: '청목 도깨비 (목)',
    color: '#6BCF7F',
    icon: PROFILE_AVATARS.find((a) => a.id === 'dokkaebi-green')?.svg,
  },
  {
    id: 'earth_dokkaebi',
    label: '황토 도깨비 (토)',
    color: '#A29BFE',
    icon: PROFILE_AVATARS.find((a) => a.id === 'dokkaebi-purple')?.svg,
  },
]

interface AvatarSelectorProps {
  selectedId: string | undefined
  onSelect: (id: string) => void
}

export function DokkaebiAvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {DOKKAEBI_AVATARS.map((avatar) => {
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
                'w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform duration-300',
                isSelected ? 'scale-110' : 'group-hover:scale-105'
              )}
              style={{ backgroundColor: isSelected ? avatar.color + '20' : 'transparent' }}
            >
              {avatar.icon}
            </div>

            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
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
