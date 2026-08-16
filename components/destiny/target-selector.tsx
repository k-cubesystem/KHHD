'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, User, Users, Heart, Briefcase, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'
import { getTargetImageUrl } from '@/lib/domain/destiny/destiny-utils'
import { QuickAddTarget } from '@/components/destiny/quick-add-target'
import { MEMBER_CATEGORY_META, toMemberCategory, type MemberCategory } from '@/lib/domain/family/member-category'

interface TargetSelectorProps {
  /**
   * Bottom Sheet 열림 상태
   */
  isOpen: boolean
  /**
   * Bottom Sheet 닫기 콜백
   */
  onClose: () => void
  /**
   * Target 선택 콜백
   */
  onSelect: (target: DestinyTarget) => void
  /**
   * 현재 선택된 Target ID (옵션)
   */
  selectedTargetId?: string
}

/**
 * TargetSelector Component
 * - Bottom Sheet 형태의 Destiny Target 선택기
 * - 본인 + 가족/친구 목록 표시
 * - "새로운 인연 등록" 링크 제공
 * - Midnight in Cheongdam 디자인 시스템 준수
 */
export function TargetSelector({ isOpen, onClose, onSelect, selectedTargetId }: TargetSelectorProps) {
  const [targets, setTargets] = useState<DestinyTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadTargets()
    }
  }, [isOpen])

  const loadTargets = async () => {
    setLoading(true)
    try {
      const data = await getDestinyTargets()
      setTargets(data)
      return data
    } catch (error) {
      logger.error('Failed to load destiny targets:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * 방금 등록한 사람을 **곧바로 고른다.**
   * 목록만 새로 고치고 끝내면 사용자가 자기가 만든 사람을 다시 찾아 눌러야 한다 —
   * 나가지 않게 만든 이유가 거기서 반쯤 사라진다.
   */
  const handleAdded = async (id: string) => {
    setAdding(false)
    const fresh = await loadTargets()
    const created = fresh.find((candidate) => candidate.id === id)
    if (created) handleSelect(created)
  }

  /** 본인 → 가족 → 지인. 갈래가 섞여 있으면 「아는 사람」을 가족 틈에서 찾아야 한다. */
  const groups: ReadonlyArray<{ key: string; label: string; items: DestinyTarget[] }> = [
    { key: 'self', label: '본인', items: targets.filter((t) => t.target_type === 'self') },
    ...(['family', 'acquaintance'] as MemberCategory[]).map((category) => ({
      key: category,
      label: MEMBER_CATEGORY_META[category].label,
      items: targets.filter((t) => t.target_type !== 'self' && toMemberCategory(t.member_category) === category),
    })),
  ]

  const handleSelect = (target: DestinyTarget) => {
    onSelect(target)
    onClose()
  }

  const getRelationIcon = (relationType: string, targetType: string) => {
    if (targetType === 'self') return User
    if (relationType.includes('가족') || relationType.includes('부모') || relationType.includes('자녀')) return Users
    if (relationType.includes('연인') || relationType.includes('배우자')) return Heart
    if (relationType.includes('직장') || relationType.includes('동료') || relationType.includes('상사'))
      return Briefcase
    return UserPlus
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-primary/20 rounded-t-3xl shadow-[0_-4px_40px_rgba(0,0,0,0.5)] max-w-[480px] mx-auto"
          >
            {/* Header */}
            <div className="relative px-3 py-5 border-b border-white/5">
              {/* Top Indicator */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full" />

              {/* Title */}
              <div className="flex items-center justify-between mt-2">
                <h2 className="text-lg font-serif font-bold text-ink-light">누구의 운명을 보시겠습니까?</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface/50 hover:bg-surface flex items-center justify-center transition-colors"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4 text-ink-light/70" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-3 py-4 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-surface/30 rounded-xl animate-pulse">
                      <div className="w-12 h-12 bg-surface rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface rounded w-1/3" />
                        <div className="h-3 bg-surface rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : targets.length === 0 ? (
                <QuickAddTarget defaultCategory="family" onAdded={handleAdded} onCancel={onClose} />
              ) : (
                <div className="space-y-2">
                  {groups.map((group) =>
                    group.items.length === 0 ? null : (
                      <div key={group.key} className="space-y-2 pt-1">
                        <p className="px-1 text-[10px] tracking-wider text-ink-light/35">{group.label}</p>
                        {group.items.map((target) => {
                          const Icon = getRelationIcon(target.relation_type, target.target_type)
                          const isSelected = target.id === selectedTargetId
                          const imageUrl = getTargetImageUrl(target)

                          return (
                            <button
                              key={target.id}
                              onClick={() => handleSelect(target)}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all group ${
                                isSelected
                                  ? 'bg-primary/10 border-2 border-primary'
                                  : 'bg-surface/30 border-2 border-transparent hover:bg-surface/50 hover:border-primary/30'
                              }`}
                            >
                              {/* Avatar */}
                              <Avatar className="w-12 h-12 border border-primary/20">
                                <AvatarImage src={imageUrl || undefined} />
                                <AvatarFallback className="bg-surface text-primary font-bold text-sm">
                                  {target.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>

                              {/* Info */}
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-serif font-bold text-ink-light group-hover:text-primary transition-colors">
                                    {target.name}
                                  </h3>
                                  {target.target_type === 'self' && (
                                    <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/30">
                                      본인
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-ink-light/60">
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{target.relation_type}</span>
                                  {target.birth_date && (
                                    <>
                                      <span className="text-ink-light/30">•</span>
                                      <span>{target.birth_date}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Selected Indicator */}
                              {isSelected && (
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-background"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  )}

                  {/* 인연 추가 — 🔴 화면을 떠나지 않는다. 나가면 절반이 돌아오지 않는다. */}
                  {adding ? (
                    <div className="pt-3">
                      <QuickAddTarget onAdded={handleAdded} onCancel={() => setAdding(false)} />
                    </div>
                  ) : (
                    <div className="space-y-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 bg-surface/20 hover:bg-surface/40 border-2 border-dashed border-primary/30 hover:border-primary/50 rounded-xl transition-all"
                      >
                        <Plus className="w-5 h-5 text-primary" />
                        <span className="text-sm text-primary font-medium">인연 추가 — 가족·지인</span>
                      </button>
                      <Link
                        href="/protected/family"
                        className="block text-center text-[11px] text-ink-light/40 underline-offset-2 hover:underline"
                      >
                        인연 관리로 가기
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
