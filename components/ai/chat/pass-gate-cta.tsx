'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { purchaseShamanQuestions } from '@/app/actions/ai/shaman-chat'
import { InsufficientPassModal } from '@/components/payment/insufficient-pass-modal'
import { useInsufficientPass } from '@/hooks/use-insufficient-pass'
import { useRefreshPasses } from '@/hooks/use-passes'
import { GAChat } from '@/lib/analytics/chat-ga'
import { PURCHASE_EXPIRE_DAYS } from '@/lib/domain/chat/entitlements'
import { SHAMAN_QUESTIONS_PER_PASS } from '@/lib/domain/entitlement/pass'
import { formatFeatureCost } from '@/lib/domain/payment/feature-costs'

const CTA_CLASS =
  'relative w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.12] text-ink-light/80 font-sans text-sm flex items-center justify-center gap-2 hover:border-gold-500/40 transition-colors disabled:opacity-60'

interface PassGateCtaProps {
  /** 서버가 읽은 보유 이용권으로 질문을 열 수 있는지. 정본 판정은 여는 순간의 서버(NO_PASS)다. */
  canOpen: boolean
}

/**
 * 속풀이 게이트의 입장로 — 「이용권으로 질문 열기」.
 * 🔴 게이트 문구가 «이용권으로 질문을 열어 이어가세요»라고 말하는데 여는 자리가 채팅 안에만 있어,
 *    잔여 0문인 비회원은 이용권을 들고도 문 앞에서 막혔다. 이 버튼이 그 길이다.
 */
export function PassGateCta({ canOpen }: PassGateCtaProps) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)
  const { passModal, handleChargeResult, closePassModal } = useInsufficientPass()
  const refreshPasses = useRefreshPasses()
  const featureLabel = `속풀이 질문 ${SHAMAN_QUESTIONS_PER_PASS}문`

  const openQuestions = async () => {
    setOpening(true)
    try {
      const result = await purchaseShamanQuestions()
      if (handleChargeResult(result, { featureLabel })) {
        void refreshPasses()
        GAChat.rechargeRedirect()
        return
      }
      if (!result.success) {
        toast.error(result.error || '질문을 열지 못했어요')
        return
      }
      void refreshPasses()
      GAChat.ticketPurchase()
      toast.success(`질문 ${SHAMAN_QUESTIONS_PER_PASS}문을 열었어요`, {
        description: `${formatFeatureCost('shamanQuestions')} 사용 · ${PURCHASE_EXPIRE_DAYS}일 안에 여쭤보세요`,
      })
      router.refresh()
    } finally {
      setOpening(false)
    }
  }

  return (
    <>
      <div className="relative my-3 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-ink-light/35 font-sans">또는</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
      {canOpen ? (
        <button onClick={openQuestions} disabled={opening} className={CTA_CLASS}>
          {opening ? (
            <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
          ) : (
            <Ticket className="w-4 h-4 text-gold-400" />
          )}
          {formatFeatureCost('shamanQuestions')}으로 질문 {SHAMAN_QUESTIONS_PER_PASS}문 열기
        </button>
      ) : (
        <Link href="/protected/store?tab=pass" className={CTA_CLASS}>
          <Ticket className="w-4 h-4 text-gold-400" />
          이용권 구매
        </Link>
      )}
      <InsufficientPassModal {...passModal} onClose={closePassModal} />
    </>
  )
}
