'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { ELEMENT_AVATARS, DEITY_AVATARS, findFamilyAvatar, type FamilyAvatar } from '@/lib/domain/family/avatars'

// 감성 돋보기:
// 가족 아바타는 오행 수호 정령 5종 + 신위 17종으로 확장되었다(lib/domain/family/avatars).
// 이 파일은 선택 UI 와, 기존 소비처(카드·기운지도·신당 탭·프로필 설정)를 위한 하위호환 재노출을 담당한다.

// ─── 하위호환 재노출 ─────────────────────────────────────────────
// 기존 import 경로(@/components/family/five-avatar-selector)를 유지한다.
export type FiveAvatar = FamilyAvatar
export const FIVE_AVATARS = ELEMENT_AVATARS
export const findFiveAvatar = findFamilyAvatar

interface AvatarSelectorProps {
  selectedId: string | undefined
  onSelect: (id: string) => void
}

function AvatarTile({
  avatar,
  isSelected,
  onSelect,
}: {
  avatar: FamilyAvatar
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
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
          'text-[9px] font-medium transition-colors whitespace-nowrap leading-tight',
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
}

export function FiveAvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
  return (
    <div className="space-y-3">
      {/* 오행 정령 */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-ink-light/40 font-medium tracking-wide px-0.5">오행 정령</p>
        <div className="grid grid-cols-5 gap-2">
          {ELEMENT_AVATARS.map((avatar) => (
            <AvatarTile key={avatar.id} avatar={avatar} isSelected={selectedId === avatar.id} onSelect={onSelect} />
          ))}
        </div>
      </div>

      {/* 신위 */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-ink-light/40 font-medium tracking-wide px-0.5">신위 (神位)</p>
        <div className="grid grid-cols-5 gap-2 max-h-[188px] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
          {DEITY_AVATARS.map((avatar) => (
            <AvatarTile key={avatar.id} avatar={avatar} isSelected={selectedId === avatar.id} onSelect={onSelect} />
          ))}
        </div>
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name="avatar_id" value={selectedId || ''} />
    </div>
  )
}
