'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { toast } from 'sonner'
import { getAdRewardAvailability } from '@/app/actions/ads/coupang'
import { AdIncenseSheet } from '@/components/ai/chat/ad-incense-sheet'
import type { AdRewardAvailability } from '@/lib/domain/ads/rewarded'

/**
 * 속풀이 게이트의 세 번째 입장로 — 「광고 보고 오늘 열기」(P1-A).
 * 광고 인벤토리가 없거나(키·링크 미설정) 브레이커·한도에 걸리면 조용히 렌더하지 않는다.
 */
export function AdGateCta() {
  const router = useRouter()
  const [avail, setAvail] = useState<AdRewardAvailability | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    void getAdRewardAvailability().then((a) => {
      if (alive) setAvail(a)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!avail?.enabled) return null

  return (
    <>
      <div className="relative my-3 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-ink-light/35 font-sans">또는</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.12] text-ink-light/80 font-sans text-sm flex items-center justify-center gap-2 hover:border-gold-500/40 transition-colors"
      >
        <Flame className="w-4 h-4 text-gold-400" />
        광고 보고 오늘 열기 · 질문 {avail.reward}회
      </button>
      {open && (
        <AdIncenseSheet
          availability={avail}
          onClose={() => setOpen(false)}
          onGranted={(_adCredits, reward) => {
            toast.success(`향이 올랐습니다 — 질문권 ${reward}회`, { description: '속풀이로 모십니다.' })
            router.refresh() // 서버 게이트 재평가 → 광고권 보유로 입장
          }}
        />
      )}
    </>
  )
}
