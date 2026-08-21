'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createShrine } from '@/app/actions/shrine/shrine'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const THEMES = [
  { key: 'traditional', emoji: '🏮', label: '전통', desc: '고즈넉한 한옥 신당' },
  { key: 'modern', emoji: '✨', label: '현대', desc: '세련된 미니멀 신당' },
  { key: 'premium', emoji: '👑', label: '프리미엄', desc: '황금빛 궁중 신당' },
] as const

export function ShrineSetupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [theme, setTheme] = useState<'traditional' | 'modern' | 'premium'>('traditional')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('신당 이름을 입력해주세요')
      return
    }
    setIsLoading(true)
    const result = await createShrine({ name, description, theme, visibility: 'public' })
    setIsLoading(false)

    if (result.success) {
      toast.success('신당이 만들어졌습니다 🙏')
      router.refresh()
    } else if (result.error === 'ALREADY_EXISTS') {
      toast.error('이미 신당이 있습니다')
      router.refresh()
    } else {
      toast.error('신당 생성 실패')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto space-y-6">
      {/* 테마 선택 */}
      <div className="space-y-3">
        <p className="text-xs text-ink-light/50 font-sans text-center">신당 테마 선택</p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl transition-all border',
                theme === t.key ? 'bg-gold-500/[0.15] border-gold-500/[0.4]' : 'bg-white/[0.03] border-white/[0.06]'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/shrine/themes/badge/${t.key}.webp`}
                alt=""
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  e.currentTarget.outerHTML = `<span class="text-2xl">${t.emoji}</span>`
                }}
                draggable={false}
              />
              <span className="text-xs font-serif text-ink-light">{t.label}</span>
              <span className="text-[10px] text-ink-light/30 font-sans text-center leading-tight">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 신당 이름 */}
      <div className="space-y-2">
        <label className="text-xs text-ink-light/50 font-sans">신당 이름 (필수)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 우리 가족 복을 담은 신당"
          maxLength={20}
          className="w-full bg-white/[0.03] border border-gold-500/15 rounded-xl px-4 py-3 text-sm text-ink-light placeholder:text-ink-light/20 focus:outline-none focus:border-gold-500/40 font-sans"
        />
        <p className="text-[10px] text-ink-light/20 font-sans text-right">{name.length}/20</p>
      </div>

      {/* 신당 소개 */}
      <div className="space-y-2">
        <label className="text-xs text-ink-light/50 font-sans">신당 소개 (선택)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="이 신당에 대한 소개를 적어주세요"
          maxLength={100}
          rows={2}
          className="w-full bg-white/[0.03] border border-gold-500/15 rounded-xl px-4 py-3 text-sm text-ink-light placeholder:text-ink-light/20 resize-none focus:outline-none focus:border-gold-500/40 font-sans"
        />
      </div>

      <button
        onClick={handleCreate}
        disabled={isLoading || !name.trim()}
        className="w-full py-4 rounded-xl font-serif font-bold text-base transition-all disabled:opacity-40 border border-gold-500/[0.4] text-gold-500"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.3) 0%, rgba(201,168,76,0.15) 100%)',
          boxShadow: '0 0 20px rgba(201,168,76,0.1)',
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            신당 생성 중...
          </span>
        ) : (
          '🏮 신당 열기'
        )}
      </button>
    </motion.div>
  )
}
