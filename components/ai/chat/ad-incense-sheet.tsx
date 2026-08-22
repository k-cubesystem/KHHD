'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Loader2, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { OverlayPortal } from '@/components/ai/chat/overlay-portal'
import { startCoupangVisit, claimCoupangVisit } from '@/app/actions/ads/coupang'
import { AD_DISCLOSURE_COUPANG, CLIENT_DWELL_HINT_SECONDS, type AdRewardAvailability } from '@/lib/domain/ads/rewarded'
import { GAChat } from '@/lib/analytics/chat-ga'
import { cn } from '@/lib/utils'

type Phase = 'ready' | 'away' | 'claiming' | 'done'

/**
 * 「광고 보고 향 올리기」 시트 — 쿠팡 방문형(P1-A).
 * 쿠팡을 새 탭으로 열고, 최소 체류 카운트다운 후 「향 올리기」로 지급을 청구한다.
 * 지급 판정(멱등·최소 체류·일일 상한)은 전부 서버 RPC — 여기 카운트다운은 안내용이다.
 */
export function AdIncenseSheet({
  availability,
  onClose,
  onGranted,
}: {
  availability: AdRewardAvailability
  onClose: () => void
  /** 지급 성공 — adCredits: 서버 기준 광고권 잔량, reward: 이번 지급 수 */
  onGranted: (adCredits: number, reward: number) => void
}) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [nonce, setNonce] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(CLIENT_DWELL_HINT_SECONDS)
  const [starting, setStarting] = useState(false)
  const grantedRef = useRef(false)

  // 체류 카운트다운 — 서버가 최종 강제하므로 여기선 버튼 활성 시점 안내만.
  useEffect(() => {
    if (phase !== 'away') return
    const timer = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  // 중도 이탈 계측 — 지급 없이 닫히면 abandon.
  useEffect(() => {
    return () => {
      if (!grantedRef.current && phase !== 'ready') GAChat.adAbandon('coupang_visit')
    }
    // phase 는 언마운트 시점 판단에만 쓴다 — 매 변경마다 abandon 을 찍지 않도록 deps 에서 뺀다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStart = useCallback(async () => {
    setStarting(true)
    try {
      const res = await startCoupangVisit()
      if (!res.success || !res.url || !res.nonce) {
        toast.error(res.error || '광고 준비가 되지 않았습니다.')
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
      setNonce(res.nonce)
      setSecondsLeft(CLIENT_DWELL_HINT_SECONDS)
      setPhase('away')
      GAChat.adStart('coupang_visit')
    } finally {
      setStarting(false)
    }
  }, [])

  const handleClaim = useCallback(async () => {
    if (!nonce) return
    setPhase('claiming')
    const res = await claimCoupangVisit(nonce)
    if (!res.success) {
      if (res.tooFast) {
        // 서버 기준 체류 미달 — 몇 초 더 기다렸다 다시 청구할 수 있게 돌려보낸다.
        setSecondsLeft(5)
        setPhase('away')
        toast.error(res.error || '조금만 더 있다 와주세요.')
      } else {
        toast.error(res.error || '향이 오르지 못했습니다.')
        setPhase('ready')
        setNonce(null)
      }
      return
    }
    grantedRef.current = true
    GAChat.adGrant('coupang_visit', res.reward ?? 0)
    setPhase('done')
    onGranted(res.adCredits ?? 0, res.reward ?? 0)
    window.setTimeout(onClose, 1400)
  }, [nonce, onClose, onGranted])

  const claimReady = phase === 'away' && secondsLeft <= 0

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center"
        role="dialog"
        aria-label="광고 보고 향 올리기"
      >
        <button aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative w-full max-w-[480px] rounded-t-2xl border border-b-0 border-primary/20 bg-[#12100a] px-5 pt-5 pb-6"
        >
          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-3.5 right-3.5 p-1 text-primary/50 hover:text-primary"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                phase === 'done'
                  ? 'border-gold-500/60 bg-gold-500/20 shadow-[0_0_18px_rgba(212,175,55,0.4)]'
                  : 'border-gold-500/25 bg-gold-500/[0.08]'
              )}
            >
              <Flame
                className={cn('h-4 w-4', phase === 'done' ? 'text-gold-300' : 'text-gold-500/70')}
                strokeWidth={1.5}
              />
            </span>
            <div>
              <p className="font-serif text-[15px] font-bold text-gold-200">광고 보고 향 올리기</p>
              <p className="font-sans text-[11px] text-ink-light/45">
                쿠팡을 다녀오시면 질문권 {availability.reward}회를 올려 드립니다 · 하루 {availability.setsLeftToday}회
                남음
              </p>
            </div>
          </div>

          {phase === 'done' ? (
            <p className="py-6 text-center font-serif text-[14px] text-gold-200">
              향이 올랐습니다 — 질문권 {availability.reward}회가 놓였습니다.
            </p>
          ) : (
            <>
              <p className="mt-3 font-sans text-[12.5px] leading-relaxed text-ink-light/70">
                {phase === 'ready'
                  ? '새 탭으로 쿠팡 오늘의 특가가 열립니다. 잠시 둘러보고 돌아오시면 향이 올라갑니다.'
                  : claimReady
                    ? '잘 다녀오셨어요. 이제 향을 올릴 수 있습니다.'
                    : `둘러보는 중… ${secondsLeft}초 뒤에 향을 올릴 수 있어요.`}
              </p>

              <div className="mt-4 flex gap-2">
                {phase === 'ready' ? (
                  <button
                    onClick={() => void handleStart()}
                    disabled={starting}
                    className="tap-glow-gold flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold-500/45 bg-gold-500/15 py-3 font-serif text-[13.5px] font-bold text-gold-300 transition-opacity hover:opacity-85 disabled:opacity-50"
                  >
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    쿠팡 다녀오기 · 질문 {availability.reward}회
                  </button>
                ) : (
                  <button
                    onClick={() => void handleClaim()}
                    disabled={phase === 'claiming' || !claimReady}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 font-serif text-[13.5px] font-bold transition-all',
                      claimReady
                        ? 'tap-glow-gold border border-gold-500/45 bg-gold-500/15 text-gold-300 hover:opacity-85'
                        : 'border border-white/10 bg-surface/40 text-ink-light/35'
                    )}
                  >
                    {phase === 'claiming' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Flame className="h-4 w-4" />
                    )}
                    {claimReady ? '향 올리기 (보상 받기)' : `향 올리기 (${secondsLeft}초)`}
                  </button>
                )}
              </div>
            </>
          )}

          {/* 대가성 고지 — 의무 문구(단일 출처 상수) */}
          <p className="mt-3 text-center font-sans text-[10px] leading-relaxed text-ink-light/35">
            {AD_DISCLOSURE_COUPANG}
          </p>
        </motion.div>
      </div>
    </OverlayPortal>
  )
}
