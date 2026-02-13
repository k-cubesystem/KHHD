'use client'

import { useState } from 'react'
import { DOKKAEBI_AVATARS, type DokkaebiAvatarId } from '@/lib/constants/dokkaebi-avatars'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface AvatarSelectorProps {
  currentAvatar: string | null
  onSelect: (avatarId: DokkaebiAvatarId) => void
  socialAvatarUrl?: string | null
}

export function AvatarSelector({ currentAvatar, onSelect, socialAvatarUrl }: AvatarSelectorProps) {
  const [selectedId, setSelectedId] = useState<DokkaebiAvatarId | null>(
    currentAvatar?.startsWith('/avatars/dokkaebi-')
      ? (currentAvatar.replace('/avatars/', '').replace('.svg', '') as DokkaebiAvatarId)
      : null
  )

  const handleSelect = (avatarId: DokkaebiAvatarId) => {
    setSelectedId(avatarId)
    onSelect(avatarId)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-light text-ink-light">프로필 아바타</Label>
        <p className="text-xs text-ink-light/50 font-light">
          {socialAvatarUrl
            ? '소셜 로그인 이미지가 자동으로 사용됩니다. 원하시면 도깨비 아바타를 선택하세요.'
            : '귀여운 도깨비 아바타 중 하나를 선택하세요.'}
        </p>
      </div>

      {/* 소셜 아바타 (있을 경우) */}
      {socialAvatarUrl && (
        <div className="space-y-2">
          <Label className="text-xs font-light text-ink-light/70">소셜 프로필 이미지</Label>
          <div className="flex items-center gap-3 p-3 bg-surface/30 border border-primary/20 rounded-lg">
            <img
              src={socialAvatarUrl}
              alt="Social Avatar"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-light text-ink-light">현재 사용 중</p>
              <p className="text-xs text-ink-light/50 font-light">소셜 로그인에서 가져온 이미지</p>
            </div>
          </div>
        </div>
      )}

      {/* 도깨비 아바타 선택 */}
      <div className="space-y-2">
        <Label className="text-xs font-light text-ink-light/70">도깨비 아바타 (선택사항)</Label>
        <div className="grid grid-cols-5 gap-4">
          {DOKKAEBI_AVATARS.map((avatar) => {
            const isSelected = selectedId === avatar.id
            return (
              <div key={avatar.id} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelect(avatar.id)}
                  className={cn(
                    'relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-primary/20 hover:border-primary/40 bg-surface/30'
                  )}
                >
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    {avatar.svg}
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                      <Check className="w-3 h-3 text-background" strokeWidth={3} />
                    </div>
                  )}
                </button>
                <div className="text-center w-full">
                  <p
                    className={cn(
                      'text-[10px] font-light truncate px-1',
                      isSelected ? 'text-primary font-medium' : 'text-ink-light/50'
                    )}
                  >
                    {avatar.name}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
