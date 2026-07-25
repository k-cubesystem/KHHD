'use client'

import { motion } from 'framer-motion'
import { History, RotateCcw, Users, Volume2, VolumeX, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FamilyOption {
  id: string
  name: string
  relation: string
}

/**
 * 채팅 더보기 시트 — 헤더에 상주하던 관리 UI(음성·지난대화·새대화·점사대상)를 모아 넣는다.
 * 대화 화면에서 크롬을 걷어내는 게 목적이므로, 여기 있는 것들은 전부 "가끔 쓰는" 조작이다.
 */
export function ChatMoreSheet({
  open,
  onClose,
  ttsSupported,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenHistory,
  onNewChat,
  canStartNewChat,
  familyOptions,
  selectedFamilyId,
  onFamilyChange,
  disabled,
}: {
  open: boolean
  onClose: () => void
  ttsSupported: boolean
  autoSpeak: boolean
  onToggleAutoSpeak: () => void
  onOpenHistory: () => void
  onNewChat: () => void
  canStartNewChat: boolean
  familyOptions: FamilyOption[]
  selectedFamilyId: string
  onFamilyChange: (id: string) => void
  disabled?: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-label="채팅 설정">
      <button aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-[480px] rounded-t-2xl border-t border-x border-primary/15 bg-[#111] pb-8"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
          <p className="text-sm font-serif text-foreground/85">대화 설정</p>
          <button onClick={onClose} aria-label="닫기" className="p-1 text-primary/50 hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-4">
          {/* 점사 대상 */}
          <div className="space-y-1.5">
            <label
              htmlFor="chat-target-select"
              className="flex items-center gap-1.5 text-[11px] text-foreground/60 tracking-wide"
            >
              <Users className="w-3 h-3 text-primary/50" />
              점사 대상
            </label>
            <select
              id="chat-target-select"
              value={selectedFamilyId}
              onChange={(e) => onFamilyChange(e.target.value)}
              disabled={disabled}
              className="w-full bg-surface/60 border border-primary/20 rounded-xl px-3 py-2.5 text-sm text-foreground/85 outline-none focus:border-primary/45 disabled:opacity-50"
            >
              <option value="self">나 (본인)</option>
              {familyOptions.map((m) => (
                <option key={m.id} value={m.id} className="bg-surface text-foreground">
                  {m.name} ({m.relation})
                </option>
              ))}
            </select>
          </div>

          {/* 음성 자동 읽기 */}
          {ttsSupported && (
            <button
              onClick={onToggleAutoSpeak}
              aria-pressed={autoSpeak}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors',
                autoSpeak
                  ? 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                  : 'border-primary/15 bg-surface/40 text-foreground/70 hover:border-primary/30'
              )}
            >
              <span className="flex items-center gap-2 text-sm">
                {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                신위 음성 자동 읽기
              </span>
              <span className="text-[11px] opacity-80">{autoSpeak ? '켜짐' : '꺼짐'}</span>
            </button>
          )}

          {/* 지난 대화 */}
          <button
            onClick={() => {
              onClose()
              onOpenHistory()
            }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/15 bg-surface/40 text-foreground/70 hover:border-primary/30 transition-colors text-sm"
          >
            <History className="w-4 h-4 text-primary/60" />
            지난 대화 열람
          </button>

          {/* 새 대화 */}
          <button
            onClick={() => {
              onClose()
              onNewChat()
            }}
            disabled={!canStartNewChat}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/15 bg-surface/40 text-foreground/70 hover:border-primary/30 transition-colors text-sm disabled:opacity-30"
          >
            <RotateCcw className="w-4 h-4 text-primary/60" />새 대화 시작
          </button>
        </div>
      </motion.div>
    </div>
  )
}
