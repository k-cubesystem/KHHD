'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { updateShrine, type Shrine } from '@/app/actions/shrine/shrine'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ShrineEditFormProps {
  shrine: Shrine
}

export function ShrineEditForm({ shrine }: ShrineEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(shrine.name)
  const [description, setDescription] = useState(shrine.description ?? '')
  const [visibility, setVisibility] = useState<'public' | 'private'>(shrine.visibility)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    const result = await updateShrine({ name, description, visibility })
    setIsLoading(false)

    if (result.success) {
      toast.success('저장했습니다')
      router.push('/protected/shrine')
    } else {
      toast.error('저장 실패')
    }
  }

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div className="space-y-2">
        <label className="text-xs text-ink-light/50 font-sans">신당 이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="w-full bg-white/3 border border-gold-500/15 rounded-xl px-4 py-3 text-sm text-ink-light focus:outline-none focus:border-gold-500/40 font-sans"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-ink-light/50 font-sans">신당 소개</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={100}
          rows={3}
          className="w-full bg-white/3 border border-gold-500/15 rounded-xl px-4 py-3 text-sm text-ink-light resize-none focus:outline-none focus:border-gold-500/40 font-sans"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-ink-light/50 font-sans">공개 설정</label>
        <div className="grid grid-cols-2 gap-2">
          {(['public', 'private'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              className={cn(
                'py-3 rounded-xl text-sm font-sans transition-all border',
                visibility === v
                  ? 'bg-gold-500/[0.15] border-gold-500/[0.4] text-gold-500'
                  : 'bg-white/[0.03] border-white/[0.06] text-ink-primary/[0.4]'
              )}
            >
              {v === 'public' ? '🌐 공개' : '🔒 비공개'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isLoading || !name.trim()}
        className="w-full py-4 rounded-xl font-serif font-bold text-sm disabled:opacity-40 transition-all border bg-gold-500/[0.15] border-gold-500/[0.35] text-gold-500"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            저장 중...
          </span>
        ) : (
          '저장하기'
        )}
      </button>
    </div>
  )
}
