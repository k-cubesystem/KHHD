'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { claimDailyEventBonus, checkEventBonusStatus } from '@/app/actions/payment/open-event'
import { logger } from '@/lib/utils/logger'

const STORAGE_KEY = 'open_event_dismissed_date'

function getTodayKST(): string {
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000
  const kstNow = new Date(now.getTime() + kstOffset)
  return kstNow.toISOString().split('T')[0]
}

export function OpenEventPopup() {
  const [open, setOpen] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const today = getTodayKST()
    const dismissed = localStorage.getItem(STORAGE_KEY)

    if (dismissed === today) return

    // Check server-side status then show popup
    checkEventBonusStatus()
      .then(({ claimed: alreadyClaimed, eventActive }) => {
        if (!eventActive) return
        setClaimed(alreadyClaimed)
        setOpen(true)
      })
      .catch((err) => {
        logger.error('[OpenEventPopup] Status check failed:', err)
        setOpen(true)
      })
  }, [])

  const handleClaim = useCallback(async () => {
    setLoading(true)
    try {
      const result = await claimDailyEventBonus()
      if (result.success) {
        setClaimed(true)
        setMessage(result.message)
      } else if (result.alreadyClaimed) {
        setClaimed(true)
        setMessage(result.message)
      } else {
        setMessage(result.message)
      }
    } catch (err) {
      logger.error('[OpenEventPopup] Claim failed:', err)
      setMessage('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      const today = getTodayKST()
      localStorage.setItem(STORAGE_KEY, today)
      setOpen(false)
    }
  }, [])

  const benefits = ['무료 사주 분석', '궁합 확인', '관상/손금 분석', 'AI 샤먼 상담']

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-[#D4AF37]/40 bg-[#1a1a2e] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl text-[#D4AF37]">오픈 이벤트</DialogTitle>
          <DialogDescription className="text-center text-base text-[#D4AF37]/80">
            정식 오픈 전까지 매일 복채 20만냥 지급!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-center text-sm text-ink-light/90">
            해화당 정식 오픈 전까지 모든 회원에게
            <br />
            매일 복채 <span className="text-[#D4AF37] font-bold">20만냥</span>을 지급합니다!
          </p>

          <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4">
            <p className="text-xs text-[#D4AF37]/70 mb-2 font-semibold">복채로 이용 가능한 서비스</p>
            <ul className="grid grid-cols-2 gap-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-1.5 text-sm text-ink-light/80">
                  <span className="text-[#D4AF37] text-xs">&#9670;</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {message && <p className={`text-center text-sm ${claimed ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}

          {claimed ? (
            <div className="text-center py-2">
              <p className="text-green-400 font-semibold">오늘 복채를 이미 받았습니다!</p>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3 text-sm font-bold text-[#1a1a2e] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '오늘의 복채 받기'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
