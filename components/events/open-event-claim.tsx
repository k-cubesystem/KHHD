'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, Loader2 } from 'lucide-react'
import { claimDailyEventBonus, checkEventBonusStatus } from '@/app/actions/payment/open-event'
import { isOpenEventActive } from '@/lib/domain/payment/open-event-window'
import { logger } from '@/lib/utils/logger'

/**
 * 오픈 이벤트 일일 복채 수령 — 상점 › 복채 충전 탭의 인라인 카드.
 *
 * 🔴 현재 이벤트는 종료 상태다(OPEN_EVENT_END_KST 가 지났다) → 이 카드는 아무것도 그리지 않는다.
 *    죽은 코드가 아니라 «되살리기 경로»다: 상수 한 줄을 미래 시각으로 되돌리면 카드가 그대로 돌아온다.
 *    진입 조건은 lib/domain/payment/open-event-window.ts 단 하나뿐이다.
 *
 * 열려 있을 때의 동작: 수령 완료·상태 확인 실패 시에도 스스로 사라져 상점 화면을 어지럽히지 않는다.
 * 지급 금액과 최종 허용 여부는 서버(app/actions/payment/open-event.ts)가 단독으로 판정한다.
 */
type Phase = 'checking' | 'claimable' | 'claimed' | 'hidden'

export function OpenEventClaim() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 종료됐으면 서버에 묻지도 않는다 — 상점을 열 때마다 죽은 왕복을 만들지 않기 위해.
    if (!isOpenEventActive()) {
      setPhase('hidden')
      return
    }

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
