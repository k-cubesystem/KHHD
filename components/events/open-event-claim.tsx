'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Loader2 } from 'lucide-react'
import { claimDailyEventBonus, checkEventBonusStatus } from '@/app/actions/payment/open-event'
import { logger } from '@/lib/utils/logger'

/**
 * 오픈 이벤트 일일 복채 수령 — 자동 팝업(OpenEventPopup)의 대체 경로.
 *
 * 팝업은 걷어냈지만 «받을 수 있던 복채»까지 사라지면 안 되므로, 복채가 필요해진 그 자리
 * (상점 › 복채 충전 탭) 에 인라인 카드로 남긴다. 수령 완료·이벤트 종료 시엔 스스로 사라져
 * 상점 화면을 어지럽히지 않는다(팝업처럼 흐름을 끊지 않는 게 핵심).
 *
 * 지급 금액·이벤트 활성 여부는 서버(app/actions/payment/open-event.ts)가 단독으로 판정한다.
 */
type Phase = 'checking' | 'claimable' | 'claimed' | 'hidden'

export function OpenEventClaim() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    // 상태 확인 실패 시엔 숨긴다(fail-closed) — 못 받는 버튼을 띄워 기대를 만들지 않는다.
    checkEventBonusStatus()
      .then(({ claimed, eventActive }) => {
        if (!alive) return
        setPhase(!eventActive || claimed ? 'hidden' : 'claimable')
      })
      .catch((err) => {
        logger.error('[OpenEventClaim] 상태 확인 실패:', err)
        if (alive) setPhase('hidden')
      })
    return () => {
      alive = false
    }
  }, [])

  const claim = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const result = await claimDailyEventBonus()
      if (result.success || result.alreadyClaimed) {
        setPhase('claimed')
        setMessage(result.message)
        router.refresh() // 상단 보유 복채 즉시 갱신
      } else {
        setFailed(true)
        setMessage(result.message)
      }
    } catch (err) {
      logger.error('[OpenEventClaim] 수령 실패:', err)
      setFailed(true)
      setMessage('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [router])

  if (phase === 'checking' || phase === 'hidden') return null

  return (
    <section className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.06] p-4" aria-label="오픈 이벤트 복채">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/12">
          <Gift className="h-4 w-4 text-gold-400" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[14px] font-bold text-ink-light">오픈 기념 — 오늘의 복채</p>
          <p className="font-sans text-[11px] text-ink-light/55">정식 오픈 전까지 하루 한 번 받을 수 있어요</p>
        </div>
        {phase === 'claimable' && (
          <button
            type="button"
            onClick={claim}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold-500/45 bg-gold-500/15 px-4 py-2 font-serif text-[12px] font-bold text-gold-300 transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? '받는 중' : '받기'}
          </button>
        )}
      </div>

      {message && (
        <p className={`mt-2.5 font-sans text-[12px] ${failed ? 'text-red-400' : 'text-green-400'}`} role="status">
          {message}
        </p>
      )}
    </section>
  )
}
