'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sparkles, Landmark, Check, Loader2 } from 'lucide-react'
import { IconBokjumeoni } from '@/components/icons/traditional-icons'
import {
  getJourneyRewardStatus,
  claimJourneyReward,
  type JourneyRewardStatus,
  type JourneyRewardChoiceStatus,
} from '@/app/actions/analysis/journey-reward'
import { JOURNEY_COMPLETE_TITLE, type JourneyRewardKind } from '@/lib/domain/analysis/journey-reward'
import { GA } from '@/lib/analytics/ga4'

const CLAIM_ERROR_COPY: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  INVALID_CHOICE: '선택할 수 없는 보상입니다.',
  JOURNEY_NOT_COMPLETE: '아직 여정이 완주되지 않았습니다.',
  REWARD_NOT_FOUND: '보상 정보를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.',
  ALREADY_OWNED: '이미 보유하고 있습니다. 다른 보상을 선택해주세요.',
  ALREADY_CLAIMED: '완주 보상은 이미 수령하셨습니다.',
  CLAIM_FAILED: '수령 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
  GRANT_FAILED: '지급에 실패했습니다. 잠시 후 다시 시도해주세요.',
}

interface JourneyRewardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 수령 성공 시(카드 쪽 claimed 상태 갱신). */
  onClaimed?: (kind: JourneyRewardKind, name: string) => void
}

/**
 * 종합운수 여정 완주 보상 선택 시트 — 신위 4좌 · 테마신당 4종 중 택1, 계정당 1회.
 * 열릴 때 스스로 현황(getJourneyRewardStatus)을 조회한다.
 */
export function JourneyRewardSheet({ open, onOpenChange, onClaimed }: JourneyRewardSheetProps) {
  const [status, setStatus] = useState<JourneyRewardStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<JourneyRewardChoiceStatus | null>(null)
  const [claimedName, setClaimedName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setErrorMsg(null)
    GA.journeyRewardView()
    getJourneyRewardStatus()
      .then((s) => {
        setStatus(s)
        if (s?.claimed) setClaimedName(s.claimed.name)
      })
      .finally(() => setLoading(false))
  }, [open])

  const claim = () => {
    if (!selected || pending) return
    setErrorMsg(null)
    startTransition(async () => {
      const res = await claimJourneyReward(selected.kind, selected.code)
      if (!res.success) {
        setErrorMsg(CLAIM_ERROR_COPY[res.error ?? ''] ?? '알 수 없는 오류가 발생했습니다.')
        return
      }
      GA.journeyRewardClaim(selected.kind, selected.code)
      setClaimedName(res.name ?? selected.name)
      onClaimed?.(selected.kind, res.name ?? selected.name)
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#C9A84C', '#E8D5A0', '#9E2B2B'],
      })
    })
  }

  const deities = status?.choices.filter((c) => c.kind === 'deity') ?? []
  const themes = status?.choices.filter((c) => c.kind === 'theme') ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] bg-[#16140F] border-gold-500/30 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {JOURNEY_COMPLETE_TITLE} 보상
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 text-gold-500/60 animate-spin" />
          </div>
        ) : claimedName ? (
          <RewardClaimedView name={claimedName} />
        ) : (
          <div className="space-y-5">
            <p className="text-[12px] text-ink-light/60 font-light leading-relaxed break-keep">
              다섯 복주머니를 모두 채우신 것을 축하드립니다. 아래 신위 한 분 또는 테마신당 한 곳을{' '}
              <span className="text-gold-500">무료로 모실 수 있습니다</span>. (1회 한정, 선택 후 변경 불가)
            </p>

            <ChoiceGroup
              title="신위 모시기 (2품 명신)"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              choices={deities}
              selected={selected}
              onSelect={setSelected}
            />
            <ChoiceGroup
              title="테마신당 소장"
              icon={<Landmark className="w-3.5 h-3.5" />}
              choices={themes}
              selected={selected}
              onSelect={setSelected}
            />

            {errorMsg && <p className="text-[12px] text-red-400/90">{errorMsg}</p>}

            <button
              onClick={claim}
              disabled={!selected || pending}
              className="w-full h-12 rounded-sm font-serif font-bold text-[14px] tracking-[0.1em] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: '#9E2B2B',
                border: '1px solid rgba(158,43,43,0.5)',
                boxShadow: '3px 3px 0 0 rgba(158,43,43,0.3)',
              }}
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selected ? (
                `${selected.name} 모시기`
              ) : (
                '보상을 선택하세요'
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChoiceGroup({
  title,
  icon,
  choices,
  selected,
  onSelect,
}: {
  title: string
  icon: React.ReactNode
  choices: JourneyRewardChoiceStatus[]
  selected: JourneyRewardChoiceStatus | null
  onSelect: (c: JourneyRewardChoiceStatus) => void
}) {
  if (choices.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-serif text-gold-500/70 flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c) => {
          const isSelected = selected?.kind === c.kind && selected?.code === c.code
          return (
            <button
              key={`${c.kind}-${c.code}`}
              onClick={() => !c.owned && onSelect(c)}
              disabled={c.owned}
              className={`text-left p-3 rounded-xl border transition-all ${
                c.owned
                  ? 'bg-white/[0.02] border-white/5 opacity-45 cursor-not-allowed'
                  : isSelected
                    ? 'bg-gold-500/15 border-gold-500/60 shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                    : 'bg-white/[0.04] border-white/10 hover:border-gold-500/30'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-[13px] font-serif font-bold ${isSelected ? 'text-gold-500' : 'text-ink-light'}`}>
                  {c.name}
                </span>
                <span className="text-[10px] font-serif text-gold-500/50 shrink-0">{c.element}</span>
              </div>
              <p className="text-[10px] text-ink-light/50 font-light mt-1 leading-relaxed break-keep">{c.tagline}</p>
              <p className="text-[10px] mt-1.5">
                {c.owned ? (
                  <span className="text-ink-light/40">보유 중</span>
                ) : (
                  <>
                    <span className="text-ink-light/30 line-through mr-1">{c.priceBokchae}만냥</span>
                    <span className="text-gold-500/80 font-medium">완주 무료</span>
                  </>
                )}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RewardClaimedView({ name }: { name: string }) {
  return (
    <div className="py-6 flex flex-col items-center gap-4 text-center">
      {/* 복주머니 완성 연출 */}
      <motion.div
        initial={{ scale: 1.6, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, rgba(201,168,76,0.35) 0%, rgba(201,168,76,0.08) 70%)',
          boxShadow: '0 0 28px rgba(212,175,55,0.45), inset 0 0 0 2px rgba(232,213,160,0.4)',
        }}
      >
        <IconBokjumeoni className="w-10 h-10 text-gold-500" fill="rgba(201,168,76,0.35)" />
      </motion.div>
      <div className="space-y-1.5">
        <p className="text-base font-serif font-bold text-gold-500">{name}</p>
        <p className="text-[12px] text-ink-light/60 font-light leading-relaxed break-keep">
          {JOURNEY_COMPLETE_TITLE} — 신당에서 확인하실 수 있습니다.
        </p>
      </div>
      <a
        href="/protected/shrine"
        className="inline-flex items-center gap-1.5 text-[12px] text-gold-500/80 hover:text-gold-500 border border-gold-500/30 rounded-sm px-4 py-2 font-serif transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
        신당으로 가기
      </a>
    </div>
  )
}
